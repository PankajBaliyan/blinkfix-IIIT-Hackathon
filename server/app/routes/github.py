import logging
import secrets
import time
from typing import Dict
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from ..config import settings
from ..database import delete_integration, get_integration, save_integration
from ..services.github_client import GitHubError, get_token, github_client, repo_slug

logger = logging.getLogger("blinkfix.github.routes")
router = APIRouter(prefix="/api/github", tags=["github"])

# One-time values that tie a login attempt to the browser that started it.
_pending_states: Dict[str, float] = {}
STATE_LIFETIME_S = 600


def _oauth_configured() -> bool:
    return bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)


@router.get("/status")
async def github_status():
    """Whether GitHub is connected and what it can do. The token itself is never returned."""
    stored = get_integration("github") or {}
    token = get_token()
    status = {
        "oauthConfigured": _oauth_configured(),
        "connected": token is not None,
        "via": "login" if stored.get("access_token") else ("token" if token else None),
        "login": stored.get("login"),
        "repo": repo_slug(),
        "branch": settings.GITHUB_BASE_BRANCH,
        "pathPrefix": settings.GITHUB_PATH_PREFIX,
        "callbackUrl": settings.GITHUB_REDIRECT_URI,
        "canWrite": None,
        "problem": None,
    }
    if token:
        try:
            repo = await github_client.request("GET", f"/repos/{repo_slug()}")
            status["canWrite"] = bool((repo.get("permissions") or {}).get("push"))
        except GitHubError as e:
            status["problem"] = str(e)
    return status


@router.get("/login")
async def github_login():
    """Sends the browser to GitHub to approve access."""
    if not _oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="GitHub login is not set up. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to server/.env and restart the server.",
        )
    now = time.time()
    for old in [s for s, expires in _pending_states.items() if expires < now]:
        _pending_states.pop(old, None)
    state = secrets.token_urlsafe(24)
    _pending_states[state] = now + STATE_LIFETIME_S
    query = urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": settings.GITHUB_OAUTH_SCOPE,
        "state": state,
    })
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{query}")


@router.get("/callback")
async def github_callback(code: str = "", state: str = "", error: str = ""):
    """GitHub sends the browser back here after the user approves or declines."""

    def back(result: str, reason: str = "") -> RedirectResponse:
        suffix = f"&reason={quote(reason)}" if reason else ""
        return RedirectResponse(f"{settings.FRONTEND_URL}/?github={result}{suffix}")

    if error:
        return back("error", error)
    expires = _pending_states.pop(state, None)
    if not expires or expires < time.time():
        return back("error", "The login attempt expired. Try connecting again.")
    if not code:
        return back("error", "GitHub did not send a login code.")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                },
            )
        data = resp.json()
        token = data.get("access_token")
        if not token:
            return back("error", data.get("error_description") or "GitHub did not return an access token.")
        login = await github_client.viewer_login(token)
    except (httpx.HTTPError, ValueError, GitHubError) as e:
        logger.warning("GitHub login failed: %s", e)
        return back("error", "Could not finish the GitHub login.")

    save_integration("github", {"access_token": token, "login": login, "scope": data.get("scope")})
    logger.info("GitHub connected as %s", login)
    return back("connected")


@router.post("/disconnect")
async def github_disconnect():
    """Forgets the stored login. (The approval can also be revoked in GitHub's settings.)"""
    delete_integration("github")
    return {"connected": get_token() is not None}
