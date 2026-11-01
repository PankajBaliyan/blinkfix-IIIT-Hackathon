"""CLI for the configured real-repository proof. Live repair requires provider credentials."""
import argparse
import asyncio
import json
from pathlib import Path
from app.services.real_bug_orchestrator import repair_real_bug
from app.services.repository_workflow import prepare_repository, validate_repository_candidate


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--bug', default='express-4893')
    parser.add_argument('--candidate', type=Path, help='Validate a complete replacement for the configured target file')
    parser.add_argument('--repair', choices=('parallel', 'single'), help='Run live model generation after reproduction')
    args = parser.parse_args()
    if args.candidate:
        result = validate_repository_candidate(args.bug, args.candidate.read_text(encoding='utf-8'))
    elif args.repair:
        result = asyncio.run(repair_real_bug(args.bug, args.repair))
    else:
        result = prepare_repository(args.bug)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
