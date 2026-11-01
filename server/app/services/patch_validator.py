from typing import List, Dict, Any
from ..models.schemas import CandidatePatch, PatchValidation

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

def score_patch(patch: CandidatePatch) -> int:
    """Calculates objective validation score (0-100)."""
    score = 70
    if patch.validation.astSyntaxValid:
        score += 15
    if "3/3" in patch.validation.unitTestsPassed or "passing" in patch.validation.unitTestsPassed:
        score += 10
    if patch.confidence > 0.9:
        score += 5
    return min(score, 99)

def rank_and_select_winner(patches: List[CandidatePatch]) -> List[CandidatePatch]:
    """Runs validation gates on candidate patches and designates the highest scoring winner."""
    for patch in patches:
        is_syntax_valid = validate_javascript_syntax(patch.code)
        patch.validation.astSyntaxValid = is_syntax_valid
        patch.validation.score = score_patch(patch)

    # Sort descending by score
    sorted_patches = sorted(patches, key=lambda p: (p.validation.score, p.confidence), reverse=True)
    if sorted_patches:
        sorted_patches[0].isWinner = True
        for p in sorted_patches[1:]:
            p.isWinner = False

    return patches

