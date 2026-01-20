"""
Pydantic models for job scheduler.
SLURM-compatible job and partition definitions.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class JobState(str, Enum):
    """SLURM-compatible job states."""
    PENDING = "PENDING"
    PENDING_DEPENDENCY = "PENDING_DEPENDENCY"
    RUNNING = "RUNNING"
    SUSPENDED = "SUSPENDED"
    COMPLETING = "COMPLETING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    CANCELLED = "CANCELLED"
    NODE_FAIL = "NODE_FAIL"
    PREEMPTED = "PREEMPTED"


class PartitionState(str, Enum):
    """Partition states."""
    UP = "UP"
    DOWN = "DOWN"
    DRAIN = "DRAIN"
    INACTIVE = "INACTIVE"


class Priority(str, Enum):
    """Job priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


PRIORITY_VALUES = {
    Priority.LOW: 1,
    Priority.NORMAL: 10,
    Priority.HIGH: 50,
    Priority.URGENT: 100,
}


class ResourceRequirements(BaseModel):
    """Resource requirements for a job."""
    cpus: int = Field(default=1, ge=1, le=1024, description="Number of CPUs required")
    gpus: int = Field(default=0, ge=0, le=64, description="Number of GPUs required")
    memory_gb: float = Field(default=1.0, ge=0.1, le=4096, description="Memory in GB")
    time_limit_minutes: int = Field(default=60, ge=1, le=43200, description="Max runtime in minutes")


class JobSubmission(BaseModel):
    """Request model for submitting a new job."""
    name: str = Field(..., min_length=1, max_length=255, description="Job name")
    partition: str = Field(default="gpu", description="Target partition")
    priority: Priority = Field(default=Priority.NORMAL, description="Job priority")
    resources: ResourceRequirements = Field(default_factory=ResourceRequirements)
    command: str = Field(default="/bin/sleep 60", max_length=4096, description="Command to execute")
    account: Optional[str] = Field(default=None, max_length=64, description="Account/project name")
    user: str = Field(default="demo-user", max_length=64, description="Submitting user")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Sanitize job name."""
        return v.strip().replace(" ", "_")


class Job(BaseModel):
    """Full job model with runtime information."""
    id: str = Field(..., description="Unique job ID")
    name: str
    partition: str
    priority: Priority
    priority_value: int = Field(default=10)
    resources: ResourceRequirements
    command: str
    account: Optional[str] = None
    user: str

    state: JobState = Field(default=JobState.PENDING)
    exit_code: Optional[int] = None
    node_id: Optional[str] = Field(default=None, description="Assigned node")

    submit_time: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class JobResponse(BaseModel):
    """API response for job queries."""
    job: Job


class JobListResponse(BaseModel):
    """API response for listing jobs."""
    jobs: list[Job]
    total: int
    pending: int
    running: int


class Partition(BaseModel):
    """Compute partition definition."""
    name: str
    state: PartitionState = Field(default=PartitionState.UP)
    total_nodes: int = Field(ge=0)
    total_cpus: int = Field(ge=0)
    total_gpus: int = Field(ge=0)
    total_memory_gb: float = Field(ge=0)

    allocated_cpus: int = Field(default=0, ge=0)
    allocated_gpus: int = Field(default=0, ge=0)
    allocated_memory_gb: float = Field(default=0.0, ge=0)

    max_time_minutes: int = Field(default=1440, description="Max job time limit")
    default_time_minutes: int = Field(default=60, description="Default job time limit")

    jobs_running: int = Field(default=0, ge=0)
    jobs_pending: int = Field(default=0, ge=0)

    @property
    def idle_cpus(self) -> int:
        return self.total_cpus - self.allocated_cpus

    @property
    def idle_gpus(self) -> int:
        return self.total_gpus - self.allocated_gpus

    @property
    def idle_memory_gb(self) -> float:
        return self.total_memory_gb - self.allocated_memory_gb


class PartitionListResponse(BaseModel):
    """API response for listing partitions."""
    partitions: list[Partition]
    total: int


class ClusterSummary(BaseModel):
    """Cluster-wide summary."""
    total_nodes: int
    total_cpus: int
    total_gpus: int
    total_memory_gb: float

    allocated_cpus: int
    allocated_gpus: int
    allocated_memory_gb: float

    jobs_pending: int
    jobs_running: int
    jobs_completed_24h: int
    jobs_failed_24h: int

    partitions: int
