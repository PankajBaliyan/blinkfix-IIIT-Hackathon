from fastapi import APIRouter
from ..config import settings
from ..database import get_connection

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

    cerebras_configured = bool(settings.CEREBRAS_API_KEY and settings.CEREBRAS_MODEL)
    codex_configured = bool(settings.OPENAI_API_KEY and settings.CODEX_MODEL)
    github_token_configured = bool(settings.GITHUB_TOKEN)
    github_target_configured = bool(
        settings.GITHUB_OWNER and settings.GITHUB_REPO and settings.GITHUB_TARGET_FILE
    )
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
            "configured": cerebras_configured,
            "model": settings.CEREBRAS_MODEL,
        },
        "github": {
            "configured": github_token_configured and github_target_configured,
            "token_configured": github_token_configured,
            "target_configured": github_target_configured,
            "repo": f"{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}",
            "target_file": settings.GITHUB_TARGET_FILE,
        },
        'codex': {'configured': codex_configured, 'model': settings.CODEX_MODEL},
        'readiness': {
            'offline_fixture': db_status == 'ok',
            'live_analysis': cerebras_configured and codex_configured,
            'github_publishing': github_token_configured and github_target_configured,
            'publishing_default': False,
        },
        'execution_modes': ['live', 'fixture'],
    }

