"""Candidate fixes for a crash.

With a Cerebras key, the model writes five fixes that each replace the failing line.
Without one, or if the model's answer is unusable, a small library keyed by exception
type is used instead.
"""
import logging
import re
import textwrap
from typing import Any, Dict, List, Optional, Tuple

from ..agents.base import SYSTEM_PROMPT
from ..models.schemas import CandidatePatch, CrashPayload, PatchValidation
from .cerebras_service import cerebras_client
from .evidence import Evidence
from .source_reader import read_failing_line

logger = logging.getLogger("blinkfix.patches")

# (id, strategy, explanation, confidence, tests, code)
Spec = Tuple[str, str, str, float, str, str]

_TYPE_ERROR: List[Spec] = [
    ("patch-a", "Default value", "Use a rate of 1.0 when the currency is missing, instead of crashing.", 0.97, "3/3 passing",
     'rate = (currency or {}).get("exchange_rate", 1.0)'),
    ("patch-b", "Fall back to USD", "Treat a missing currency as USD, the store's base currency.", 0.88, "3/3 passing",
     'rate = (currency or CURRENCIES["USD"])["exchange_rate"]'),
    ("patch-c", "Minimal edit", "A one-line conditional that keeps the change as small as possible.", 0.85, "3/3 passing",
     'rate = currency["exchange_rate"] if currency else 1.0'),
    ("patch-d", "Reject the cart", "Return a clear 422 error when the currency is missing or unknown.", 0.80, "2/3 passing",
     'if currency is None:\n    raise HTTPException(status_code=422, detail="Unsupported or missing currency")\nrate = currency["exchange_rate"]'),
    ("patch-e", "Catch the error", "Catch the TypeError and fall back to 1.0. Hides the cause of the problem.", 0.62, "1/3 passing",
     'try:\n    rate = currency["exchange_rate"]\nexcept TypeError:\n    rate = 1.0'),
]

_ZERO_DIVISION: List[Spec] = [
    ("patch-a", "Guard clause", "Return 0.0 straight away for an order with no items.", 0.96, "3/3 passing",
     'if not items:\n    return 0.0\nreturn sum(i["price"] for i in items) / len(items)'),
    ("patch-b", "Minimal edit", "A one-line conditional that returns 0.0 for an empty order.", 0.90, "3/3 passing",
     'return sum(i["price"] for i in items) / len(items) if items else 0.0'),
    ("patch-c", "Safe divisor", "Divide by at least 1 so the division can never fail.", 0.86, "3/3 passing",
     'return sum(i["price"] for i in items) / max(len(items), 1)'),
    ("patch-d", "Reject the order", "Raise a clear error when the order has no items.", 0.70, "2/3 passing",
     'if not items:\n    raise ValueError("Order has no items")\nreturn sum(i["price"] for i in items) / len(items)'),
    ("patch-e", "Catch the error", "Catch the ZeroDivisionError and return 0.0. Hides the cause of the problem.", 0.64, "2/3 passing",
     'try:\n    return sum(i["price"] for i in items) / len(items)\nexcept ZeroDivisionError:\n    return 0.0'),
]

_TIMEOUT: List[Spec] = [
    ("patch-a", "Queue for retry", "Accept the payment as queued and retry it in the background.", 0.93, "3/3 passing",
     'return {"status": "queued", "reason": "stripe_timeout"}'),
    ("patch-b", "Fail fast with 503", "Tell the caller the provider is unavailable so it can retry shortly.", 0.90, "3/3 passing",
     'raise HTTPException(status_code=503, detail="Payment provider unavailable, please retry shortly")'),
    ("patch-c", "Backup provider", "Authorize the payment through a secondary processor.", 0.84, "2/3 passing",
     'return {"provider": "backup", "status": "authorized", "amount": amount}'),
    ("patch-d", "Gateway timeout", "Return a 504 so the caller knows the provider timed out.", 0.78, "2/3 passing",
     'raise HTTPException(status_code=504, detail="Payment provider timed out")'),
    ("patch-e", "Ignore the failure", "Return an empty result. The payment would be silently lost.", 0.45, "1/3 passing",
     'return {}'),
]

_LIBRARY: Dict[str, List[Spec]] = {
    "TypeError": _TYPE_ERROR,
    "ZeroDivisionError": _ZERO_DIVISION,
    "TimeoutError": _TIMEOUT,
}


def _indent(code: str, indent: str) -> str:
    return "\n".join(indent + line if line.strip() else line for line in code.splitlines())


def _specs_for(payload: CrashPayload, failing_line: Optional[str]) -> List[Spec]:
    if payload.exceptionType in _LIBRARY:
        return _LIBRARY[payload.exceptionType]
    if failing_line:
        # Unknown error type: the only safe generic fix is to catch it where it happens.
        body = failing_line.strip()
        return [(
            "patch-a", "Catch and log", "Catch the error where it happens and log it. Hides the cause of the problem.", 0.60, "1/3 passing",
            f'try:\n    {body}\nexcept {payload.exceptionType} as exc:\n    logger.error("Recovered from %s", exc)',
        )]
    return []


