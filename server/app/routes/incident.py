from datetime import datetime, timezone
from typing import Literal
import uuid
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from ..state import create_run, get_state, list_states
from ..services.orchestrator import run_incident_orchestration
from ..services.patch_validator import FIXTURE

router = APIRouter(prefix='/api/incidents', tags=['incidents'])


class RunRequest(BaseModel):
    requestId: str = Field(default_factory=lambda: uuid.uuid4().hex, min_length=8, max_length=100)
    scenarioId: Literal['payments-typeerror', 'stripe-timeout'] = 'payments-typeerror'
    mode: Literal['live', 'fixture'] = 'live'
    publish: bool = False
    source: str | None = Field(default=None, max_length=30000)


@router.post('/simulate')
async def simulate_outage(request: RunRequest, background_tasks: BackgroundTasks):
    if request.mode == 'fixture' and request.publish:
        raise HTTPException(400, 'Fixture runs cannot publish PRs')
    incident_id = 'inc_' + uuid.uuid4().hex[:12]
    source = request.source if request.source is not None else (FIXTURE / 'payments.cjs').read_text()
    incident_id, created = create_run(request.requestId, incident_id, {
        'status': 'TRIGGERED', 'scenario_id': request.scenarioId, 'mode': request.mode,
        'publish': request.publish, 'source': source, 'agents': [], 'patches': [],
        'started_at': datetime.now(timezone.utc).isoformat(), 'duration_ms': 0,
        'pr_url': None, 'error': None, 'mitigation': None,
    })
    if created:
        background_tasks.add_task(run_incident_orchestration, incident_id)
    return {'status': 'initiated' if created else 'existing', 'incident_id': incident_id}


@router.get('/{incident_id}')
async def get_incident_details(incident_id: str):
    state = get_state(incident_id)
    if not state:
        raise HTTPException(404, 'Incident not found')
    return state


@router.get('/reports/rehearsals/live')
async def live_rehearsal_report(limit: int = 5):
    limit = max(1, min(limit, 20))
    runs = list_states(limit=limit, mode='live', scenario_id='payments-typeerror')
    rows = []
    for run in runs:
        error = run.get('error') or ''
        rows.append({
            'id': run['id'], 'status': run.get('status'),
            'duration_ms': run.get('duration_ms', 0),
            'model_failure': run.get('status') == 'FAILED' and any(
                marker in error for marker in ('Cerebras', 'Codex', 'Parallel analysis')),
            'publication_failure': run.get('status') == 'PUBLISH_FAILED',
            'published': bool(run.get('pr_url')),
            'pr_url': run.get('pr_url'), 'started_at': run.get('started_at'),
            'error': error or None,
        })
    return {
        'requested_runs': 5,
        'recorded_runs': len(rows),
        'successful_runs': sum(row['status'] in ('VALIDATED', 'RESOLVED') for row in rows),
        'total_duration_ms': sum(row['duration_ms'] for row in rows),
        'model_failures': sum(row['model_failure'] for row in rows),
        'publication_failures': sum(row['publication_failure'] for row in rows),
        'runs': rows,
    }
