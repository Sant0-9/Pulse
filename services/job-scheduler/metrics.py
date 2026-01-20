"""
Prometheus metrics for SLURM-compatible job scheduler.
Follows SLURM exporter naming conventions.
"""
from prometheus_client import Gauge, Counter, Histogram, Info

# Cluster-level metrics
slurm_cpus_total = Gauge(
    "slurm_cpus_total",
    "Total number of CPUs in the cluster"
)
slurm_cpus_allocated = Gauge(
    "slurm_cpus_allocated",
    "Number of allocated CPUs"
)
slurm_cpus_idle = Gauge(
    "slurm_cpus_idle",
    "Number of idle CPUs"
)

slurm_gpus_total = Gauge(
    "slurm_gpus_total",
    "Total number of GPUs in the cluster"
)
slurm_gpus_allocated = Gauge(
    "slurm_gpus_allocated",
    "Number of allocated GPUs"
)

slurm_memory_total_bytes = Gauge(
    "slurm_memory_total_bytes",
    "Total memory in the cluster (bytes)"
)
slurm_memory_allocated_bytes = Gauge(
    "slurm_memory_allocated_bytes",
    "Allocated memory (bytes)"
)

# Job queue metrics
slurm_queue_pending = Gauge(
    "slurm_queue_pending",
    "Number of pending jobs in the queue"
)
slurm_queue_running = Gauge(
    "slurm_queue_running",
    "Number of running jobs"
)
slurm_queue_suspended = Gauge(
    "slurm_queue_suspended",
    "Number of suspended jobs"
)
slurm_queue_completing = Gauge(
    "slurm_queue_completing",
    "Number of jobs in completing state"
)

# Job state counters (total jobs that have entered each state)
slurm_jobs_submitted_total = Counter(
    "slurm_jobs_submitted_total",
    "Total number of jobs submitted"
)
slurm_jobs_completed_total = Counter(
    "slurm_jobs_completed_total",
    "Total number of jobs completed successfully"
)
slurm_jobs_failed_total = Counter(
    "slurm_jobs_failed_total",
    "Total number of jobs that failed"
)
slurm_jobs_cancelled_total = Counter(
    "slurm_jobs_cancelled_total",
    "Total number of jobs cancelled"
)
slurm_jobs_timeout_total = Counter(
    "slurm_jobs_timeout_total",
    "Total number of jobs that timed out"
)

# Per-partition metrics
slurm_partition_cpus_total = Gauge(
    "slurm_partition_cpus_total",
    "Total CPUs in partition",
    ["partition"]
)
slurm_partition_cpus_allocated = Gauge(
    "slurm_partition_cpus_allocated",
    "Allocated CPUs in partition",
    ["partition"]
)
slurm_partition_gpus_total = Gauge(
    "slurm_partition_gpus_total",
    "Total GPUs in partition",
    ["partition"]
)
slurm_partition_gpus_allocated = Gauge(
    "slurm_partition_gpus_allocated",
    "Allocated GPUs in partition",
    ["partition"]
)
slurm_partition_jobs_running = Gauge(
    "slurm_partition_jobs_running",
    "Running jobs in partition",
    ["partition"]
)
slurm_partition_jobs_pending = Gauge(
    "slurm_partition_jobs_pending",
    "Pending jobs in partition",
    ["partition"]
)
slurm_partition_state = Gauge(
    "slurm_partition_state",
    "Partition state (1=UP, 0=DOWN/DRAIN/INACTIVE)",
    ["partition"]
)

# Per-user metrics
slurm_user_jobs_running = Gauge(
    "slurm_user_jobs_running",
    "Running jobs per user",
    ["user"]
)
slurm_user_jobs_pending = Gauge(
    "slurm_user_jobs_pending",
    "Pending jobs per user",
    ["user"]
)

# Per-account metrics
slurm_account_jobs_running = Gauge(
    "slurm_account_jobs_running",
    "Running jobs per account",
    ["account"]
)
slurm_account_jobs_pending = Gauge(
    "slurm_account_jobs_pending",
    "Pending jobs per account",
    ["account"]
)

# Scheduler performance metrics
slurm_scheduler_cycle_seconds = Histogram(
    "slurm_scheduler_cycle_seconds",
    "Time taken for scheduler cycle",
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)
slurm_scheduler_backfill_jobs = Gauge(
    "slurm_scheduler_backfill_jobs",
    "Number of jobs scheduled via backfill"
)

# Job timing histograms
slurm_job_wait_time_seconds = Histogram(
    "slurm_job_wait_time_seconds",
    "Time jobs spend waiting in queue",
    buckets=[1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]
)
slurm_job_runtime_seconds = Histogram(
    "slurm_job_runtime_seconds",
    "Actual job runtime",
    buckets=[1, 10, 30, 60, 300, 600, 1800, 3600, 7200, 14400]
)

# Scheduler info
slurm_scheduler_info = Info(
    "slurm_scheduler",
    "Scheduler information"
)


def init_scheduler_info(version: str = "1.0.0"):
    """Initialize scheduler info metric."""
    slurm_scheduler_info.info({
        "version": version,
        "scheduler_type": "pulse-simulator",
        "algorithm": "priority-fifo"
    })
