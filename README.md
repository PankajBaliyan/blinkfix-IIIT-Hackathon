# Blinkfix

Hackathon scope: one reproducible checkout currency bug and one explicit
payment-gateway outage fixture. React UI, FastAPI backend, Node regressions,
Cerebras parallel analysis, and Codex candidate generation. Slack is deferred.

The next milestone adds one configured real-repository proof: Express PR 4893
at a pinned pre-fix revision. Its provenance, environment limits, data-leakage
boundary, and acceptance criteria are in [Real Bug Proof](docs/Real%20Bug%20Proof.md).
The checkout fixture remains the offline fallback.

From `server`, reproduce the real bug without calling a model:

```powershell
.\.venv\Scripts\python.exe run_real_bug.py --bug express-4893
```

The command clones or resets the configured repository, verifies its exact SHA,
installs dependencies when needed, runs the unchanged focused repository suite,
then requires the BlinkFix-added reproducer to fail. A failure to reproduce is
an abstention and prevents analysis, candidate generation, and publication.
Live `--repair parallel` and `--repair single` modes remain unavailable until
credentials are configured; neither mode publishes a PR in this milestone.

## Currency behavior and proof

Read the [currency contract](server/fixtures/checkout/CONTRACT.md) first.
Missing or invalid FX metadata must reject before charging. There is **no rate
of 1.0 or USD fallback**. Valid explicit rates convert source minor units into
destination minor units, rounded to an integer. USD and EUR are the only fixture
currencies. The injected charge gateway never moves money.

From `server`, reproduce all three cases:

```powershell
.\.venv\Scripts\python.exe verify_fixture.py
```

| Case | JavaScript syntax exit | Regression exit | Result |
| --- | --- | --- | --- |
| Original | 0 | 1 | 3/22 pass; missing metadata throws the wrong error |
| Bad `1.0` fallback | 0 | 1 | 3/22 pass; can silently charge invalid metadata |
| Correct rejection | 0 | 0 | 22/22 pass |

Full commands, exit codes, TAP output, source and diffs are in
[fixture evidence](server/evidence/fixture.json). The original stays broken on
purpose so every run can reproduce the regression.

## Setup and run (Windows PowerShell)

Tested with Node 24.21.0 and Python 3.14.7. Use Node 24 as specified by
[.node-version](.node-version); the validator requires Node permission mode and
in-process test isolation. Python runtime packages are pinned in
[requirements.lock.txt](server/requirements.lock.txt).

```powershell
cd client
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

In another terminal, from the project root:

```powershell
cd server
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
# Only if .env does not already exist:
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:5173. API docs: http://127.0.0.1:8000/docs.
VS Code also has backend/frontend tasks in [.vscode/tasks.json](.vscode/tasks.json).
Use `server/.venv` on Windows; the bundled `server/venv` is from another OS.

## Execution choices

- **Live**: reproduce against supplied source; call five Cerebras
  roles concurrently (Trace Analyst, Git Detective, Infra Checker, Impact
  Analyst, and Mitigation Planner) with source, actual error output and contract;
  persist each result as it arrives; call
  Codex through the OpenAI Responses API for complete candidate files; execute
  each candidate against the immutable suite. Missing credentials, provider
  HTTP errors, malformed output and timeouts fail the run visibly. No fallback.
- **Offline fixture** (default): named bad/correct files replace model calls, but run the
  same real validator. This is explicitly labeled and cannot publish PRs.
- **Infrastructure fixture**: supplied 503 gateway telemetry returns mitigation
  and stops before analysis, patch generation, execution or publication. It is
  not a live Stripe probe. There is no rollback execution or Slack integration.

Set `CEREBRAS_API_KEY`, `CEREBRAS_MODEL`, `OPENAI_API_KEY`, and `CODEX_MODEL` in
`server/.env` for live runs. Select model IDs accessible to those accounts.
`DEMO_MODE` is obsolete and does not enable fallback in this pipeline.
Model failures are persisted as `FAILED`; partial analysis failures also stop.

## Actual validation and publication

