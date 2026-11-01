import httpx
import json
import logging
import asyncio
from typing import Dict, Any, Optional
from ..config import settings

logger = logging.getLogger("blinkfix.cerebras")

class CerebrasClient:
    def __init__(self):
        self.api_key = settings.CEREBRAS_API_KEY
        self.api_base = settings.CEREBRAS_API_BASE
        self.model = settings.CEREBRAS_MODEL
        self._http_client: Optional[httpx.AsyncClient] = None

    async def get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=3.0),
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
    ) -> Dict[str, Any]:
        """Calls Cerebras API with JSON response format, or falls back to demo mode."""
        if not self.api_key or settings.DEMO_MODE:
            # Deterministic sub-second simulated response
            await asyncio.sleep(0.18)
            return {"status": "ok", "mode": "simulated"}

        client = await self.get_http_client()
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        try:
            resp = await client.post(f"{self.api_base}/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            logger.warning(f"Cerebras API call failed: {e}. Falling back to demo mode.")
            return {"status": "fallback", "error": str(e)}

cerebras_client = CerebrasClient()

