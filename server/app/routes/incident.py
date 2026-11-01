import uuid
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..models.schemas import (
    SimulateRequest,
    CrashPayload,
    RollbackApprovalRequest,
)
from ..services.orchestrator import run_incident_orchestration
from ..database import get_incident, update_incident, list_recent_incidents

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.post("/simulate")
async def simulate_outage(request: SimulateRequest, background_tasks: BackgroundTasks):
    """Triggers an autonomous incident simulation."""
    incident_id = f"inc_{uuid.uuid4().hex[:8]}"

    payload = request.customCrash or CrashPayload(
        eventId=incident_id,
        level="error",
        service="checkout-service",
        message="TypeError: Cannot read properties of undefined (reading 'exchangeRate')",
        exceptionType="TypeError",
        file="src/payments.js",
        line=5,
        functionName="processPayment",
    )

    # Launch orchestration in background so API responds instantly
    background_tasks.add_task(run_incident_orchestration, incident_id, payload)

    return {
        "status": "initiated",
        "incident_id": incident_id,
        "service": payload.service,
        "message": "Incident investigation launched across parallel Cerebras agent swarm.",
    }

@router.post("/webhook/crash")
async def crash_webhook(payload: CrashPayload, background_tasks: BackgroundTasks):
    """Custom webhook receiver for Sentry / production crash payloads."""
    incident_id = payload.eventId or f"inc_{uuid.uuid4().hex[:8]}"
    background_tasks.add_task(run_incident_orchestration, incident_id, payload)
    return {
        "status": "ingested",
        "incident_id": incident_id,
        "service": payload.service,
    }

@router.get("/{incident_id}")
async def get_incident_details(incident_id: str):
    """Fetches full state and diagnosis for an incident from SQLite."""
    data = get_incident(incident_id)
    if not data:
        raise HTTPException(status_code=404, detail="Incident not found")
    return data

@router.post("/{incident_id}/rollback")
async def approve_rollback(incident_id: str, request: RollbackApprovalRequest):
    """Human-in-the-loop authorization to execute simulated rollback."""
    incident = get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_incident(incident_id, {"rollback_approved": 1})
    return {
        "status": "rollback_approved",
        "incident_id": incident_id,
        "approved_by": request.approvedBy,
        "action": "Dispatched Kubernetes deployment rollback to v1.0.3",
    }

@router.get("/")
async def get_recent_incidents():
    """Lists recent incidents stored in the SQLite database file."""
    return {"incidents": list_recent_incidents(limit=20)}

