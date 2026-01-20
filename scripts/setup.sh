#!/bin/bash
set -e

echo "=========================================="
echo "  Pulse - HPC Observability Platform"
echo "  Setup Script"
echo "=========================================="
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check for Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Prerequisites checked successfully"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "Building services..."
docker compose build

echo ""
echo "Starting services..."
docker compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "Service Status:"
docker compose ps

echo ""
echo "=========================================="
echo "  Pulse is now running!"
echo "=========================================="
echo ""
echo "  Access points:"
echo "    - Grafana:        http://localhost:3001"
echo "                      (admin / pulse-admin)"
echo "    - Prometheus:     http://localhost:9090"
echo "    - API Gateway:    http://localhost:8081"
echo "    - Node Simulator: http://localhost:8080/metrics"
echo ""
echo "  Useful commands:"
echo "    - View logs:      docker compose logs -f"
echo "    - Stop services:  docker compose down"
echo "    - Restart:        docker compose restart"
echo ""
