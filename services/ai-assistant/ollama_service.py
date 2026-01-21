"""Ollama service for LLM interactions."""

import logging
from typing import AsyncGenerator, Optional

import ollama
from ollama import AsyncClient

from config import settings
from prompts import SYSTEM_PROMPT, INVESTIGATION_PROMPT, build_context_prompt

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with Ollama LLM."""

    def __init__(self):
        self.client = AsyncClient(host=settings.ollama_host)
        self.model = settings.ollama_model
        self.conversations: dict[str, list[dict]] = {}

    async def check_connection(self) -> bool:
        """Check if Ollama is reachable and model is available."""
        try:
            models = await self.client.list()
            model_names = [m.get("name", "") for m in models.get("models", [])]
            # Check if our model is available (with or without tag)
            model_base = self.model.split(":")[0]
            return any(model_base in name for name in model_names)
        except Exception as e:
            logger.error(f"Ollama connection check failed: {e}")
            return False

    async def pull_model(self) -> bool:
        """Pull the configured model if not available."""
        try:
            logger.info(f"Pulling model: {self.model}")
            await self.client.pull(self.model)
            return True
        except Exception as e:
            logger.error(f"Failed to pull model: {e}")
            return False

    def _get_conversation(self, conversation_id: str) -> list[dict]:
        """Get or create a conversation history."""
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        return self.conversations[conversation_id]

    def _trim_conversation(self, messages: list[dict], max_messages: int = 20) -> list[dict]:
        """Trim conversation history to prevent context overflow."""
        if len(messages) <= max_messages:
            return messages
        # Keep system message (if first) and recent messages
        if messages and messages[0].get("role") == "system":
            return [messages[0]] + messages[-(max_messages - 1):]
        return messages[-max_messages:]

    async def chat(
        self,
        message: str,
        conversation_id: str,
        context: Optional[dict] = None,
        stream: bool = False
    ) -> str:
        """Send a chat message and get a response."""
        messages = self._get_conversation(conversation_id)

        # Add system prompt if new conversation
        if not messages:
            messages.append({
                "role": "system",
                "content": SYSTEM_PROMPT
            })

        # Add context if provided
        if context:
            context_prompt = build_context_prompt(context)
            # Update or add context message
            context_msg = {
                "role": "system",
                "content": f"Current cluster context:\n\n{context_prompt}"
            }
            # Find and update existing context or insert after system prompt
            context_idx = next(
                (i for i, m in enumerate(messages)
                 if m.get("role") == "system" and "Current cluster context" in m.get("content", "")),
                None
            )
            if context_idx is not None:
                messages[context_idx] = context_msg
            elif len(messages) > 0:
                messages.insert(1, context_msg)

        # Add user message
        messages.append({
            "role": "user",
            "content": message
        })

        # Trim if needed
        messages = self._trim_conversation(messages)
        self.conversations[conversation_id] = messages

        try:
            response = await self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    "temperature": settings.temperature,
                    "num_predict": settings.max_tokens
                }
            )

            assistant_message = response.get("message", {}).get("content", "")

            # Add assistant response to history
            messages.append({
                "role": "assistant",
                "content": assistant_message
            })

            return assistant_message

        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise

    async def chat_stream(
        self,
        message: str,
        conversation_id: str,
        context: Optional[dict] = None
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response."""
        messages = self._get_conversation(conversation_id)

        if not messages:
            messages.append({
                "role": "system",
                "content": SYSTEM_PROMPT
            })

        if context:
            context_prompt = build_context_prompt(context)
            messages.insert(1, {
                "role": "system",
                "content": f"Current cluster context:\n\n{context_prompt}"
            })

        messages.append({
            "role": "user",
            "content": message
        })

        messages = self._trim_conversation(messages)
        self.conversations[conversation_id] = messages

        full_response = ""
        try:
            async for chunk in await self.client.chat(
                model=self.model,
                messages=messages,
                stream=True,
                options={
                    "temperature": settings.temperature,
                    "num_predict": settings.max_tokens
                }
            ):
                content = chunk.get("message", {}).get("content", "")
                full_response += content
                yield content

            messages.append({
                "role": "assistant",
                "content": full_response
            })

        except Exception as e:
            logger.error(f"Stream error: {e}")
            raise

    async def investigate_alert(
        self,
        alert_name: str,
        severity: str,
        node: Optional[str],
        context: dict
    ) -> dict:
        """Investigate an alert and return structured analysis."""
        prompt = INVESTIGATION_PROMPT.format(
            alert_name=alert_name,
            severity=severity or "unknown",
            node=node or "cluster-wide"
        )

        # Build messages for investigation
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": f"Current cluster context:\n\n{build_context_prompt(context)}"},
            {"role": "user", "content": prompt}
        ]

        try:
            response = await self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    "temperature": 0.3,  # Lower temperature for more focused analysis
                    "num_predict": settings.max_tokens
                }
            )

            content = response.get("message", {}).get("content", "")

            # Parse the response into structured format
            return self._parse_investigation_response(content)

        except Exception as e:
            logger.error(f"Investigation error: {e}")
            raise

    def _parse_investigation_response(self, content: str) -> dict:
        """Parse investigation response into structured format."""
        sections = {
            "summary": "",
            "probable_causes": [],
            "recommendations": [],
            "related_metrics": [],
            "runbook_steps": []
        }

        current_section = None
        current_items = []

        for line in content.split("\n"):
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()

            # Detect section headers
            if "summary" in lower_line and ("**" in line or ":" in line):
                if current_section and current_items:
                    sections[current_section] = current_items
                current_section = "summary"
                current_items = []
                # Check if summary is on same line
                if ":" in line:
                    summary_text = line.split(":", 1)[-1].strip()
                    if summary_text:
                        sections["summary"] = summary_text
                        current_section = None
            elif "probable cause" in lower_line or "likely cause" in lower_line:
                if current_section == "summary" and current_items:
                    sections["summary"] = " ".join(current_items)
                current_section = "probable_causes"
                current_items = []
            elif "recommendation" in lower_line or "action" in lower_line:
                if current_section and current_items:
                    if current_section == "summary":
                        sections["summary"] = " ".join(current_items)
                    else:
                        sections[current_section] = current_items
                current_section = "recommendations"
                current_items = []
            elif "related metric" in lower_line or "metrics to check" in lower_line:
                if current_section and current_items:
                    sections[current_section] = current_items
                current_section = "related_metrics"
                current_items = []
            elif "runbook" in lower_line or "troubleshooting" in lower_line or "step" in lower_line:
                if current_section and current_items:
                    sections[current_section] = current_items
                current_section = "runbook_steps"
                current_items = []
            elif current_section:
                # Add content to current section
                if line.startswith(("-", "*", "1", "2", "3", "4", "5", "6", "7", "8", "9")):
                    # Remove bullet/number prefix
                    item = line.lstrip("-*0123456789. ").strip()
                    if item:
                        current_items.append(item)
                elif current_section == "summary":
                    current_items.append(line)

        # Capture last section
        if current_section and current_items:
            if current_section == "summary":
                sections["summary"] = " ".join(current_items)
            else:
                sections[current_section] = current_items

        # Ensure summary is a string
        if isinstance(sections["summary"], list):
            sections["summary"] = " ".join(sections["summary"])

        return sections

    def clear_conversation(self, conversation_id: str):
        """Clear a conversation history."""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]


# Singleton instance
ollama_service = OllamaService()
