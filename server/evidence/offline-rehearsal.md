# Offline rehearsal evidence

Date: 2026-11-01  
Environment: local Windows development workspace, Node 24.21.0  
Interface: http://127.0.0.1:5173

## Checkout code-bug fixture

- Result: `VALIDATED`
- Backend duration shown by UI: **535 ms**
- Data label: **OFFLINE FIXTURE MODE**
- Five role panels: Trace Analyst, Git Detective, Infra Checker, Impact Analyst,
  Mitigation Planner. Each is marked `SKIPPED` because fixture mode makes no
  model calls.
- Original: syntax exit `0`, regression exit `1` — **ORIGINAL FAILURE**
- Bad `1.0` fallback: syntax exit `0`, regression exit `1` — **REJECTED CANDIDATE**
- Correct validation: syntax exit `0`, regression exit `0` — **PASSING WINNER**
- Publishing: disabled; no PR created or implied.

The detailed TAP output and source/diff evidence remain in `fixture.json`.

## Infrastructure fixture

- Result: `MITIGATED`
- Backend duration shown by UI: **3 ms**
- Data label: **SIMULATED INFRASTRUCTURE TELEMETRY**
- Input: deterministic upstream payment-gateway HTTP 503 fixture; no live probe.
- Recommendation: pause checkout, use bounded retries/circuit breaker, contact
  the provider.
- Candidate patches: **0**
- PR links: **0**
- Publishing: disabled.

## UI checks

- No page runtime errors were observed during either clean-page rehearsal.
- Integration status exposed readiness booleans and non-secret names only.
- Offline fixture ready; Cerebras, OpenAI Codex, and GitHub publishing reported
  not configured.
- Publishing checkbox was disabled in both rehearsals.

