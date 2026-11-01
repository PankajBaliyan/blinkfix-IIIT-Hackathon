import asyncio
from typing import Dict, Any, List
from .base import BaseAgent, text_field
from ..models.schemas import CrashPayload
from ..services.diagnosis import commit_label, find_culprit_commit
from ..services.evidence import Evidence


def _commit_findings(commit: Dict[str, Any], confidence: float, reason: str = "") -> Dict[str, Any]:
    return {
        "commit_hash": commit["hash"],
        "author": commit.get("author"),
        "pr_number": commit.get("prNumber"),
        "message": commit.get("message"),
        "committed_at": commit.get("timestamp"),
        "url": commit.get("url"),
        "confidence": confidence,
        "reason": reason,
    }


class GitDetective(BaseAgent):
    key = "git_detective"
    name = "Git Detective"
    role = "Finds the recent change that most likely caused the crash"
    task = (
        "Choose which commit most likely introduced this crash. The <blame> block, when present, names the commit "
        "that last changed the failing line, which is strong evidence. Otherwise use <recent_commits> and their "
        "messages and dates. Only choose a commit that appears in the evidence. "
        "If none is plausible, set commit_hash to null.\n"
        'Return JSON: {"commit_hash": string or null, "reason": string, "confidence": number between 0 and 1}'
    )

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str], evidence: Evidence
    ) -> Dict[str, Any]:
        known = list(context.get("recentCommits", []))
        if context.get("blame"):
            known.insert(0, context["blame"])
        commits = {c["hash"]: c for c in known}
        answer = await self.ask(evidence, logs)

        chosen = commits.get(answer.get("commit_hash")) if answer else None
        if chosen:
            self.accept_model_answer()
            reason = text_field(answer, "reason") or ""
            try:
                confidence = max(0.0, min(1.0, float(answer.get("confidence", 0.5))))
            except (TypeError, ValueError):
                confidence = 0.5
            self.note(logs, f"Culprit identified: {commit_label(chosen)} by {chosen.get('author')}. {reason}")
            return {
                "summary": f"Culprit {commit_label(chosen)} ({chosen['hash']}) by {chosen.get('author')}. {reason}".strip(),
                "findings": _commit_findings(chosen, confidence, reason),
            }

        if answer:
            self.note(logs, "The model did not name a commit from the evidence. Using the history directly.")

        # Built-in analysis: whoever last changed the line, else the newest commit on the file
        await asyncio.sleep(0.2)
        culprit = find_culprit_commit(context, payload.file)
        if culprit["hash"] == "unknown":
            self.note(logs, "No commit history was available from GitHub.")
            return {
                "summary": "No commit history was available, so the change that caused this could not be identified.",
                "findings": _commit_findings(culprit, 0.0),
            }
        how = "git blame on the failing line" if context.get("blame") else "the newest commit on the file"
        self.note(logs, f"Culprit taken from {how}: {commit_label(culprit)} by {culprit.get('author')}.")
        return {
            "summary": f"Culprit {commit_label(culprit)} ({culprit['hash']}) by {culprit.get('author')}, from {how}.",
            "findings": _commit_findings(culprit, 0.9 if context.get("blame") else 0.5),
        }
