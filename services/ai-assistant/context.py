"""Context service for RAG - fetches cluster data for LLM context injection."""

import logging
from typing import Optional

import httpx

from config import settings
from models import ClusterContext

logger = logging.getLogger(__name__)


class ContextService:
    """Service for fetching and aggregating cluster context."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        self.api_base = settings.api_gateway_url
        self.scheduler_base = settings.job_scheduler_url

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def get_cluster_status(self) -> dict:
        """Fetch cluster status from API gateway."""
        try:
            response = await self.client.get(f"{self.api_base}/api/v1/cluster/status")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch cluster status: {e}")
            return {}

    async def get_nodes(self) -> list[dict]:
        """Fetch node information from API gateway."""
        try:
            response = await self.client.get(f"{self.api_base}/api/v1/cluster/nodes")
            response.raise_for_status()
            data = response.json()
            return data.get("nodes", [])
        except Exception as e:
            logger.error(f"Failed to fetch nodes: {e}")
            return []

    async def get_alerts(self) -> list[dict]:
        """Fetch active alerts from API gateway."""
        try:
            response = await self.client.get(f"{self.api_base}/api/v1/alerts")
            response.raise_for_status()
            data = response.json()
            return data.get("alerts", [])
        except Exception as e:
            logger.error(f"Failed to fetch alerts: {e}")
            return []

    async def get_jobs(self, limit: int = 50) -> dict:
        """Fetch recent jobs from job scheduler."""
        try:
            response = await self.client.get(
                f"{self.scheduler_base}/jobs",
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch jobs: {e}")
            return {"jobs": [], "stats": {}}

    async def get_full_context(self) -> ClusterContext:
        """Fetch and aggregate full cluster context for RAG."""
        # Fetch all data concurrently
        import asyncio

        cluster_task = asyncio.create_task(self.get_cluster_status())
        nodes_task = asyncio.create_task(self.get_nodes())
        alerts_task = asyncio.create_task(self.get_alerts())
        jobs_task = asyncio.create_task(self.get_jobs(settings.max_job_history))

        cluster = await cluster_task
        nodes = await nodes_task
        alerts = await alerts_task
        jobs_data = await jobs_task

        # Process nodes into metrics summary
        node_metrics = []
        for node in nodes[:settings.max_context_items]:
            gpu_util = 0
            gpu_temp = 0
            if node.get("gpus"):
                gpus = node["gpus"]
                gpu_util = sum(g.get("utilization", 0) for g in gpus) / len(gpus)
                gpu_temp = sum(g.get("temp", 0) for g in gpus) / len(gpus)

            node_metrics.append({
                "node_id": node.get("id", "unknown"),
                "cpu_util": node.get("cpu_utilization", 0),
                "gpu_util": gpu_util,
                "gpu_temp": gpu_temp,
                "status": node.get("status", "unknown")
            })

        # Build context object
        jobs = jobs_data.get("jobs", [])
        stats = jobs_data.get("stats", {})

        return ClusterContext(
            nodes_total=cluster.get("nodes_total", len(nodes)),
            nodes_up=cluster.get("nodes_up", sum(1 for n in nodes if n.get("status") == "up")),
            gpus_total=cluster.get("gpus_total", 0),
            gpus_active=cluster.get("gpus_active", 0),
            jobs_running=stats.get("running", 0),
            jobs_pending=stats.get("pending", 0),
            active_alerts=alerts[:settings.max_alert_history],
            recent_jobs=jobs[:settings.max_job_history],
            node_metrics=node_metrics
        )

    async def get_context_for_alert(self, alert_name: str, node: Optional[str] = None) -> dict:
        """Get focused context for a specific alert investigation."""
        context = await self.get_full_context()

        # Find the specific alert
        target_alert = None
        for alert in context.active_alerts:
            labels = alert.get("labels", {})
            if labels.get("alertname") == alert_name:
                if node is None or labels.get("node") == node:
                    target_alert = alert
                    break

        # Get node-specific metrics if node is specified
        node_detail = None
        if node:
            for metric in context.node_metrics:
                if metric.get("node_id") == node:
                    node_detail = metric
                    break

        return {
            "cluster": context.model_dump(),
            "target_alert": target_alert,
            "node_detail": node_detail
        }


# Singleton instance
context_service = ContextService()
