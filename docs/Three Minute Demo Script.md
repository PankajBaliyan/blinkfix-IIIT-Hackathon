# Three-minute demo script

## 0:00-0:25 — Contract and readiness

“Blinkfix handles one code bug and one infrastructure outage. The checkout
contract never guesses a currency or exchange rate because a `1.0` fallback can
silently charge the wrong amount.”

Show the **Integration setup** panel. Point out that it exposes readiness without
revealing secrets and that **publishing defaults off**.

## 0:25-1:20 — Code bug, evidence first

Use **Offline fixture candidates** for the reliable stage path, or **Live** after
credentials have passed rehearsal. Click **Run incident**.

“The timer is backend execution time in milliseconds. Five roles analyze the
same supplied source and actual failure evidence. In fixture mode they are
clearly marked skipped; no model work is implied.”

Show:

1. **Original failure** — syntax succeeds but regressions fail.
2. **Rejected candidate** — the tempting `1.0` fallback also fails.
3. **Passing winner** — selected only after syntax and all 22 regressions pass.

For a live run, describe only the candidates that actually appeared. Do not
promise that one candidate will fail.

## 1:20-2:05 — Verified publication

Use the previously rehearsed live publishing run. Open the **Verified draft pull
request** card and then its real GitHub URL.

“Blinkfix re-runs the winner at the publication boundary, checks that the remote
broken source matches the supplied source, commits the fixed file, tests,
contract, and raw execution evidence, and only then opens a draft PR.”

Show the GitHub Files changed tab and the committed evidence JSON. State the
actual duration shown in the UI, even when it exceeds two seconds.

If credentials are unavailable on stage, say: “This is the labeled offline
fallback; it uses the same real execution gate but does not call models or
publish.” Do not show a mock PR link.

## 2:05-2:35 — Infrastructure stop condition

Select **Payment gateway outage (503 fixture)** and run it.

“This telemetry is explicitly simulated. The local service is healthy and the
upstream gateway returns 503, so Blinkfix recommends containment and stops.”

Point out that there are **zero candidates and no PR**. This demonstrates that
the system does not turn every incident into a code change.

## 2:35-3:00 — Rehearsal measurements and close

Show **Last five live rehearsals**.

“Across five consecutive live runs: [read successful count], [read total
duration], [read model failures], and [read publication failures]. These are
durable measurements from live checkout runs; offline and infrastructure runs
are excluded.”

Close with: “Blinkfix produces a draft for human review only after executable
evidence passes, and it stops when code is not the right intervention.”

