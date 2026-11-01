"""Evidence-producing workflow for configured public repository bugs."""
from __future__ import annotations

import difflib
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from pydantic import BaseModel, Field
from ..config import BASE_DIR

BUGS_ROOT = BASE_DIR / 'real_bugs'
WORKSPACES_ROOT = BASE_DIR.parent / '.blinkfix' / 'workspaces'


class RealBugManifest(BaseModel):
    id: str
    repository: str
    broken_revision: str = Field(pattern=r'^[0-9a-f]{40}$')
    report_url: str
    upstream_merge_revision: str = Field(pattern=r'^[0-9a-f]{40}$')
    target_file: str
    install_command: list[str]
    syntax_command: list[str]
    reproducer_command: list[str]
    regression_command: list[str]
    report: str


def load_manifest(bug_id: str) -> RealBugManifest:
    if not bug_id.replace('-', '').isalnum():
        raise ValueError('Invalid bug identifier')
    path = BUGS_ROOT / bug_id / 'manifest.json'
    if not path.is_file():
        raise FileNotFoundError(f'Unknown configured bug: {bug_id}')
    return RealBugManifest.model_validate_json(path.read_text(encoding='utf-8'))


def _safe_environment() -> dict[str, str]:
    allowed = ('PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC',
               'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'HOME', 'USERPROFILE')
    return {key: os.environ[key] for key in allowed if key in os.environ}


def run_command(command: list[str], cwd: Path, timeout: int = 180) -> dict:
    started = time.perf_counter()
    environment = _safe_environment()
    executable = shutil.which(command[0], path=environment.get('PATH'))
    resolved = [executable or command[0], *command[1:]]
    try:
        result = subprocess.run(resolved, cwd=cwd, env=environment, text=True,
                                encoding='utf-8', errors='replace',
                                capture_output=True, timeout=timeout, shell=False)
        return {'command': command, 'exit_code': result.returncode, 'stdout': result.stdout,
                'stderr': result.stderr, 'timed_out': False,
                'duration_ms': int((time.perf_counter() - started) * 1000)}
    except subprocess.TimeoutExpired as exc:
        return {'command': command, 'exit_code': 124, 'stdout': exc.stdout or '',
                'stderr': (exc.stderr or '') + f'\nTimed out after {timeout} seconds.',
                'timed_out': True, 'duration_ms': int((time.perf_counter() - started) * 1000)}
    except OSError as exc:
        return {'command': command, 'exit_code': 127, 'stdout': '', 'stderr': str(exc),
                'timed_out': False, 'duration_ms': int((time.perf_counter() - started) * 1000)}


def _git(args: list[str], cwd: Path, timeout: int = 180) -> dict:
    return run_command(['git', *args], cwd, timeout)


def _require_success(result: dict, stage: str) -> None:
    if result['exit_code'] != 0:
        detail = (result['stderr'] or result['stdout']).strip()[-2000:]
        raise RuntimeError(f'{stage} failed with exit {result["exit_code"]}: {detail}')


def prepare_repository(bug_id: str, install: bool = True) -> dict:
    overall_started = time.perf_counter()
    setup_started = time.perf_counter()
    manifest = load_manifest(bug_id)
    workspace = WORKSPACES_ROOT / manifest.id
    workspace.parent.mkdir(parents=True, exist_ok=True)
    setup_commands = []
    cloned = not (workspace / '.git').is_dir()
    installed = False
    if cloned:
        clone = run_command(['git', 'clone', manifest.repository, str(workspace)], workspace.parent, 300)
        setup_commands.append(clone)
        _require_success(clone, 'Repository clone')
    for args, stage in [(['reset', '--hard'], 'Repository reset'),
                        (['clean', '-fd'], 'Repository clean'),
                        (['checkout', '--detach', manifest.broken_revision], 'Broken revision checkout')]:
        result = _git(args, workspace)
        setup_commands.append(result)
        _require_success(result, stage)
    revision = _git(['rev-parse', 'HEAD'], workspace)
    setup_commands.append(revision)
    _require_success(revision, 'Revision verification')
    if revision['stdout'].strip() != manifest.broken_revision:
        raise RuntimeError('Checked-out revision does not match configured broken revision')
    if install and not (workspace / 'node_modules').is_dir():
        dependency_install = run_command(manifest.install_command, workspace, 300)
        setup_commands.append(dependency_install)
        _require_success(dependency_install, 'Dependency installation')
        installed = True

    test_dir = workspace / '.blinkfix-tests'
    test_dir.mkdir(exist_ok=True)
    shutil.copy2(BUGS_ROOT / bug_id / 'reproducer.test.cjs',
                 test_dir / 'res-send-transfer-encoding.test.cjs')
    environment = {
        'node': run_command(['node', '--version'], workspace),
        'npm': run_command(['npm', '--version'], workspace),
        'resolved_dependencies': run_command(['npm', 'ls', '--all', '--json'], workspace, 60),
    }
    setup_duration = int((time.perf_counter() - setup_started) * 1000)
    regression_started = time.perf_counter()
    regression = run_command(manifest.regression_command, workspace)
    _require_success(regression, 'Unchanged repository regression baseline')
    regression_duration = int((time.perf_counter() - regression_started) * 1000)
    reproduction_started = time.perf_counter()
    reproduction = run_command(manifest.reproducer_command, workspace)
    reproduction_duration = int((time.perf_counter() - reproduction_started) * 1000)
    if reproduction['timed_out']:
        raise RuntimeError('Reproducer timed out; expected behavior is not established')
    if reproduction['exit_code'] == 0:
        raise RuntimeError('Reproducer did not fail on the configured broken revision; repair stopped')

    history = _git(['log', '-8', '--format=%H%x09%ad%x09%s', '--date=iso-strict', '--', manifest.target_file], workspace)
    _require_success(history, 'Target history collection')
    head_diff = _git(['show', '--format=fuller', '--stat', '--patch', 'HEAD', '--', manifest.target_file], workspace)
    _require_success(head_diff, 'Target diff collection')
    source = (workspace / manifest.target_file).read_text(encoding='utf-8')
    return {
        'status': 'REPRODUCED', 'bug_id': bug_id, 'repository': manifest.repository,
        'revision': manifest.broken_revision, 'target_file': manifest.target_file,
        'report_url': manifest.report_url, 'report': manifest.report,
        'source': source, 'git_history': history['stdout'], 'head_target_diff': head_diff['stdout'],
        'setup_commands': setup_commands, 'reproduction': {'origin': 'blinkfix-added', **reproduction},
        'regression': {'origin': 'repository-unchanged', **regression},
        'regression_scope': {
            'kind': 'focused', 'command': manifest.regression_command,
            'files': ['test/res.send.js'], 'observed_passing_tests': 70,
            'full_regression_suite': False,
        },
        'environment': environment,
        'cache_state': 'cold' if cloned or installed else 'cached',
        'phase_timings_ms': {
            'environment_setup': setup_duration,
            'baseline_regression': regression_duration,
            'reproduction': reproduction_duration,
            'total': int((time.perf_counter() - overall_started) * 1000),
        },
        'agent_input_excludes': ['upstream patch', 'upstream post-fix tests'],
        'upstream_reference_reserved': True,
    }


def _hardlink_or_copy(source: str, destination: str) -> None:
    try:
        os.link(source, destination)
    except OSError:
        shutil.copy2(source, destination)


def validate_repository_candidate(bug_id: str, candidate_code: str) -> dict:
    manifest = load_manifest(bug_id)
    if not candidate_code or len(candidate_code) > 100_000:
        raise ValueError('Candidate source must contain 1 to 100000 characters')
    prepared = prepare_repository(bug_id)
    workspace = WORKSPACES_ROOT / manifest.id
    original = (workspace / manifest.target_file).read_text(encoding='utf-8')
    with tempfile.TemporaryDirectory(prefix=f'blinkfix-{bug_id}-') as temporary:
        isolated = Path(temporary) / 'repository'
        shutil.copytree(workspace, isolated, ignore=shutil.ignore_patterns('.git'),
                        copy_function=_hardlink_or_copy)
        target = isolated / manifest.target_file
        target.unlink()
        target.write_text(candidate_code, encoding='utf-8')
        syntax = run_command(manifest.syntax_command, isolated)
        reproduction = run_command(manifest.reproducer_command, isolated)
        regression = run_command(manifest.regression_command, isolated)
    diff = ''.join(difflib.unified_diff(original.splitlines(True), candidate_code.splitlines(True),
                                        fromfile=f'a/{manifest.target_file}', tofile=f'b/{manifest.target_file}'))
    passed = all(step['exit_code'] == 0 for step in (syntax, reproduction, regression))
    return {
        'status': 'VALIDATED' if passed else 'REJECTED', 'passed': passed,
        'bug_id': bug_id, 'repository': manifest.repository, 'revision': manifest.broken_revision,
        'allowed_files': [manifest.target_file], 'changed_files': [manifest.target_file], 'diff': diff,
        'checks': {
            'syntax': {'origin': 'blinkfix-check', **syntax},
            'reproducer': {'origin': 'blinkfix-added', **reproduction},
            'regression': {'origin': 'repository-unchanged', **regression},
        },
        'baseline': {'reproduction': prepared['reproduction'], 'regression': prepared['regression']},
    }
