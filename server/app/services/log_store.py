import logging
import time
from collections import deque
from contextvars import ContextVar
from typing import Any, Deque, Dict, List, Optional

# Set per request by the crash-detection middleware so every log line can be tied to a request.
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class LogStore:
    """In-memory ring buffer of recent service log lines (stand-in for Loki / CloudWatch)."""

    def __init__(self, maxlen: int = 1000):
        self._records: Deque[Dict[str, Any]] = deque(maxlen=maxlen)

    def add(self, record: Dict[str, Any]) -> None:
        self._records.append(record)

    def request_stats(self, service: str, method: str, path: str, window_s: int = 300) -> Dict[str, Any]:
        """How many requests to one route arrived recently, and how many of them ended in an unhandled error."""
        cutoff = time.time() - window_s
        received = f"{method} {path} received"
        failed_marker = f"on {method} {path}:"
        total = failed = 0
        for r in self._records:
            if r["service"] != service or r["ts"] < cutoff:
                continue
            if r["message"] == received:
                total += 1
            elif r["level"] == "ERROR" and r["message"].startswith("Unhandled") and failed_marker in r["message"]:
                failed += 1
        return {"total": total, "failed": failed, "window_minutes": window_s // 60}

    def fetch(self, service: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Most recent log lines for a service, oldest first."""
        rows = [r for r in self._records if r["service"] == service]
        return rows[-limit:]


log_store = LogStore()


class LogStoreHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        log_store.add({
            "ts": record.created,
            "level": record.levelname,
            "service": record.name,
            "request_id": request_id_var.get(),
            "message": record.getMessage(),
        })


def capture_service_logs(service: str) -> logging.Logger:
    """Returns the service's logger with its output mirrored into the log store."""
    service_logger = logging.getLogger(service)
    service_logger.setLevel(logging.INFO)
    if not any(isinstance(h, LogStoreHandler) for h in service_logger.handlers):
        service_logger.addHandler(LogStoreHandler())
    return service_logger


def format_log_line(row: Dict[str, Any]) -> str:
    stamp = time.strftime("%H:%M:%S", time.localtime(row["ts"])) + f".{int(row['ts'] * 1000) % 1000:03d}"
    request_id = row["request_id"] or "-"
    return f"{stamp} {row['level']:<5} [{request_id}] {row['message']}"
