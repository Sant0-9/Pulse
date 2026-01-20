"""
FastAPI routes for job scheduler.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from models import (
    Job, JobState, JobSubmission, JobResponse, JobListResponse,
    Partition, PartitionListResponse, ClusterSummary
)
from scheduler import JobScheduler

logger = logging.getLogger(__name__)

router = APIRouter()

# Scheduler instance (set by main.py)
scheduler: Optional[JobScheduler] = None


def set_scheduler(sched: JobScheduler):
    """Set the scheduler instance for the routes."""
    global scheduler
    scheduler = sched


@router.post("/jobs", response_model=JobResponse, status_code=201)
async def submit_job(submission: JobSubmission):
    """
    Submit a new job to the scheduler.

    The job will be queued and scheduled based on priority and resource availability.
    """
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    try:
        job = await scheduler.submit_job(submission)
        return JobResponse(job=job)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to submit job: {e}")
        raise HTTPException(status_code=500, detail="Internal error submitting job")


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    state: Optional[JobState] = Query(None, description="Filter by job state"),
    partition: Optional[str] = Query(None, description="Filter by partition"),
    user: Optional[str] = Query(None, description="Filter by user"),
    limit: int = Query(100, ge=1, le=1000, description="Max results to return"),
):
    """
    List jobs with optional filters.

    Returns jobs sorted by submit time (newest first).
    """
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    jobs = await scheduler.list_jobs(
        state=state,
        partition=partition,
        user=user,
        limit=limit,
    )

    pending = sum(1 for j in jobs if j.state == JobState.PENDING)
    running = sum(1 for j in jobs if j.state == JobState.RUNNING)

    return JobListResponse(
        jobs=jobs,
        total=len(jobs),
        pending=pending,
        running=running,
    )


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get details of a specific job."""
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    job = await scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return JobResponse(job=job)


@router.delete("/jobs/{job_id}", response_model=JobResponse)
async def cancel_job(job_id: str):
    """
    Cancel a running or pending job.

    Jobs that have already completed cannot be cancelled.
    """
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    job = await scheduler.cancel_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return JobResponse(job=job)


@router.get("/partitions", response_model=PartitionListResponse)
async def list_partitions():
    """List all available partitions and their current state."""
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    partitions = await scheduler.get_partitions()
    return PartitionListResponse(
        partitions=partitions,
        total=len(partitions),
    )


@router.get("/partitions/{name}", response_model=Partition)
async def get_partition(name: str):
    """Get details of a specific partition."""
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    partition = await scheduler.get_partition(name)
    if not partition:
        raise HTTPException(status_code=404, detail=f"Partition {name} not found")

    return partition


@router.get("/cluster/summary", response_model=ClusterSummary)
async def get_cluster_summary():
    """Get cluster-wide resource and job summary."""
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    return await scheduler.get_cluster_summary()


@router.post("/demo/generate-jobs")
async def generate_demo_jobs(count: int = Query(10, ge=1, le=100)):
    """
    Generate demo jobs for testing.

    This endpoint creates random jobs across different partitions
    to demonstrate scheduler behavior.
    """
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    import random
    from models import Priority, ResourceRequirements

    demo_names = [
        "training-bert", "inference-gpt", "data-preprocess", "model-eval",
        "hyperopt-search", "distributed-train", "checkpoint-save", "metric-compute",
        "batch-predict", "feature-extract", "embedding-gen", "fine-tune",
    ]

    demo_accounts = ["ml-team", "research", "production", "experiments"]
    demo_users = ["alice", "bob", "charlie", "diana", "eve"]

    partition_configs = {
        "gpu": {"cpus": (4, 32), "gpus": (1, 8), "memory": (32, 256)},
        "cpu": {"cpus": (8, 64), "gpus": (0, 0), "memory": (16, 128)},
        "highmem": {"cpus": (4, 32), "gpus": (0, 0), "memory": (256, 1024)},
        "debug": {"cpus": (1, 4), "gpus": (0, 1), "memory": (4, 32)},
    }

    created_jobs = []
    for i in range(count):
        partition = random.choice(list(partition_configs.keys()))
        config = partition_configs[partition]

        submission = JobSubmission(
            name=f"{random.choice(demo_names)}-{random.randint(1000, 9999)}",
            partition=partition,
            priority=random.choice(list(Priority)),
            resources=ResourceRequirements(
                cpus=random.randint(*config["cpus"]),
                gpus=random.randint(*config["gpus"]),
                memory_gb=float(random.randint(*config["memory"])),
                time_limit_minutes=random.randint(5, 120),
            ),
            command=f"/bin/sleep {random.randint(30, 300)}",
            account=random.choice(demo_accounts),
            user=random.choice(demo_users),
        )

        try:
            job = await scheduler.submit_job(submission)
            created_jobs.append(job.id)
        except ValueError as e:
            logger.warning(f"Demo job creation failed: {e}")

    return {
        "message": f"Created {len(created_jobs)} demo jobs",
        "job_ids": created_jobs,
    }
