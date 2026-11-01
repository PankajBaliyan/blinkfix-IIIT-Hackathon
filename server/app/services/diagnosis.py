from typing import Any, Dict
from ..models.schemas import CrashPayload


def is_external_failure(payload: CrashPayload) -> bool:
    """True when the crash comes from an outside service rather than our own code."""
    text = f"{payload.exceptionType} {payload.message}"
    return any(word in text for word in ("ConnectionError", "Timeout", "timed out"))


def commit_label(commit: Dict[str, Any]) -> str:
    """'PR #12' when the commit came from a pull request, otherwise 'commit abc1234'."""
    return f"PR #{commit['prNumber']}" if commit.get("prNumber") else f"commit {commit.get('hash', 'unknown')}"


def find_culprit_commit(context: Dict[str, Any], file: str = "") -> Dict[str, Any]:
    """The commit that last changed the failing line (git blame), else the newest commit on the file."""
    if context.get("blame"):
        return context["blame"]
    commits = context.get("recentCommits", [])
    if commits:
        return commits[0]
    return {
        "hash": "unknown",
        "author": "unknown",
        "message": "No commit history available (GitHub is not connected or could not be reached)",
        "prNumber": None,
    }


# How much of the product each route carries. Stand-in for real traffic metrics.
_IMPACT_BY_ROUTE = {
    "/api/demo/checkout": ("Checkout", "14.2% of live traffic", "P0 - CRITICAL"),
    "/api/demo/payments/charge": ("Card payments", "100% of charge attempts", "P1 - HIGH"),
    "/api/demo/orders": ("Order summaries", "3.1% of live traffic", "P2 - MEDIUM"),
}


def impact_profile(payload: CrashPayload) -> Dict[str, Any]:
    route = payload.route or ""
    scope, traffic, severity = ("The failing endpoint", "Unknown share of traffic", "P1 - HIGH")
    for prefix, profile in _IMPACT_BY_ROUTE.items():
        if route.startswith(prefix):
            scope, traffic, severity = profile
            break
    return {
        "scope": scope,
        "impact_percentage": traffic,
        "severity": severity,
        "affected_routes": [f"{payload.method or 'GET'} {route}"] if route else [],
    }
