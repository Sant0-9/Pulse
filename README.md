# Pulse - HPC Cluster Observability Platform

Simulates and monitors high-performance computing clusters with GPU telemetry, job scheduling, and real-time dashboards.

## Features

- **Cluster Simulation**: Realistic GPU (A100, H100) and CPU node simulation with DCGM-compatible metrics
- **Real-time Observability**: Prometheus metrics with 5-second granularity
- **Dashboards**: Pre-configured Grafana dashboards for cluster monitoring
- **API Gateway**: RESTful API for cluster management and metrics queries
- **Containerized**: Docker Compose for easy deployment

## Quick Start

```bash
# Clone the repo
git clone git@github.com:Sant0-9/Pulse.git
cd Pulse

# Run the setup script
./scripts/setup.sh

# Or manually:
docker compose up -d
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / pulse-admin |
| Prometheus | http://localhost:9090 | - |
| API Gateway | http://localhost:8081 | - |
| Node Simulator | http://localhost:8082/metrics | - |
| Job Scheduler | http://localhost:8083 | - |

## Architecture

```
                    +------------------+
                    |  React Dashboard |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v----+  +------v------+  +----v--------+
     |   Grafana   |  | API Gateway |  | AI Assistant|
     +------+------+  +------+------+  +-------------+
            |                |
     +------v----------------v------+
     |         Prometheus           |
     +------+-----------------------+
            |
     +------v------+
     |    Node     |
     |  Simulator  |
     +-------------+
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Node Simulator | Go + Prometheus client |
| API Gateway | Go + Fiber |
| Job Scheduler | Python + FastAPI |
| Metrics | Prometheus |
| Visualization | Grafana |
| Cache | Redis |
| Database | PostgreSQL |
| Containerization | Docker |

## Simulated Metrics

### GPU Metrics (DCGM-compatible)
- `dcgm_gpu_utilization` - GPU utilization percentage
- `dcgm_gpu_temp` - GPU temperature in Celsius
- `dcgm_power_usage` - GPU power consumption in Watts
- `dcgm_memory_used` - GPU memory used in MiB
- `dcgm_sm_clock` - SM clock frequency in MHz

### Node Metrics
- `pulse_node_up` - Node availability
- `pulse_cpu_utilization` - CPU utilization percentage
- `pulse_memory_utilization` - Memory utilization percentage

### Job Scheduler Metrics (SLURM-compatible)

- `slurm_queue_pending` - Number of pending jobs
- `slurm_queue_running` - Number of running jobs
- `slurm_jobs_submitted_total` - Total jobs submitted
- `slurm_jobs_completed_total` - Total jobs completed
- `slurm_jobs_failed_total` - Total jobs failed
- `slurm_partition_cpus_total` - Total CPUs per partition
- `slurm_partition_gpus_total` - Total GPUs per partition
- `slurm_job_wait_time_seconds` - Job wait time histogram

## API Endpoints

### Cluster Management
```
GET  /api/v1/cluster/status      # Cluster health status
GET  /api/v1/cluster/nodes       # List all nodes
GET  /api/v1/cluster/nodes/:id   # Get node details
POST /api/v1/cluster/nodes/:id/drain   # Drain node
POST /api/v1/cluster/nodes/:id/resume  # Resume node
```

### Job Scheduling

```
GET  /api/v1/jobs              # List all jobs
POST /api/v1/jobs              # Submit a new job
GET  /api/v1/jobs/:id          # Get job details
DELETE /api/v1/jobs/:id        # Cancel a job
GET  /api/v1/partitions        # List partitions
GET  /api/v1/partitions/:name  # Get partition details
POST /api/v1/demo/generate-jobs # Generate demo workload
```

### Health & Metrics

```
GET  /health    # Service health check
GET  /metrics   # Prometheus metrics
```

## Development

### Prerequisites
- Go 1.24+
- Docker & Docker Compose
- Node.js 20+ (for React dashboard)

### Building Services

```bash
# Build node-simulator
cd services/node-simulator
go build -o node-simulator .

# Build api-gateway
cd services/api-gateway
go build -o api-gateway .
```

### Running Locally (without Docker)

```bash
# Terminal 1: Run node-simulator
cd services/node-simulator
./node-simulator

# Terminal 2: Run api-gateway
cd services/api-gateway
./api-gateway
```

## Project Structure

```
pulse/
├── docker-compose.yml          # Container orchestration
├── services/
│   ├── node-simulator/         # Go - HPC node simulation
│   ├── api-gateway/            # Go - REST API
│   └── job-scheduler/          # Python - SLURM-compatible scheduler
├── grafana/
│   ├── provisioning/           # Auto-configuration
│   └── dashboards/             # Pre-built dashboards
│       ├── cluster-overview.json
│       ├── gpu-performance.json
│       └── job-analytics.json
├── prometheus/
│   └── prometheus.yml          # Scrape configuration
├── web/                        # React dashboard (Phase 4)
└── scripts/
    └── setup.sh                # One-command setup
```

## Roadmap

- [x] Foundation: Prometheus, Grafana, Node Simulator, API Gateway
- [x] Job Scheduler with SLURM-compatible metrics and Grafana dashboards
- [ ] OpenTelemetry integration, VictoriaMetrics, Alerting
- [ ] React Dashboard for fleet management
- [ ] LLM-powered operations assistant
- [ ] Security hardening and documentation

## License

MIT