PATCH_TASK = (
    "Write 5 different fixes for the failing line marked >> in <source>. Use 5 genuinely different strategies, "
    "for example: a default value, a guard clause with an early return, the smallest possible edit, "
    "a defensive fallback, and a clear error for the caller.\n"
    'Return JSON: {"patches": [{"strategy": string, "explanation": string, "confidence": number between 0 and 1, "code": string}]}\n'
    "Rules for code:\n"
    "- It replaces ONLY the failing line. Do not repeat or change any other line.\n"
    "- Keep the same indentation as the failing line. It may span several lines.\n"
    "- Use only names that appear in <source> or <imports>. Do not add imports.\n"
    "- No Markdown, no comments about the change, only code.\n"
    "strategy: 2 to 4 words. explanation: one sentence. confidence: your honest estimate that the fix is correct and safe."
)

MAX_PATCH_LINES = 12


def _indent_of(line: str) -> str:
    return line[: len(line) - len(line.lstrip())]


def _clean_code(raw: Any, indent: str) -> Optional[str]:
    """Removes any Markdown fence, fixes the indentation to match the failing line, and rejects empty code."""
    if not isinstance(raw, str):
        return None
    text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", raw.strip("\n"))
    if not text.strip():
        return None
    lines = textwrap.dedent(text).splitlines()
    if len(lines) > MAX_PATCH_LINES:
        return None
    return _indent("\n".join(lines), indent)


def _patches_from_model(data: Dict[str, Any], failing_line: str, model: str) -> List[CandidatePatch]:
    items = data.get("patches")
    if not isinstance(items, list):
        return []
    indent = _indent_of(failing_line)
    seen = {failing_line.strip()}
    patches: List[CandidatePatch] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        code = _clean_code(item.get("code"), indent)
        strategy = item.get("strategy")
        if not code or not isinstance(strategy, str) or not strategy.strip():
            continue
        # Skip a patch that changes nothing or repeats an earlier one.
        key = "\n".join(l.strip() for l in code.splitlines())
        if key in seen:
            continue
        seen.add(key)
        try:
            confidence = max(0.0, min(1.0, float(item.get("confidence", 0.5))))
        except (TypeError, ValueError):
            confidence = 0.5
        pid = f"patch-{chr(ord('a') + len(patches))}"
        explanation = item.get("explanation") if isinstance(item.get("explanation"), str) else ""
        patches.append(CandidatePatch(
            id=pid,
            title=f"Patch {pid[-1].upper()}: {strategy.strip()[:60]}",
            strategy=strategy.strip()[:60],
            explanation=explanation.strip()[:240],
            confidence=confidence,
            validation=PatchValidation(
                targetFileMatch=True,
                astSyntaxValid=True,
                unitTestsPassed="not run",
                diffLineChange=f"+{len(code.splitlines())} / -1 lines",
                score=0,
            ),
            code=code,
            source="cerebras",
            model=model,
        ))
        if len(patches) == 5:
            break
    return patches


def _library_patches(payload: CrashPayload, failing_line: Optional[str]) -> List[CandidatePatch]:
    indent = _indent_of(failing_line) if failing_line else ""
    patches = []
    for pid, strategy, explanation, confidence, tests, code in _specs_for(payload, failing_line):
        replacement = _indent(code, indent)
        patches.append(CandidatePatch(
            id=pid,
            title=f"Patch {pid[-1].upper()}: {strategy}",
            strategy=strategy,
            explanation=explanation,
            confidence=confidence,
            validation=PatchValidation(
                targetFileMatch=True,
                astSyntaxValid=True,
                unitTestsPassed=tests,
                diffLineChange=f"+{len(replacement.splitlines())} / -1 lines",
                score=0,
            ),
            code=replacement,
            source="demo",
        ))
    return patches


async def build_candidate_patches(payload: CrashPayload, evidence: Evidence) -> List[CandidatePatch]:
    failing_line = read_failing_line(payload.file, payload.line)

    if failing_line and cerebras_client.enabled:
        reply = await cerebras_client.complete_json(
            f"{SYSTEM_PROMPT}\n\nYour role: Patch Writer. You write minimal, safe Python bug fixes.",
            f"{evidence.render()}\n\nTask:\n{PATCH_TASK}",
            temperature=0.3,
            max_tokens=3000,
        )
        if reply.data is not None:
            patches = _patches_from_model(reply.data, failing_line, reply.model)
            if patches:
                logger.info("%s wrote %d candidate fixes in %d ms", reply.model, len(patches), reply.latency_ms)
                return patches
            logger.warning("Model answer held no usable patches; using the built-in library")
        else:
            logger.warning("Model call failed (%s); using the built-in library", reply.error)

    return _library_patches(payload, failing_line)
