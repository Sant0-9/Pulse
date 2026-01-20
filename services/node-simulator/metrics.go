package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Node-level metrics
	nodeUp = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "pulse_node_up",
			Help: "Whether the node is up (1) or down (0)",
		},
		[]string{"node", "node_type"},
	)

	cpuUtilization = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "pulse_cpu_utilization",
			Help: "CPU utilization percentage (0-100)",
		},
		[]string{"node", "node_type"},
	)

	memoryUtilization = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "pulse_memory_utilization",
			Help: "Memory utilization percentage (0-100)",
		},
		[]string{"node", "node_type"},
	)

	memoryUsedBytes = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "pulse_memory_used_bytes",
			Help: "Memory used in bytes",
		},
		[]string{"node", "node_type"},
	)

	memoryTotalBytes = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "pulse_memory_total_bytes",
			Help: "Total memory in bytes",
		},
		[]string{"node", "node_type"},
	)

	networkReceiveBytes = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "pulse_network_receive_bytes_total",
			Help: "Total network bytes received",
		},
		[]string{"node", "node_type"},
	)

	networkTransmitBytes = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "pulse_network_transmit_bytes_total",
			Help: "Total network bytes transmitted",
		},
		[]string{"node", "node_type"},
	)

	// GPU-specific metrics (DCGM-compatible naming)
	gpuUtilization = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_gpu_utilization",
			Help: "GPU utilization percentage (0-100)",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuMemoryUtilization = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_mem_copy_utilization",
			Help: "GPU memory copy utilization percentage (0-100)",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuMemoryUsed = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_memory_used",
			Help: "GPU memory used in MiB",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuMemoryTotal = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_memory_total",
			Help: "GPU total memory in MiB",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuTemperature = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_gpu_temp",
			Help: "GPU temperature in Celsius",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuPowerUsage = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_power_usage",
			Help: "GPU power usage in Watts",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuSMClock = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_sm_clock",
			Help: "GPU SM clock frequency in MHz",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuMemoryClock = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "dcgm_memory_clock",
			Help: "GPU memory clock frequency in MHz",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuECCErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "dcgm_ecc_sbe_count",
			Help: "GPU ECC single-bit error count",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuPCIeTxBytes = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "dcgm_pcie_tx_bytes",
			Help: "GPU PCIe TX bytes",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	gpuPCIeRxBytes = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "dcgm_pcie_rx_bytes",
			Help: "GPU PCIe RX bytes",
		},
		[]string{"node", "gpu_index", "gpu_model"},
	)

	// Cluster-level metrics
	clusterNodesTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "pulse_cluster_nodes_total",
			Help: "Total number of nodes in the cluster",
		},
	)

	clusterGPUsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "pulse_cluster_gpus_total",
			Help: "Total number of GPUs in the cluster",
		},
	)
)

func initMetrics() {
	// Metrics are auto-registered by promauto
	// This function can be used for any additional initialization
}
