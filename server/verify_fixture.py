"""Reproduce original/bad failures and correct success; save raw evidence."""
import json
import re
from pathlib import Path
from app.services.patch_validator import FIXTURE, validate_candidate

root = Path(__file__).resolve().parent
cases = {'original': FIXTURE / 'payments.cjs',
         'bad-fallback': root / 'fixtures/candidates/bad.cjs',
         'correct': root / 'fixtures/candidates/correct.cjs'}
results = [validate_candidate(path.read_text(), name) for name, path in cases.items()]

def sanitize_local_paths(value):
    if isinstance(value, str):
        return re.sub(
            r'(?i)[A-Z]:(?:\\\\|\\)Users(?:\\\\|\\)[^\\]+(?:\\\\|\\)',
            lambda match: '<USER_HOME>' + ('\\\\' if '\\\\' in match.group(0) else '\\'),
            value,
        )
    if isinstance(value, list):
        return [sanitize_local_paths(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_local_paths(item) for key, item in value.items()}
    return value

results = sanitize_local_paths(results)
for result in results:
    v = result['validation']
    print(f"{result['id']}: syntax={v['syntax']['exit_code']} tests={v['tests']['exit_code']}")
assert [r['validation']['passed'] for r in results] == [False, False, True]
output = root / 'evidence/fixture.json'
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'Raw evidence: {output}')

repository_evidence = root / 'evidence/express-4893-reproduction.json'
if repository_evidence.exists():
    recorded = json.loads(repository_evidence.read_text(encoding='utf-8'))
    repository_evidence.write_text(
        json.dumps(sanitize_local_paths(recorded), indent=2) + '\n', encoding='utf-8')
