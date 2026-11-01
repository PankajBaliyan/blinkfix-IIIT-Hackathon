import asyncio
from fastapi import APIRouter, Request, HTTPException
from sse_starlette.sse import EventSourceResponse
from ..state import get_state, TERMINAL
from ..streaming.event_bus import event_bus

router = APIRouter(prefix='/api/incidents', tags=['streaming'])


@router.get('/{incident_id}/stream')
async def incident_event_stream(incident_id: str, request: Request, after: int = 0):
    if not get_state(incident_id):
        raise HTTPException(404, 'Incident not found')
    try:
        cursor = max(after, int(request.headers.get('last-event-id', '0')))
    except ValueError:
        raise HTTPException(400, 'Invalid event cursor')

    async def events():
        nonlocal cursor
        while not await request.is_disconnected():
            batch = event_bus.replay(incident_id, cursor)
            for event in batch:
                cursor = int(event['id'])
                yield event
            # Read terminal state before a second replay to avoid a completion
            # racing the batch read and closing without its final event.
            if get_state(incident_id)['status'] in TERMINAL and not event_bus.replay(incident_id, cursor):
                break
            await asyncio.sleep(0.1)
    return EventSourceResponse(events(), ping=10)
