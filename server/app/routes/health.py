from fastapi import APIRouter
from ..config import settings
from ..database import get_connection
from ..services.github_client import get_token

router = APIRouter(tags=["health"])

@router.get("/api/health")
async def health_check():
    """System health check endpoint."""
    db_status = "ok"
    try:
        conn = get_connection()
        conn.execute("SELECT 1")
        conn.close()
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "service": "blinkfix-backend",
        "version": "1.0.4",
        "database": {
            "type": "sqlite",
            "path": str(settings.DATABASE_PATH),
            "status": db_status,
        },
        "cerebras": {
            "configured": bool(settings.CEREBRAS_API_KEY),
            "model": settings.CEREBRAS_MODEL,
        },
        "github": {
            "configured": get_token() is not None,
            "oauth_configured": bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
            "repo": f"{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}",
        },
        "codex": {
            "configured": bool(settings.OPENAI_API_KEY and settings.CODEX_MODEL),
            "model": settings.CODEX_MODEL or None,
            "key_set": bool(settings.OPENAI_API_KEY),
        },
        "slack": {"configured": bool(settings.SLACK_WEBHOOK_URL)},
        "auto_open_pr": settings.AUTO_OPEN_PR,
    }

