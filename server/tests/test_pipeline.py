import asyncio
import base64
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.state import claim_action, replay, get_state, recover_interrupted, record
from app.services import orchestrator
from app.services.patch_validator import FIXTURE, validate_candidate, rank_and_select_winner
from app.services.github_service import create_draft_pull_request
from app.services.codex_service import generate_candidates
from app.services.cerebras_service import cerebras_client

SOURCE = (FIXTURE / 'payments.cjs').read_text()
CORRECT = (FIXTURE.parent / 'candidates/correct.cjs').read_text()
BAD = (FIXTURE.parent / 'candidates/bad.cjs').read_text()


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = patch.object(settings, 'DATABASE_PATH', Path(self.temp.name) / 'test.db')
        self.db.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.db.stop()
        self.temp.cleanup()

    def run_incident(self, **options):
        response = self.client.post('/api/incidents/simulate', json=options)
        self.assertEqual(response.status_code, 200, response.text)
        return self.client.get('/api/incidents/' + response.json()['incident_id']).json()

    def test_fixture_validates_without_publishing(self):
        with patch.object(orchestrator, 'create_draft_pull_request', new_callable=AsyncMock) as publish:
            result = self.run_incident(mode='fixture')
        self.assertEqual(result['status'], 'VALIDATED')
        self.assertEqual(len(result['agents']), 5)
        self.assertTrue(all(agent['status'] == 'SKIPPED' for agent in result['agents']))
        self.assertEqual([p['validation']['passed'] for p in result['patches']], [False, True])
        self.assertIsNone(result['pr_url'])
        publish.assert_not_called()

    def test_duplicate_request_returns_same_run_without_second_execution(self):
        payload = {'requestId': 'same-request-123', 'mode': 'fixture'}
        first = self.client.post('/api/incidents/simulate', json=payload).json()
        second = self.client.post('/api/incidents/simulate', json=payload).json()
        self.assertEqual(first['incident_id'], second['incident_id'])
        self.assertEqual(second['status'], 'existing')
        events = replay(first['incident_id'])
        self.assertEqual(sum(event['event'] == 'incident_started' for event in events), 1)
        self.assertEqual(sum(event['event'] == 'incident_completed' for event in events), 1)

    def test_publication_claim_is_one_shot(self):
        self.assertTrue(claim_action('claim-test', 'github-publication'))
        self.assertFalse(claim_action('claim-test', 'github-publication'))

    def test_setup_status_exposes_readiness_without_secrets(self):
        with patch.object(settings, 'CEREBRAS_API_KEY', 'cerebras-secret'), \
             patch.object(settings, 'OPENAI_API_KEY', ''), \
             patch.object(settings, 'GITHUB_TOKEN', 'github-secret'):
            response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body['cerebras']['configured'])
        self.assertFalse(body['codex']['configured'])
        self.assertFalse(body['readiness']['live_analysis'])
        self.assertTrue(body['readiness']['github_publishing'])
        self.assertFalse(body['readiness']['publishing_default'])
        serialized = response.text
        self.assertNotIn('cerebras-secret', serialized)
        self.assertNotIn('github-secret', serialized)

    def test_external_outage_stops_before_models_or_execution(self):
        with patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock) as generate, \
             patch.object(orchestrator, 'validate_candidate') as validate, \
             patch.object(cerebras_client, 'complete_json', new_callable=AsyncMock) as analyze, \
             patch.object(orchestrator, 'create_draft_pull_request', new_callable=AsyncMock) as publish:
            result = self.run_incident(scenarioId='stripe-timeout', mode='live', publish=True)
        self.assertEqual(result['status'], 'MITIGATED')
        self.assertEqual(result['patches'], [])
        for mock in [generate, validate, analyze, publish]: mock.assert_not_called()

    def test_all_candidates_fail_no_pr(self):
        with patch.object(cerebras_client, 'complete_json', new_callable=AsyncMock, return_value={'summary': 'analysis'}), \
             patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock, return_value=[{'id':'bad','code':BAD}]), \
             patch.object(orchestrator, 'create_draft_pull_request', new_callable=AsyncMock) as publish:
            result = self.run_incident(mode='live', publish=True)
        self.assertEqual(result['status'], 'FAILED')
        self.assertIn('All candidates failed', result['error'])
        publish.assert_not_called()

    def test_missing_credentials_never_simulates_success(self):
        with patch.object(settings, 'CEREBRAS_API_KEY', ''):
            result = self.run_incident(mode='live')
        self.assertEqual(result['status'], 'FAILED')
        self.assertIn('CEREBRAS_API_KEY', result['error'])
        self.assertEqual(result['patches'], [])

    def test_codex_failure_is_reported(self):
        with patch.object(cerebras_client, 'complete_json', new_callable=AsyncMock, return_value={'summary':'analysis'}), \
             patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock, side_effect=RuntimeError('Codex HTTP 429')):
            result = self.run_incident(mode='live')
        self.assertEqual(result['status'], 'FAILED')
        self.assertIn('429', result['error'])

    def test_publication_failure_retains_executed_winner(self):
        with patch.object(cerebras_client, 'complete_json', new_callable=AsyncMock, return_value={'summary':'analysis'}), \
             patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock, return_value=[{'id':'correct','code':CORRECT}]), \
             patch.object(orchestrator, 'create_draft_pull_request', new_callable=AsyncMock, side_effect=RuntimeError('GitHub HTTP 403')):
            result = self.run_incident(mode='live', publish=True)
        self.assertEqual(result['status'], 'PUBLISH_FAILED')
        self.assertTrue(result['patches'][0]['isWinner'])
        self.assertIsNone(result['pr_url'])

    def test_returned_pr_url_is_preserved(self):
        with patch.object(cerebras_client, 'complete_json', new_callable=AsyncMock, return_value={'summary':'analysis'}), \
             patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock, return_value=[{'id':'correct','code':CORRECT}]), \
             patch.object(orchestrator, 'create_draft_pull_request', new_callable=AsyncMock, return_value={'pr_url':'https://github.com/test/checkout/pull/9','status':'created','commit_sha':'new'}):
            result = self.run_incident(mode='live', publish=True)
        self.assertEqual(result['status'], 'RESOLVED')
        self.assertEqual(result['pr_url'], 'https://github.com/test/checkout/pull/9')

    def test_cerebras_analysts_run_concurrently(self):
        active = 0
        all_started = asyncio.Event()
        async def analyze(*args):
            nonlocal active
            active += 1
            if active == len(orchestrator.ROLES):
                all_started.set()
            await asyncio.wait_for(all_started.wait(), 1)
            return {'summary': 'parallel analysis'}
        with patch.object(cerebras_client, 'complete_json', side_effect=analyze), \
             patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock, return_value=[{'id':'correct','code':CORRECT}]):
            result = self.run_incident(mode='live')
        self.assertEqual(active, 5)
        self.assertEqual(result['status'], 'VALIDATED')
        progress = [event for event in replay(result['id']) if event['event'] == 'agent_progress']
        self.assertEqual(len(progress), 5)
        completed_counts = [
            sum(agent['status'] == 'COMPLETED' for agent in json.loads(event['data'])['agents'])
            for event in progress
        ]
        self.assertEqual(completed_counts, [1, 2, 3, 4, 5])

    def test_rehearsal_report_tracks_last_five_live_runs(self):
        with patch.object(settings, 'CEREBRAS_API_KEY', ''):
            for _ in range(6):
                self.run_incident(mode='live')
        report = self.client.get('/api/incidents/reports/rehearsals/live?limit=5').json()
        self.assertEqual(report['recorded_runs'], 5)
        self.assertEqual(report['successful_runs'], 0)
        self.assertEqual(report['model_failures'], 5)
        self.assertEqual(report['publication_failures'], 0)

    def test_completed_event_replay_and_reconnect_cursor(self):
        result = self.run_incident(mode='fixture')
        events = replay(result['id'])
        self.assertEqual(events[0]['event'], 'incident_started')
        self.assertEqual(json.loads(events[-1]['data'])['status'], 'VALIDATED')
        response = self.client.get(f"/api/incidents/{result['id']}/stream")
        self.assertIn('event: incident_completed', response.text)
        cursor = events[-2]['id']
        response = self.client.get(f"/api/incidents/{result['id']}/stream", headers={'Last-Event-ID':cursor})
        self.assertIn('event: incident_completed', response.text)
        self.assertNotIn('event: incident_started', response.text)
        self.assertEqual(self.client.get('/api/incidents/missing/stream').status_code, 404)

    def test_restart_marks_interrupted_run_failed(self):
        record('interrupted', 'incident_started', {'status':'AGENTS_ACTIVE'})
        recover_interrupted()
        self.assertEqual(get_state('interrupted')['status'], 'FAILED')
        self.assertIn('restarted', get_state('interrupted')['error'])

    def test_unsupported_scenario_and_fixture_publishing_rejected(self):
        self.assertEqual(self.client.post('/api/incidents/simulate', json={'scenarioId':'auth-bug'}).status_code, 422)
        self.assertEqual(self.client.post('/api/incidents/simulate', json={'mode':'fixture','publish':True}).status_code, 400)

    def test_no_reproduction_no_generation(self):
        with patch.object(orchestrator, 'generate_candidates', new_callable=AsyncMock) as generate:
            result = self.run_incident(mode='live', source=CORRECT)
        self.assertEqual(result['status'], 'FAILED')
        self.assertIn('does not reproduce', result['error'])
        generate.assert_not_called()


