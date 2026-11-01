import logging
from dataclasses import dataclass
from typing import Optional

from ..models.schemas import CrashPayload
from .github_client import GitHubError, github_client, repo_path
from .source_reader import read_file_text

logger = logging.getLogger("blinkfix.code")


@dataclass
class SourceFile:
    """The failing file as the agents and the pull request will see it."""
    file: str            # path as written in the crash report
    path: str            # path in the repository
    text: str
    line: int            # the failing line, in this text
    origin: str          # "github" or "local"
    sha: Optional[str] = None
    ref: Optional[str] = None
    note: Optional[str] = None

    @property
    def pr_ready(self) -> bool:
        """A pull request can only be built on GitHub's own copy of the file."""
        return self.origin == "github"


def _line(text: str, number: int) -> Optional[str]:
    lines = text.splitlines()
    return lines[number - 1] if 1 <= number <= len(lines) else None


async def load_source_file(payload: CrashPayload) -> Optional[SourceFile]:
    """Reads the failing file from GitHub, checking it matches the code that actually crashed.

    The service runs from a local copy, so GitHub's branch may be ahead or behind it. If the failing
    line is not where the crash report says, the line is found again by its text. If that is not
    possible either, the local copy is used and no pull request is offered.
    """
    local_text = read_file_text(payload.file)
    local_line = _line(local_text, payload.line) if local_text else None
    path = repo_path(payload.file)

    try:
        remote = await github_client.get_file(path)
    except GitHubError as e:
        logger.warning("Could not read %s from GitHub: %s", path, e)
        if local_text:
            return SourceFile(payload.file, payload.file, local_text, payload.line, "local",
                              note=f"Read from the local copy because GitHub failed ({e}).")
        return None

    line = payload.line
    note = None
    if local_line is not None and (_line(remote["text"], line) or "").strip() != local_line.strip():
        # GitHub's copy has moved on. Look for the crashing line by its text.
        matches = [i + 1 for i, l in enumerate(remote["text"].splitlines()) if l.strip() == local_line.strip()]
        if len(matches) == 1:
            line = matches[0]
            note = f"The failing line is at line {line} on GitHub (line {payload.line} in the running code)."
        else:
            return SourceFile(
                payload.file, payload.file, local_text, payload.line, "local",
                note="GitHub's copy of this file does not match the running code, so the local copy was used.",
            )

    return SourceFile(payload.file, remote["path"], remote["text"], line, "github", sha=remote["sha"], ref=remote["ref"], note=note)
