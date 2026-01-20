package main

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Job Scheduler proxy configuration
var jobSchedulerURL string
var httpClient = &http.Client{
	Timeout: 30 * time.Second,
}

func initJobSchedulerProxy(url string) {
	jobSchedulerURL = strings.TrimSuffix(url, "/")
	slog.Info("Job scheduler proxy initialized", "url", jobSchedulerURL)
}

// Cluster handlers

func getClusterStatus(c *fiber.Ctx) error {
	// TODO: Implement actual cluster status from Prometheus
	return c.JSON(fiber.Map{
		"status":      "healthy",
		"nodes_total": 8,
		"nodes_up":    8,
		"gpus_total":  32,
		"gpus_active": 28,
	})
}

func getNodes(c *fiber.Ctx) error {
	// TODO: Fetch from node-simulator or database
	return c.JSON(fiber.Map{
		"nodes": []fiber.Map{
			{"id": "gpu-node-01", "type": "gpu", "status": "up", "gpus": 8},
			{"id": "gpu-node-02", "type": "gpu", "status": "up", "gpus": 8},
			{"id": "gpu-node-03", "type": "gpu", "status": "up", "gpus": 8},
			{"id": "gpu-node-04", "type": "gpu", "status": "up", "gpus": 8},
			{"id": "cpu-node-01", "type": "cpu", "status": "up"},
			{"id": "cpu-node-02", "type": "cpu", "status": "up"},
			{"id": "cpu-node-03", "type": "cpu", "status": "up"},
			{"id": "cpu-node-04", "type": "cpu", "status": "up"},
		},
		"total": 8,
	})
}

func getNodeByID(c *fiber.Ctx) error {
	nodeID := c.Params("id")
	// TODO: Fetch actual node data
	return c.JSON(fiber.Map{
		"id":              nodeID,
		"type":            "gpu",
		"status":          "up",
		"cpu_utilization": 45.5,
		"memory_used_gb":  1024,
		"memory_total_gb": 2048,
		"gpus": []fiber.Map{
			{"index": 0, "utilization": 78.5, "temp": 72, "power": 320},
			{"index": 1, "utilization": 82.3, "temp": 74, "power": 335},
		},
	})
}

func drainNode(c *fiber.Ctx) error {
	nodeID := c.Params("id")
	// TODO: Implement drain logic
	return c.JSON(fiber.Map{
		"message": "Node drain initiated",
		"node_id": nodeID,
		"status":  "draining",
	})
}

func resumeNode(c *fiber.Ctx) error {
	nodeID := c.Params("id")
	// TODO: Implement resume logic
	return c.JSON(fiber.Map{
		"message": "Node resumed",
		"node_id": nodeID,
		"status":  "up",
	})
}

// Job Scheduler Proxy Handlers

func proxyToJobScheduler(c *fiber.Ctx, method, path string) error {
	url := fmt.Sprintf("%s%s", jobSchedulerURL, path)

	// Add query string if present
	if qs := c.Request().URI().QueryString(); len(qs) > 0 {
		url = fmt.Sprintf("%s?%s", url, string(qs))
	}

	var body io.Reader
	if len(c.Body()) > 0 {
		body = strings.NewReader(string(c.Body()))
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		slog.Error("Failed to create proxy request", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create proxy request",
		})
	}

	// Copy headers
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		slog.Error("Job scheduler proxy error", "error", err, "url", url)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "Job scheduler unavailable",
		})
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("Failed to read proxy response", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read response",
		})
	}

	c.Set("Content-Type", "application/json")
	return c.Status(resp.StatusCode).Send(respBody)
}

func proxyListJobs(c *fiber.Ctx) error {
	return proxyToJobScheduler(c, "GET", "/jobs")
}

func proxyCreateJob(c *fiber.Ctx) error {
	return proxyToJobScheduler(c, "POST", "/jobs")
}

func proxyGetJob(c *fiber.Ctx) error {
	jobID := c.Params("id")
	return proxyToJobScheduler(c, "GET", fmt.Sprintf("/jobs/%s", jobID))
}

func proxyCancelJob(c *fiber.Ctx) error {
	jobID := c.Params("id")
	return proxyToJobScheduler(c, "DELETE", fmt.Sprintf("/jobs/%s", jobID))
}

func proxyListPartitions(c *fiber.Ctx) error {
	return proxyToJobScheduler(c, "GET", "/partitions")
}

func proxyGetPartition(c *fiber.Ctx) error {
	name := c.Params("name")
	return proxyToJobScheduler(c, "GET", fmt.Sprintf("/partitions/%s", name))
}

func proxyGenerateDemoJobs(c *fiber.Ctx) error {
	return proxyToJobScheduler(c, "POST", "/demo/generate-jobs")
}

// Metrics handlers