class ExecutionTests(unittest.TestCase):
    def test_original_bad_correct_and_immutable_fixture(self):
        for code, expected in [(SOURCE, False), (BAD, False), (CORRECT, True)]:
            result = validate_candidate(code)
            self.assertEqual(result['validation']['passed'], expected)
        self.assertEqual((FIXTURE / 'payments.cjs').read_text(), SOURCE)

    def test_real_syntax_failure_and_no_winner(self):
        results = rank_and_select_winner([{'id':'syntax','code':'async function ('}, {'id':'bad','code':BAD}])
        self.assertNotEqual(results[0]['validation']['syntax']['exit_code'], 0)
        self.assertFalse(any(p['isWinner'] for p in results))

    def test_generated_code_cannot_access_secrets_or_write_files(self):
        code = "require('node:fs').writeFileSync('oops', 'bad');\n" + CORRECT
        self.assertFalse(validate_candidate(code)['validation']['passed'])
        with patch.dict(os.environ, {'OPENAI_API_KEY':'secret-sentinel'}):
            code = "if (process.env.OPENAI_API_KEY) throw new Error('secret leaked');\n" + CORRECT
            self.assertTrue(validate_candidate(code)['validation']['passed'])

    def test_timeout_is_failure_with_captured_output(self):
        result = validate_candidate("console.log('before loop'); while (true) {}")
        self.assertEqual(result['validation']['tests']['exit_code'], 124)
        self.assertIn('before loop', result['validation']['tests']['stdout'])
        self.assertFalse(result['validation']['passed'])


