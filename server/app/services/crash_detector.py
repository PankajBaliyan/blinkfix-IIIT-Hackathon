import asyncio
import json
import logging
import re
import traceback
import uuid
from pathlib import Path
from typing import Optional, Set

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from ..config import BASE_DIR
from ..demo_service.checkout import SERVICE_NAME
from ..models.schemas import CrashPayload
from .log_store import request_id_var

logger = logging.getLogger(SERVICE_NAME)
detector_logger = logging.getLogger("blinkfix.detector")

# Only the demo service is watched. The incident API itself is never reported, to avoid loops.
WATCHED_PREFIX = "/api/demo"

# Keeps references to in-flight webhook calls so they are not garbage collected.
_pending: Set[asyncio.Task] = set()


MAX_BODY_BYTES = 8192
_SECRET_KEY = re.compile(r"pass|secret|token|card|cvv|cvc|ssn|key|auth", re.I)


def _mask_secrets(value):
    """Replaces the values of sensitive-looking keys, at any depth."""
    if isinstance(value, dict):
        return {k: "[redacted]" if _SECRET_KEY.search(str(k)) else _mask_secrets(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_mask_secrets(v) for v in value]
    return value


def _safe_body(raw: bytes) -> Optional[str]:
    """The request body as text for replay, with secrets masked. None if there is no body or it is too big."""
    if not raw or len(raw) > MAX_BODY_BYTES:
        return None
    text = raw.decode("utf-8", errors="replace")
    try:
        return json.dumps(_mask_secrets(json.loads(text)))
    except ValueError:
        return text


def build_crash_payload(
    exc: Exception, request: Request, incident_id: str, request_id: str, body: bytes = b""
) -> CrashPayload:
    """Turns an unhandled exception into the crash payload a tool like Sentry would send."""
    frames = traceback.extract_tb(exc.__traceback__)
    app_dir = str(BASE_DIR / "app")
    # Keep only the service's own frames; the middleware and framework frames are noise.
    own_frames = [
        f for f in frames
        if f.filename.startswith(app_dir) and not f.filename.endswith("crash_detector.py")
    ]
    # The deepest own frame is the line that actually failed.
    culprit = own_frames[-1] if own_frames else frames[-1]
    stack_trace = (
        "Traceback (most recent call last):\n"
        + "".join(traceback.format_list(own_frames or list(frames)))
        + "".join(traceback.format_exception_only(type(exc), exc))
    )

    return CrashPayload(
        eventId=incident_id,
        level="error",
        service=SERVICE_NAME,
        environment="local",
        message=f"{type(exc).__name__}: {exc}",
        exceptionType=type(exc).__name__,
        file=str(Path(culprit.filename).relative_to(BASE_DIR)) if culprit.filename.startswith(str(BASE_DIR)) else culprit.filename,
        line=culprit.lineno or 0,
        functionName=culprit.name,
        stackTrace=stack_trace,
        requestId=request_id,
        route=request.url.path,
        method=request.method,
        requestBody=_safe_body(body),
        queryString=request.url.query or None,
    )


async def _send_webhook(url: str, payload: CrashPayload) -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, json=payload.model_dump(exclude_none=True))
    except Exception as e:
        detector_logger.warning("Could not deliver crash webhook to %s: %s", url, e)


class CrashDetectionMiddleware(BaseHTTPMiddleware):
    """Catches unhandled errors from the watched service and fires the crash webhook."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith(WATCHED_PREFIX):
            return await call_next(request)

        request_id = f"req_{uuid.uuid4().hex[:6]}"
        token = request_id_var.set(request_id)
        logger.info("%s %s received", request.method, request.url.path)
        body = await request.body()
        try:
            response = await call_next(request)
            logger.info("%s %s -> %d", request.method, request.url.path, response.status_code)
            return response
        except Exception as exc:
            incident_id = f"inc_{uuid.uuid4().hex[:8]}"
            logger.error("Unhandled %s on %s %s: %s", type(exc).__name__, request.method, request.url.path, exc)

            payload = build_crash_payload(exc, request, incident_id, request_id, body)
            webhook_url = f"{request.url.scheme}://{request.url.netloc}/api/incidents/webhook/crash"
            task = asyncio.create_task(_send_webhook(webhook_url, payload))
            _pending.add(task)
            task.add_done_callback(_pending.discard)

            return JSONResponse(
                status_code=500,
                content={
                    "error": "internal_server_error",
                    "message": "The service crashed. Blinkfix has opened an incident.",
                    "incident_id": incident_id,
                    "request_id": request_id,
                    "details_url": f"/api/incidents/{incident_id}",
                },
            )
        finally:
            request_id_var.reset(token)
