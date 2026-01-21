"""Configuration for AI Assistant service."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service configuration
    host: str = "0.0.0.0"
    port: int = 8084

    # Ollama configuration
    ollama_host: str = "http://ollama:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout: int = 120

    # Internal service URLs
    api_gateway_url: str = "http://api-gateway:8081"
    job_scheduler_url: str = "http://job-scheduler:8083"
    prometheus_url: str = "http://prometheus:9090"

    # RAG configuration
    max_context_items: int = 10
    max_alert_history: int = 20
    max_job_history: int = 50

    # Response configuration
    max_tokens: int = 2048
    temperature: float = 0.7

    class Config:
        env_prefix = ""


settings = Settings()
