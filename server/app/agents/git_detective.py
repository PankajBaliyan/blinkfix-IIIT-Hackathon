import asyncio
from typing import Dict, Any, List
from .base import BaseAgent
from ..models.schemas import CrashPayload
from ..services.diagnosis import find_culprit_commit

class GitDetective(BaseAgent):
    name = "Git Detective"
    role = "Deployment Delta & Git Blame Attribution"

    async def run_agent_logic(
        self, payload: CrashPayload, context: Dict[str, Any], logs: List[str]
    ) -> Dict[str, Any]:
        logs.append("[00:00.120] Querying commit history diff from deployment context.")
        await asyncio.sleep(0.39)

        culprit = find_culprit_commit(context, payload.file)

        logs.append(f"[00:00.340] Diff matched commit {culprit['hash']} modifying {payload.file}.")
        logs.append(f"[00:00.400] Culprit identified: PR #{culprit.get('prNumber', 104)} by {culprit.get('author')}.")

        return {
            "summary": f"Culprit commit {culprit['hash']} by {culprit.get('author')} (PR #{culprit.get('prNumber', 104)}).",
            "findings": {
                "commit_hash": culprit["hash"],
                "author": culprit.get("author"),
                "pr_number": culprit.get("prNumber", 104),
                "message": culprit.get("message"),
                "committed_at": culprit.get("timestamp"),
                "confidence": 0.98,
            },
        }

