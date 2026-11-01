import asyncio
from typing import Dict, Any, List
from .base import BaseAgent
from ..models.schemas import CrashPayload
from ..services.diagnosis import find_culprit_commit, is_external_failure

class MitigationPlanner(BaseAgent):
    name = "Mitigation Planner"
    role = "Immediate Rollback & Containment Strategy"

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str]
    ) -> Dict[str, Any]:
        logs.append("[00:00.120] Formulating immediate containment & failover strategy.")
        await asyncio.sleep(0.31)

        culprit = find_culprit_commit(context, payload.file)
        pr = culprit.get("prNumber", 0)

        if is_external_failure(payload):
            # A rollback cannot fix someone else's outage.
            action = "Fail over to the backup payment provider"
            desc = "The payment provider is timing out, so rolling back our code would not help. Route charges to the secondary processor until it recovers."
            risk = "MEDIUM"
        else:
            action = f"Roll back to the previous deployment (revert PR #{pr})"
            desc = f"Reverts commit {culprit.get('hash')} to restore the last version that worked."
            risk = "LOW"

        logs.append(f"[00:00.290] Safe mitigation generated: {action}.")
        logs.append("[00:00.310] Human-in-the-loop approval gate requested.")

        return {
            "summary": f"Recommendation: {action} ({risk} risk). Awaiting approval.",
            "findings": {
                "action": action,
                "description": desc,
                "target_pr": pr,
                "risk_level": risk,
                "requires_human_approval": True,
            },
        }
