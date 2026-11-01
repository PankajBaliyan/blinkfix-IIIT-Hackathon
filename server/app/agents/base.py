import time
from typing import Dict, Any, List
from ..models.schemas import AgentResult, CrashPayload
from ..services.cerebras_service import cerebras_client

class BaseAgent:
    name: str = "BaseAgent"
    role: str = "Generic Investigation"

    async def execute(self, payload: CrashPayload, context: Dict[str, Any]) -> AgentResult:
        start = time.perf_counter()
        logs: List[str] = [f"[00:00.000] Ingested crash payload for {payload.service}."]
        
        # Subclass implementation
        result_data = await self.run_agent_logic(payload, context, logs)
        
        duration_ms = int((time.perf_counter() - start) * 1000)
        logs.append(f"[{duration_ms/1000:06.3f}s] {self.name} completed analysis.")
        
        return AgentResult(
            agent_name=self.name,
            status="COMPLETED",
            duration_ms=duration_ms,
            summary=result_data.get("summary", ""),
            logs=logs,
            findings=result_data.get("findings", {}),
        )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str]
    ) -> Dict[str, Any]:
        raise NotImplementedError

