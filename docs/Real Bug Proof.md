# Real bug proof: Express response header conflict

## Selection and provenance

- Repository: `expressjs/express`
- Public report and repair PR: https://github.com/expressjs/express/pull/4893
- Reported behavior: `res.send()` adds `Content-Length` even when the application has set `Transfer-Encoding`. HTTP responses must not contain both framing headers.
- Broken revision: `947b6b7d57939d1a3b33ce008765f9aba3eb6f70`, the parent of the first repair commit in PR 4893.
- Upstream merge commit reserved for later comparison: `18e5985b8a9d5e8423db0a9121f22bdaecd5b120`.
- Upstream release documentation: Express v5.3.0 identifies PR 4893 as the fix.

The upstream patch and its added tests are evaluation-only. BlinkFix records their identifiers for provenance but does not fetch or include their contents in reproduction, analysis, or patch-generation prompts.

## Scope

BlinkFix supports this repository as the first real-repository target. The allowed repair surface is `lib/response.js`. The original repository tests remain unchanged. BlinkFix adds its reproducer under `.blinkfix-tests/`, clearly separated from the repository suite.

The reproducer starts the real Express application at the broken revision, requests a route that sets `Transfer-Encoding: chunked` and calls `res.send('hello')`, captures the raw HTTP response, and asserts that `Content-Length` is absent. At the broken revision it fails while showing both headers. The existing focused `test/res.send.js` suite passes independently, demonstrating that the report covers a missing regression.

## Environment requirements

- Git with HTTPS access to GitHub.
- Node.js 24.21.x and npm 11.x for the recorded BlinkFix run. The historical Express package declares Node `>=0.10.0`, but this proof certifies only the recorded Node 24 environment.
- Network access for the initial clone and dependency installation. The selected revision has no lockfile, so installation uses its declared dependency ranges and is less deterministic than a lockfile-based build. BlinkFix records this limitation and abstains if installation fails.
- Windows PowerShell is the currently verified host. Commands are stored as argument arrays and run without a shell.

## Acceptance criteria

1. Clone the public repository and verify the exact broken Git SHA before running any code.
2. Add only the BlinkFix reproducer and show that it fails on the unmodified broken revision.
3. Preserve all repository tests and record a clean baseline for the focused existing suite.
4. Give analysis and patch generation only the original report, pre-fix source, pre-fix history/diffs, reproducer failure, and unchanged pre-fix tests. Exclude the upstream patch and post-fix tests.
5. Restrict candidates to `lib/response.js`; reject changes elsewhere.
6. Run syntax checking, the added reproducer, and the unchanged focused suite for every candidate. A winner must pass all three.
7. Capture repository URL, exact SHA, commands, exit codes, output, candidate diff, and whether each test is BlinkFix-added or repository-owned.
8. Abstain with no PR when checkout, installation, reproduction, context, candidate constraints, or executable verification fails.
9. Compare with one single-agent run using identical report, context, model, allowed file, commands, and success criteria. Record correctness, wall-clock time, reported token usage/cost when available, and reviewer effort. Parallel execution has no presumed advantage.

## Comparison protocol

Both arms receive the same report, broken SHA, target source, reproducer output, unchanged regression result, Git history/diff, allowed file, and validation commands. Both use the configured Cerebras model for analysis and the configured Codex model for candidate generation. The parallel arm uses four model-backed specialist analyses plus one deterministic infrastructure abstention; the single arm uses one generalist Cerebras analysis. Both then use one Codex generation request and the same executable validator. Temperature and output limits remain identical.

For each arm, record whether a valid winner exists, total wall-clock duration, provider token usage, calculated cost only when an authoritative configured price is available, number of files and diff lines presented to a reviewer, and manually measured review minutes. Run order should alternate between repetitions. Do not compare against the reserved upstream patch until both arms have completed, and do not expose the upstream patch or post-fix tests to either arm.

## Initial environment check

On 2026-11-01, BlinkFix checked out the broken SHA and independently ran the reproducer. It failed because the raw response contained both `Transfer-Encoding: chunked` and `Content-Length: 5`. The unchanged focused repository suite passed 70 tests. These are measured environment results, not model inference or live repair success.
