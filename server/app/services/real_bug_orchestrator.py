"""Live model orchestration for a reproduced configured repository bug."""
import asyncio
import json
import time
from ..config import settings
from .cerebras_service import cerebras_client
from .codex_service import generate_repository_candidates
from .repository_workflow import prepare_repository, validate_repository_candidate

ROLES = {
    'Reproduction Analyst': 'Explain the observed reproducer failure and cite only command output and source.',
    'Git Analyst': 'Analyze the supplied real target-file history and HEAD diff. Do not invent commits.',
    'Infrastructure Analyst': 'Use only supplied telemetry. If none exists, explicitly report insufficient infrastructure evidence.',
    'Impact Analyst': 'Assess protocol and compatibility impact from the report, source, and failure only.',
    'Constraint Reviewer': 'Identify allowed-file and executable acceptance constraints; do not propose test changes.',
}


async def repair_real_bug(bug_id: str, strategy: str = 'parallel') -> dict:
    started = time.perf_counter()
    if strategy not in ('parallel', 'single'):
        return _abstain(bug_id, 'configuration', 'Strategy must be parallel or single', started)
    if not settings.OPENAI_API_KEY or not settings.CEREBRAS_API_KEY:
        return _abstain(
            bug_id, 'provider',
            'OPENAI_API_KEY and CEREBRAS_API_KEY are required before repository setup. '
            'Use the reproduction command independently; no checkout or model call was attempted.',
            started,
        )
    try:
        prepared = await asyncio.to_thread(prepare_repository, bug_id)
    except Exception as exc:
        return _abstain(bug_id, 'reproduction', str(exc), started)
    evidence = {
        'bug_report': prepared['report'], 'report_url': prepared['report_url'],
        'repository': prepared['repository'], 'revision': prepared['revision'],
        'target_file': prepared['target_file'], 'source': prepared['source'],
        'reproducer_failure': prepared['reproduction'],
        'unchanged_regression_baseline': prepared['regression'],
        'git_history': prepared['git_history'], 'head_target_diff': prepared['head_target_diff'],
        'telemetry': None,
        'constraints': {'allowed_files': [prepared['target_file']],
                        'tests_must_remain_unchanged': True,
                        'upstream_fix_and_post_fix_tests_available': False},
    }
    analyses = []

    async def analyze(role: str, instruction: str) -> dict:
        tick = time.perf_counter()
        if role == 'Infrastructure Analyst' and evidence['telemetry'] is None:
            return {'agent_name': role, 'status': 'COMPLETED', 'duration_ms': 0,
                    'summary': 'Insufficient evidence: no infrastructure telemetry was supplied.',
                    'findings': {'evidence_available': False}}
        try:
            result = await cerebras_client.complete_json(
                f'You are the {role}. {instruction} Return summary and findings JSON.',
                json.dumps(evidence),
            )
            return {'agent_name': role, 'status': 'COMPLETED',
                    'duration_ms': int((time.perf_counter()-tick)*1000), **result}
        except Exception as exc:
            return {'agent_name': role, 'status': 'FAILED',
                    'duration_ms': int((time.perf_counter()-tick)*1000),
                    'summary': str(exc), 'findings': {}}

    analysis_started = time.perf_counter()
    if strategy == 'parallel':
        analyses = await asyncio.gather(*(analyze(role, instruction) for role, instruction in ROLES.items()))
        if any(item['status'] == 'FAILED' for item in analyses):
            return _abstain(bug_id, 'analysis', 'One or more evidence analyses failed; no candidate was generated.', started, prepared, analyses)
    else:
        analyses = [await analyze('Generalist Analyst',
            'Analyze reproduction, source, actual history, constraints, impact, and missing evidence together. '
            'Do not invent infrastructure telemetry or commits.')]
        if analyses[0]['status'] == 'FAILED':
            return _abstain(bug_id, 'analysis', 'The single evidence analysis failed; no candidate was generated.', started, prepared, analyses)

    analysis_duration = int((time.perf_counter() - analysis_started) * 1000)
    generation_started = time.perf_counter()
    try:
        generated = await generate_repository_candidates({**evidence, 'analyses': analyses, 'strategy': strategy})
    except Exception as exc:
        return _abstain(bug_id, 'generation', str(exc), started, prepared, analyses)
    generation_duration = int((time.perf_counter() - generation_started) * 1000)
    validation_started = time.perf_counter()
    validations = []
    for candidate in generated['candidates']:
        result = await asyncio.to_thread(validate_repository_candidate, bug_id, candidate['code'])
        validations.append({'id': candidate['id'], **result})
    passing = [item for item in validations if item['passed']]
    validation_duration = int((time.perf_counter() - validation_started) * 1000)
    if not passing:
        return _abstain(bug_id, 'validation', 'Every generated candidate failed executable checks.', started, prepared, analyses, validations, generated.get('usage'))
    winner = min(passing, key=lambda item: len(item['diff'].splitlines()))
    return {
        'status': 'VALIDATED', 'bug_id': bug_id, 'strategy': strategy,
        'duration_ms': int((time.perf_counter()-started)*1000), 'prepared': prepared,
        'cache_state': prepared.get('cache_state'),
        'phase_timings_ms': {
            'environment_setup': prepared.get('phase_timings_ms', {}).get('environment_setup'),
            'reproduction': prepared.get('phase_timings_ms', {}).get('reproduction'),
            'analysis': analysis_duration, 'generation': generation_duration,
            'validation': validation_duration,
        },
        'agents': analyses, 'candidates': validations, 'winner_id': winner['id'],
        'model_usage': {'analysis': [item.get('provider_usage') for item in analyses],
                        'generation': generated.get('usage')}, 'model_cost': None,
        'cost_note': 'Provider usage is recorded; cost requires the configured account/model price and is not inferred.',
        'reviewer_effort': {'files_to_review': 1, 'changed_diff_lines': len(winner['diff'].splitlines()),
                            'manual_review_minutes': None},
        'pr_url': None, 'publishing_status': 'NOT_ATTEMPTED',
    }


def _abstain(bug_id, stage, reason, started, prepared=None, agents=None, candidates=None, usage=None):
    return {'status': 'ABSTAINED', 'bug_id': bug_id, 'stage': stage, 'reason': reason,
            'duration_ms': int((time.perf_counter()-started)*1000), 'prepared': prepared,
            'cache_state': prepared.get('cache_state') if prepared else 'not_started',
            'phase_timings_ms': prepared.get('phase_timings_ms') if prepared else {
                'environment_setup': 0, 'reproduction': 0, 'analysis': 0,
                'generation': 0, 'validation': 0,
            },
            'agents': agents or [], 'candidates': candidates or [], 'model_usage': usage,
            'model_cost': None, 'pr_url': None, 'publishing_status': 'NOT_ATTEMPTED'}
