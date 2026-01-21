# Pulse - HPC Cluster Observability Platform

A production-grade observability platform for high-performance computing clusters, featuring GPU telemetry simulation, SLURM-compatible job scheduling, real-time alerting, and an AI-powered operations assistant.

Built to demonstrate expertise in HPC infrastructure, observability pipelines, and modern cloud-native architecture.

## Features

- **GPU Cluster Simulation**: Realistic A100/H100 GPU nodes with DCGM-compatible metrics
- **SLURM-Compatible Scheduling**: Priority-based job scheduler with 30+ metrics
- **Full Observability Stack**: Prometheus, VictoriaMetrics, OpenTelemetry, Alertmanager
- **AI Operations Assistant**: LLM-powered chat for cluster analysis (Ollama + llama3.2)
- **Real-time Dashboard**: React 19 fleet management UI with live updates
- **Pre-configured Dashboards**: 5 Grafana dashboards for GPU, jobs, alerts, and network
- **Production-Ready Alerting**: 30+ alert rules across 5 categories

## Quick Start

```bash
# Clone the repository
git clone git@github.com:Sant0-9/Pulse.git
cd Pulse/pulse

# One-command setup (builds, starts, pulls LLM model)
./scripts/setup.sh

# Or manually:
docker compose up -d
```

**First startup takes 5-10 minutes** to pull the Ollama model (~2GB).

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Dashboard** | http://localhost:3002 | - |
| **Grafana** | http://localhost:3001 | admin / pulse-admin |
| **Prometheus** | http://localhost:9090 | - |
| **VictoriaMetrics** | http://localhost:8428 | - |
| **Alertmanager** | http://localhost:9093 | - |
| **API Gateway** | http://localhost:8081 | - |
| **Job Scheduler** | http://localhost:8083 | - |
| **AI Assistant** | http://localhost:8084 | - |
| **Ollama** | http://localhost:11434 | - |

## Architecture

```
                        +------------------+
                        |  React Dashboard |
                        |   (Port 3002)    |
                        +--------+---------+
                                 |
              +------------------+------------------+
              |                  |                  |
     +--------v------+    +------v------+    +-----v--------+
     |    Grafana    |    | API Gateway |    | AI Assistant |
     |  (Port 3001)  |    | (Port 8081) |    | (Port 8084)  |
     +-------+-------+    +------+------+    +------+-------+
             |                   |                  |
             |           +-------+-------+          |
             |           |               |          |
     +-------v-----------v-------+  +----v---------v----+
     |      Prometheus           |  |   Job Scheduler   |
     |      (Port 9090)          |  |   (Port 8083)     |
     +-------+-------------------+  +-------------------+
             |
     +-------v-------+    +------------------+
     | VictoriaMetrics|   | OpenTelemetry    |
     |  (Port 8428)  |    | Collector        |
     +---------------+    +------------------+
             |
     +-------v-------+    +------------------+
     | Node Simulator|    |   Alertmanager   |
     | (Port 8082)   |    |   (Port 9093)    |
     +---------------+    +------------------+
```

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Node Simulator** | Go + Prometheus client | Go 1.24 |
| **API Gateway** | Go + Fiber | v2 |
| **Job Scheduler** | Python + FastAPI | 0.115.12 |
| **AI Assistant** | Python + Ollama | 0.6.1 |
| **Frontend** | React + TypeScript | 19.2.3 |
| **Build Tool** | Vite | 7.2.4 |
| **State Management** | TanStack Query | 5.90.19 |
| **Metrics Collection** | Prometheus | 2.50.0 |
| **Long-term Storage** | VictoriaMetrics | 1.133.0 |
| **Telemetry Pipeline** | OpenTelemetry Collector | 0.143.0 |
| **Alerting** | Alertmanager | 0.30.1 |
| **Visualization** | Grafana | 12.0.0 |
| **LLM Runtime** | Ollama | 0.9.0 |
| **LLM Model** | llama3.2:3b | - |
| **Cache** | Redis | 8.4.0 |
| **Database** | PostgreSQL | 16 |

