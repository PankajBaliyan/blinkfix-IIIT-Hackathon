"""Candidate fixes for a crash.

Demo mode: fixes come from a small library keyed by exception type. Each one
replaces the failing line. When a Cerebras key is configured these are meant to
be produced by the model instead.
"""
from typing import Dict, List, Optional, Tuple

from ..models.schemas import CandidatePatch, CrashPayload, PatchValidation
from .source_reader import read_failing_line

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


def build_candidate_patches(payload: CrashPayload) -> List[CandidatePatch]:
    failing_line = read_failing_line(payload.file, payload.line)
    indent = ""
    if failing_line:
        indent = failing_line[: len(failing_line) - len(failing_line.lstrip())]

    patches = []
    for pid, strategy, explanation, confidence, tests, code in _specs_for(payload, failing_line):
        replacement = _indent(code, indent)
        added = len(replacement.splitlines())
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
                diffLineChange=f"+{added} / -1 lines",
                score=0,
            ),
            code=replacement,
        ))
    return patches
