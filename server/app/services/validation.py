"""Checks candidate fixes by running them, instead of trusting what the model says about them."""
import ast
import asyncio
import logging
from dataclasses import dataclass, asdict
from typing import List, Optional

from ..config import BASE_DIR
from ..models.schemas import CandidatePatch, CrashPayload
from .code_source import SourceFile
from .sandbox import has_tests, run_in_sandbox, unsafe_reason
from .source_reader import replace_lines

logger = logging.getLogger("blinkfix.validation")

CONCURRENCY = 4


@dataclass
class ValidationOutcome:
    """What the original, unfixed code does in the sandbox. Every fix is judged against it."""
    reproduced: bool
    baseline_exception: Optional[str]
    baseline_tests_run: int
    baseline_test_failures: int
    note: str

    def as_dict(self) -> dict:
        return asdict(self)


def can_validate(payload: CrashPayload) -> bool:
    return (
        payload.file.endswith(".py")
        and bool(payload.route)
        and (BASE_DIR / payload.file).is_file()
    )


async def validate_candidates(
    payload: CrashPayload, source: SourceFile, patches: List[CandidatePatch]
) -> Optional[ValidationOutcome]:
    """Runs the original code and every fix in sandbox copies of the service, and records the results on each patch.

    Returns None when the service cannot be run here, so the caller falls back to syntax-only checks.
    """
    if not can_validate(payload):
        return None

    # 1. The original code: does the crash reproduce, and do the tests pass?
    base = await run_in_sandbox(payload, source.text)
    exception = (base.replay or {}).get("exception") if base.replay else None
    reproduced = bool(base.imported and exception and exception.get("type") == payload.exceptionType)
    tests = base.tests or {}
    if reproduced:
        note = f"Replayed {payload.method} {payload.route} on the original code and got the same {exception['type']}."
    elif base.error:
        note = f"The sandbox could not run the original code ({base.error})."
    elif exception:
        note = f"Replaying the request gave {exception['type']}, not {payload.exceptionType}."
    else:
        note = "The original code did not crash when the request was replayed, so fixes cannot be proven against it."
    outcome = ValidationOutcome(
        reproduced=reproduced,
        baseline_exception=f"{exception['type']}: {exception['message']}" if exception else None,
        baseline_tests_run=tests.get("run", 0),
        baseline_test_failures=tests.get("failures", 0),
        note=note,
    )

    # 2. Each fix, a few at a time
    gate = asyncio.Semaphore(CONCURRENCY)

    async def check(patch: CandidatePatch) -> None:
        v = patch.validation
        start = patch.startLine or source.line
        end = patch.endLine or start
        patched = replace_lines(source.text, start, end, patch.code)
        try:
            ast.parse(patched)
        except SyntaxError as e:
            v.astSyntaxValid, v.replay, v.replayDetail = False, "not_run", f"Not run: the file no longer parses ({e.msg})."
            return
        v.astSyntaxValid = True

        reason = unsafe_reason(patch.code)
        if reason:
            v.replay, v.replayDetail = "blocked", f"Not run: {reason}, which a fix should not need."
            return

        async with gate:
            run = await run_in_sandbox(payload, patched)

        if run.error:
            v.replay, v.replayDetail = "not_run", f"The sandbox failed: {run.error}"
            return
        v.importOk = run.imported
        if not run.imported:
            v.replay, v.replayDetail = "not_run", f"The service no longer starts: {run.import_error}"
            return

        if run.tests and run.tests.get("run"):
            v.testsRun = run.tests["run"]
            v.testsFailed = run.tests["failures"]
            v.unitTestsPassed = f"{v.testsRun - v.testsFailed}/{v.testsRun} passing"
            v.testsDetail = run.tests.get("first_failure", "")

        crash = (run.replay or {}).get("exception")
        if not outcome.reproduced:
            v.replay, v.replayDetail = "not_reproduced", "The crash could not be reproduced here, so this fix could not be proven."
        elif crash is None:
            v.replay = "fixed"
            v.replayDetail = f"Replayed {payload.method} {payload.route}: no crash (status {(run.replay or {}).get('status')})."
        else:
            v.replay, v.replayDetail = "still_fails", f"Still crashes: {crash['type']}: {crash['message']}"

    await asyncio.gather(*(check(p) for p in patches))
    logger.info("Validated %d fixes (crash reproduced: %s)", len(patches), reproduced)
    return outcome
