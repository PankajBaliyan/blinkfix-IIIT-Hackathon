import asyncio
import json
import logging
from typing import Dict, List, Any

logger = logging.getLogger("blinkfix.eventbus")

class EventBus:
    def __init__(self):
        # Maps incident_id to a list of subscriber Queues
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        # Subscribers that receive updates for every incident (the dashboard).
        self._global: List[asyncio.Queue] = []

    def subscribe(self, incident_id: str) -> asyncio.Queue:
        if incident_id not in self._subscribers:
            self._subscribers[incident_id] = []
        queue = asyncio.Queue()
        self._subscribers[incident_id].append(queue)
        logger.debug(f"Client subscribed to incident {incident_id}. Active: {len(self._subscribers[incident_id])}")
        return queue

    def unsubscribe(self, incident_id: str, queue: asyncio.Queue):
        if incident_id in self._subscribers:
            if queue in self._subscribers[incident_id]:
                self._subscribers[incident_id].remove(queue)
            if not self._subscribers[incident_id]:
                del self._subscribers[incident_id]

    def subscribe_global(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._global.append(queue)
        return queue

    def unsubscribe_global(self, queue: asyncio.Queue):
        if queue in self._global:
            self._global.remove(queue)

    async def broadcast_global(self, event_type: str, data: Any):
        payload = json.dumps(data)
        for queue in list(self._global):
            await queue.put({"event": event_type, "data": payload})

    async def broadcast(self, incident_id: str, event_type: str, data: Any):
        payload = json.dumps({"type": event_type, "data": data})
        if incident_id in self._subscribers:
            for queue in list(self._subscribers[incident_id]):
                await queue.put({"event": event_type, "data": payload})

event_bus = EventBus()

