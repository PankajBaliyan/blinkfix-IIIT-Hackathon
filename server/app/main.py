import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .services.cerebras_service import cerebras_client
from .services.github_client import github_client
from .routes import incident, stream, health, github
from .demo_service import checkout
from .services.crash_detector import CrashDetectionMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("blinkfix.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite database file
    logger.info("Starting up Blinkfix Swarm Zero API server...")
    init_db()
    yield
    # Shutdown
    logger.info("Shutting down Blinkfix Swarm Zero API server...")
    await cerebras_client.close()
    await github_client.close()

app = FastAPI(
    title="Blinkfix // Swarm Zero Autonomous Incident API",
    description="Ultra-low latency incident triage, speculative repair, and automated GitHub PR creation powered by Cerebras.",
    version="1.0.4",
    lifespan=lifespan,
)

# Added before CORS so it sits inside it and its error responses still get CORS headers.
app.add_middleware(CrashDetectionMiddleware)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health.router)
app.include_router(incident.router)
app.include_router(stream.router)
app.include_router(stream.events_router)
app.include_router(github.router)
app.include_router(checkout.router)

@app.get("/")
async def root():
    return {
        "platform": "Blinkfix // Swarm Zero",
        "description": "Autonomous SRE Incident Response Engine",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "endpoints": [
            "POST /api/incidents/simulate",
            "POST /api/incidents/webhook/crash",
            "GET  /api/incidents/{incident_id}",
            "GET  /api/incidents/{incident_id}/stream (SSE)",
            "GET  /api/events (SSE, all incident updates)",
            "POST /api/incidents/{incident_id}/pull-request",
            "GET  /api/github/status, /api/github/login, POST /api/github/disconnect",
            "POST /api/incidents/{incident_id}/rollback",
            "GET  /api/health",
            "POST /api/demo/checkout (buggy: TypeError)",
            "GET  /api/demo/orders/{order_id}/average-price (buggy: ZeroDivisionError)",
            "POST /api/demo/payments/charge (buggy: TimeoutError)",
        ],
    }

