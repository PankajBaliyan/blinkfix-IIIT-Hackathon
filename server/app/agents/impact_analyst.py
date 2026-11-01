import asyncio
from typing import Dict, Any, List
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.diagnosis import impact_profile
from ..services.evidence import Evidence

SEVERITIES = {"P0": "P0 - CRITICAL", "P1": "P1 - HIGH", "P2": "P2 - MEDIUM"}
RISKS = {"LOW", "MEDIUM", "HIGH"}


class ImpactAnalyst(BaseAgent):
    key = "impact_analyst"
    name = "Impact Analyst"
    role = "Judges how serious the crash is and what it affects"
    task = (
        "Judge the impact of this crash on users, from the failing request and the error. "
        "The <traffic> line, when present, gives real request counts: use it. "
        "Do not invent any other numbers.\n"
        'Return JSON: {"scope": string, "severity": "P0" or "P1" or "P2", '
        '"regression_risk": "LOW" or "MEDIUM" or "HIGH", "summary": string}\n'
        "scope: the part of the product that breaks, in a few words. "
        "P0 = money or core flow fully broken, P1 = important feature degraded, P2 = minor or rare."
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        profile = impact_profile(payload, context.get("traffic"))
        answer = await self.ask(evidence, logs)

        severity = SEVERITIES.get(str(answer.get("severity", "")).strip()[:2].upper()) if answer else None
        scope = text_field(answer, "scope", 120) if answer else None
        if severity and scope:
            self.accept_model_answer()
            risk = str(answer.get("regression_risk", "")).upper()
            risk = risk if risk in RISKS else "MEDIUM"
            summary = text_field(answer, "summary") or f"{scope}. Severity: {severity}."
            self.note(logs, f"Assigned severity: {severity}.")
            return {
                "summary": summary,
                "findings": {
                    "scope": scope,
                    "recent_failures": profile["recent_failures"],
                    "traffic": profile["traffic"],
                    "severity": severity,
                    "affected_routes": profile["affected_routes"],
                    "regression_risk": risk,
                },
            }

        # Built-in analysis: only what can be measured, with a default severity
        await asyncio.sleep(0.2)
        self.note(logs, f"{profile['recent_failures']}.")
        self.note(logs, f"Default severity {profile['severity']} (no model answer to judge it).")
        return {
            "summary": f"{profile['recent_failures']}. Severity: {profile['severity']}.",
            "findings": {
                "scope": profile["scope"],
                "recent_failures": profile["recent_failures"],
                "traffic": profile["traffic"],
                "severity": profile["severity"],
                "affected_routes": profile["affected_routes"],
                "regression_risk": "MEDIUM",
            },
        }
