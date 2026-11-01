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
            "configured": bool(settings.GITHUB_TOKEN),
            "repo": f"{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}",
        },
        "demo_mode": settings.DEMO_MODE,
    }

