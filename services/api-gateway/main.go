package main

import (
	"log/slog"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/valyala/fasthttp/fasthttpadaptor"
)

func main() {
	// Initialize structured logging
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(log)

	config := loadConfig()

	slog.Info("Starting Pulse API Gateway",
		"port", config.Port,
		"prometheus_url", config.PrometheusURL,
		"job_scheduler_url", config.JobSchedulerURL,
	)

	// Initialize job scheduler proxy
	initJobSchedulerProxy(config.JobSchedulerURL)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:               "Pulse API Gateway",
		ReadTimeout:           10 * time.Second,
		WriteTimeout:          10 * time.Second,
		IdleTimeout:           120 * time.Second,
		DisableStartupMessage: false,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "api-gateway",
		})
	})

	// Prometheus metrics endpoint
	app.Get("/metrics", func(c *fiber.Ctx) error {
		handler := fasthttpadaptor.NewFastHTTPHandler(promhttp.Handler())
		handler(c.Context())
		return nil
	})

	// API v1 routes
	v1 := app.Group("/api/v1")

	// Cluster routes
	cluster := v1.Group("/cluster")
	cluster.Get("/status", getClusterStatus)
	cluster.Get("/nodes", getNodes)
	cluster.Get("/nodes/:id", getNodeByID)
	cluster.Post("/nodes/:id/drain", drainNode)
	cluster.Post("/nodes/:id/resume", resumeNode)

	// Jobs routes (proxied to job-scheduler)
	jobs := v1.Group("/jobs")
	jobs.Get("/", proxyListJobs)
	jobs.Post("/", proxyCreateJob)
	jobs.Get("/:id", proxyGetJob)
	jobs.Delete("/:id", proxyCancelJob)

	// Partitions routes (proxied to job-scheduler)
	partitions := v1.Group("/partitions")
	partitions.Get("/", proxyListPartitions)
	partitions.Get("/:name", proxyGetPartition)

	// Demo endpoint for job generation
	v1.Post("/demo/generate-jobs", proxyGenerateDemoJobs)

	// Metrics proxy routes
	metrics := v1.Group("/metrics")
	metrics.Get("/query", queryMetrics)
	metrics.Get("/query_range", queryMetricsRange)

	// Alerts routes (Phase 3)
	alerts := v1.Group("/alerts")
	alerts.Get("/", listAlerts)
	alerts.Post("/webhook", alertWebhook)
	alerts.Post("/acknowledge/:id", acknowledgeAlert)

	// AI routes (placeholder for Phase 5)
	ai := v1.Group("/ai")
	ai.Post("/chat", aiChat)
	ai.Post("/investigate/:alert_id", aiInvestigate)
	ai.Get("/recommendations", aiRecommendations)

	// Start server
	slog.Info("API Gateway starting", "addr", ":"+config.Port)
	if err := app.Listen(":" + config.Port); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

// Config holds application configuration
type Config struct {
	Port            string
	PrometheusURL   string
	RedisURL        string
	PostgresURL     string
	JobSchedulerURL string
}

func loadConfig() Config {
	return Config{
		Port:            getEnv("PORT", "8081"),
		PrometheusURL:   getEnv("PROMETHEUS_URL", "http://localhost:9090"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		PostgresURL:     getEnv("POSTGRES_URL", "postgres://pulse:pulse-secret@localhost:5432/pulse?sslmode=disable"),
		JobSchedulerURL: getEnv("JOB_SCHEDULER_URL", "http://localhost:8083"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
