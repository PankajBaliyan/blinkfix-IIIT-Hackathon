# BlinkFix architecture

BlinkFix has one repair path and one infrastructure stop path. The browser sends an idempotent run request to FastAPI and receives durable state through snapshot reads plus replayable server-sent events. SQLite commits each state revision and event together. The client ignores revisions older than the state it already displays.

## Repair path

1. The orchestrator runs the immutable checkout regression suite against the supplied `payments.cjs`. A passing baseline stops because the reported bug did not reproduce.
2. Five Cerebras calls run concurrently. They analyze only the supplied source, contract, test failure, and other supplied evidence. Each response must match the backend analysis schema. Any failed or malformed response remains visible and stops patch generation.
3. Codex receives the source, actual error, contract, immutable tests, and the five analyses. Its concrete role is to return one to three complete candidate versions of `payments.cjs`. Its JSON must match the candidate schema. Codex does not choose the winner and cannot report a test result.
4. The execution service copies each candidate into a fresh temporary fixture, runs `node --check`, then the independent Node regression suite. It captures commands, exit codes, stdout, stderr, and timeouts. Only candidates that pass both commands can win; the smallest passing diff wins.
5. Publishing is optional and off by default. A per-incident database claim prevents a second publication attempt. The GitHub service revalidates the winner, verifies that the remote target still equals the supplied broken source, commits the winner plus tests, contract, and execution evidence, then opens a draft PR. Publishing failure retains validation evidence in a separate `PUBLISH_FAILED` state.

## Infrastructure path

The infrastructure fixture is supplied 503 telemetry. It returns a mitigation recommendation and exits before provider analysis, candidate generation, execution, or GitHub publication. It does not claim a live probe or verified recovery.

## Boundaries and recovery

- Provider clients own HTTP timeouts and response validation.
- The orchestrator owns state transitions and the infrastructure stop condition.
- The validator owns temporary workspaces and executable proof.
- SQLite owns snapshots, ordered events, idempotent submissions, and publication claims.
- The GitHub service owns remote source checks, commit creation, and draft PR creation.
- The React client owns presentation, reconnect messaging, revision ordering, and elapsed time.

On stream loss, EventSource reconnects while the client fetches the latest snapshot. On reload, the incident ID in local storage restores durable state. A backend restart marks interrupted work failed because in-process provider or execution work cannot be resumed safely.

Execution uses temporary directories, a minimal environment, timeouts, and Node permission flags. This is local development isolation, not a complete security sandbox: it does not provide an OS or container boundary, and Node permission mode does not isolate network access.
