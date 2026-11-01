import json
import httpx
from pydantic import ValidationError
from ..config import settings
from ..provider_models import AnalysisResponse


class CerebrasClient:
    async def close(self):
        pass

    async def complete_json(self, system_prompt, user_prompt, temperature=0.1):
        if not settings.CEREBRAS_API_KEY:
            raise RuntimeError('CEREBRAS_API_KEY is required for live analysis')
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    f'{settings.CEREBRAS_API_BASE}/chat/completions',
                    headers={'Authorization': f'Bearer {settings.CEREBRAS_API_KEY}'},
                    json={'model': settings.CEREBRAS_MODEL,
                          'messages': [{'role': 'system', 'content': system_prompt},
                                       {'role': 'user', 'content': user_prompt}],
                          'temperature': temperature, 'response_format': {'type': 'json_object'}},
                )
        except httpx.TimeoutException as exc:
            raise RuntimeError('Cerebras request timed out after 45 seconds') from exc
        if response.is_error:
            raise RuntimeError(f'Cerebras HTTP {response.status_code}; check credentials/model/quota')
        try:
            body = response.json()
            payload = json.loads(body['choices'][0]['message']['content'])
            validated = AnalysisResponse.model_validate(payload).model_dump()
            validated['provider_usage'] = body.get('usage')
            return validated
        except (ValueError, KeyError, TypeError, ValidationError) as exc:
            raise RuntimeError('Cerebras returned malformed analysis JSON') from exc


cerebras_client = CerebrasClient()