Each candidate gets a new temporary copy of the fixture. Only `payments.cjs`
changes; tests are never generated or modified by the model. The runner executes
`node --check payments.cjs` and the Node test runner, capturing exit codes and
stdout/stderr. A command has a 10 second timeout. A candidate must pass both;
the smallest passing diff wins. If all fail, the run fails with no PR.

This is a **local development runner**, not an OS/container sandbox. Node
permission mode denies filesystem writes and subprocesses; filesystem reads
are restricted to the temporary copy. Network access is not isolated by Node
24 permission mode. Model/API secrets are removed from the subprocess
environment. Do not expose this runner publicly or run hostile source. Use a
container/VM boundary with resource limits before deployment.

To publish, configure `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, and
`GITHUB_TARGET_FILE` (default `payments.cjs`) in `server/.env`, then explicitly
enable publishing in the UI. Use a fixture repository containing the original
file. The token needs repository contents and pull request write access.
The pipeline revalidates the winner, checks the remote file matches the supplied
source, creates a tree with the winning file, regression suite, contract, and
raw evidence, creates a commit and branch, then opens a draft PR. The UI shows
the returned URL and commit SHA only after success. No invented commits or PRs.
If publication fails, `PUBLISH_FAILED` retains test evidence and shows the
failure; a branch/commit may remain if a later GitHub request failed.

The target must be named `payments.cjs` and live beside `payments.test.cjs`. The
fixture intentionally uses CommonJS and no dependencies. Publication is scoped
to this fixture, not arbitrary checkout applications or production deployment.

## State and verification

Snapshots and ordered events are committed together in SQLite. SSE replays
events emitted before subscription, resumes from `Last-Event-ID`, and closes on
terminal states. The browser recovers its last incident from local storage and
fetches a snapshot after stream errors. On backend restart, interrupted runs are
marked failed; they are not silently resumed or reported successful.
Elapsed time is measured from real execution, never a fixed demo duration.
The interface keeps five analysis panels visible, renders original/candidate
execution evidence, and shows the exact backend duration in milliseconds. Live
candidate outcomes are not shaped for the demo: every generated candidate may
pass or fail. The offline fixture remains the labeled, deterministic rejected-
candidate fallback.

The **Last five live rehearsals** panel counts only live checkout runs. It shows
successful runs, summed duration, model failures, publication failures, and each
run status. Run the five rehearsals only after live credentials and the dedicated
demo repository are configured; offline and infrastructure runs are excluded.

Use a repository created only for the demo, with the original broken
`payments.cjs` at `GITHUB_TARGET_FILE`. Do not point these settings at this app
or another primary repository. Before enabling publication, verify the token's
owner/repository and contents/pull-request write scope. The remote source-match
gate blocks publication if the file is not the exact supplied broken source.

```powershell
# From server:
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe verify_fixture.py
# From client:
npm.cmd run build
```

The backend tests exercise real JavaScript execution, failing candidates,
infrastructure stop, durable SSE replay, restart recovery, missing credentials,
provider failures and publication gates. Provider and GitHub HTTP tests use
mock transports: they validate request/response behavior and commit-before-PR
ordering, not live provider availability or a real GitHub write.
API request example: `POST /api/incidents/simulate` with
`{"scenarioId":"payments-typeerror","mode":"fixture","publish":false}`.
`source` optionally supplies a full replacement input file for reproduction;
the contract and regression suite remain fixed. Extra scenario IDs are rejected.

Provider references: [Cerebras Chat Completions](https://inference-docs.cerebras.ai/api-reference/chat-completions),
[OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses),
[Codex model](https://developers.openai.com/api/docs/models/gpt-5.3-codex).

Demo handoff: [live setup checklist](docs/Live%20Demo%20Setup.md) and
[three-minute demo script](docs/Three%20Minute%20Demo%20Script.md).
The implemented component boundaries and recovery behavior are documented in
[architecture](docs/Architecture.md).
The latest credential-free walkthrough is recorded in
[offline rehearsal evidence](server/evidence/offline-rehearsal.md).