class ProviderTests(unittest.TestCase):
    def client_patch(self, handler):
        original = httpx.AsyncClient
        return patch('httpx.AsyncClient', side_effect=lambda **kw: original(transport=httpx.MockTransport(handler), **kw))

    def test_cerebras_request_and_http_failure(self):
        def handler(request):
            self.assertTrue(str(request.url).endswith('/chat/completions'))
            self.assertEqual(json.loads(request.content)['response_format']['type'], 'json_object')
            return httpx.Response(401, json={'error':'unauthorized'})
        with patch.object(settings, 'CEREBRAS_API_KEY', 'test'), self.client_patch(handler):
            with self.assertRaisesRegex(RuntimeError, '401'):
                asyncio.run(cerebras_client.complete_json('JSON please', 'source'))

    def test_cerebras_malformed_response_is_rejected(self):
        response = httpx.Response(200, json={'choices':[{'message':{'content':'{"findings":{}}'}}]})
        with patch.object(settings, 'CEREBRAS_API_KEY', 'test'), self.client_patch(lambda request: response):
            with self.assertRaisesRegex(RuntimeError, 'malformed'):
                asyncio.run(cerebras_client.complete_json('JSON please', 'source'))

    def test_codex_response_parsing_and_supplied_source(self):
        def handler(request):
            self.assertEqual(str(request.url), 'https://api.openai.com/v1/responses')
            payload = json.loads(request.content)
            self.assertEqual(json.loads(payload['input'])['source'], SOURCE)
            return httpx.Response(200, json={'status':'completed','output':[{'type':'message','content':[
                {'type':'output_text','text':json.dumps({'candidates':[{'code':CORRECT}]})}]}]})
        with patch.object(settings, 'OPENAI_API_KEY', 'test'), self.client_patch(handler):
            candidates = asyncio.run(generate_candidates(SOURCE, 'TypeError', 'contract', [], 'tests'))
        self.assertEqual(candidates[0]['code'], CORRECT)

    def test_github_commits_winner_tests_evidence_before_pr(self):
        calls = []
        def handler(request):
            path = request.url.path
            payload = json.loads(request.content) if request.content else None
            calls.append((request.method, path, payload))
            if path.endswith('/git/ref/heads/main'): data = {'object':{'sha':'base'}}
            elif '/contents/' in path: data = {'content':base64.b64encode(SOURCE.encode()).decode()}
            elif path.endswith('/git/commits/base'): data = {'tree':{'sha':'base-tree'}}
            elif path.endswith('/git/trees'):
                files = {entry['path']:entry['content'] for entry in payload['tree']}
                self.assertEqual(files['payments.cjs'], CORRECT)
                self.assertIn('payments.test.cjs', files)
                self.assertIn('blinkfix-evidence/inc_test.json', files)
                data = {'sha':'new-tree'}
            elif path.endswith('/git/commits'): data = {'sha':'new-commit'}
            elif path.endswith('/git/refs'):
                self.assertEqual(payload['sha'], 'new-commit'); data = {}
            elif path.endswith('/pulls'):
                self.assertTrue(payload['draft']); self.assertIn('regression exit: 0', payload['body'])
                data = {'number':7,'html_url':'https://github.com/test/checkout/pull/7'}
            else: data = {'default_branch':'main'}
            return httpx.Response(200, json=data)
        with patch.object(settings, 'GITHUB_TOKEN', 'test'), self.client_patch(handler):
            result = asyncio.run(create_draft_pull_request('inc_test', SOURCE, {'id':'winner','code':CORRECT}))
        self.assertEqual(result['commit_sha'], 'new-commit')
        self.assertEqual(result['target_file'], 'payments.cjs')
        self.assertEqual(result['evidence_path'], 'blinkfix-evidence/inc_test.json')
        self.assertEqual(result['syntax_exit_code'], 0)
        self.assertEqual(result['regression_exit_code'], 0)
        self.assertTrue(calls[-1][1].endswith('/pulls'))

    def test_github_failure_does_not_return_fake_url(self):
        with patch.object(settings, 'GITHUB_TOKEN', 'test'), self.client_patch(lambda request: httpx.Response(403, json={})):
            with self.assertRaisesRegex(RuntimeError, '403'):
                asyncio.run(create_draft_pull_request('inc_failure', SOURCE, {'id':'winner','code':CORRECT}))

    def test_remote_source_mismatch_prevents_any_write(self):
        def handler(request):
            self.assertEqual(request.method, 'GET')
            path = request.url.path
            if path.endswith('/git/ref/heads/main'): data = {'object':{'sha':'base'}}
            elif '/contents/' in path: data = {'content':base64.b64encode(b'changed upstream').decode()}
            else: data = {'default_branch':'main'}
            return httpx.Response(200, json=data)
        with patch.object(settings, 'GITHUB_TOKEN', 'test'), self.client_patch(handler):
            with self.assertRaisesRegex(RuntimeError, 'remote target differs'):
                asyncio.run(create_draft_pull_request('inc_mismatch', SOURCE, {'id':'winner','code':CORRECT}))

    def test_codex_malformed_output_and_http_failure(self):
        for response in [httpx.Response(429, json={}),
                         httpx.Response(200, json={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':'not JSON'}]}]})]:
            with patch.object(settings, 'OPENAI_API_KEY', 'test'), self.client_patch(lambda request: response):
                with self.assertRaises(RuntimeError):
                    asyncio.run(generate_candidates(SOURCE, 'error', 'contract', [], 'tests'))

    def test_github_revalidates_bad_patch_before_network(self):
        with patch.object(settings, 'GITHUB_TOKEN', 'test'), self.client_patch(lambda r: self.fail('Network called')):
            with self.assertRaisesRegex(RuntimeError, 'failed revalidation'):
                asyncio.run(create_draft_pull_request('inc_bad', SOURCE, {'id':'bad','code':BAD}))


if __name__ == '__main__':
    unittest.main()
