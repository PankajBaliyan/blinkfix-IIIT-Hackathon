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
        "Do not invent traffic numbers.\n"
        'Return JSON: {"scope": string, "severity": "P0" or "P1" or "P2", '
        '"regression_risk": "LOW" or "MEDIUM" or "HIGH", "summary": string}\n'
        "scope: the part of the product that breaks, in a few words. "
        "P0 = money or core flow fully broken, P1 = important feature degraded, P2 = minor or rare."
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        profile = impact_profile(payload)
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
                    # Traffic share is an estimate from a fixed table until real metrics are connected.
                    "impact_percentage": profile["impact_percentage"],
                    "severity": severity,
                    "affected_routes": profile["affected_routes"],
                    "regression_risk": risk,
                },
            }

        # Built-in demo analysis
        await asyncio.sleep(0.42)
        self.note(logs, f"Blast radius scoped to {profile['scope']} ({profile['impact_percentage']}).")
        self.note(logs, f"Assigned severity: {profile['severity']}.")
        return {
            "summary": f"Blast radius: {profile['scope']} ({profile['impact_percentage']}). Severity: {profile['severity']}.",
            "findings": {
                "scope": profile["scope"],
                "impact_percentage": profile["impact_percentage"],
                "severity": profile["severity"],
                "affected_routes": profile["affected_routes"],
                "regression_risk": "HIGH",
            },
        }
