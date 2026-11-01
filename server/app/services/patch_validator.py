import ast
import re
import textwrap
from typing import List
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


def rank_and_select_winner(patches: List[CandidatePatch], language: str = "javascript") -> List[CandidatePatch]:
    """Runs validation gates on candidate patches and designates the highest scoring winner."""
    validate = validate_python_syntax if language == "python" else validate_javascript_syntax
    for patch in patches:
        patch.validation.astSyntaxValid = validate(patch.code)
        patch.validation.score = score_patch(patch)

    # Sort descending by score
    sorted_patches = sorted(patches, key=lambda p: (p.validation.score, p.confidence), reverse=True)
    if sorted_patches:
        sorted_patches[0].isWinner = True
        for p in sorted_patches[1:]:
            p.isWinner = False

    return patches
