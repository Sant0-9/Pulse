"""Prompt templates for HPC cluster observability."""

SYSTEM_PROMPT = """You are Pulse AI, an intelligent assistant for HPC (High-Performance Computing) cluster operations. You help operators monitor, troubleshoot, and optimize GPU/CPU compute clusters.

Your capabilities:
- Analyze cluster health and performance metrics
- Investigate alerts and provide root cause analysis
- Recommend optimization strategies for workloads
- Explain job scheduling decisions and queue status
- Provide guidance on GPU utilization and thermal management

Guidelines:
- Be concise and actionable in your responses
- Use technical terminology appropriate for HPC operators
- When investigating issues, consider hardware, software, and workload factors
- Reference specific metrics and thresholds when relevant
- Suggest concrete next steps, not vague recommendations

Current cluster context will be provided with each query. Use this data to give accurate, contextual responses."""

CONTEXT_TEMPLATE = """## Current Cluster Status

**Infrastructure:**
- Total Nodes: {nodes_total} ({nodes_up} online)
- Total GPUs: {gpus_total} ({gpus_active} active)

**Workload:**
- Running Jobs: {jobs_running}
- Pending Jobs: {jobs_pending}

{alerts_section}

{jobs_section}

{metrics_section}
"""

ALERTS_SECTION_TEMPLATE = """**Active Alerts ({count}):**
{alerts_list}"""

JOBS_SECTION_TEMPLATE = """**Recent Jobs:**
{jobs_list}"""

METRICS_SECTION_TEMPLATE = """**Node Metrics Summary:**
{metrics_list}"""

INVESTIGATION_PROMPT = """Investigate the following alert and provide analysis:

**Alert:** {alert_name}
**Severity:** {severity}
**Node:** {node}

Based on the current cluster context and your knowledge of HPC systems, provide:

1. **Summary**: Brief description of what this alert means
2. **Probable Causes**: List 3-5 likely causes for this alert
3. **Recommendations**: Specific actions to resolve the issue
4. **Related Metrics**: Other metrics to check for diagnosis
5. **Runbook Steps**: Step-by-step troubleshooting guide

Focus on practical, actionable guidance for an HPC operator."""

OPTIMIZATION_PROMPT = """Analyze the current cluster utilization and suggest optimizations:

Current State:
- GPU Utilization: {gpu_util}%
- CPU Utilization: {cpu_util}%
- Memory Usage: {memory_util}%
- Pending Jobs: {pending_jobs}
- Queue Wait Time: {avg_wait_time}

Provide recommendations for:
1. Resource allocation improvements
2. Job scheduling optimizations
3. Capacity planning suggestions
4. Performance bottleneck identification"""

QUERY_CLASSIFICATION_PROMPT = """Classify the following user query into one of these categories:
- CLUSTER_STATUS: Questions about overall cluster health or status
- JOB_QUERY: Questions about specific jobs or job scheduling
- ALERT_INVESTIGATION: Questions about alerts or troubleshooting
- PERFORMANCE: Questions about performance or optimization
- GENERAL: General questions or conversation

Query: {query}

Respond with only the category name."""


def format_alerts_section(alerts: list[dict]) -> str:
    """Format alerts for context injection."""
    if not alerts:
        return "**Active Alerts:** None"

    alert_lines = []
    for alert in alerts[:10]:
        labels = alert.get("labels", {})
        name = labels.get("alertname", "Unknown")
        severity = labels.get("severity", "unknown")
        node = labels.get("node", "cluster")
        alert_lines.append(f"- [{severity.upper()}] {name} on {node}")

    return ALERTS_SECTION_TEMPLATE.format(
        count=len(alerts),
        alerts_list="\n".join(alert_lines)
    )


def format_jobs_section(jobs: list[dict]) -> str:
    """Format recent jobs for context injection."""
    if not jobs:
        return "**Recent Jobs:** None"

    job_lines = []
    for job in jobs[:10]:
        name = job.get("name", "Unknown")
        state = job.get("state", "unknown")
        partition = job.get("partition", "default")
        gpus = job.get("num_gpus", 0)
        job_lines.append(f"- {name}: {state} ({partition}, {gpus} GPUs)")

    return JOBS_SECTION_TEMPLATE.format(
        jobs_list="\n".join(job_lines)
    )


def format_metrics_section(metrics: list[dict]) -> str:
    """Format node metrics for context injection."""
    if not metrics:
        return ""

    metric_lines = []
    for metric in metrics[:8]:
        node_id = metric.get("node_id", "Unknown")
        cpu = metric.get("cpu_util", 0)
        gpu = metric.get("gpu_util", 0)
        temp = metric.get("gpu_temp", 0)
        metric_lines.append(f"- {node_id}: CPU {cpu:.0f}%, GPU {gpu:.0f}%, Temp {temp:.0f}C")

    return METRICS_SECTION_TEMPLATE.format(
        metrics_list="\n".join(metric_lines)
    )


def build_context_prompt(context: dict) -> str:
    """Build the full context prompt from cluster data."""
    alerts_section = format_alerts_section(context.get("active_alerts", []))
    jobs_section = format_jobs_section(context.get("recent_jobs", []))
    metrics_section = format_metrics_section(context.get("node_metrics", []))

    return CONTEXT_TEMPLATE.format(
        nodes_total=context.get("nodes_total", 0),
        nodes_up=context.get("nodes_up", 0),
        gpus_total=context.get("gpus_total", 0),
        gpus_active=context.get("gpus_active", 0),
        jobs_running=context.get("jobs_running", 0),
        jobs_pending=context.get("jobs_pending", 0),
        alerts_section=alerts_section,
        jobs_section=jobs_section,
        metrics_section=metrics_section
    )
