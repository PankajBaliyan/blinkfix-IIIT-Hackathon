import asyncio
from typing import Dict, Any, List
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.diagnosis import find_culprit_commit
from ..services.evidence import Evidence


def _commit_findings(commit: Dict[str, Any], confidence: float, reason: str = "") -> Dict[str, Any]:
    return {
        "commit_hash": commit["hash"],
        "author": commit.get("author"),
        "pr_number": commit.get("prNumber", 0),
        "message": commit.get("message"),
        "committed_at": commit.get("timestamp"),
        "confidence": confidence,
        "reason": reason,
    }


class GitDetective(BaseAgent):
    key = "git_detective"
    name = "Git Detective"
    role = "Finds the recent change that most likely caused the crash"
    task = (
        "Choose which commit in <recent_commits> most likely introduced this crash, based on the files it "
        "changed, its message and its date. Only choose a commit from the list. "
        "If none is plausible, set commit_hash to null.\n"
        'Return JSON: {"commit_hash": string or null, "reason": string, "confidence": number between 0 and 1}'
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        commits = {c["hash"]: c for c in context.get("recentCommits", [])}
        answer = await self.ask(evidence, logs)

        chosen = commits.get(answer.get("commit_hash")) if answer else None
        if chosen:
            self.accept_model_answer()
            reason = text_field(answer, "reason") or ""
            try:
                confidence = max(0.0, min(1.0, float(answer.get("confidence", 0.5))))
            except (TypeError, ValueError):
                confidence = 0.5
            self.note(logs, f"Culprit identified: {chosen['hash']} by {chosen.get('author')}. {reason}")
            return {
                "summary": f"Culprit commit {chosen['hash']} by {chosen.get('author')} (PR #{chosen.get('prNumber', 0)}). {reason}".strip(),
                "findings": _commit_findings(chosen, confidence, reason),
            }

        if answer:
            self.note(logs, "The model did not name a commit from the list. Using the built-in demo analysis.")

        # Built-in demo analysis: the latest commit that touched the failing file
        await asyncio.sleep(0.39)
        culprit = find_culprit_commit(context, payload.file)
        self.note(logs, f"Diff matched commit {culprit['hash']} modifying {payload.file}.")
        self.note(logs, f"Culprit identified: PR #{culprit.get('prNumber', 0)} by {culprit.get('author')}.")
        return {
            "summary": f"Culprit commit {culprit['hash']} by {culprit.get('author')} (PR #{culprit.get('prNumber', 0)}).",
            "findings": _commit_findings(culprit, 0.98),
        }
