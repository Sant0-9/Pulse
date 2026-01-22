#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:8081}"

echo -e "${RED}"
echo "=========================================="
echo "  Pulse - Chaos Engineering Simulator"
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

show_menu() {
    echo -e "${CYAN}Select a chaos scenario:${NC}"
    echo ""
    echo "  1) Drain a GPU node (maintenance simulation)"
    echo "  2) Trigger high GPU temperature alert"
    echo "  3) Simulate job failures"
    echo "  4) Create queue backlog"
    echo "  5) Restart a service (brief outage)"
    echo "  6) Run all scenarios"
    echo "  7) Exit"
    echo ""
    echo -n "Enter choice [1-7]: "
}

drain_node() {
    echo -e "${YELLOW}Draining GPU node for maintenance...${NC}"

    # Get a GPU node
    node_id="gpu-node-01"

    response=$(curl -sf -X POST "$API_URL/api/v1/cluster/nodes/$node_id/drain" \
        -H "Content-Type: application/json")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Node $node_id is now draining${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"

        echo ""
        echo -e "${YELLOW}Waiting 10 seconds before resuming...${NC}"
        sleep 10

        echo -e "${YELLOW}Resuming node...${NC}"
        curl -sf -X POST "$API_URL/api/v1/cluster/nodes/$node_id/resume" \
            -H "Content-Type: application/json" | python3 -m json.tool 2>/dev/null
        echo -e "${GREEN}Node $node_id resumed${NC}"
    else
        echo -e "${RED}Failed to drain node${NC}"
    fi
}

trigger_gpu_alert() {
    echo -e "${YELLOW}Triggering GPU temperature alert via Alertmanager webhook...${NC}"

    # Send a test alert to the webhook
    alert_payload='{
        "version": "4",
        "groupKey": "test-gpu-temp",
        "status": "firing",
        "receiver": "pulse-webhook",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "GPUTemperatureCritical",
                    "severity": "critical",
                    "node": "gpu-node-02",
                    "gpu": "0",
                    "instance": "node-simulator:8082"
                },
                "annotations": {
                    "summary": "GPU temperature critical on gpu-node-02",
                    "description": "GPU 0 on gpu-node-02 has reached 95C"
                },
                "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                "endsAt": "0001-01-01T00:00:00Z",
                "fingerprint": "gpu-temp-test-001"
            }
        ]
    }'

    response=$(curl -sf -X POST "$API_URL/api/v1/alerts/webhook" \
        -H "Content-Type: application/json" \
        -d "$alert_payload")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}GPU temperature alert triggered${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"

        echo ""
        echo -e "${YELLOW}Check alerts at: http://localhost:3000/alerts${NC}"
        echo -e "${YELLOW}Check Alertmanager at: http://localhost:9093${NC}"

        echo ""
        echo -e "${YELLOW}Resolving alert in 15 seconds...${NC}"
        sleep 15

        # Send resolved
        resolved_payload='{
            "version": "4",
            "groupKey": "test-gpu-temp",
            "status": "resolved",
            "receiver": "pulse-webhook",
            "alerts": [
                {
                    "status": "resolved",
                    "labels": {
                        "alertname": "GPUTemperatureCritical",
                        "severity": "critical",
                        "node": "gpu-node-02",
                        "gpu": "0"
                    },
                    "annotations": {
                        "summary": "GPU temperature back to normal"
                    },
                    "startsAt": "'$(date -u -d '15 seconds ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "endsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "fingerprint": "gpu-temp-test-001"
                }
            ]
        }'

        curl -sf -X POST "$API_URL/api/v1/alerts/webhook" \
            -H "Content-Type: application/json" \
            -d "$resolved_payload" > /dev/null
        echo -e "${GREEN}Alert resolved${NC}"
    else
        echo -e "${RED}Failed to trigger alert${NC}"
    fi
}

simulate_job_failures() {
    echo -e "${YELLOW}Simulating job failures...${NC}"

    # Submit some jobs that will "fail"
    for i in {1..5}; do
        curl -sf -X POST "$API_URL/api/v1/jobs" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"failing-job-$i\",
                \"partition\": \"gpu\",
                \"priority\": 10,
                \"cpus\": 4,
                \"gpus\": 1,
                \"memory_gb\": 16,
                \"wall_time_minutes\": 5
            }" > /dev/null
        echo -e "  ${RED}Submitted failing job $i${NC}"
    done

    echo ""
    echo -e "${GREEN}Jobs submitted - they will transition through states${NC}"
    echo -e "${YELLOW}Monitor at: http://localhost:3000/jobs${NC}"
}

create_queue_backlog() {
    echo -e "${YELLOW}Creating queue backlog (50 pending jobs)...${NC}"

    for i in {1..50}; do
        curl -sf -X POST "$API_URL/api/v1/jobs" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"backlog-job-$i\",
                \"partition\": \"gpu\",
                \"priority\": $((RANDOM % 100)),
                \"cpus\": $((4 + RANDOM % 28)),
                \"gpus\": $((1 + RANDOM % 4)),
                \"memory_gb\": $((32 + RANDOM % 224)),
                \"wall_time_minutes\": $((30 + RANDOM % 450))
            }" > /dev/null

        if [ $((i % 10)) -eq 0 ]; then
            echo -e "  ${YELLOW}Submitted $i jobs...${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}Queue backlog created${NC}"
    echo -e "${YELLOW}This should trigger queue backlog alerts${NC}"
    echo -e "${YELLOW}Monitor at: http://localhost:3000/jobs${NC}"
}

restart_service() {
    echo -e "${YELLOW}Select service to restart:${NC}"
    echo "  1) Node Simulator"
    echo "  2) Job Scheduler"
    echo "  3) AI Assistant"
    echo -n "Enter choice [1-3]: "
    read svc_choice

    case $svc_choice in
        1) service="node-simulator" ;;
        2) service="job-scheduler" ;;
        3) service="ai-assistant" ;;
        *) echo -e "${RED}Invalid choice${NC}"; return ;;
    esac

    echo -e "${YELLOW}Restarting $service...${NC}"
    docker restart "pulse-$service"
    echo -e "${GREEN}$service restarted${NC}"
    echo -e "${YELLOW}Service will be briefly unavailable${NC}"
}

run_all() {
    echo -e "${RED}Running all chaos scenarios...${NC}"
    echo ""

    echo -e "${CYAN}=== Scenario 1: Queue Backlog ===${NC}"
    create_queue_backlog
    echo ""
    sleep 2

    echo -e "${CYAN}=== Scenario 2: GPU Temperature Alert ===${NC}"
    trigger_gpu_alert
    echo ""
    sleep 2

    echo -e "${CYAN}=== Scenario 3: Node Drain ===${NC}"
    drain_node
    echo ""

    echo -e "${GREEN}All scenarios completed!${NC}"
}

# Main loop
while true; do
    show_menu
    read choice
    echo ""

    case $choice in
        1) drain_node ;;
        2) trigger_gpu_alert ;;
        3) simulate_job_failures ;;
        4) create_queue_backlog ;;
        5) restart_service ;;
        6) run_all ;;
        7) echo -e "${GREEN}Exiting chaos simulator${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac

    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read
    echo ""
done
