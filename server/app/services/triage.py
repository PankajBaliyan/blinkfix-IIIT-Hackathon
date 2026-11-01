import logging
from typing import List

from ..agents.base import BaseAgent, SYSTEM_PROMPT
from .cerebras_service import cerebras_client
from .evidence import Evidence, SharedTriage

logger = logging.getLogger("blinkfix.triage")


async def run_shared_triage(agents: List[BaseAgent], evidence: Evidence) -> SharedTriage:
    """One model call that answers for every agent, so an incident costs one request instead of five."""
    sections = "\n\n".join(f'Key "{a.key}" ({a.name}):\n{a.task}' for a in agents)
    keys = ", ".join(f'"{a.key}"' for a in agents)
    reply = await cerebras_client.complete_json(
        f"{SYSTEM_PROMPT}\n\nYou play {len(agents)} specialist roles at once. Answer each role on its own, from the evidence.",
        (
            f"{evidence.render()}\n\nTask:\nReturn ONE JSON object with exactly these keys: {keys}.\n"
            f"Each value is a JSON object that follows that role's instructions below.\n\n{sections}"
        ),
        max_tokens=3000,
    )
    if reply.data is None:
        logger.warning("Shared triage call failed (%s)", reply.error)
    else:
        logger.info("%s answered for all %d agents in %d ms", reply.model, len(agents), reply.latency_ms)
    return SharedTriage(reply.data, reply.latency_ms, reply.model, reply.error)
