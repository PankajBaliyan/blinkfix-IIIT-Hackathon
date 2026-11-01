import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .services.cerebras_service import cerebras_client
from .routes import incident, stream, health
from .state import initialize, recover_interrupted

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("blinkfix.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Blinkfix Swarm Zero API server...")
    initialize()
    recover_interrupted()
    yield
    # Shutdown
    logger.info("Shutting down Blinkfix Swarm Zero API server...")
    await cerebras_client.close()

app = FastAPI(
    title="Blinkfix checkout repair API",
    description="Reproduce checkout regressions, analyze with Cerebras, generate with Codex, execute candidates and publish verified draft PRs.",
    version="1.0.4",
    lifespan=lifespan,
)

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

@app.get('/api/fixture')
async def checkout_fixture():
    from .services.patch_validator import FIXTURE
    return {'source': (FIXTURE / 'payments.cjs').read_text(),
            'contract': (FIXTURE / 'CONTRACT.md').read_text()}

@app.get("/")
async def root():
    return {
        "platform": "Blinkfix // Swarm Zero",
        "description": "Checkout currency repair and infrastructure mitigation demo",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "endpoints": [
            "POST /api/incidents/simulate",
            "GET  /api/incidents/{incident_id}",
            "GET  /api/incidents/{incident_id}/stream (SSE)",
            "GET  /api/fixture",
            "GET  /api/health",
        ],
    }

