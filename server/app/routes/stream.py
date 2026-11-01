import json
import asyncio
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from ..streaming.event_bus import event_bus

router = APIRouter(prefix="/api/incidents", tags=["streaming"])

@router.get("/{incident_id}/stream")
async def incident_event_stream(incident_id: str, request: Request):
    """Server-Sent Events endpoint streaming real-time agent telemetry and PR events."""
    queue = event_bus.subscribe(incident_id)

    async def event_generator():
        try:
            # Yield initial connection confirmation
            yield {
                "event": "connected",
                "data": json.dumps({"incident_id": incident_id, "status": "stream_open"}),
            }

            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break

                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield event
                    if event.get("event") in ("incident_completed", "incident_failed"):
                        # Keep open briefly then finish
                        await asyncio.sleep(0.5)
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment
                    yield {"comment": "keep-alive"}
        finally:
            event_bus.unsubscribe(incident_id, queue)

    return EventSourceResponse(event_generator())

