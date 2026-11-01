"""Fresh fixture copies, real Node execution. Local development runner only.

Node permissions deny filesystem writes/subprocesses; temporary copies are file
isolation, not an OS security sandbox. Never expose to untrusted users.
"""
import difflib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

FIXTURE = Path(__file__).resolve().parents[2] / 'fixtures' / 'checkout'
TARGET = 'payments.cjs'


def execute(args, cwd):
    try:
        env = {k: v for k, v in os.environ.items() if k.upper() in
               {'SYSTEMROOT', 'WINDIR', 'PATH', 'TEMP', 'TMP'}}
        result = subprocess.run([shutil.which('node') or 'node', *args], cwd=cwd,
                                env=env, capture_output=True, text=True,
                                encoding='utf-8', errors='replace', timeout=10)
        return {'command': ['node', *args], 'exit_code': result.returncode,
                'stdout': result.stdout[-30000:], 'stderr': result.stderr[-10000:]}
    except subprocess.TimeoutExpired as exc:
        def decode(value):
            return value.decode('utf-8', errors='replace') if isinstance(value, bytes) else value or ''
        return {'command': ['node', *args], 'exit_code': 124,
                'stdout': decode(exc.stdout)[-30000:],
                'stderr': decode(exc.stderr)[-10000:] + '\nExecution timed out after 10s'}
    except OSError as exc:
        return {'command': ['node', *args], 'exit_code': 127, 'stdout': '', 'stderr': str(exc)}


def validate_candidate(code, candidate_id='candidate', original=None):
    original = original if original is not None else (FIXTURE / TARGET).read_text(encoding='utf-8')
    with tempfile.TemporaryDirectory(prefix='blinkfix-') as directory:
        root = Path(directory)
        shutil.copytree(FIXTURE, root, dirs_exist_ok=True)
        (root / TARGET).write_text(code, encoding='utf-8')
        syntax = execute(['--check', TARGET], root)
        tests = execute(['--permission', '--allow-fs-read=.', '--test',
                         '--test-isolation=none', '--test-reporter=tap', 'payments.test.cjs'], root)
    passed = syntax['exit_code'] == 0 and tests['exit_code'] == 0
    diff = ''.join(difflib.unified_diff(original.splitlines(True), code.splitlines(True),
                                      fromfile=TARGET, tofile=TARGET))
    return {'id': candidate_id, 'title': candidate_id, 'strategy': candidate_id,
            'explanation': 'Executed against the checkout currency contract.',
            'confidence': 0, 'isWinner': False, 'code': code, 'diff': diff,
            'validation': {'targetFileMatch': True, 'astSyntaxValid': syntax['exit_code'] == 0,
                           'unitTestsPassed': 'passed' if passed else 'failed',
                           'diffLineChange': f'{len(diff.splitlines())} diff lines',
                           'score': 100 if passed else 0, 'passed': passed,
                           'syntax': syntax, 'tests': tests}}


def rank_and_select_winner(patches, original=None):
    results = [validate_candidate(p['code'], p['id'], original) for p in patches]
    eligible = [p for p in results if p['validation']['passed']]
    if eligible:
        min(eligible, key=lambda p: len(p['diff']))['isWinner'] = True
    return results
