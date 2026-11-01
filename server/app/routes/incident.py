import uuid
import asyncio
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..models.schemas import (
    CrashPayload,
    RollbackApprovalRequest,
)
from ..services.orchestrator import run_incident_orchestration
from ..services.log_store import log_store
from ..services.incident_console import print_crash_report
from ..database import get_incident, update_incident
from ..services.incident_events import publish_incident_update
from ..services.pull_request import PullRequestError, create_pull_request
from ..database import get_integration
from ..services.incident_view import build_incident_detail, list_incident_summaries

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.post("/webhook/crash")
async def crash_webhook(payload: CrashPayload, background_tasks: BackgroundTasks):
    """Custom webhook receiver for Sentry / production crash payloads."""
    incident_id = payload.eventId or f"inc_{uuid.uuid4().hex[:8]}"

    # Fetch the service's recent logs and print them with the incident summary.
    logs = log_store.fetch(payload.service, limit=20)
    print_crash_report(incident_id, payload, logs)

    background_tasks.add_task(run_incident_orchestration, incident_id, payload, logs)
    return {
        "status": "ingested",
        "incident_id": incident_id,
        "service": payload.service,
        "logs_fetched": len(logs),
    }

@router.get("/{incident_id}")
async def get_incident_details(incident_id: str):
    """Fetches full state and diagnosis for an incident from SQLite."""
    data = build_incident_detail(incident_id)
    if not data:
        raise HTTPException(status_code=404, detail="Incident not found")
    return data

@router.post("/{incident_id}/rollback")
async def approve_rollback(incident_id: str, request: RollbackApprovalRequest):
    """Records that a person approved the recommended mitigation. Blinkfix does not carry it out."""
    incident = get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_incident(incident_id, {"rollback_approved": 1})
    await publish_incident_update(incident_id)
    return {
        "status": "rollback_approved",
        "incident_id": incident_id,
        "approved_by": request.approvedBy,
        "note": "Approval recorded. Blinkfix does not run rollbacks or failovers itself, so someone has to carry the action out.",
    }

class PullRequestRequest(BaseModel):
    patchId: Optional[str] = None


@router.post("/{incident_id}/pull-request")
async def open_pull_request(incident_id: str, request: PullRequestRequest):
    """Opens a draft pull request on GitHub with the chosen fix (the best one by default)."""
    login = (get_integration("github") or {}).get("login")
    try:
        return await create_pull_request(incident_id, request.patchId, login)
    except PullRequestError as e:
        raise HTTPException(status_code=e.status, detail=e.message)


@router.get("/")
async def get_recent_incidents(limit: int = 50):
    """Lists recent incidents stored in the SQLite database file, newest first."""
    return {"incidents": list_incident_summaries(limit=min(max(limit, 1), 200))}

