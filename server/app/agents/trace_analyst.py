import asyncio
from typing import Dict, Any, List
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.evidence import Evidence


class TraceAnalyst(BaseAgent):
    key = "trace_analyst"
    name = "Trace Analyst"
    role = "Finds the exact line and the reason it fails"
    task = (
        "Explain why the line marked >> in <source> fails, using the stack trace and the source.\n"
        'Return JSON: {"root_cause": string, "explanation": string}\n'
        "root_cause: one sentence naming the value or condition that breaks. "
        "explanation: one or two sentences on how the code reaches that state."
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        func = payload.functionName or "unknown"
        answer = await self.ask(evidence, logs)
        root_cause = text_field(answer, "root_cause") if answer else None
        if root_cause:
            self.accept_model_answer()
            explanation = text_field(answer, "explanation") or ""
            self.note(logs, f"Root cause: {root_cause}")
            return {
                "summary": f"Isolated {payload.file}:{payload.line} in {func}(). {root_cause}",
                "findings": {
                    "broken_file": payload.file,
                    "broken_line": payload.line,
                    "function": func,
                    "cause": root_cause,
                    "explanation": explanation,
                },
            }

        # Built-in demo analysis
        await asyncio.sleep(0.35)
        self.note(logs, f"Parsed stack frame: {payload.file}:{payload.line} in {func}().")
        self.note(logs, f"Root cause: {payload.message}")
        return {
            "summary": f"Isolated {payload.file}:{payload.line} in {func}(). Error: {payload.message}",
            "findings": {
                "broken_file": payload.file,
                "broken_line": payload.line,
                "function": func,
                "cause": payload.message,
            },
        }
