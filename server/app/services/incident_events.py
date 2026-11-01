from ..streaming.event_bus import event_bus
from .incident_view import build_incident_detail


async def publish_incident_update(incident_id: str) -> None:
    """Pushes the incident's current state to every connected dashboard."""
    detail = build_incident_detail(incident_id)
    if detail:
        await event_bus.broadcast_global("incident_updated", detail)
