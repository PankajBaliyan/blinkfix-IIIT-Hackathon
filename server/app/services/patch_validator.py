import ast
import re
import textwrap
from typing import Callable, List, Optional
from ..models.schemas import CandidatePatch


def validate_javascript_syntax(code: str) -> bool:
    """Basic structural syntax validation for candidate JavaScript patches."""
    # Check brace and parenthesis parity
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for char in code:
        if char in pairs.values():
            stack.append(char)
        elif char in pairs.keys():
            if not stack or stack.pop() != pairs[char]:
                return False
    return len(stack) == 0


def validate_python_syntax(code: str) -> bool:
    """A Python patch is valid if it parses on its own."""
    try:
        ast.parse(textwrap.dedent(code))
        return True
    except SyntaxError:
        return False


def score_patch(patch: CandidatePatch) -> int:
    """Calculates objective validation score (0-100)."""
    score = 70
    if patch.validation.astSyntaxValid:
        score += 15
    # Reported tests look like "2/3 passing"; award points in proportion to how many pass.
    match = re.match(r"\s*(\d+)\s*/\s*(\d+)", patch.validation.unitTestsPassed)
    if match and int(match.group(2)) > 0:
        score += round(10 * int(match.group(1)) / int(match.group(2)))
    if patch.confidence > 0.9:
        score += 5
    return min(score, 99)


def rank_and_select_winner(
    patches: List[CandidatePatch],
    language: str = "javascript",
    syntax_check: Optional[Callable[[CandidatePatch], bool]] = None,
) -> List[CandidatePatch]:
    """Runs validation gates on candidate patches and designates the highest scoring winner.

    `syntax_check` can check a patch in the context of the whole file. Without it only the snippet is checked.
    """
    validate = validate_python_syntax if language == "python" else validate_javascript_syntax
    for patch in patches:
        patch.validation.astSyntaxValid = syntax_check(patch) if syntax_check else validate(patch.code)
        patch.validation.score = score_patch(patch)

    # Sort descending by score
    sorted_patches = sorted(patches, key=lambda p: (p.validation.score, p.confidence), reverse=True)
    if sorted_patches:
        sorted_patches[0].isWinner = True
        for p in sorted_patches[1:]:
            p.isWinner = False

    return patches


def score_validated(patch: CandidatePatch, baseline_test_failures: int = 0) -> int:
    """0-100 from what running the fix showed. The model's own confidence is only a small tie-breaker."""
    v = patch.validation
    if not v.astSyntaxValid or not v.importOk:
        return 0
    score = 20 + 10                                  # the file parses, and the service still starts
    if v.replay == "fixed":
        score += 35                                  # the original crash no longer happens
    if v.testsRun:
        score += round(25 * (v.testsRun - v.testsFailed) / v.testsRun)
    changed = [l for l in patch.code.splitlines() if l.strip()]
    if len(changed) <= 3:
        score += 5                                   # a small change is easier to review
    score += round(5 * max(0.0, min(1.0, patch.confidence)))
    if v.replay in ("still_fails", "blocked") or v.testsFailed > baseline_test_failures:
        score = min(score, 25)                       # disqualified, but keep a score to show why
    return min(score, 100)


def is_eligible(patch: CandidatePatch, baseline_test_failures: int = 0) -> bool:
    """A fix may only win if it parses, starts, does not still crash, and breaks no test."""
    v = patch.validation
    return (
        v.astSyntaxValid
        and v.importOk
        and v.replay not in ("still_fails", "blocked")
        and v.testsFailed <= baseline_test_failures
    )


def rank_validated(patches: List[CandidatePatch], baseline_test_failures: int = 0) -> List[CandidatePatch]:
    """Scores sandbox-checked fixes and picks the winner. There may be none."""
    for patch in patches:
        v = patch.validation
        v.verified = (
            v.astSyntaxValid and v.importOk and v.replay == "fixed" and v.testsRun > 0
            and v.testsFailed <= baseline_test_failures
        )
        v.score = score_validated(patch, baseline_test_failures)
        patch.isWinner = False
    eligible = [p for p in patches if is_eligible(p, baseline_test_failures)]
    if eligible:
        max(eligible, key=lambda p: (p.validation.verified, p.validation.score, p.confidence)).isWinner = True
    return patches
