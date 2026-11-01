import base64
import logging
import re
from typing import Any, Dict, List, Optional

import httpx

from ..config import settings
from ..database import get_integration

logger = logging.getLogger("blinkfix.github")

API = "https://api.github.com"


class GitHubError(Exception):
    """A GitHub call failed. `status` is the HTTP status, or 0 if GitHub could not be reached."""

    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status


def repo_path(file: str) -> str:
    """Crash reports use paths inside the service (app/x.py). This is the same file's path in the repository."""
    return settings.GITHUB_PATH_PREFIX.rstrip("/") + "/" + file.lstrip("/") if settings.GITHUB_PATH_PREFIX else file.lstrip("/")


def get_token() -> Optional[str]:
    """The OAuth token from the Settings page, or the optional personal access token from .env."""
    stored = get_integration("github")
    if stored and stored.get("access_token"):
        return stored["access_token"]
    return settings.GITHUB_TOKEN or None


def repo_slug() -> str:
    return f"{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}"


def parse_pr_number(message: str) -> Optional[int]:
    """Squash merges end with '(#123)'."""
    match = re.search(r"\(#(\d+)\)\s*$", message.splitlines()[0] if message else "")
    return int(match.group(1)) if match else None


class GitHubClient:
    def __init__(self):
        self._http: Optional[httpx.AsyncClient] = None

    async def _client(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))
        return self._http

    async def close(self) -> None:
        if self._http and not self._http.is_closed:
            await self._http.aclose()

    async def request(self, method: str, path: str, *, accept: str = "application/vnd.github+json", **kwargs) -> Any:
        headers = {"Accept": accept, "X-GitHub-Api-Version": "2022-11-28"}
        token = get_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        client = await self._client()
        try:
            resp = await client.request(method, f"{API}{path}", headers=headers, **kwargs)
        except httpx.HTTPError as e:
            raise GitHubError(f"could not reach GitHub: {type(e).__name__}") from e
        if resp.status_code >= 400:
            detail = ""
            try:
                detail = resp.json().get("message", "")
            except ValueError:
                detail = resp.text[:120]
            if resp.status_code == 403 and resp.headers.get("x-ratelimit-remaining") == "0":
                detail = "GitHub rate limit reached. Connect GitHub in Settings for a higher limit."
            raise GitHubError(f"{resp.status_code} {detail}".strip(), resp.status_code)
        return resp.json() if resp.content else None

    # ---------- reading

    async def head_sha(self, ref: Optional[str] = None) -> str:
        data = await self.request("GET", f"/repos/{repo_slug()}/commits/{ref or settings.GITHUB_BASE_BRANCH}")
        return data["sha"]

    async def get_file(self, path: str, ref: Optional[str] = None) -> Dict[str, Any]:
        """The text of one file. Returns {text, sha, path, ref}."""
        data = await self.request(
            "GET", f"/repos/{repo_slug()}/contents/{path}", params={"ref": ref or settings.GITHUB_BASE_BRANCH}
        )
        if isinstance(data, list) or data.get("type") != "file":
            raise GitHubError(f"{path} is not a file", 404)
        if data.get("encoding") != "base64":
            raise GitHubError(f"{path} is too large to read through the API", 413)
        text = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return {"text": text, "sha": data["sha"], "path": data["path"], "ref": ref or settings.GITHUB_BASE_BRANCH}

    async def list_files(self, ref: Optional[str] = None) -> List[str]:
        """Every file path in the repository at a ref."""
        data = await self.request(
            "GET", f"/repos/{repo_slug()}/git/trees/{ref or settings.GITHUB_BASE_BRANCH}", params={"recursive": "1"}
        )
        return [item["path"] for item in data.get("tree", []) if item.get("type") == "blob"]

    async def recent_commits(self, path: str, limit: int = 5) -> List[Dict[str, Any]]:
        """The latest commits that touched a file, newest first, in the shape the agents expect."""
        rows = await self.request(
            "GET",
            f"/repos/{repo_slug()}/commits",
            params={"path": path, "sha": settings.GITHUB_BASE_BRANCH, "per_page": limit},
        )
        commits = []
        for row in rows:
            message = row["commit"]["message"]
            author = (row.get("author") or {}).get("login") or row["commit"]["author"]["name"]
            commits.append({
                "hash": row["sha"][:7],
                "fullHash": row["sha"],
                "author": author,
                "timestamp": row["commit"]["author"]["date"],
                "message": message.splitlines()[0] if message else "",
                "changedFiles": [path],
                "prNumber": parse_pr_number(message),
                "url": row.get("html_url"),
            })
        return commits

    async def blame_line(self, path: str, line: int) -> Optional[Dict[str, Any]]:
        """The commit that last changed one line (git blame). Needs a GitHub login, because it uses GraphQL."""
        if not get_token():
            return None
        query = """
        query($owner: String!, $name: String!, $expr: String!, $path: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expr) {
              ... on Commit {
                blame(path: $path) {
                  ranges {
                    startingLine endingLine
                    commit {
                      oid abbreviatedOid messageHeadline committedDate url
                      author { name user { login } }
                      associatedPullRequests(first: 1) { nodes { number } }
                    }
                  }
                }
              }
            }
          }
        }"""
        data = await self.request(
            "POST",
            "/graphql",
            json={"query": query, "variables": {
                "owner": settings.GITHUB_OWNER,
                "name": settings.GITHUB_REPO,
                "expr": settings.GITHUB_BASE_BRANCH,
                "path": path,
            }},
        )
        ranges = (((data.get("data") or {}).get("repository") or {}).get("object") or {}).get("blame", {}).get("ranges", [])
        for r in ranges:
            if r["startingLine"] <= line <= r["endingLine"]:
                c = r["commit"]
                prs = c["associatedPullRequests"]["nodes"]
                return {
                    "hash": c["abbreviatedOid"],
                    "fullHash": c["oid"],
                    "author": (c["author"].get("user") or {}).get("login") or c["author"]["name"],
                    "timestamp": c["committedDate"],
                    "message": c["messageHeadline"],
                    "changedFiles": [path],
                    "prNumber": prs[0]["number"] if prs else parse_pr_number(c["messageHeadline"]),
                    "url": c["url"],
                    "blamedLine": line,
                }
        return None

    async def search_code(self, query: str) -> List[str]:
        """Paths of files whose text matches. GitHub only allows code search when signed in."""
        if not get_token():
            raise GitHubError("code search needs GitHub to be connected", 401)
        data = await self.request("GET", "/search/code", params={"q": f"{query} repo:{repo_slug()}", "per_page": 10})
        return [item["path"] for item in data.get("items", [])]

    # ---------- writing (pull requests)

    async def create_branch(self, name: str, from_sha: str) -> None:
        try:
            await self.request("POST", f"/repos/{repo_slug()}/git/refs", json={"ref": f"refs/heads/{name}", "sha": from_sha})
        except GitHubError as e:
            # A retry for the same incident finds its branch already there. Anything else is a real failure.
            if e.status != 422:
                raise

    async def commit_file(self, path: str, text: str, message: str, branch: str, sha: str) -> None:
        await self.request(
            "PUT",
            f"/repos/{repo_slug()}/contents/{path}",
            json={
                "message": message,
                "content": base64.b64encode(text.encode("utf-8")).decode("ascii"),
                "sha": sha,
                "branch": branch,
            },
        )

    async def open_pull_request(self, title: str, body: str, head: str) -> Dict[str, Any]:
        data = await self.request(
            "POST",
            f"/repos/{repo_slug()}/pulls",
            json={"title": title, "body": body, "head": head, "base": settings.GITHUB_BASE_BRANCH, "draft": True},
        )
        return {"number": data["number"], "url": data["html_url"], "branch": head}

    async def viewer_login(self, token: str) -> str:
        """Who a token belongs to. Used right after the OAuth login."""
        client = await self._client()
        try:
            resp = await client.get(f"{API}/user", headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
        except httpx.HTTPError as e:
            raise GitHubError(f"could not reach GitHub: {type(e).__name__}") from e
        if resp.status_code != 200:
            raise GitHubError(f"{resp.status_code} could not read the account", resp.status_code)
        return resp.json()["login"]


github_client = GitHubClient()
