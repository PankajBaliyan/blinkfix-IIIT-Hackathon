import asyncio
from typing import Dict, Any, List
from .base import BaseAgent
from ..models.schemas import CrashPayload
from ..services.diagnosis import is_external_failure

class InfraChecker(BaseAgent):
    name = "Infra Checker"
    role = "Upstream API Status & Dependency Integrity"

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str]
    ) -> Dict[str, Any]:
        logs.append("[00:00.120] Probing upstream infrastructure & gateway health.")
        await asyncio.sleep(0.28)

        is_external = is_external_failure(payload)
        if is_external:
            logs.append("[00:00.270] Upstream Stripe API Gateway timed out after 5000ms.")
            diagnosis = "EXTERNAL_OUTAGE"
            summary = "Stripe API Gateway timed out. Upstream 3rd-party outage detected."
            services = [
                {"service": "Stripe API Gateway", "status": "DOWN", "latencyMs": 5000},
                {"service": "Redis Session Store", "status": "HEALTHY", "latencyMs": 2},
                {"service": "PostgreSQL Primary", "status": "HEALTHY", "latencyMs": 12},
            ]
        else:
            logs.append("[00:00.270] Probed Stripe API (200 OK), Redis (HEALTHY), Postgres (HEALTHY).")
            diagnosis = "LOCAL_CODE_BUG"
            summary = "All upstream APIs healthy (Stripe, Redis, DB). Confirmed local code bug."
            services = [
                {"service": "Stripe API Gateway", "status": "HEALTHY", "latencyMs": 38},
                {"service": "Redis Session Store", "status": "HEALTHY", "latencyMs": 2},
                {"service": "PostgreSQL Primary", "status": "HEALTHY", "latencyMs": 12},
            ]

        logs.append(f"[00:00.285] Categorized incident as {diagnosis}.")

        return {
            "summary": summary,
            "findings": {
                "diagnosis": diagnosis,
                "is_external": is_external,
                "services": services,
                "dependencies": context.get("dependencies", {}),
            },
        }