func queryMetrics(c *fiber.Ctx) error {
	// TODO: Proxy to Prometheus
	query := c.Query("query")
	return c.JSON(fiber.Map{
		"status": "success",
		"query":  query,
		"note":   "Prometheus proxy not yet implemented",
	})
}

func queryMetricsRange(c *fiber.Ctx) error {
	// TODO: Proxy to Prometheus
	query := c.Query("query")
	start := c.Query("start")
	end := c.Query("end")
	return c.JSON(fiber.Map{
		"status": "success",
		"query":  query,
		"start":  start,
		"end":    end,
		"note":   "Prometheus proxy not yet implemented",
	})
}

// Alert handlers (Phase 3)

// AlertmanagerWebhook represents the incoming alert payload from Alertmanager
type AlertmanagerWebhook struct {
	Version           string  `json:"version"`
	GroupKey          string  `json:"groupKey"`
	TruncatedAlerts   int     `json:"truncatedAlerts"`
	Status            string  `json:"status"`
	Receiver          string  `json:"receiver"`
	GroupLabels       Labels  `json:"groupLabels"`
	CommonLabels      Labels  `json:"commonLabels"`
	CommonAnnotations Labels  `json:"commonAnnotations"`
	ExternalURL       string  `json:"externalURL"`
	Alerts            []Alert `json:"alerts"`
}

// Labels is a map of label key-value pairs
type Labels map[string]string

// Alert represents a single alert from Alertmanager
type Alert struct {
	Status       string    `json:"status"`
	Labels       Labels    `json:"labels"`
	Annotations  Labels    `json:"annotations"`
	StartsAt     time.Time `json:"startsAt"`
	EndsAt       time.Time `json:"endsAt"`
	GeneratorURL string    `json:"generatorURL"`
	Fingerprint  string    `json:"fingerprint"`
}

// In-memory alert storage (would be Redis/Postgres in production)
var (
	alertStore      = make(map[string]Alert)
	alertStoreMutex = &sync.RWMutex{}
)

// alertWebhook receives alerts from Alertmanager
func alertWebhook(c *fiber.Ctx) error {
	var webhook AlertmanagerWebhook
	if err := c.BodyParser(&webhook); err != nil {
		slog.Error("Failed to parse alert webhook", "error", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid webhook payload",
		})
	}

	alertStoreMutex.Lock()
	for _, alert := range webhook.Alerts {
		if alert.Status == "resolved" {
			// Remove resolved alerts from store
			delete(alertStore, alert.Fingerprint)
			slog.Info("Alert resolved",
				"alertname", alert.Labels["alertname"],
				"fingerprint", alert.Fingerprint,
			)
		} else {
			alertStore[alert.Fingerprint] = alert
			slog.Info("Alert received",
				"alertname", alert.Labels["alertname"],
				"status", alert.Status,
				"severity", alert.Labels["severity"],
				"fingerprint", alert.Fingerprint,
			)
		}
	}
	alertStoreMutex.Unlock()

	return c.JSON(fiber.Map{
		"status":   "received",
		"received": len(webhook.Alerts),
	})
}

func listAlerts(c *fiber.Ctx) error {
	alertStoreMutex.RLock()
	defer alertStoreMutex.RUnlock()

	alerts := make([]fiber.Map, 0, len(alertStore))
	firingCount := 0

	for _, alert := range alertStore {
		firingCount++
		alerts = append(alerts, fiber.Map{
			"fingerprint": alert.Fingerprint,
			"status":      alert.Status,
			"labels":      alert.Labels,
			"annotations": alert.Annotations,
			"startsAt":    alert.StartsAt,
			"endsAt":      alert.EndsAt,
		})
	}

	return c.JSON(fiber.Map{
		"alerts": alerts,
		"total":  len(alertStore),
		"firing": firingCount,
	})
}

func acknowledgeAlert(c *fiber.Ctx) error {
	alertID := c.Params("id")

	alertStoreMutex.RLock()
	alert, exists := alertStore[alertID]
	alertStoreMutex.RUnlock()

	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":    "Alert not found",
			"alert_id": alertID,
		})
	}

	slog.Info("Alert acknowledged",
		"alert_id", alertID,
		"alertname", alert.Labels["alertname"],
	)

	return c.JSON(fiber.Map{
		"message":  "Alert acknowledged",
		"alert_id": alertID,
		"status":   "acknowledged",
	})
}

// AI handlers (Phase 5)

func aiChat(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "AI assistant not yet implemented (Phase 5)",
	})
}

func aiInvestigate(c *fiber.Ctx) error {
	alertID := c.Params("alert_id")
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error":    "AI assistant not yet implemented (Phase 5)",
		"alert_id": alertID,
	})
}

func aiRecommendations(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"recommendations": []fiber.Map{},
		"note":            "AI assistant not yet implemented (Phase 5)",
	})
}
