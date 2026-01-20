"""
Job scheduler with priority-based FIFO scheduling.
Simulates SLURM-like workload management.
"""
import asyncio
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from models import (
    Job, JobState, JobSubmission, Partition, PartitionState,
    Priority, PRIORITY_VALUES, ClusterSummary
)
import metrics

logger = logging.getLogger(__name__)


class JobScheduler:
    """
    Priority-based job scheduler with partition support.
    Simulates SLURM scheduling behavior.
    """

    def __init__(self):
        self.jobs: dict[str, Job] = {}
        self.partitions: dict[str, Partition] = {}
        self.job_counter: int = 0
        self._lock = asyncio.Lock()
        self._running = False
        self._scheduler_task: Optional[asyncio.Task] = None

        # Track jobs by state for efficient queries
        self._jobs_by_state: dict[JobState, set[str]] = defaultdict(set)
        self._jobs_by_user: dict[str, set[str]] = defaultdict(set)
        self._jobs_by_account: dict[str, set[str]] = defaultdict(set)
        self._jobs_by_partition: dict[str, set[str]] = defaultdict(set)

        # Completed jobs history (last 24h)
        self._completed_jobs: list[tuple[datetime, Job]] = []

        # Initialize default partitions
        self._init_partitions()

        # Initialize metrics
        metrics.init_scheduler_info()

    def _init_partitions(self):
        """Initialize default partitions matching the simulated cluster."""
        # GPU partition - 4 nodes with 8 GPUs each (A100/H100 mix)
        self.partitions["gpu"] = Partition(
            name="gpu",
            state=PartitionState.UP,
            total_nodes=4,
            total_cpus=256,  # 64 cores per node
            total_gpus=32,   # 8 GPUs per node
            total_memory_gb=8192,  # 2TB per node
            max_time_minutes=7200,  # 5 days max
            default_time_minutes=60,
        )

        # CPU partition - 4 nodes, no GPUs
        self.partitions["cpu"] = Partition(
            name="cpu",
            state=PartitionState.UP,
            total_nodes=4,
            total_cpus=768,  # 192 cores per node (EPYC)
            total_gpus=0,
            total_memory_gb=4096,  # 1TB per node
            max_time_minutes=10080,  # 7 days max
            default_time_minutes=120,
        )

        # High-memory partition (subset of CPU nodes)
        self.partitions["highmem"] = Partition(
            name="highmem",
            state=PartitionState.UP,
            total_nodes=2,
            total_cpus=384,
            total_gpus=0,
            total_memory_gb=8192,  # 4TB per node
            max_time_minutes=4320,  # 3 days max
            default_time_minutes=240,
        )

        # Debug partition for quick testing
        self.partitions["debug"] = Partition(
            name="debug",
            state=PartitionState.UP,
            total_nodes=1,
            total_cpus=16,
            total_gpus=2,
            total_memory_gb=128,
            max_time_minutes=30,
            default_time_minutes=10,
        )

        self._update_cluster_metrics()

    async def start(self):
        """Start the scheduler background task."""
        if self._running:
            return
        self._running = True
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Scheduler started")

    async def stop(self):
        """Stop the scheduler."""
        self._running = False
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("Scheduler stopped")

    async def _scheduler_loop(self):
        """Main scheduler loop - runs every second."""
        while self._running:
            try:
                start_time = time.monotonic()
                await self._schedule_cycle()
                cycle_time = time.monotonic() - start_time
                metrics.slurm_scheduler_cycle_seconds.observe(cycle_time)

                # Sleep for remainder of 1-second interval
                sleep_time = max(0.1, 1.0 - cycle_time)
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler cycle error: {e}")
                await asyncio.sleep(1.0)

    async def _schedule_cycle(self):
        """Single scheduling cycle."""
        async with self._lock:
            # 1. Check running jobs for completion/timeout
            await self._check_running_jobs()

            # 2. Schedule pending jobs
            await self._schedule_pending_jobs()

            # 3. Update metrics
            self._update_all_metrics()

    async def _check_running_jobs(self):
        """Check running jobs for completion or timeout."""
        now = datetime.utcnow()
        running_jobs = list(self._jobs_by_state[JobState.RUNNING])

        for job_id in running_jobs:
            job = self.jobs.get(job_id)
            if not job or not job.start_time:
                continue

            runtime = (now - job.start_time).total_seconds()
            time_limit = job.resources.time_limit_minutes * 60

            # Simulate job completion based on command
            # For demo: jobs complete randomly or at their time limit
            completion_chance = runtime / max(time_limit, 60)

            if runtime >= time_limit:
                # Job timed out
                await self._transition_job(job, JobState.TIMEOUT)
                metrics.slurm_jobs_timeout_total.inc()
            elif completion_chance > 0.3 and runtime > 10:
                # Simulate random completion (30% chance per cycle after 10s)
                import random
                if random.random() < 0.05:  # 5% chance per second
                    if random.random() < 0.95:  # 95% success rate
                        await self._transition_job(job, JobState.COMPLETED)
                        metrics.slurm_jobs_completed_total.inc()
                    else:
                        await self._transition_job(job, JobState.FAILED, exit_code=1)
                        metrics.slurm_jobs_failed_total.inc()

    async def _schedule_pending_jobs(self):
        """Schedule pending jobs to available resources."""
        pending_jobs = [
            self.jobs[jid] for jid in self._jobs_by_state[JobState.PENDING]
        ]

        # Sort by priority (descending) then submit time (ascending)
        pending_jobs.sort(
            key=lambda j: (-j.priority_value, j.submit_time)
        )

        backfill_count = 0
        for job in pending_jobs:
            partition = self.partitions.get(job.partition)
            if not partition or partition.state != PartitionState.UP:
                continue

            # Check if resources are available
            if self._can_schedule(job, partition):
                await self._start_job(job, partition)
                backfill_count += 1

        metrics.slurm_scheduler_backfill_jobs.set(backfill_count)

    def _can_schedule(self, job: Job, partition: Partition) -> bool:
        """Check if a job can be scheduled on a partition."""
        req = job.resources

        if req.cpus > partition.idle_cpus:
            return False
        if req.gpus > partition.idle_gpus:
            return False
        if req.memory_gb > partition.idle_memory_gb:
            return False

        return True

    async def _start_job(self, job: Job, partition: Partition):
        """Start a job on the partition."""
        now = datetime.utcnow()
        req = job.resources

        # Allocate resources
        partition.allocated_cpus += req.cpus
        partition.allocated_gpus += req.gpus
        partition.allocated_memory_gb += req.memory_gb
        partition.jobs_pending -= 1
        partition.jobs_running += 1

        # Update job state
        job.state = JobState.RUNNING
        job.start_time = now
        job.node_id = f"{partition.name}-node-{(hash(job.id) % partition.total_nodes) + 1:02d}"

        # Update tracking
        self._jobs_by_state[JobState.PENDING].discard(job.id)
        self._jobs_by_state[JobState.RUNNING].add(job.id)

        # Record wait time
        wait_time = (now - job.submit_time).total_seconds()
        metrics.slurm_job_wait_time_seconds.observe(wait_time)

        logger.info(f"Job {job.id} ({job.name}) started on {job.node_id}")

    async def _transition_job(
        self, job: Job, new_state: JobState, exit_code: Optional[int] = None
    ):
        """Transition a job to a new state."""
        old_state = job.state
        now = datetime.utcnow()

        # Release resources if leaving RUNNING
        if old_state == JobState.RUNNING:
            partition = self.partitions.get(job.partition)
            if partition:
                req = job.resources
                partition.allocated_cpus -= req.cpus
                partition.allocated_gpus -= req.gpus
                partition.allocated_memory_gb -= req.memory_gb
                partition.jobs_running -= 1

            # Record runtime
            if job.start_time:
                runtime = (now - job.start_time).total_seconds()
                metrics.slurm_job_runtime_seconds.observe(runtime)

        # Update tracking
        self._jobs_by_state[old_state].discard(job.id)
        self._jobs_by_state[new_state].add(job.id)

        # Update job
        job.state = new_state
        job.end_time = now
        if exit_code is not None:
            job.exit_code = exit_code

        # Track completed jobs
        if new_state in (JobState.COMPLETED, JobState.FAILED, JobState.CANCELLED, JobState.TIMEOUT):
            self._completed_jobs.append((now, job))
            # Prune old entries
            cutoff = now - timedelta(hours=24)
            self._completed_jobs = [
                (t, j) for t, j in self._completed_jobs if t > cutoff
            ]

        logger.info(f"Job {job.id} transitioned: {old_state} -> {new_state}")

    def _update_all_metrics(self):
        """Update all Prometheus metrics."""
        self._update_cluster_metrics()
        self._update_queue_metrics()
        self._update_partition_metrics()
        self._update_user_metrics()
        self._update_account_metrics()

    def _update_cluster_metrics(self):
        """Update cluster-wide metrics."""
        total_cpus = sum(p.total_cpus for p in self.partitions.values())
        total_gpus = sum(p.total_gpus for p in self.partitions.values())
        total_memory = sum(p.total_memory_gb for p in self.partitions.values())

        allocated_cpus = sum(p.allocated_cpus for p in self.partitions.values())
        allocated_gpus = sum(p.allocated_gpus for p in self.partitions.values())
        allocated_memory = sum(p.allocated_memory_gb for p in self.partitions.values())

        metrics.slurm_cpus_total.set(total_cpus)
        metrics.slurm_cpus_allocated.set(allocated_cpus)
        metrics.slurm_cpus_idle.set(total_cpus - allocated_cpus)

        metrics.slurm_gpus_total.set(total_gpus)
        metrics.slurm_gpus_allocated.set(allocated_gpus)

        metrics.slurm_memory_total_bytes.set(total_memory * 1024 * 1024 * 1024)
        metrics.slurm_memory_allocated_bytes.set(allocated_memory * 1024 * 1024 * 1024)

    def _update_queue_metrics(self):
        """Update queue metrics."""
        metrics.slurm_queue_pending.set(len(self._jobs_by_state[JobState.PENDING]))
        metrics.slurm_queue_running.set(len(self._jobs_by_state[JobState.RUNNING]))
        metrics.slurm_queue_suspended.set(len(self._jobs_by_state[JobState.SUSPENDED]))
        metrics.slurm_queue_completing.set(len(self._jobs_by_state[JobState.COMPLETING]))

    def _update_partition_metrics(self):
        """Update per-partition metrics."""
        for name, partition in self.partitions.items():
            metrics.slurm_partition_cpus_total.labels(partition=name).set(partition.total_cpus)
            metrics.slurm_partition_cpus_allocated.labels(partition=name).set(partition.allocated_cpus)
            metrics.slurm_partition_gpus_total.labels(partition=name).set(partition.total_gpus)
            metrics.slurm_partition_gpus_allocated.labels(partition=name).set(partition.allocated_gpus)
            metrics.slurm_partition_jobs_running.labels(partition=name).set(partition.jobs_running)
            metrics.slurm_partition_jobs_pending.labels(partition=name).set(partition.jobs_pending)
            metrics.slurm_partition_state.labels(partition=name).set(
                1 if partition.state == PartitionState.UP else 0
            )

    def _update_user_metrics(self):
        """Update per-user metrics."""
        user_running: dict[str, int] = defaultdict(int)
        user_pending: dict[str, int] = defaultdict(int)

        for job_id in self._jobs_by_state[JobState.RUNNING]:
            job = self.jobs.get(job_id)
            if job:
                user_running[job.user] += 1

        for job_id in self._jobs_by_state[JobState.PENDING]:
            job = self.jobs.get(job_id)
            if job:
                user_pending[job.user] += 1

        # Update metrics for all known users
        all_users = set(user_running.keys()) | set(user_pending.keys())
        for user in all_users:
            metrics.slurm_user_jobs_running.labels(user=user).set(user_running[user])
            metrics.slurm_user_jobs_pending.labels(user=user).set(user_pending[user])

    def _update_account_metrics(self):
        """Update per-account metrics."""
        account_running: dict[str, int] = defaultdict(int)
        account_pending: dict[str, int] = defaultdict(int)

        for job_id in self._jobs_by_state[JobState.RUNNING]:
            job = self.jobs.get(job_id)
            if job and job.account:
                account_running[job.account] += 1

        for job_id in self._jobs_by_state[JobState.PENDING]:
            job = self.jobs.get(job_id)
            if job and job.account:
                account_pending[job.account] += 1

        all_accounts = set(account_running.keys()) | set(account_pending.keys())
        for account in all_accounts:
            metrics.slurm_account_jobs_running.labels(account=account).set(account_running[account])
            metrics.slurm_account_jobs_pending.labels(account=account).set(account_pending[account])

    # Public API methods

    async def submit_job(self, submission: JobSubmission) -> Job:
        """Submit a new job to the scheduler."""
        async with self._lock:
            self.job_counter += 1
            job_id = f"{self.job_counter:06d}"

            now = datetime.utcnow()

            job = Job(
                id=job_id,
                name=submission.name,
                partition=submission.partition,
                priority=submission.priority,
                priority_value=PRIORITY_VALUES[submission.priority],
                resources=submission.resources,
                command=submission.command,
                account=submission.account,
                user=submission.user,
                state=JobState.PENDING,
                submit_time=now,
            )

            # Validate partition exists
            if job.partition not in self.partitions:
                raise ValueError(f"Unknown partition: {job.partition}")

            partition = self.partitions[job.partition]

            # Validate resources fit partition
            if job.resources.cpus > partition.total_cpus:
                raise ValueError(f"Requested CPUs ({job.resources.cpus}) exceed partition capacity ({partition.total_cpus})")
            if job.resources.gpus > partition.total_gpus:
                raise ValueError(f"Requested GPUs ({job.resources.gpus}) exceed partition capacity ({partition.total_gpus})")
            if job.resources.memory_gb > partition.total_memory_gb:
                raise ValueError(f"Requested memory ({job.resources.memory_gb}GB) exceeds partition capacity ({partition.total_memory_gb}GB)")

            # Validate time limit
            if job.resources.time_limit_minutes > partition.max_time_minutes:
                raise ValueError(f"Time limit ({job.resources.time_limit_minutes}min) exceeds partition max ({partition.max_time_minutes}min)")

            # Add to tracking
            self.jobs[job_id] = job
            self._jobs_by_state[JobState.PENDING].add(job_id)
            self._jobs_by_user[job.user].add(job_id)
            if job.account:
                self._jobs_by_account[job.account].add(job_id)
            self._jobs_by_partition[job.partition].add(job_id)

            # Update partition
            partition.jobs_pending += 1

            metrics.slurm_jobs_submitted_total.inc()
            logger.info(f"Job {job_id} ({job.name}) submitted to partition {job.partition}")

            return job

    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID."""
        return self.jobs.get(job_id)

    async def list_jobs(
        self,
        state: Optional[JobState] = None,
        partition: Optional[str] = None,
        user: Optional[str] = None,
        limit: int = 100,
    ) -> list[Job]:
        """List jobs with optional filters."""
        jobs = list(self.jobs.values())

        if state:
            jobs = [j for j in jobs if j.state == state]
        if partition:
            jobs = [j for j in jobs if j.partition == partition]
        if user:
            jobs = [j for j in jobs if j.user == user]

        # Sort by submit time descending
        jobs.sort(key=lambda j: j.submit_time, reverse=True)

        return jobs[:limit]

    async def cancel_job(self, job_id: str) -> Optional[Job]:
        """Cancel a job."""
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job:
                return None

            if job.state in (JobState.COMPLETED, JobState.FAILED, JobState.CANCELLED, JobState.TIMEOUT):
                return job  # Already terminal

            await self._transition_job(job, JobState.CANCELLED)
            metrics.slurm_jobs_cancelled_total.inc()
            return job

    async def get_partitions(self) -> list[Partition]:
        """Get all partitions."""
        return list(self.partitions.values())

    async def get_partition(self, name: str) -> Optional[Partition]:
        """Get a partition by name."""
        return self.partitions.get(name)

    async def get_cluster_summary(self) -> ClusterSummary:
        """Get cluster-wide summary."""
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=24)

        completed_24h = sum(
            1 for t, j in self._completed_jobs
            if t > cutoff and j.state == JobState.COMPLETED
        )
        failed_24h = sum(
            1 for t, j in self._completed_jobs
            if t > cutoff and j.state in (JobState.FAILED, JobState.TIMEOUT, JobState.NODE_FAIL)
        )

        return ClusterSummary(
            total_nodes=sum(p.total_nodes for p in self.partitions.values()),
            total_cpus=sum(p.total_cpus for p in self.partitions.values()),
            total_gpus=sum(p.total_gpus for p in self.partitions.values()),
            total_memory_gb=sum(p.total_memory_gb for p in self.partitions.values()),
            allocated_cpus=sum(p.allocated_cpus for p in self.partitions.values()),
            allocated_gpus=sum(p.allocated_gpus for p in self.partitions.values()),
            allocated_memory_gb=sum(p.allocated_memory_gb for p in self.partitions.values()),
            jobs_pending=len(self._jobs_by_state[JobState.PENDING]),
            jobs_running=len(self._jobs_by_state[JobState.RUNNING]),
            jobs_completed_24h=completed_24h,
            jobs_failed_24h=failed_24h,
            partitions=len(self.partitions),
        )
