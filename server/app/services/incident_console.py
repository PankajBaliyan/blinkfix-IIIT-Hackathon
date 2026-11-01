from typing import Any, Dict, List

from ..models.schemas import CrashPayload
from .log_store import format_log_line

RULE = "=" * 78
THIN = "-" * 78


def print_crash_report(incident_id: str, payload: CrashPayload, logs: List[Dict[str, Any]]) -> None:
    """Prints the incident summary and the service logs fetched for it."""
    lines = [
        "",
        RULE,
        f" BLINKFIX INCIDENT {incident_id}",
        RULE,
        f" Service : {payload.service} ({payload.environment})",
        f" Request : {payload.method or '-'} {payload.route or '-'}  [{payload.requestId or '-'}]",
        f" Error   : {payload.message}",
        f" Where   : {payload.file}:{payload.line} in {payload.functionName}()",
        THIN,
        f" Logs fetched for {payload.service} (last {len(logs)} lines, > marks this request)",
        THIN,
    ]
    for row in logs:
        marker = ">" if payload.requestId and row["request_id"] == payload.requestId else " "
        lines.append(f" {marker} {format_log_line(row)}")
    if not logs:
        lines.append("   (no logs found)")
    if payload.stackTrace:
        lines += [THIN, " Stack trace", THIN, payload.stackTrace.rstrip()]
    lines += [RULE, " Investigation started: 5 agents running in parallel", RULE, ""]
    print("\n".join(lines), flush=True)
