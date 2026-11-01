import asyncio
from typing import Dict, Any, List, Optional
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.diagnosis import is_external_failure
from ..services.evidence import Evidence

DIAGNOSES = {"LOCAL_CODE_BUG", "EXTERNAL_OUTAGE"}
DEPENDENCIES = ["Stripe API Gateway", "Redis Session Store", "PostgreSQL Primary"]


def _services(down: Optional[str]) -> List[Dict[str, Any]]:
    """Dependency table. The values are placeholders until real health probes exist."""
    healthy = {"Stripe API Gateway": 38, "Redis Session Store": 2, "PostgreSQL Primary": 12}
    return [
        {"service": s, "status": "DOWN", "latencyMs": 5000}
        if s == down
        else {"service": s, "status": "HEALTHY", "latencyMs": healthy[s]}
        for s in DEPENDENCIES
    ]


def _match_dependency(name: Optional[str]) -> str:
    """Maps the model's free-text suspect to one of the dependencies we list."""
    lowered = (name or "").lower()
    for dep in DEPENDENCIES:
        if dep.split()[0].lower() in lowered:
            return dep
    return DEPENDENCIES[0]


class InfraChecker(BaseAgent):
    key = "infra_checker"
    name = "Infra Checker"
    role = "Tells a bug in our code apart from an outside service failing"
    task = (
        "Decide whether this crash is a bug in our own code (LOCAL_CODE_BUG) or caused by an outside "
        "service such as a payment provider, cache or database being unavailable (EXTERNAL_OUTAGE).\n"
        'Return JSON: {"diagnosis": "LOCAL_CODE_BUG" or "EXTERNAL_OUTAGE", "summary": string, '
        '"suspect_dependency": string or null}\n'
        "summary: one sentence with the evidence for your decision."
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        answer = await self.ask(evidence, logs)
        diagnosis = answer.get("diagnosis") if answer else None
        summary = text_field(answer, "summary") if answer else None

        if diagnosis in DIAGNOSES and summary:
            self.accept_model_answer()
            external = diagnosis == "EXTERNAL_OUTAGE"
            suspect = _match_dependency(answer.get("suspect_dependency")) if external else None
            self.note(logs, f"Categorized incident as {diagnosis}.")
            return {
                "summary": summary,
                "findings": {
                    "diagnosis": diagnosis,
                    "is_external": external,
                    "suspect_dependency": suspect,
                    "services": _services(suspect),
                    "services_simulated": True,
                    "dependencies": context.get("dependencies", {}),
                },
            }

        # Built-in demo analysis
        await asyncio.sleep(0.28)
        external = is_external_failure(payload)
        diagnosis = "EXTERNAL_OUTAGE" if external else "LOCAL_CODE_BUG"
        if external:
            summary = "Stripe API Gateway timed out. Upstream 3rd-party outage detected."
        else:
            summary = "All upstream APIs healthy (Stripe, Redis, DB). Confirmed local code bug."
        self.note(logs, f"Categorized incident as {diagnosis}.")
        return {
            "summary": summary,
            "findings": {
                "diagnosis": diagnosis,
                "is_external": external,
                "services": _services(DEPENDENCIES[0] if external else None),
                "services_simulated": True,
                "dependencies": context.get("dependencies", {}),
            },
        }
