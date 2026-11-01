from typing import Any, Dict, Optional
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


def describe_traffic(traffic: Optional[Dict[str, Any]], method: str, route: str) -> str:
    """One plain sentence from the real request counts."""
    if not traffic or not traffic.get("total"):
        return "No request data for this route in the recent window"
    return f"{traffic['failed']} of {traffic['total']} recent requests to {method} {route} failed (last {traffic['window_minutes']} minutes)"


def impact_profile(payload: CrashPayload, traffic: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Facts about the crash's reach. Only what can be measured: the route and the real request counts."""
    method = payload.method or "GET"
    route = payload.route or ""
    return {
        "scope": f"{method} {route}".strip() or "The failing endpoint",
        "recent_failures": describe_traffic(traffic, method, route),
        "traffic": traffic,
        "severity": "P1 - HIGH",
        "affected_routes": [f"{method} {route}"] if route else [],
    }
