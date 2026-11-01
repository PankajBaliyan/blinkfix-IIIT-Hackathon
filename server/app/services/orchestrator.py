import asyncio
import time
import json
from ..state import claim_action, get_state
from ..streaming.event_bus import event_bus
from .patch_validator import FIXTURE, validate_candidate, rank_and_select_winner
from .cerebras_service import cerebras_client
from .codex_service import generate_candidates
from .github_service import create_draft_pull_request

ROLES = ['Trace Analyst', 'Git Detective', 'Infra Checker', 'Impact Analyst', 'Mitigation Planner']


async def run_incident_orchestration(incident_id):
    started = time.perf_counter()
    state = get_state(incident_id)

    def emit(event, **changes):
        changes['duration_ms'] = int((time.perf_counter() - started) * 1000)
        return event_bus.publish(incident_id, event, changes)

    try:
        # Infrastructure fixture is an explicit supplied telemetry scenario,
        # not a claimed live probe of Stripe.
        if state['scenario_id'] == 'stripe-timeout':
            emit('mitigation_ready', status='MITIGATED',
                 telemetry={'source': 'infrastructure fixture', 'upstream': 'payment-gateway',
                            'http_status': 503, 'local_health': 'ok'},
                 mitigation='Upstream payment gateway unavailable (fixture 503). Pause checkout, use bounded retries/circuit breaker and contact provider. No code patch generated.',
                 patches=[], agents=[])
            return
        source = state['source']
        contract = (FIXTURE / 'CONTRACT.md').read_text()
        tests = (FIXTURE / 'payments.test.cjs').read_text()
        baseline = await asyncio.to_thread(validate_candidate, source, 'original')
        emit('baseline_completed', baseline=baseline)
        if baseline['validation']['syntax']['exit_code'] != 0:
            raise RuntimeError('Supplied source has a syntax error; this demo supports only the checkout currency bug')
        if baseline['validation']['passed']:
            raise RuntimeError('Regression does not reproduce against supplied source; no patch or PR generated')
        error = baseline['validation']['tests']['stdout'] + baseline['validation']['tests']['stderr']
        emit('agent_started', status='AGENTS_ACTIVE', agents=[
            {'agent_name': role, 'status': 'ANALYZING', 'summary': 'Analyzing supplied evidence...',
             'duration_ms': 0, 'logs': [], 'findings': {}} for role in ROLES])
        if state['mode'] == 'fixture':
            analyses = [
                {'agent_name': role, 'summary': 'Offline fixture mode: model call skipped.',
                 'status': 'SKIPPED', 'duration_ms': 0, 'logs': [], 'findings': {}}
                for role in ROLES
            ]
            emit('agent_completed', agents=analyses)
        else:
            async def analyze(role):
                tick = time.perf_counter()
                try:
                    result = await cerebras_client.complete_json(
                        f'Act as {role}. Return JSON with summary and findings. Analyze supplied source, error and contract only. Do not invent execution, probes, deployment actions or commit history. Explicitly state missing evidence. Git Detective must report unavailable history rather than name a commit. Infra Checker must distinguish supplied telemetry from live probes. Impact Analyst checks currency contract and gateway side effects. Mitigation Planner recommends containment without claiming execution.',
                        json.dumps({'source': source, 'error': error, 'contract': contract}))
                    return {'agent_name': role, 'summary': result['summary'], 'findings': result.get('findings', {}),
                            'status': 'COMPLETED', 'duration_ms': int((time.perf_counter()-tick)*1000), 'logs': []}
                except Exception as exc:
                    return {'agent_name': role, 'summary': str(exc), 'status': 'FAILED',
                            'duration_ms': int((time.perf_counter()-tick)*1000), 'findings': {}, 'logs': []}
            analyses_by_role = {
                role: {'agent_name': role, 'status': 'ANALYZING',
                       'summary': 'Analyzing supplied evidence...', 'duration_ms': 0,
                       'logs': [], 'findings': {}}
                for role in ROLES
            }
            tasks = [asyncio.create_task(analyze(role)) for role in ROLES]
            for completed in asyncio.as_completed(tasks):
                result = await completed
                analyses_by_role[result['agent_name']] = result
                emit('agent_progress', agents=[analyses_by_role[role] for role in ROLES])
            analyses = [analyses_by_role[role] for role in ROLES]
            emit('agent_completed', agents=analyses)
        if any(a['status'] == 'FAILED' for a in analyses):
            raise RuntimeError('Parallel analysis failed: ' + '; '.join(a['summary'] for a in analyses if a['status'] == 'FAILED'))
        emit('repair_started', status='SPECULATIVE_REPAIR')
        if state['mode'] == 'fixture':
            root = FIXTURE.parent / 'candidates'
            candidates = [{'id': name, 'code': (root / f'{name}.cjs').read_text()} for name in ['bad', 'correct']]
        else:
            candidates = await generate_candidates(source, error, contract, analyses, tests)
        emit('validation_started', status='VALIDATING', generator='fixture files' if state['mode'] == 'fixture' else 'Codex')
        patches = await asyncio.to_thread(rank_and_select_winner, candidates, source)
        emit('patch_verified', patches=patches)
        winner = next((p for p in patches if p['isWinner']), None)
        if winner is None:
            raise RuntimeError('All candidates failed execution. No PR created.')
        if state['publish']:
            if not claim_action(incident_id, 'github-publication'):
                emit('publishing_failed', status='PUBLISH_FAILED',
                     error='Publication was already attempted for this incident.', pr_url=None)
                return
            try:
                publishing = await create_draft_pull_request(incident_id, source, winner)
            except Exception as exc:
                emit('publishing_failed', status='PUBLISH_FAILED', error=str(exc), pr_url=None)
                return
            publishing.pop('status', None)
            emit('incident_completed', status='RESOLVED', **publishing)
        else:
            emit('incident_completed', status='VALIDATED', pr_url=None)
    except Exception as exc:
        emit('incident_failed', status='FAILED', error=f'{type(exc).__name__}: {exc}', pr_url=None)
