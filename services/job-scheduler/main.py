"""
Job Scheduler Service - SLURM-compatible workload management for HPC clusters.
"""
import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

import api
from scheduler import JobScheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Configuration from environment
PORT = int(os.getenv("PORT", "8083"))
HOST = os.getenv("HOST", "0.0.0.0")

# Global scheduler instance
scheduler: JobScheduler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage scheduler lifecycle."""
    global scheduler

    logger.info("Starting job scheduler...")
    scheduler = JobScheduler()
    api.set_scheduler(scheduler)
    await scheduler.start()

    logger.info(f"Job scheduler started on {HOST}:{PORT}")
    logger.info(f"Partitions: {list(scheduler.partitions.keys())}")

    yield

    logger.info("Shutting down job scheduler...")
    if scheduler:
        await scheduler.stop()
    logger.info("Job scheduler stopped")


app = FastAPI(
    title="Pulse Job Scheduler",
    description="SLURM-compatible job scheduler for HPC cluster simulation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api.router, tags=["jobs"])


@app.get("/health")
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "service": "job-scheduler",
        "scheduler_running": scheduler is not None and scheduler._running,
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
    )
