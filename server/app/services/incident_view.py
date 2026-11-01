"""Shapes stored incident rows into the JSON the frontend reads."""
import json
from typing import Any, Dict, List, Optional

from ..config import settings
from ..database import get_agent_runs, get_incident, get_patches, list_recent_incidents
from .source_reader import read_source_snippet


def _iso(created_at: Optional[str]) -> Optional[str]:
    # SQLite stores CURRENT_TIMESTAMP as UTC without a timezone marker.
    return created_at.replace(" ", "T") + "Z" if created_at else None


def _loads(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return default


def incident_summary(row: Dict[str, Any]) -> Dict[str, Any]:
    payload = _loads(row.get("payload_json"), {})
    return {
        "id": row["id"],
        "service": row["service"],
        "status": row["status"],
        "errorType": row["error_name"],
        "errorMessage": row["error_message"],
        "file": row["file"],
        "line": row["line"],
        "route": payload.get("route"),
        "method": payload.get("method"),
        "createdAt": _iso(row.get("created_at")),
        "durationMs": row.get("duration_ms") or 0,
        "rollbackApproved": bool(row.get("rollback_approved")),
        "prUrl": row.get("pr_url") if row.get("pr_number") else None,
        "prNumber": row.get("pr_number"),
    }


def list_incident_summaries(limit: int = 50) -> List[Dict[str, Any]]:
    return [incident_summary(r) for r in list_recent_incidents(limit)]


def build_incident_detail(incident_id: str) -> Optional[Dict[str, Any]]:
    row = get_incident(incident_id)
    if not row:
        return None

    payload = _loads(row.get("payload_json"), {})
    agents = get_agent_runs(incident_id)
    findings = {a["name"]: a["findings"] for a in agents}

    stored_source = _loads(row.get("source_json"), None)
    detail = incident_summary(row)
    detail.update({
        "environment": payload.get("environment"),
        "demoMode": settings.DEMO_MODE,
        "culpritCommit": row.get("culprit_commit"),
        "winningPatchId": row.get("winning_patch_id"),
        "error": {
            "type": row["error_name"],
            "message": row["error_message"],
            "file": row["file"],
            "line": row["line"],
            "function": payload.get("functionName"),
            "route": payload.get("route"),
            "method": payload.get("method"),
            "requestId": payload.get("requestId"),
            "stackTrace": payload.get("stackTrace"),
        },
        "logs": [
            {"ts": r["ts"], "level": r["level"], "requestId": r["request_id"], "message": r["message"]}
            for r in _loads(row.get("logs_json"), [])
        ],
        # The snippet saved when the incident was handled, so it shows the code Blinkfix actually read.
        "source": stored_source or read_source_snippet(row["file"], row["line"]),
        "codeOrigin": row.get("code_origin"),
        "codeNote": (stored_source or {}).get("note"),
        "pr": (
            {"number": row.get("pr_number"), "url": row["pr_url"], "branch": row.get("pr_branch")}
            # Incidents from before real pull requests have a made-up link and no number.
            if row.get("pr_url") and row.get("pr_number") else None
        ),
        "agents": agents,
        "culprit": findings.get("Git Detective"),
        "impact": findings.get("Impact Analyst"),
        "infra": findings.get("Infra Checker"),
        "mitigation": findings.get("Mitigation Planner"),
        "patches": get_patches(incident_id),
    })
    return detail
