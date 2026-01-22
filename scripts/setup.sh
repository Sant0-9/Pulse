#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=========================================="
echo "  Pulse - HPC Observability Platform"
echo "  Setup Script"
echo "=========================================="
echo -e "${NC}"

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check for Docker
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check for Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# Build services
echo -e "${YELLOW}Building services (this may take a few minutes)...${NC}"
docker compose build

echo ""
echo -e "${YELLOW}Starting services...${NC}"
docker compose up -d

# Wait for Ollama to be ready
echo ""
echo -e "${YELLOW}Waiting for Ollama to start...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec pulse-ollama curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}Ollama is ready${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${YELLOW}Ollama taking longer than expected, continuing...${NC}"
fi

# Pull the LLM model
echo ""
echo -e "${YELLOW}Pulling LLM model (llama3.2:3b, ~2GB)...${NC}"
echo "This may take several minutes on first run..."
docker exec pulse-ollama ollama pull llama3.2:3b || {
    echo -e "${YELLOW}Model pull in progress, will complete in background${NC}"
}

# Wait for core services
echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "  ${GREEN}$name: healthy${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    echo -e "  ${YELLOW}$name: starting (may need more time)${NC}"
    return 1
}

echo ""
echo "Checking service health:"
wait_for_service "Prometheus" "http://localhost:9090/-/healthy"
wait_for_service "Grafana" "http://localhost:3001/api/health"
wait_for_service "API Gateway" "http://localhost:8081/health"
wait_for_service "Job Scheduler" "http://localhost:8083/health"
wait_for_service "Frontend" "http://localhost:3000"

# Show status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN}=========================================="
echo "  Pulse is now running!"
echo "==========================================${NC}"
echo ""
echo -e "  ${BLUE}Access Points:${NC}"
echo "    Dashboard:        http://localhost:3000"
echo "    Grafana:          http://localhost:3001  (admin / pulse-admin)"
echo "    Prometheus:       http://localhost:9090"
echo "    VictoriaMetrics:  http://localhost:8428"
echo "    Alertmanager:     http://localhost:9093"
echo "    API Gateway:      http://localhost:8081"
echo ""
echo -e "  ${BLUE}Demo Commands:${NC}"
echo "    Generate jobs:    ./scripts/demo-workload.sh"
echo "    Simulate chaos:   ./scripts/chaos.sh"
echo ""
echo -e "  ${BLUE}Management:${NC}"
echo "    View logs:        docker compose logs -f"
echo "    Stop services:    docker compose down"
echo "    Restart:          docker compose restart"
echo ""
echo -e "${YELLOW}Note: AI assistant may take 1-2 minutes to fully initialize.${NC}"
echo ""