## Simulated Metrics

### GPU Metrics (DCGM-compatible)

| Metric | Description |
|--------|-------------|
| `dcgm_gpu_utilization` | GPU utilization percentage |
| `dcgm_gpu_temp` | GPU temperature in Celsius |
| `dcgm_power_usage` | Power consumption in Watts |
| `dcgm_memory_used` | GPU memory used in MiB |
| `dcgm_memory_total` | GPU memory total in MiB |
| `dcgm_sm_clock` | SM clock frequency in MHz |
| `dcgm_ecc_errors_total` | ECC error count |

### Job Scheduler Metrics (SLURM-compatible)

| Metric | Description |
|--------|-------------|
| `slurm_queue_pending` | Pending jobs count |
| `slurm_queue_running` | Running jobs count |
| `slurm_jobs_submitted_total` | Total submitted jobs |
| `slurm_jobs_completed_total` | Total completed jobs |
| `slurm_jobs_failed_total` | Total failed jobs |
| `slurm_partition_cpus_total` | CPUs per partition |
| `slurm_partition_gpus_total` | GPUs per partition |
| `slurm_job_wait_time_seconds` | Wait time histogram |
| `slurm_job_run_time_seconds` | Runtime histogram |

### Node Metrics

| Metric | Description |
|--------|-------------|
| `pulse_node_up` | Node availability (0/1) |
| `pulse_cpu_utilization` | CPU utilization % |
| `pulse_memory_utilization` | Memory utilization % |
| `pulse_network_rx_bytes` | Network received bytes |
| `pulse_network_tx_bytes` | Network transmitted bytes |

## API Reference

### Cluster Management

```http
GET  /api/v1/cluster/status           # Cluster health overview
GET  /api/v1/cluster/nodes            # List all nodes
GET  /api/v1/cluster/nodes/:id        # Node details with GPU info
POST /api/v1/cluster/nodes/:id/drain  # Drain node for maintenance
POST /api/v1/cluster/nodes/:id/resume # Resume drained node
```

### Job Scheduling

```http
GET    /api/v1/jobs                   # List jobs (filters: state, partition)
POST   /api/v1/jobs                   # Submit new job
GET    /api/v1/jobs/:id               # Job details
DELETE /api/v1/jobs/:id               # Cancel job
GET    /api/v1/partitions             # List partitions
GET    /api/v1/partitions/:name       # Partition details
POST   /api/v1/demo/generate-jobs     # Generate demo workload
```

### Alerts

```http
GET  /api/v1/alerts                   # List active alerts
POST /api/v1/alerts/webhook           # Alertmanager webhook receiver
POST /api/v1/alerts/acknowledge/:id   # Acknowledge alert
```

### AI Assistant

```http
GET    /api/v1/ai/health              # AI service health
POST   /api/v1/ai/chat                # Send chat message
POST   /api/v1/ai/chat/stream         # Stream chat response
POST   /api/v1/ai/investigate         # Investigate an alert
DELETE /api/v1/ai/conversations/:id   # Clear conversation
GET    /api/v1/ai/context             # Get current cluster context
```

### Health & Metrics

```http
GET /health                           # Service health check
GET /metrics                          # Prometheus metrics endpoint
```

## Grafana Dashboards

| Dashboard | Description |
|-----------|-------------|
| **Cluster Overview** | High-level cluster health, node status, resource utilization |
| **GPU Performance** | Per-GPU metrics, temperature, power, memory, utilization |
| **Job Analytics** | Job queue depth, wait times, completion rates, partition stats |
| **Network Health** | Network I/O, bandwidth, error rates |
| **Alerts** | Active alerts, alert history, severity breakdown |

## Alert Rules

30+ production-grade alert rules across 5 categories:

| Category | Examples |
|----------|----------|
| **GPU Alerts** | High temperature, memory exhaustion, ECC errors, low utilization |
| **Node Alerts** | Node down, high CPU/memory, disk pressure |
| **Job Alerts** | Queue backlog, high failure rate, long wait times |
| **Cluster Alerts** | Low overall utilization, partition imbalance |
| **Infrastructure** | Service down, scrape failures, storage pressure |

## Demo Scripts

```bash
# Generate sample workload (50 jobs)
./scripts/demo-workload.sh

# Simulate failures (GPU overheat, node down)
./scripts/chaos.sh

# View real-time logs
docker compose logs -f

# Stop all services
docker compose down
```

## Development

### Prerequisites

- Docker 24+ & Docker Compose v2
- Go 1.24+ (for service development)
- Node.js 20+ (for frontend development)
- Python 3.12+ (for AI/scheduler development)

### Project Structure

```
pulse/
├── docker-compose.yml              # Container orchestration
├── services/
│   ├── node-simulator/             # Go - GPU/CPU node simulation
│   ├── api-gateway/                # Go - REST API + proxying
│   ├── job-scheduler/              # Python - SLURM-compatible scheduler
│   └── ai-assistant/               # Python - LLM operations assistant
├── frontend/                       # React 19 dashboard
│   ├── src/
│   │   ├── components/             # UI components
│   │   ├── pages/                  # Route pages
│   │   └── lib/                    # API client, utilities
│   └── Dockerfile
├── grafana/
│   ├── provisioning/               # Auto-configuration
│   └── dashboards/                 # 5 pre-built dashboards
├── prometheus/
│   ├── prometheus.yml              # Scrape config
│   └── rules/                      # Alert rules
├── alertmanager/
│   └── alertmanager.yml            # Notification config
├── otel-collector/
│   └── config.yaml                 # OTel pipeline config
└── scripts/
    ├── setup.sh                    # One-command setup
    ├── demo-workload.sh            # Generate sample jobs
    └── chaos.sh                    # Failure simulation
```

### Building Services Locally

```bash
# Node Simulator (Go)
cd services/node-simulator && go build -o node-simulator .

# API Gateway (Go)
cd services/api-gateway && go build -o api-gateway .

# Job Scheduler (Python)
cd services/job-scheduler && pip install -r requirements.txt

# AI Assistant (Python)
cd services/ai-assistant && pip install -r requirements.txt

# Frontend (React)
cd frontend && npm install && npm run build
```

### Running Without Docker

```bash
# Terminal 1: Node Simulator
cd services/node-simulator && ./node-simulator

# Terminal 2: API Gateway
cd services/api-gateway && ./api-gateway

# Terminal 3: Job Scheduler
cd services/job-scheduler && uvicorn main:app --port 8083

# Terminal 4: AI Assistant (requires Ollama running)
cd services/ai-assistant && uvicorn main:app --port 8084

# Terminal 5: Frontend
cd frontend && npm run dev
```

## Configuration

### Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | All | varies | Service port |
| `PROMETHEUS_URL` | api-gateway | http://localhost:9090 | Prometheus endpoint |
| `JOB_SCHEDULER_URL` | api-gateway | http://localhost:8083 | Job scheduler endpoint |
| `AI_ASSISTANT_URL` | api-gateway | http://localhost:8084 | AI assistant endpoint |
| `OLLAMA_HOST` | ai-assistant | http://ollama:11434 | Ollama API endpoint |
| `OLLAMA_MODEL` | ai-assistant | llama3.2:3b | LLM model to use |

## Troubleshooting

### Services not starting

```bash
# Check service logs
docker compose logs <service-name>

# Rebuild all services
docker compose build --no-cache
docker compose up -d
```

### AI Assistant not responding

```bash
# Check if Ollama model is downloaded
docker exec pulse-ollama ollama list

# Manually pull the model
docker exec pulse-ollama ollama pull llama3.2:3b
```

### Grafana dashboards empty

1. Wait 30 seconds for initial scrape
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify datasource: Grafana > Connections > Data sources

## License

MIT
