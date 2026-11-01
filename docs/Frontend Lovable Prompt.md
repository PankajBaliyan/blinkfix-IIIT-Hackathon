# Blinkfix / Swarm Zero: Master Lovable Frontend Prompt

> **Usage:** Copy the prompt in the block below and paste it directly into **[Lovable.dev](https://lovable.dev)** to generate the complete, high-end SRE Mission Control Dashboard.

---

```markdown
You are an elite principal frontend engineer and UI/UX designer specializing in mission-critical developer tools, cybersecurity operations centers, and modern SRE dashboards (inspired by Datadog, Linear, Vercel, and Cloudflare).

Build a production-grade, highly reactive, dark-mode SRE Mission Control Cockpit called "Blinkfix // Swarm Zero" — an autonomous AI-powered incident response platform that detects crashes, runs a parallel swarm of 5 AI specialist agents, generates speculative code patches, and opens a verified GitHub Pull Request with sub-2-second target MTTR.

---

### 1. Visual Aesthetics & Design System
* **Theme:** Deep space / terminal cyberpunk dark mode.
  - Background base: `#07090e` (ultra-dark obsidian) with subtle mesh gradients (`bg-radial from-slate-900/40 to-transparent`).
  - Surface cards: `#0d111a` with borders in `border-slate-800/80` or `border-slate-700/50`.
  - Accent colors:
    - Primary Tech Blue: `#38bdf8` / `#0284c7`
    - Alert / P0 Red: `#ef4444` / `#f87171` with subtle pulse glow
    - Success / Green: `#10b981` / `#34d399`
    - Warning / Mitigation Amber: `#f59e0b` / `#fbbf24`
    - Agent Neon Violet: `#8b5cf6` / `#a855f7`
* **Typography:**
  - UI Labels & Headers: `Inter` or `Geist` (clean, tight letter-spacing, semi-bold/medium).
  - Code, Logs & Stopwatches: `JetBrains Mono` or `Fira Code` (crisp monospace font with tabular figures).
* **Micro-interactions:** Smooth state transitions, glowing status orbs, typing/streaming log animations, copy-to-clipboard buttons, and collapsible terminal drawers.

---

### 2. Complete Layout & Component Hierarchy

#### A. Top Navigation Bar (Command Header)
* **Left:** Brand logo with glowing green pulse orb: `BLINKFIX` with monospace subtext `// SWARM ZERO: AUTONOMOUS SRE ENGINE`.
* **Center:** Target Environment Pill: `checkout-service (prod-us-east-1)` + `v1.0.4` + `HEAD: abc104`.
* **Right Controls:**
  - **Scenario Dropdown Selector:**
    1. "TypeError in payments.js (Currency Null Pointer) - Recommended"
    2. "Upstream Stripe Gateway Timeout (Infra Degradation)"
    3. "Auth Token Null Pointer in auth.js"
  - **Simulate Outage Button (Hero CTA):** High-impact button with red/amber gradient and glowing border: `⚡ SIMULATE OUTAGE`.
  - **Reset Demo Button:** Returns system to idle ready state.
  - **Sound / FX Toggle:** Monospace toggle for audio click/siren feedback.

#### B. The Incident Cockpit & T-Zero Stopwatch Bar
* **Left Card (Incident Status Card):**
  - Severity Badge: `P0 - CRITICAL INCIDENT` (pulsing red).
  - Active Error: `TypeError: Cannot read properties of undefined (reading 'exchangeRate')`
  - Location: `src/payments.js:5` in `processPayment()`
  - Detection Source: `Sentry Webhook (Ingested in 12ms)`
* **Right Card (The T-Zero Stopwatch):**
  - Massive digital millisecond stopwatch: `00:01.842`
  - Sub-label: `T-ZERO TO RESOLUTION (MTTR)`
  - Status Pill: Changes dynamically:
    - Idle: `STANDBY [00:00.000]` (slate)
    - In-flight: `AUTONOMOUS TRIAGE IN PROGRESS...` (pulsing yellow)
    - Resolved: `MTTR ACHIEVED: 1.84s (SUB-2S RECOVERY)` (glowing emerald green)

#### C. The Parallel Agent Swarm Grid (The Visual Centerpiece)
Display a 5-card responsive grid representing the 5 autonomous AI specialists running concurrently on Cerebras inference:

1. **Git Detective (Commit Delta & Blame)**
   - Icon: GitCommit / History
   - Status Badge: `COMPLETED (410ms)`
   - Analysis: Highlights culprit commit `abc104` by `alex@company.com` ("Refactor payment currency conversion").
   - Confidence: `98% Confidence Match`

2. **Trace Analyst (Stack Trace & Frame Localization)**
   - Icon: Terminal / Bug
   - Status Badge: `COMPLETED (380ms)`
   - Analysis: Pinpoints line 5 in `src/payments.js`. Identifies null dereference when `cart.currency` is missing.
   - Code snippet preview with red highlighted syntax error line.

3. **Infra / Dependency Checker (Upstream Health)**
   - Icon: Server / Network
   - Status Badge: `COMPLETED (290ms)`
   - Analysis: Verifies Stripe API status (`HEALTHY - 200 OK`), Redis (`HEALTHY`). Concludes: `LOCAL_CODE_BUG` (not an infra outage).

4. **Impact Analyst (Blast Radius & Risk)**
   - Icon: Activity / Flame
   - Status Badge: `COMPLETED (450ms)`
   - Analysis: Blast radius: `European Checkout Flow (14.2% of traffic)`. Severity: `P0 Revenue Impact`. Regression Risk: `High`.

5. **Mitigation Planner (Immediate Containment)**
   - Icon: ShieldAlert / RotateCcw
   - Status Badge: `COMPLETED (320ms)`
   - Recommendation: `Immediate rollback of PR #104 recommended while patch is speculatively verified`.
   - Requires Human Gate: `Yes`.

*Each Agent Terminal must feature:*
- Terminal window title bar with colored dot buttons (macOS style).
- Latency telemetry badge (e.g. `⚡ 380ms`).
- Streaming log box with simulated typewriter typing effect.
- Expandable / collapsible JSON findings toggle.

#### D. Immediate Mitigation & Human Approval Banner
* Appears immediately once Mitigation Planner completes:
* Amber/Red alert banner:
  - Text: **⚠️ Immediate Mitigation Available:** *"Suspected regression introduced by PR #104. Recommended action: Rollback checkout service to deployment v1.0.3."*
  - Interactive Action Buttons:
    - **`[Approve Immediate Rollback]`** button (triggers simulated rollback with success badge: *"Rollback dispatched via Kubernetes API"*).
    - **`[Dismiss & Await Patch]`** button.

#### E. Speculative Multi-Patching & Validation Showcase
* Displays the speculative repair pipeline where 5 candidate patches are generated simultaneously:
* Tabs or cards for all 5 patches:
  - **Patch A (Winner ⭐️):** Standard ES6 Optional Chaining (`cart?.currency?.exchangeRate ?? 1.0`)
  - **Patch B:** Strict Runtime Type-Checking (`typeof cart.currency === 'object'`)
  - **Patch C:** Defensive Fallback Object (`cart.currency || DEFAULT_CURRENCY`)
  - **Patch D:** Minimal AST Edit
  - **Patch E:** Guard Clause Early Return
* Validation Gates Checklist per patch:
  - `[✔] Target File Match (src/payments.js)`
  - `[✔] AST Syntax Valid (Babel/TS Parser)`
  - `[✔] Unit Tests Passing (3/3 passed in 120ms)`
  - `[✔] Diff Minimality Score: 96/100`
* Clearly highlights **Patch A** with a glowing green "WINNING PATCH SELECTED" badge.

#### F. Resolution & Action Panel (The Bottom Line)
* **Code Diff Viewer:**
  - Interactive split or unified code diff showing `src/payments.js`:
    - Red `- const amountInCents = cart.total * cart.currency.exchangeRate;`
    - Green `+ const amountInCents = cart.total * (cart?.currency?.exchangeRate ?? 1.0);`
* **Verified GitHub PR Card:**
  - Pull Request Title: `[Swarm Zero] Automated fix for payment TypeError in payments.js (#105)`
  - Branch: `swarm-zero/fix/incident-001` $\rightarrow$ `main`
  - Action Button: **`[View Draft PR on GitHub ↗]`** (external link style) + **`[Copy PR Link]`**.
* **Slack Broadcast Preview Card:**
  - Mini Slack-style card showing the exact Block Kit message dispatched to `#incident-room`:
    `🚨 P0 Incident Resolved in 1.84s | Culprit: PR #104 | PR #105 Ready for Review`

---

### 3. Interactive State Machine & Autonomous Simulation

The UI must include a fully functional, zero-backend interactive simulation mode so it can be demonstrated live without external APIs:

1. **State 1: STANDBY / ARMED (Initial)**
   - Stopwatch reads `00:00.000`.
   - All 5 agent terminals show `IDLE / READY`.
   - Incident panel shows `SYSTEM NOMINAL - LISTENING FOR CRASH WEBHOOKS`.

2. **State 2: CRASH TRIGGERED (T = 0.0s)**
   - User clicks **"⚡ SIMULATE OUTAGE"**.
   - Alarm pulse animation on incident banner.
   - Stopwatch immediately begins ticking up smoothly in milliseconds (60 FPS `requestAnimationFrame`).
   - Incident banner updates to `P0 - TypeError in payments.js`.

3. **State 3: PARALLEL AGENT BURST (T = 0.1s - 0.7s)**
   - All 5 agent terminals switch simultaneously to `THINKING / ANALYZING`.
   - Terminal logs stream in with rapid typewriter animation.
   - Terminals turn green one by one as they complete (between 290ms and 450ms).

4. **State 4: MITIGATION BANNER POPS UP (T = 0.8s)**
   - The rollback recommendation banner animates into view.

5. **State 5: SPECULATIVE PATCH VALIDATION (T = 1.0s - 1.5s)**
   - The 5 candidate patch cards animate. Checkmarks sequentially pop onto validation gates.
   - Patch A receives the green "WINNER" badge.

6. **State 6: RESOLVED & VERIFIED PR (T = 1.84s)**
   - Stopwatch freezes at exact simulated duration (e.g. `00:01.842`).
   - GitHub Draft PR card and Code Diff viewer animate into full view.
   - Green success confetti / celebratory subtle glow.
   - Slack alert preview confirms broadcast.

---

### 4. Technical Implementation Details for Lovable
* **Framework:** React + TypeScript + Tailwind CSS.
* **Icons:** `lucide-react` (Terminal, GitCommit, GitPullRequest, Bug, ShieldAlert, Activity, CheckCircle2, AlertTriangle, Play, RotateCcw, Copy, ExternalLink, Zap).
* **State Management:** Single comprehensive `useIncidentSimulation` hook managing timer, incident state, agent log streams, active scenario, and simulated latency.
* **Styling Polish:**
  - Custom scrollbars for terminals (`scrollbar-thin scrollbar-thumb-slate-800`).
  - Code blocks with syntax highlighting styling (dark background `#090d16`, line numbers, subtle diff tints).
  - Responsive layout (looks stunning on desktop 1440px+ and handles tablets gracefully).
* **Provide realistic fallback data** for all 3 scenarios so switching scenarios immediately updates the mock stack trace, commit history, and code diff.

Make this look like a 100M-dollar enterprise SRE platform that will blow judges away during a demo!
```

---

## 2. Quick Tips for Using with Lovable

1. **New Project Setup in Lovable:**
   - Create a new project in Lovable.
   - Paste the complete prompt above into the prompt input box.
   - Lovable will generate the application with all required subcomponents (`Dashboard`, `AgentTerminal`, `Timer`, `PatchComparison`, `ResolutionPanel`, and `MitigationPanel`).

2. **Iterative Refinement Prompts (Follow-ups in Lovable):**
   - *For Timer Precision:*  
     `"Ensure the T-Zero millisecond timer runs smoothly at 60 FPS using requestAnimationFrame and freezes automatically at 1.842s when the simulation completes."`
   - *For Code Diff:*  
     `"Make the code diff viewer in ResolutionPanel look identical to GitHub's unified diff view with line numbers, red minus rows, and green plus rows."`
   - *For Sound FX:*  
     `"Add subtle Web Audio API clicks for the Simulate Outage button and agent completion chimes with a mute toggle in the top navbar."`
   - *For Terminal Typography:*  
     `"Ensure all agent terminal text and diff views use a crisp monospace font like JetBrains Mono with custom dark scrollbars."`

