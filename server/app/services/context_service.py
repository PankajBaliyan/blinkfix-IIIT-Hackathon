import asyncio
import logging
import re
from typing import Any, Dict, List, Optional

from ..config import settings
from ..models.schemas import CrashPayload
from .github_client import GitHubError, get_token, github_client, repo_path, repo_slug

logger = logging.getLogger("blinkfix.context")


def parse_requirements(text: str) -> Dict[str, str]:
    """{'fastapi': '>=0.115.0', ...} from a requirements.txt."""
    deps: Dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        match = re.match(r"^([A-Za-z0-9_.\-]+)(\[[^\]]*\])?\s*(.*)$", line)
        if match and not line.startswith("-"):
            deps[match.group(1)] = match.group(3).strip() or "any"
    return deps


async def _guarded(coro, label: str, notes: List[str]):
    """Runs one GitHub lookup. A failure is recorded as a note instead of stopping the incident."""
    try:
        return await coro
    except GitHubError as e:
        logger.warning("GitHub lookup failed (%s): %s", label, e)
        notes.append(f"{label}: {e}")
        return None


async def build_deployment_context(payload: CrashPayload) -> Dict[str, Any]:
    """What GitHub knows about the failing code: recent commits, who last changed the line, dependencies."""
    notes: List[str] = []
    file_path = repo_path(payload.file)

    head, commits, blame, requirements = await asyncio.gather(
        _guarded(github_client.head_sha(), "branch head", notes),
        _guarded(github_client.recent_commits(file_path, limit=5), "commit history", notes),
        _guarded(github_client.blame_line(file_path, payload.line), "git blame", notes),
        _guarded(github_client.get_file(repo_path("requirements.txt")), "dependencies", notes),
    )

    return {
        "repository": repo_slug(),
        "branch": settings.GITHUB_BASE_BRANCH,
        "github": {
            "signedIn": get_token() is not None,
            "reachable": head is not None or commits is not None,
            "notes": notes,
        },
        "deployment": {"branch": settings.GITHUB_BASE_BRANCH, "headSha": head[:7] if head else None},
        "recentCommits": commits or [],
        "blame": blame,
        "dependencies": parse_requirements(requirements["text"]) if requirements else {},
    }
