"""FastAPI routes for AI Assistant service."""

import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models import (
    ChatRequest,
    ChatResponse,
    InvestigationRequest,
    InvestigationResponse,
    HealthResponse
)
from ollama_service import ollama_service
from context import context_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    ollama_connected = await ollama_service.check_connection()

    return HealthResponse(
        status="healthy" if ollama_connected else "degraded",
        ollama_connected=ollama_connected,
        model_loaded=ollama_connected,
        timestamp=datetime.utcnow()
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a chat message and get a response."""
    conversation_id = request.conversation_id or str(uuid.uuid4())

    # Get cluster context if requested
    context = None
    context_sources = []

    if request.include_context:
        try:
            cluster_context = await context_service.get_full_context()
            context = cluster_context.model_dump()
            context_sources = ["cluster_status", "nodes", "alerts", "jobs"]
        except Exception as e:
            logger.warning(f"Failed to fetch context: {e}")

    try:
        response = await ollama_service.chat(
            message=request.message,
            conversation_id=conversation_id,
            context=context
        )

        return ChatResponse(
            message=response,
            conversation_id=conversation_id,
            context_used=context_sources,
            model=ollama_service.model,
            tokens_used=None  # Ollama doesn't always report token counts
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream a chat response."""
    conversation_id = request.conversation_id or str(uuid.uuid4())

    context = None
    if request.include_context:
        try:
            cluster_context = await context_service.get_full_context()
            context = cluster_context.model_dump()
        except Exception as e:
            logger.warning(f"Failed to fetch context: {e}")

    async def generate():
        try:
            async for chunk in ollama_service.chat_stream(
                message=request.message,
                conversation_id=conversation_id,
                context=context
            ):
                yield chunk
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"\n\nError: {str(e)}"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"X-Conversation-ID": conversation_id}
    )


@router.post("/investigate", response_model=InvestigationResponse)
async def investigate_alert(request: InvestigationRequest):
    """Investigate an alert and provide analysis."""
    try:
        # Get context focused on the alert
        context_data = await context_service.get_context_for_alert(
            alert_name=request.alert_name,
            node=request.node
        )

        result = await ollama_service.investigate_alert(
            alert_name=request.alert_name,
            severity=request.severity,
            node=request.node,
            context=context_data.get("cluster", {})
        )

        return InvestigationResponse(
            summary=result.get("summary", "Unable to generate summary"),
            probable_causes=result.get("probable_causes", []),
            recommendations=result.get("recommendations", []),
            related_metrics=result.get("related_metrics", []),
            runbook_steps=result.get("runbook_steps", [])
        )

    except Exception as e:
        logger.error(f"Investigation error: {e}")
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def clear_conversation(conversation_id: str):
    """Clear a conversation history."""
    ollama_service.clear_conversation(conversation_id)
    return {"message": "Conversation cleared", "conversation_id": conversation_id}


@router.get("/context")
async def get_current_context():
    """Get the current cluster context (for debugging)."""
    try:
        context = await context_service.get_full_context()
        return context.model_dump()
    except Exception as e:
        logger.error(f"Context fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch context: {str(e)}")
