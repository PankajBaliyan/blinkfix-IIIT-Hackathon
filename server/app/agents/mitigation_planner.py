import asyncio
from typing import Dict, Any, List
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.diagnosis import find_culprit_commit, is_external_failure
from ..services.evidence import Evidence

RISKS = {"LOW", "MEDIUM", "HIGH"}


class MitigationPlanner(BaseAgent):
    key = "mitigation_planner"
    name = "Mitigation Planner"
    role = "Proposes the safest immediate action to stop the damage"
    task = (
        "Recommend the single safest action to stop the damage right now, before a code fix is ready. "
        "Only recommend a rollback if the evidence points to a recent commit as the cause. "
        "If an outside service is failing, a rollback will not help: recommend failing over or degrading gracefully.\n"
        'Return JSON: {"action": string, "description": string, "risk_level": "LOW" or "MEDIUM" or "HIGH"}\n'
        "action: a short imperative sentence. description: one or two sentences on what it does and why it is safe."
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        culprit = find_culprit_commit(context, payload.file)
        pr = culprit.get("prNumber", 0)
        answer = await self.ask(evidence, logs)

        action = text_field(answer, "action", 160) if answer else None
        description = text_field(answer, "description") if answer else None
        risk = str(answer.get("risk_level", "")).upper() if answer else ""
        if action and description and risk in RISKS:
            self.accept_model_answer()
            self.note(logs, f"Mitigation proposed: {action}.")
            return {
                "summary": f"Recommendation: {action} ({risk} risk). Awaiting approval.",
                "findings": {
                    "action": action,
                    "description": description,
                    "target_pr": pr,
                    "risk_level": risk,
                    "requires_human_approval": True,
                },
            }

        # Built-in demo analysis
        await asyncio.sleep(0.31)
        if is_external_failure(payload):
            # A rollback cannot fix someone else's outage.
            action = "Fail over to the backup payment provider"
            description = "The payment provider is timing out, so rolling back our code would not help. Route charges to the secondary processor until it recovers."
            risk = "MEDIUM"
        else:
            action = f"Roll back to the previous deployment (revert PR #{pr})"
            description = f"Reverts commit {culprit.get('hash')} to restore the last version that worked."
            risk = "LOW"
        self.note(logs, f"Safe mitigation generated: {action}.")
        return {
            "summary": f"Recommendation: {action} ({risk} risk). Awaiting approval.",
            "findings": {
                "action": action,
                "description": description,
                "target_pr": pr,
                "risk_level": risk,
                "requires_human_approval": True,
            },
        }
