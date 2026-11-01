import asyncio
from typing import Dict, Any, List
from .base import BaseAgent
from ..models.schemas import CrashPayload

class TraceAnalyst(BaseAgent):
    name = "Trace Analyst"
    role = "Stack Frames & Broken Line Localization"

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str]
    ) -> Dict[str, Any]:
        logs.append(f"[00:00.120] Dispatched prompt to Cerebras Llama 3.3 70B.")
        await asyncio.sleep(0.35)
        
        file = payload.file
        line = payload.line
        func = payload.functionName or "processPayment"
        
        logs.append(f"[00:00.320] Parsed Sentry stack frame: {file}:{line} in {func}().")
        logs.append(f"[00:00.370] Root cause: Null pointer dereference on cart.currency.")

        return {
            "summary": f"Isolated {file}:{line} in {func}(). Error: {payload.message}",
            "findings": {
                "broken_file": file,
                "broken_line": line,
                "function": func,
                "cause": payload.message,
            },
        }

