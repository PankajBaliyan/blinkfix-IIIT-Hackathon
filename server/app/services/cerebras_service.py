import json
import httpx
from ..config import settings


class CerebrasClient:
    async def close(self):
        pass

    async def complete_json(self, system_prompt, user_prompt, temperature=0.1):
        if not settings.CEREBRAS_API_KEY:
            raise RuntimeError('CEREBRAS_API_KEY is required for live analysis')
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(f'{settings.CEREBRAS_API_BASE}/chat/completions',
                headers={'Authorization': f'Bearer {settings.CEREBRAS_API_KEY}'},
                json={'model': settings.CEREBRAS_MODEL,
                      'messages': [{'role': 'system', 'content': system_prompt},
                                   {'role': 'user', 'content': user_prompt}],
                      'temperature': temperature, 'response_format': {'type': 'json_object'}})
            if response.is_error:
                raise RuntimeError(f'Cerebras HTTP {response.status_code}; check credentials/model/quota')
            result = json.loads(response.json()['choices'][0]['message']['content'])
            if not isinstance(result, dict) or not isinstance(result.get('summary'), str):
                raise RuntimeError('Cerebras returned invalid analysis JSON (summary required)')
            return result


cerebras_client = CerebrasClient()
