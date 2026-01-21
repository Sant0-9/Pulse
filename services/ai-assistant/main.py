"""Main entry point for AI Assistant service."""

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app, Counter, Histogram

from config import settings
from api import router
from context import context_service
from ollama_service import ollama_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Prometheus metrics
CHAT_REQUESTS = Counter(
    "ai_assistant_chat_requests_total",
    "Total chat requests",
    ["status"]
)
CHAT_LATENCY = Histogram(
    "ai_assistant_chat_latency_seconds",
    "Chat request latency",
    buckets=[0.5, 1, 2, 5, 10, 30, 60, 120]
)
INVESTIGATION_REQUESTS = Counter(
    "ai_assistant_investigation_requests_total",
    "Total investigation requests",
    ["alert_name"]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting AI Assistant service...")
    logger.info(f"Ollama host: {settings.ollama_host}")
    logger.info(f"Model: {settings.ollama_model}")

    # Check Ollama connection
    connected = await ollama_service.check_connection()
    if connected:
        logger.info("Ollama connection verified, model available")
    else:
        logger.warning("Ollama not available or model not loaded")
        logger.info("Attempting to pull model...")
        pulled = await ollama_service.pull_model()
        if pulled:
            logger.info("Model pulled successfully")
        else:
            logger.warning("Failed to pull model - service will retry on requests")

    yield

    # Cleanup
    logger.info("Shutting down AI Assistant service...")
    await context_service.close()


# Create FastAPI app
app = FastAPI(
    title="Pulse AI Assistant",
    description="AI-powered assistant for HPC cluster observability",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include API routes
app.include_router(router, prefix="/api/v1/ai")


@app.get("/health")
async def root_health():
    """Root health check."""
    return {"status": "ok", "service": "ai-assistant"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info"
    )
