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
    CEREBRAS_MODEL: str = os.getenv("CEREBRAS_MODEL", "llama3.3-70b")
    CEREBRAS_API_BASE: str = os.getenv("CEREBRAS_API_BASE", "https://api.cerebras.ai/v1")

    # GitHub API
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_OWNER: str = os.getenv("GITHUB_OWNER", "swarm-zero-demo")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "checkout-service")

    # Slack Webhook
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")

    # SQLite Database File
    DATABASE_PATH: Path = BASE_DIR / os.getenv("DATABASE_PATH", "data/blinkfix.db")

    # Deployment Context File

    # Demo Mode
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    CODEX_MODEL: str = os.getenv('CODEX_MODEL', 'gpt-5.3-codex')
    GITHUB_TARGET_FILE: str = os.getenv('GITHUB_TARGET_FILE', 'payments.cjs')

settings = Settings()
