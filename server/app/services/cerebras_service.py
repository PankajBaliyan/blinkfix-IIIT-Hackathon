import asyncio
import json
import logging
import re
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Deque, Dict, Optional

import httpx

from ..config import settings

logger = logging.getLogger("blinkfix.cerebras")

# 429 is not retried: the limiter below is what keeps us under the quota.
_RETRY_STATUSES = {500, 502, 503, 504}


@dataclass
class ModelReply:
    """What came back from one model call. `data` is None when the call did not produce usable JSON."""
    data: Optional[Dict[str, Any]]
    latency_ms: int
    model: str
    error: Optional[str] = None


def _parse_json_object(content: str) -> Dict[str, Any]:
    text = content.strip()
    # Some models wrap JSON in a Markdown code fence.
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.S)
    if fenced:
        text = fenced.group(1)
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("model reply is not a JSON object")
    return data


class CerebrasClient:
    def __init__(self):
        self.api_key = settings.CEREBRAS_API_KEY
        self.api_base = settings.CEREBRAS_API_BASE
        self.model = settings.CEREBRAS_MODEL
        self._http_client: Optional[httpx.AsyncClient] = None
        self._call_times: Deque[float] = deque()
        self._limiter_lock = asyncio.Lock()

    async def _wait_for_slot(self) -> Optional[str]:
        """Keeps us under the requests-per-minute quota. Returns an error if a slot is too far away."""
        async with self._limiter_lock:
            now = time.monotonic()
            while self._call_times and now - self._call_times[0] >= 60:
                self._call_times.popleft()
            if len(self._call_times) >= settings.CEREBRAS_MAX_RPM:
                wait = 60 - (now - self._call_times[0])
                if wait > settings.CEREBRAS_MAX_WAIT_S:
                    return f"rate limit reached ({settings.CEREBRAS_MAX_RPM} requests per minute), next slot in {wait:.0f}s"
                await asyncio.sleep(wait)
                self._call_times.popleft()
            self._call_times.append(time.monotonic())
        return None

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=5.0),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._http_client

    async def close(self):
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 1500,
    ) -> ModelReply:
        """Asks the model for one JSON object. Never raises: failures come back in `error`."""
        if not self.enabled:
            return ModelReply(None, 0, self.model, "no CEREBRAS_API_KEY set")

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_completion_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        if settings.CEREBRAS_REASONING_EFFORT:
            payload["reasoning_effort"] = settings.CEREBRAS_REASONING_EFFORT

        start = time.perf_counter()
        limited = await self._wait_for_slot()
        if limited:
            logger.warning("Cerebras call skipped: %s", limited)
            return ModelReply(None, 0, self.model, limited)

        client = await self.get_http_client()
        error = "unknown error"
        for attempt in range(2):
            try:
                resp = await client.post(f"{self.api_base}/chat/completions", json=payload)
                if resp.status_code in _RETRY_STATUSES and attempt == 0:
                    await asyncio.sleep(0.5)
                    continue
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"].get("content") or ""
                data = _parse_json_object(content)
                return ModelReply(data, int((time.perf_counter() - start) * 1000), self.model)
            except httpx.HTTPStatusError as e:
                error = f"HTTP {e.response.status_code}: {e.response.text[:160]}"
                break
            except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
                error = f"{type(e).__name__}: {e}"[:200]
                break

        logger.warning("Cerebras call failed (%s): %s", self.model, error)
        return ModelReply(None, int((time.perf_counter() - start) * 1000), self.model, error)


cerebras_client = CerebrasClient()
