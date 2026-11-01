"""Reproduce original/bad failures and correct success; save raw evidence."""
import json
from pathlib import Path
from app.services.patch_validator import FIXTURE, validate_candidate

root = Path(__file__).resolve().parent
cases = {'original': FIXTURE / 'payments.cjs',
         'bad-fallback': root / 'fixtures/candidates/bad.cjs',
         'correct': root / 'fixtures/candidates/correct.cjs'}
results = [validate_candidate(path.read_text(), name) for name, path in cases.items()]
for result in results:
    v = result['validation']
    print(f"{result['id']}: syntax={v['syntax']['exit_code']} tests={v['tests']['exit_code']}")
assert [r['validation']['passed'] for r in results] == [False, False, True]
output = root / 'evidence/fixture.json'
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'Raw evidence: {output}')
