package main

import (
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Initialize structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Read configuration from environment
	config := loadConfig()

	slog.Info("Starting Pulse Node Simulator",
		"gpu_nodes", config.GPUNodes,
		"cpu_nodes", config.CPUNodes,
		"port", config.MetricsPort,
	)

	// Initialize metrics
	initMetrics()

	// Create and start simulated nodes
	cluster := NewCluster(config)
	go cluster.Run()

	// Set up HTTP server
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"node-simulator"}`))
	})

	// Prometheus metrics endpoint
	mux.Handle("/metrics", promhttp.Handler())

	// Cluster info endpoint
	mux.HandleFunc("/api/nodes", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		cluster.HandleNodesAPI(w, r)
	})

	server := &http.Server{
		Addr:         ":" + config.MetricsPort,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	slog.Info("HTTP server starting", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

// Config holds application configuration
type Config struct {
	GPUNodes    int
	CPUNodes    int
	MetricsPort string
}

func loadConfig() Config {
	return Config{
		GPUNodes:    getEnvInt("GPU_NODES", 4),
		CPUNodes:    getEnvInt("CPU_NODES", 4),
		MetricsPort: getEnv("METRICS_PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}
