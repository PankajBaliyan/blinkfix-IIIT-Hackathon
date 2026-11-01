import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for server
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file
load_dotenv(BASE_DIR / ".env")

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]

    # Cerebras Cloud API
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    CEREBRAS_MODEL: str = os.getenv("CEREBRAS_MODEL", "gpt-oss-120b")
    CEREBRAS_REASONING_EFFORT: str = os.getenv("CEREBRAS_REASONING_EFFORT", "low")
    # Requests per minute the key allows, and the longest a call may wait for a free slot before
    # the app gives up and uses its built-in analysis instead.
    CEREBRAS_MAX_RPM: int = int(os.getenv("CEREBRAS_MAX_RPM", "5"))
    CEREBRAS_MAX_WAIT_S: float = float(os.getenv("CEREBRAS_MAX_WAIT_S", "10"))
    # "batched": the five agents share one model call. "parallel": one call per agent (needs a higher rate limit).
    CEREBRAS_AGENT_MODE: str = os.getenv("CEREBRAS_AGENT_MODE", "batched")
    CEREBRAS_API_BASE: str = os.getenv("CEREBRAS_API_BASE", "https://api.cerebras.ai/v1")

    # GitHub: the repository Blinkfix reads code from and opens pull requests against
    GITHUB_OWNER: str = os.getenv("GITHUB_OWNER", "PankajBaliyan")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "blinkfix-IIIT-Hackathon")
    GITHUB_BASE_BRANCH: str = os.getenv("GITHUB_BASE_BRANCH", "main")
    # Crash reports use paths relative to the service (app/x.py). This is where the service
    # lives inside the repository (server/app/x.py).
    GITHUB_PATH_PREFIX: str = os.getenv("GITHUB_PATH_PREFIX", "server/")
    # OAuth App credentials: the user connects their account from the Settings page.
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_REDIRECT_URI: str = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/api/github/callback")
    GITHUB_OAUTH_SCOPE: str = os.getenv("GITHUB_OAUTH_SCOPE", "repo")
    # Open a draft pull request by itself once a fix is verified. If off, use the button on the Fix page.
    AUTO_OPEN_PR: bool = os.getenv("AUTO_OPEN_PR", "true").lower() in ("true", "1", "yes")
    # Optional fallback if you would rather use a personal access token than the OAuth login.
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    # Where the browser is sent back to after connecting GitHub.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # OpenAI (the Codex coding agent)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    CODEX_MODEL: str = os.getenv("CODEX_MODEL", "")
    CODEX_MAX_STEPS: int = int(os.getenv("CODEX_MAX_STEPS", "8"))

    # Slack Webhook
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")

    # SQLite Database File
    DATABASE_PATH: Path = BASE_DIR / os.getenv("DATABASE_PATH", "data/blinkfix.db")

    # Demo Mode
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")

settings = Settings()
