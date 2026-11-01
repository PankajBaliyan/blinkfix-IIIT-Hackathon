import ast
import logging
from typing import Any, Dict, Optional

from ..database import update_incident
from .github_client import GitHubError, get_token, github_client, repo_path
from .incident_events import publish_incident_update
from .incident_view import build_incident_detail
from .slack_service import send_slack_incident_alert
from .source_reader import replace_lines

logger = logging.getLogger("blinkfix.pr")


class PullRequestError(Exception):
    """Something the user can act on. `status` is the HTTP status to answer with."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _body(detail: Dict[str, Any], patch: Dict[str, Any], login: Optional[str]) -> str:
    agents = {a["name"]: a for a in detail["agents"]}
    written_by = f"{patch['model']} ({patch['source']})" if patch.get("model") else "the built-in demo library"
    lines = [
        f"## Fix for `{detail['error']['type']}` in `{detail['error']['file']}`",
        "",
        f"**Incident:** `{detail['id']}`  ",
        f"**Request:** `{detail['error']['method']} {detail['error']['route']}`  ",
        f"**Error:** `{detail['error']['message']}`",
        "",
        "### Why it failed",
        (agents.get("Trace Analyst") or {}).get("summary", "No analysis available."),
        "",
        "### Likely cause",
        (agents.get("Git Detective") or {}).get("summary", "Not identified."),
        "",
        f"### The fix: {patch['strategy']}",
        patch.get("explanation") or "",
        "",
        "```diff",
        *[f"- {l}" for l in (patch.get("original") or "").splitlines()],
        *[f"+ {l}" for l in patch["code"].splitlines()],
        "```",
        "",
        f"Written by {written_by}.",
        "",
        "### Before you merge",
        "- The new code was checked for valid syntax on the real file. **Tests have not been run.**",
        "- Review the change and run the service's tests.",
        "",
        f"_Opened by Blinkfix on behalf of {'@' + login if login else 'a team member'}. Nothing is merged or deployed automatically._",
    ]
    return "\n".join(lines)


async def create_pull_request(incident_id: str, patch_id: Optional[str], login: Optional[str]) -> Dict[str, Any]:
    detail = build_incident_detail(incident_id)
    if not detail:
        raise PullRequestError(404, "Incident not found.")
    if detail.get("pr"):
        return detail["pr"]
    if detail["status"] != "RESOLVED":
        raise PullRequestError(409, "The fix is not ready yet.")
    if not get_token():
        raise PullRequestError(401, "Connect GitHub in Settings first.")
    if detail.get("codeOrigin") != "github":
        raise PullRequestError(409, "This incident's code was not read from GitHub, so a pull request cannot be built from it.")

    wanted = patch_id or detail.get("winningPatchId")
    patch = next((p for p in detail["patches"] if p["id"] == wanted), None)
    if not patch:
        raise PullRequestError(404, "That fix does not exist for this incident.")
    if not patch["validation"].get("astSyntaxValid"):
        raise PullRequestError(409, "That fix does not produce valid code.")

    path = repo_path(patch["file"])
    try:
        current = await github_client.get_file(path)
        start, end = patch["startLine"], patch["endLine"]
        if "\n".join(current["text"].splitlines()[start - 1:end]) != patch["original"]:
            raise PullRequestError(409, "The file changed on GitHub since this incident, so the fix no longer applies.")
        new_text = replace_lines(current["text"], start, end, patch["code"])
        if path.endswith(".py"):
            try:
                ast.parse(new_text)
            except SyntaxError:
                raise PullRequestError(409, "The fix no longer produces valid code on GitHub's current file.")

        branch = f"blinkfix/fix-{incident_id}"
        await github_client.create_branch(branch, await github_client.head_sha())
        on_branch = await github_client.get_file(path, ref=branch)
        error_type = detail["error"]["type"]
        await github_client.commit_file(
            path,
            new_text,
            f"fix: {error_type} in {detail['error']['file']}\n\nProposed by Blinkfix for incident {incident_id}.",
            branch,
            on_branch["sha"],
        )
        pr = await github_client.open_pull_request(
            f"[Blinkfix] Fix {error_type} in {detail['error']['file']}", _body(detail, patch, login), branch
        )
    except GitHubError as e:
        if e.status == 401:
            raise PullRequestError(401, "GitHub rejected the saved login. Reconnect GitHub in Settings.")
        if e.status == 403:
            raise PullRequestError(403, f"GitHub refused: {e}. The connected account may not be allowed to push to this repository.")
        raise PullRequestError(502, f"GitHub refused: {e}")

    update_incident(incident_id, {"pr_url": pr["url"], "pr_number": pr["number"], "pr_branch": branch})
    await send_slack_incident_alert(
        incident_id=incident_id,
        service=detail["service"],
        error_name=error_type,
        error_message=detail["error"]["message"],
        pr_url=pr["url"],
        duration_ms=detail["durationMs"],
        culprit_commit=detail.get("culpritCommit") or "unknown",
    )
    await publish_incident_update(incident_id)
    logger.info("Opened pull request #%s for %s", pr["number"], incident_id)
    return pr
