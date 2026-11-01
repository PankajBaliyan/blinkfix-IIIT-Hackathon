# Swarm Zero: Architecture & Execution Plan

## 1. High-Level Tech Stack
*   **Frontend UI:** React (Next.js or Vite) - Dark mode, terminal-aesthetic, highly reactive.
*   **Backend Orchestrator:** Node.js (Express) or Python (FastAPI) - Optimized for asynchronous parallel network requests.
*   **AI / Inference Layer:** Cerebras API serving OpenAI Codex (or equivalent coding model provided by the hackathon).
*   **Version Control / CI:** GitHub API (Octokit/PyGithub).
*   **Mock Services:** Hardcoded JSON payloads for Sentry alerts and prior commit history.

---

## 2. Core System Components

### A. The Dashboard (Frontend)
The visual centerpiece of the demo. 
*   **The T-Zero Timer:** A large millisecond timer that starts the moment the mock error is triggered.
*   **Agent Terminals:** Four distinct terminal windows (Trace Investigator, Git Detective, Dependency Inspector, Mitigation Planner) that stream text simultaneously.
*   **Resolution Panel:** Displays the recommended immediate rollback and the final verified GitHub PR link.

### B. The Orchestrator (Backend)
The brain of the operation. It does *not* do the thinking; it manages the parallel network requests.
*   Uses `Promise.all()` (Node) or `asyncio.gather()` (Python) to fire 4 to 10 Cerebras/Codex prompts at the exact same time.
*   Handles the "Speculative Multi-Patching" validation logic.

### C. The Deployment State (Context Layer)
*   **Hackathon Shortcut:** Do not build a real vector database. 
*   Create a `context.json` file on your backend containing:
    *   The last 5 commit messages.
    *   The core dependencies list.
    *   A simplified text map of the target codebase (e.g., just the `payments.js` and `auth.js` files).
    *   This represents the "Pre-computed Deployment Intelligence."

---

## 3. The Execution Flow (The 2-Second Demo)

### Phase 1: The Trigger (T = 0.0s)
*   User clicks "Simulate Outage" on the frontend.
*   Frontend sends a mock Sentry payload (e.g., `TypeError in payments.js`) to the backend.
*   The T-Zero timer starts counting up in milliseconds.

### Phase 2: Parallel Triage Burst (T = 0.1s - 0.5s)
The backend instantly fires 4 concurrent prompts to the Cerebras API. It injects the `context.json` and the error payload into each prompt:
1.  **Git Detective:** "Analyze this error against the recent commit history. Did a recent change cause this?"
2.  **Trace Investigator:** "Locate the exact function and line number causing this TypeError."
3.  **Dependency Inspector:** "Check if this is a third-party outage (e.g., Stripe API) or a local code bug."
4.  **Mitigation Planner:** "Based on the error, what is the safest immediate rollback or failover action?"

### Phase 3: Immediate Mitigation (T = 1.0s)
*   The UI streams the results. 
*   The Mitigation Planner outputs a red alert: *“Code bug detected. Recommending immediate rollback of PR #104. Awaiting human approval.”*

### Phase 4: Speculative Repair (T = 1.2s - 1.8s)
While the user reads the mitigation alert, the backend fires **5 concurrent prompts** to Codex to fix the bug in `payments.js`.
*   Prompt A: "Fix this TypeError prioritizing standard ES6 syntax."
*   Prompt B: "Fix this TypeError with strict type-checking."
*   Prompt C, D, E: (Slight variations).
*   *Hackathon Shortcut:* The backend "tests" these by checking for basic syntax validity or simply hardcoding which of the 5 variations is the "winner."

### Phase 5: Verified Recovery (T = 2.0s)
*   The backend takes the winning Codex patch and hits the GitHub API to create a new branch and open a Draft PR.
*   The frontend timer stops (e.g., `1.94s`).
*   A green button appears: *“Verified Patch Generated: Review PR #105.”*

---

## 4. Hackathon Build Priorities (The 8-Hour Rule)

1.  **Hour 1-2:** Build the backend parallel trigger. Prove you can hit the Cerebras API 5 times simultaneously and measure the sub-second response time.
2.  **Hour 3-4:** Build the frontend UI. It must look like a high-end enterprise SRE tool (dark themes, monospace fonts, glowing accents).
3.  **Hour 5-6:** Connect the backend to the GitHub API so it actually creates a real PR in a dummy repo. (This makes the demo real).
4.  **Hour 7-8:** Polish the prompts and hardcode the mock `context.json` so the AI responses are perfectly deterministic for the live pitch. No demo failures allowed.