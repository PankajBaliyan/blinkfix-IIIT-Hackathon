# Blinkfix // Swarm Zero

**An autonomous incident-response system that turns a production crash into a verified fix, with minimal human effort.**

---

## 1. The Problem

When a production system fails, every minute counts. Large outages can cost over $10,000 per minute. Most of that time is not spent fixing the problem. It goes to the work around it:

- Reading through long logs and stack traces
- Working out which recent change caused the failure
- Deciding whether the fault is in our code or in an outside service
- Judging how many users and which features are affected
- Switching between monitoring, version control and chat tools
- Writing, testing and reviewing the fix

This delay is called **Mean Time To Resolution (MTTR)**. Blinkfix aims to cut it from hours to seconds.

---

## 2. The Core Idea

Instead of one engineer working through these steps one after another, Blinkfix runs a **swarm of specialist AI agents in parallel**. Each agent looks at the crash from a different angle, and the results are combined into a single picture. A safe immediate action is proposed while a permanent fix is prepared in the background.

The workflow is a closed loop:

**Detect → Investigate → Mitigate → Repair → Validate → Deliver**

---

## 3. How It Works

### Step 1: Detect
A monitoring tool (for example Sentry or Datadog) reports a crash. Blinkfix receives the report and starts a new incident automatically. A millisecond-accurate timer starts at the same moment, so the system's speed can be measured.

### Step 2: Investigate
Five specialist agents start at the same time. Each answers one question:

| Agent | Question it answers |
| :--- | :--- |
| **Trace Analyst** | Where exactly did the failure happen? |
| **Git Detective** | Which recent change introduced it, and who made it? |
| **Infra Checker** | Is this our bug, or is an outside service (payments, cache, database) failing? |
| **Impact Analyst** | How many users, features and requests are affected? |
| **Mitigation Planner** | What is the safest way to stop the damage right now? |

Because the agents run in parallel, total investigation time is roughly that of the slowest single agent, not the sum of all five.

### Step 3: Mitigate
While the permanent fix is still being built, Blinkfix recommends an immediate containment action, usually rolling back to the last known-good version. A human reviews the recommendation and approves it with one click. **The system recommends and a person decides.** This keeps people in control of risky production changes.

### Step 4: Repair
Rather than betting on a single guess, Blinkfix creates **five different candidate fixes at once**, each using a different strategy:

- Safe access with default values
- Strict checks on input types
- Defensive fallbacks for missing data
- The smallest possible edit
- Rejecting bad input early

Several approaches raise the chance that at least one is both correct and safe.

### Step 5: Validate
Every candidate passes through a series of quality gates:

1. **Scope check:** does it change the right place and nothing else?
2. **Syntax check:** is the code structurally valid?
3. **Test check:** do existing tests still pass, and does the fix resolve the failure?
4. **Size and risk check:** is the change small, with little chance of side effects?

Candidates are scored and ranked, and the best one wins.

### Step 6: Deliver
The winning fix is packaged as a **Draft Pull Request** for engineers to review, and a summary is posted to the team chat. The summary covers the root cause, the responsible change, the time taken and a link to the proposal. The fix is never merged automatically. A person always makes the final call.

---

## 4. The Mission Control Dashboard

A live dashboard shows the whole incident as it unfolds:

- **Live Incident Cockpit:** the headline incident, the running timer and the rollback approval
- **Agent Swarm:** what each agent is doing, how fast it responded and what it found
- **Patch Lab:** the five candidate fixes side by side, with their validation results
- **Resolution Hub:** the pull request and the chat notification
- **Service Topology:** how services connect, which outside dependencies are healthy, and where the damage spreads
- **Incident History:** past incidents and resolution-time trends
- **Settings:** configuration for the AI engine and integrations

Progress is streamed in real time, so viewers watch the agents work instead of waiting for a final report.

---

## 5. Design Principles

- **Speed:** parallel work and fast AI inference keep the whole loop to seconds.
- **Safety first:** mitigation comes before the fix, and every risky action needs human approval.
- **Many options, then one winner:** several candidate fixes are tested before one is chosen.
- **Transparency:** every agent's reasoning, every validation result and every decision is visible and auditable.
- **Human in the loop:** the system does the legwork and engineers keep authority.

---

## 6. Where Cerebras and Codex Fit

Blinkfix has two kinds of AI work, and each suits a different model.

### Cerebras: speed-critical reasoning
Cerebras offers very fast inference, with responses in a fraction of a second. That suits any step where **latency is the product**.

- **The five investigation agents.** They need quick, structured answers that are combined into one picture. Their prompts are short and the outputs are small, so fast inference brings investigation down to sub-second.
- **The mitigation recommendation.** It must appear almost immediately, because it is the first thing an on-call engineer acts on.
- **Impact and infrastructure assessment.** These are classification-style judgments that benefit from speed.
- **Parallel patch drafting.** Cerebras's throughput lets all five candidate strategies be drafted at once, without waiting on each other.
- **Plain-language summaries.** Incident summaries for chat and the dashboard can be generated almost instantly.

### Codex: deep code understanding and generation
Codex is a model built for programming tasks. It suits steps where **code quality matters more than raw speed**.

- **Refining the candidate fixes.** After the fast first drafts, Codex can improve a candidate so it fits the surrounding code style and conventions.
- **Writing and extending tests.** It can create tests that prove a fix works and guard against the same bug returning.
- **Reviewing the winning fix.** It can act as an independent reviewer that looks for side effects, missed edge cases and risky assumptions before the pull request is opened.
- **Explaining the change.** It can write a clear pull-request description of what changed and why, aimed at the human reviewer.
- **Reasoning across larger codebases.** When a failure spans several files, Codex can follow the logic through them more reliably than a short triage prompt.

### How they work together
Cerebras handles the **fast path**: investigate, recommend and draft candidates in seconds. Codex handles the **quality path**: refine, test and review the best candidate. The first gets the on-call engineer a safe action and a diagnosis immediately. The second makes sure the proposed fix is trustworthy by the time someone reviews it.

---

## 7. Demonstration Scenarios

Three example incidents show the range of what the system handles:

1. **Missing data in a payment calculation.** A change breaks multi-currency checkout. The fix adds safe handling for missing values.
2. **Outside payment provider times out.** The fault is not in our code, so the right response is to fail over to a backup provider.
3. **Expired guest session breaks authentication.** A missing safety check on an empty identity causes the crash. The fix defaults to no permissions.

The scenarios cover a code bug, an infrastructure failure and a security-sensitive path, which shows that the agents tell these apart.

---

## 8. Value and Impact

- **Shorter outages:** resolution time drops from hours to seconds.
- **Less engineer fatigue:** the repetitive investigation work is automated.
- **Fewer mistakes under pressure:** the system works through the same checks every time, even at 3 a.m.
- **Better knowledge capture:** every incident leaves a clear, structured record.
- **Safe automation:** humans approve every production-affecting action.

---

## 9. Vision

Blinkfix points toward self-healing software. Incidents are detected, understood and repaired in the time it takes an engineer to open a laptop, and engineers spend their effort on review and decisions, not on firefighting.

*Built for the IIIT Hackathon, in the track of AI-Driven DevOps, Autonomous SRE and Developer Productivity.*
