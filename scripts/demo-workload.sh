#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:8081}"

echo -e "${BLUE}"
echo "=========================================="
echo "  Pulse - Demo Workload Generator"
echo "=========================================="
echo -e "${NC}"

# Check if API is available
echo -e "${YELLOW}Checking API availability...${NC}"
if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: API Gateway is not available at $API_URL${NC}"
    echo "Make sure Pulse is running: ./scripts/setup.sh"
    exit 1
fi
echo -e "${GREEN}API Gateway is healthy${NC}"
echo ""

# Generate demo jobs using the built-in endpoint
echo -e "${YELLOW}Generating demo workload...${NC}"
response=$(curl -sf -X POST "$API_URL/api/v1/demo/generate-jobs" \
    -H "Content-Type: application/json")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Demo jobs generated successfully${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo -e "${RED}Failed to generate demo jobs${NC}"
    exit 1
fi

echo ""

# Also submit some custom jobs with different characteristics
echo -e "${YELLOW}Submitting custom training jobs...${NC}"

# GPU-intensive training job
curl -sf -X POST "$API_URL/api/v1/jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "llm-finetune-gpt4",
        "partition": "gpu",
        "priority": 100,
        "cpus": 32,
        "gpus": 8,
        "memory_gb": 512,
        "wall_time_minutes": 480
    }' > /dev/null && echo -e "  ${GREEN}Submitted: llm-finetune-gpt4 (8 GPUs)${NC}"

# Multi-node distributed training
curl -sf -X POST "$API_URL/api/v1/jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "distributed-resnet-training",
        "partition": "gpu",
        "priority": 80,
        "cpus": 64,
        "gpus": 4,
        "memory_gb": 256,
        "wall_time_minutes": 240
    }' > /dev/null && echo -e "  ${GREEN}Submitted: distributed-resnet-training (4 GPUs)${NC}"

# CPU-only preprocessing job
curl -sf -X POST "$API_URL/api/v1/jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "data-preprocessing-pipeline",
        "partition": "cpu",
        "priority": 50,
        "cpus": 128,
        "gpus": 0,
        "memory_gb": 256,
        "wall_time_minutes": 60
    }' > /dev/null && echo -e "  ${GREEN}Submitted: data-preprocessing-pipeline (CPU only)${NC}"

# High-memory job
curl -sf -X POST "$API_URL/api/v1/jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "genome-analysis-large",
        "partition": "highmem",
        "priority": 60,
        "cpus": 48,
        "gpus": 0,
        "memory_gb": 1024,
        "wall_time_minutes": 720
    }' > /dev/null && echo -e "  ${GREEN}Submitted: genome-analysis-large (1TB RAM)${NC}"

# Quick debug job
curl -sf -X POST "$API_URL/api/v1/jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "debug-test-run",
        "partition": "debug",
        "priority": 200,
        "cpus": 4,
        "gpus": 1,
        "memory_gb": 16,
        "wall_time_minutes": 15
    }' > /dev/null && echo -e "  ${GREEN}Submitted: debug-test-run (debug partition)${NC}"

echo ""

# Show current job statistics
echo -e "${YELLOW}Current Job Statistics:${NC}"
stats=$(curl -sf "$API_URL/api/v1/jobs" | python3 -c "
import sys, json
data = json.load(sys.stdin)
stats = data.get('stats', {})
print(f\"  Total jobs: {data.get('total', 0)}\")
print(f\"  Pending: {stats.get('pending', 0)}\")
print(f\"  Running: {stats.get('running', 0)}\")
print(f\"  Completed: {stats.get('completed', 0)}\")
print(f\"  Failed: {stats.get('failed', 0)}\")
" 2>/dev/null) && echo "$stats"

echo ""

# Show partition status
echo -e "${YELLOW}Partition Status:${NC}"
curl -sf "$API_URL/api/v1/partitions" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('partitions', []):
    name = p.get('name', 'unknown')
    nodes = p.get('nodes', 0)
    cpus = p.get('total_cpus', 0)
    gpus = p.get('total_gpus', 0)
    jobs = p.get('running_jobs', 0)
    print(f\"  {name}: {nodes} nodes, {cpus} CPUs, {gpus} GPUs, {jobs} running jobs\")
" 2>/dev/null

echo ""
echo -e "${GREEN}=========================================="
echo "  Demo workload generated!"
echo "==========================================${NC}"
echo ""
echo "  View jobs in the dashboard: http://localhost:3002/jobs"
echo "  View in Grafana: http://localhost:3001/d/job-analytics"
echo ""
