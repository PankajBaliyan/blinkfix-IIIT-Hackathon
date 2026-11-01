import asyncio
import re
from typing import Dict, Any, List, Optional
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.diagnosis import is_external_failure
from ..services.evidence import Evidence

DIAGNOSES = {"LOCAL_CODE_BUG", "EXTERNAL_OUTAGE"}
_HOST = re.compile(r"\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b", re.I)


def _host_in(text: str) -> Optional[str]:
    """A hostname mentioned in an error, such as api.stripe.com."""
    match = _HOST.search(text or "")
    return match.group(1) if match else None


class InfraChecker(BaseAgent):
    key = "infra_checker"
    name = "Infra Checker"
    role = "Tells a bug in our code apart from an outside service failing"
    task = (
        "Decide whether this crash is a bug in our own code (LOCAL_CODE_BUG) or caused by an outside "
        "service such as a payment provider, cache or database being unavailable (EXTERNAL_OUTAGE). "
        "Base this only on the evidence: the error text, the stack trace and the source.\n"
        'Return JSON: {"diagnosis": "LOCAL_CODE_BUG" or "EXTERNAL_OUTAGE", "summary": string, '
        '"suspect_dependency": string or null}\n'
        "summary: one sentence with the evidence for your decision. "
        "suspect_dependency: the outside service or host, or null for a bug in our own code."
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
            suspect = (text_field(answer, "suspect_dependency", 80) or _host_in(payload.message)) if external else None
            self.note(logs, f"Categorized incident as {diagnosis}.")
        else:
            # Built-in analysis: look for the signs of a failing outside service in the error text
            await asyncio.sleep(0.2)
            external = is_external_failure(payload)
            diagnosis = "EXTERNAL_OUTAGE" if external else "LOCAL_CODE_BUG"
            suspect = _host_in(payload.message) if external else None
            summary = (
                f"The error looks like an outside service failing ({suspect or 'unknown service'})."
                if external
                else "The error does not point to an outside service, so it looks like a bug in our own code."
            )
            self.note(logs, f"Categorized incident as {diagnosis}.")

        return {
            "summary": summary,
            "findings": {
                "diagnosis": diagnosis,
                "is_external": external,
                "suspect_dependency": suspect,
                # Read from the repository's requirements.txt, so these are real.
                "dependencies": context.get("dependencies", {}),
            },
        }
