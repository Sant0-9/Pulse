"""Data models for AI Assistant service."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single chat message."""

    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    """Request for chat completion."""

    message: str = Field(..., description="User message", min_length=1)
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    include_context: bool = Field(True, description="Include cluster context in response")


class ChatResponse(BaseModel):
    """Response from chat completion."""

    message: str = Field(..., description="Assistant response")
    conversation_id: str = Field(..., description="Conversation ID")
    context_used: list[str] = Field(default_factory=list, description="Context sources used")
    model: str = Field(..., description="Model used for generation")
    tokens_used: Optional[int] = Field(None, description="Tokens used in response")


class InvestigationRequest(BaseModel):
    """Request for alert investigation."""

    alert_name: str = Field(..., description="Name of the alert to investigate")
    node: Optional[str] = Field(None, description="Node associated with the alert")
    severity: Optional[str] = Field(None, description="Alert severity")


class InvestigationResponse(BaseModel):
    """Response from alert investigation."""

    summary: str = Field(..., description="Investigation summary")
    probable_causes: list[str] = Field(..., description="List of probable causes")
    recommendations: list[str] = Field(..., description="Recommended actions")
    related_metrics: list[str] = Field(..., description="Related metrics to check")
    runbook_steps: list[str] = Field(..., description="Runbook steps to follow")


class ClusterContext(BaseModel):
    """Current cluster context for RAG."""

    nodes_total: int = 0
    nodes_up: int = 0
    gpus_total: int = 0
    gpus_active: int = 0
    jobs_running: int = 0
    jobs_pending: int = 0
    active_alerts: list[dict] = Field(default_factory=list)
    recent_jobs: list[dict] = Field(default_factory=list)
    node_metrics: list[dict] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    ollama_connected: bool
    model_loaded: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
