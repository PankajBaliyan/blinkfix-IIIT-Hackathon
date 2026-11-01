import asyncio
from typing import Dict, Any, List
from .base import BaseAgent
from ..models.schemas import CrashPayload
from ..services.diagnosis import impact_profile

class ImpactAnalyst(BaseAgent):
    name = "Impact Analyst"
    role = "Blast Radius & Regression Risk Scoring"

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str]
    ) -> Dict[str, Any]:
        logs.append("[00:00.120] Mapping topology dependency graph & route impact.")
        await asyncio.sleep(0.42)

        profile = impact_profile(payload)
        scope = profile["scope"]
        traffic = profile["impact_percentage"]
        severity = profile["severity"]

        logs.append(f"[00:00.380] Blast radius scoped to {scope} ({traffic}).")
        logs.append(f"[00:00.430] Assigned severity: {severity}.")

        return {
            "summary": f"Blast radius: {scope} ({traffic}). Severity: {severity}.",
            "findings": {
                "scope": scope,
                "impact_percentage": traffic,
                "severity": severity,
                "affected_routes": profile["affected_routes"],
                "regression_risk": "HIGH",
            },
        }
