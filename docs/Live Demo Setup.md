# Live demo setup

This checklist keeps publishing disabled until the local repair path has passed.
Never paste credentials into chat, screenshots, source control, or the browser.

## 1. Runtime setup

From the project root in PowerShell:

```powershell
cd client
npm.cmd ci
npm.cmd run build

cd ..\server
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe verify_fixture.py
```

Expected: frontend build succeeds, backend tests pass, original and bad fallback
fail, and the correct fixture passes all 22 regressions. Node 24.21.x is required.

## 2. Local environment

If `server/.env` does not exist:

```powershell
Copy-Item .env.example .env
```

Edit `server/.env` locally. Do not quote values unless the value itself requires
quotes.

```dotenv
CEREBRAS_API_KEY=<local-secret>
CEREBRAS_MODEL=<model-enabled-for-your-account>
OPENAI_API_KEY=<local-secret>
CODEX_MODEL=gpt-5.3-codex

# Dedicated disposable demo repository only
GITHUB_TOKEN=<fine-grained-token>
GITHUB_OWNER=<demo-owner-or-organization>
GITHUB_REPO=<dedicated-demo-repository>
GITHUB_TARGET_FILE=payments.cjs
```

The GitHub token needs **Contents: read/write** and **Pull requests: read/write**
for the dedicated repository only. Do not target this Blinkfix workspace or a
primary application repository.

Create the dedicated repository with one file at its root: copy the exact
contents of `server/fixtures/checkout/payments.cjs` to `payments.cjs` and commit
it to the default branch. Do not pre-add the regression suite; Blinkfix commits
`payments.test.cjs`, `CONTRACT.md`, and `blinkfix-evidence/<incident>.json` with
the winner. The remote source-match gate rejects any different target content.

## 3. Start and inspect readiness

Backend terminal:

```powershell
cd server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd client
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173. The Integration setup panel exposes only readiness
booleans and non-secret model/repository names. It must show Cerebras, OpenAI
Codex, and GitHub publishing as ready before the live publishing rehearsal.

You can inspect the same non-secret status directly:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health | ConvertTo-Json -Depth 5
```

## 4. First live repair without publishing

1. Select **Checkout currency metadata bug**.
2. Select **Live Cerebras analysis + Codex generation**.
3. Leave **Publish verified winner** unchecked.
4. Run the incident.
5. Confirm all five panels complete with actual durations.
6. Confirm Codex candidates appear exactly as returned.
7. Confirm a winner exists only if syntax and all regressions exit with `0`.
8. Record the displayed backend duration. Do not claim a sub-two-second result
   unless that is the measured result.

If a provider fails or all candidates fail, keep the failed result as evidence,
fix the credential/model issue, and run a new incident. The app never fabricates
success.

## 5. Publishing rehearsal

Only after step 4 passes:

1. Re-check the Integration setup repository name and target file.
2. Check **Publish verified winner** for this run only.
3. Run the checkout incident.
4. Open the returned draft PR link.
5. Verify the changed `payments.cjs`, committed `payments.test.cjs`, committed
   `CONTRACT.md`, and `blinkfix-evidence/<incident>.json`.
6. Verify the PR body contains actual test output and both exit codes are `0`.
7. Verify the displayed commit SHA and branch match GitHub.

Publishing is false for every new browser session and is forcibly disabled in
offline fixture mode and the infrastructure scenario.

## 6. Five live rehearsals

Run five consecutive live checkout repairs. Use publishing only when each run is
intended to create a separate draft PR; otherwise keep it off. The Last five live
rehearsals table records status, duration, model failures, publication failures,
and publication result. Offline and infrastructure runs are excluded.

Afterward, copy the measured totals from that table into the pitch. Do not count
mock-provider unit tests as live rehearsals.

