# Pulse - HPC Cluster Observability Platform

A production-grade HPC cluster monitoring and management platform demonstrating expertise in high-performance computing infrastructure, observability, and modern DevOps practices.

## Features

- **Cluster Simulation**: Realistic GPU (A100, H100) and CPU node simulation with DCGM-compatible metrics
- **Real-time Observability**: Prometheus metrics with 5-second granularity
- **Professional Dashboards**: Pre-configured Grafana dashboards for cluster monitoring
- **API Gateway**: RESTful API for cluster management and metrics queries
- **Containerized**: Docker Compose for easy deployment

## Quick Start

```bash
# Clone and navigate to the project
cd pulse

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
| Node Simulator | http://localhost:8080/metrics | - |

## Architecture

```
                    +------------------+
                    |  React Dashboard |  (Phase 4)
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v----+  +------v------+  +----v--------+
     |   Grafana   |  | API Gateway |  | AI Assistant|
     +------+------+  +------+------+  +-------------+
            |                |               (Phase 5)
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

## API Endpoints

### Cluster Management
```
GET  /api/v1/cluster/status      # Cluster health status
GET  /api/v1/cluster/nodes       # List all nodes
GET  /api/v1/cluster/nodes/:id   # Get node details
POST /api/v1/cluster/nodes/:id/drain   # Drain node
POST /api/v1/cluster/nodes/:id/resume  # Resume node
```

### Health & Metrics
```
GET  /health    # Service health check
GET  /metrics   # Prometheus metrics
```

## Development

### Prerequisites
- Go 1.23+
- Docker & Docker Compose
- Node.js 20+ (for React dashboard - Phase 4)

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
│   └── api-gateway/            # Go - REST API
├── grafana/
│   ├── provisioning/           # Auto-configuration
│   └── dashboards/             # Pre-built dashboards
├── prometheus/
│   └── prometheus.yml          # Scrape configuration
├── web/                        # React dashboard (Phase 4)
└── scripts/
    └── setup.sh                # One-command setup
```

## Roadmap

- [x] Phase 1: Foundation (Prometheus, Grafana, Node Simulator)
- [ ] Phase 2: GPU simulation with DCGM metrics, Job Scheduler
- [ ] Phase 3: OpenTelemetry, VictoriaMetrics, Alerting
- [ ] Phase 4: React Dashboard
- [ ] Phase 5: AI Operations Assistant
- [ ] Phase 6: Security & Documentation

## Skills Demonstrated

- **Infrastructure Monitoring**: Prometheus, Grafana, OpenTelemetry
- **HPC Domain Knowledge**: GPU metrics, SLURM concepts
- **Backend Development**: Go, REST APIs
- **DevOps**: Docker, container orchestration
- **System Design**: Microservices architecture

## License

MIT
