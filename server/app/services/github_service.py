"""Publish only executed winners, with source-match and committed evidence gates."""
import base64
import asyncio
import json
from pathlib import PurePosixPath
import httpx
from ..config import settings
from .patch_validator import FIXTURE, validate_candidate


async def create_draft_pull_request(incident_id, source, winner):
    if not settings.GITHUB_TOKEN or not settings.GITHUB_OWNER or not settings.GITHUB_REPO:
        raise RuntimeError('GitHub publishing requires GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO')
    # Never trust a caller-supplied validation flag at the publication boundary.
    verified = await asyncio.to_thread(validate_candidate, winner['code'], winner['id'], source)
    if not verified['validation']['passed']:
        raise RuntimeError('Publication blocked: winning candidate failed revalidation')
    target = PurePosixPath(settings.GITHUB_TARGET_FILE)
    if target.is_absolute() or '..' in target.parts or str(target) in ('', '.'):
        raise RuntimeError('Invalid GITHUB_TARGET_FILE')
    if target.name != 'payments.cjs':
        raise RuntimeError('This fixture requires a target named payments.cjs beside payments.test.cjs')
    path = str(target)
    base_url = f'https://api.github.com/repos/{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}'
    async with httpx.AsyncClient(timeout=30, headers={
        'Authorization': f'Bearer {settings.GITHUB_TOKEN}',
        'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
    }) as client:
        async def call(method, endpoint, payload=None):
            response = await client.request(method, base_url + endpoint, json=payload)
            if response.is_error:
                raise RuntimeError(f'GitHub {method} {endpoint} HTTP {response.status_code}; publishing stopped')
            return response.json()
        repo = await call('GET', '')
        base = repo['default_branch']
        ref = await call('GET', f'/git/ref/heads/{base}')
        sha = ref['object']['sha']
        original = await call('GET', f'/contents/{path}?ref={sha}')
        remote = base64.b64decode(original['content']).decode('utf-8')
        if remote.replace('\r\n', '\n') != source.replace('\r\n', '\n'):
            raise RuntimeError('Publication blocked: remote target differs from the supplied source')
        commit = await call('GET', f'/git/commits/{sha}')
        evidence = json.dumps({'incident_id': incident_id, 'winner': verified}, indent=2)
        parent = target.parent
        files = {path: winner['code'], str(parent / 'payments.test.cjs'): (FIXTURE / 'payments.test.cjs').read_text(),
                 str(parent / 'CONTRACT.md'): (FIXTURE / 'CONTRACT.md').read_text(),
                 f'blinkfix-evidence/{incident_id}.json': evidence}
        tree = await call('POST', '/git/trees', {'base_tree': commit['tree']['sha'],
            'tree': [{'path': name, 'mode': '100644', 'type': 'blob', 'content': content}
                     for name, content in files.items()]})
        changed = await call('POST', '/git/commits', {
            'message': f'Fix checkout currency validation ({incident_id})',
            'tree': tree['sha'], 'parents': [sha]})
        branch = f'blinkfix/{incident_id}'
        await call('POST', '/git/refs', {'ref': f'refs/heads/{branch}', 'sha': changed['sha']})
        test = verified['validation']['tests']
        body = ('Reject invalid or missing checkout FX metadata before charging. No implicit rate.\n\n'
                f'Committed regression evidence: `blinkfix-evidence/{incident_id}.json`\n'
                f'Syntax exit: 0; regression exit: {test["exit_code"]}.\n\n'
                '```text\n' + test['stdout'][-14000:] + '\n```\n')
        try:
            pr = await call('POST', '/pulls', {'title': 'Fix checkout currency validation',
                            'head': branch, 'base': base, 'body': body, 'draft': True})
        except Exception as exc:
            raise RuntimeError(f'Draft PR creation failed after commit {changed["sha"]} on {branch}: {exc}') from exc
        return {'pr_url': pr['html_url'], 'pr_number': pr['number'],
                'branch': branch, 'commit_sha': changed['sha'], 'status': 'created',
                'target_file': path,
                'evidence_path': f'blinkfix-evidence/{incident_id}.json',
                'syntax_exit_code': verified['validation']['syntax']['exit_code'],
                'regression_exit_code': verified['validation']['tests']['exit_code']}
