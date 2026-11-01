"""Persistent event bus: publish first commits snapshot + event atomically.

Consumers replay from a sequence cursor; there are no transient-only queues.
"""
from ..state import record, replay


class EventBus:
    def publish(self, incident_id, event_type, state_changes):
        return record(incident_id, event_type, state_changes)

    def replay(self, incident_id, after=0):
        return replay(incident_id, after)


event_bus = EventBus()
