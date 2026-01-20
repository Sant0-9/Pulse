package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

// GPUModel represents different GPU types
type GPUModel string

const (
	GPUModelA100 GPUModel = "NVIDIA-A100-80GB"
	GPUModelH100 GPUModel = "NVIDIA-H100-80GB"
)

// GPUSpec holds GPU specifications
type GPUSpec struct {
	Model       GPUModel
	MemoryMiB   float64
	MaxPowerW   float64
	MaxTempC    float64
	BaseSMClock float64
	BaseMemClock float64
}

var gpuSpecs = map[GPUModel]GPUSpec{
	GPUModelA100: {
		Model:        GPUModelA100,
		MemoryMiB:    81920, // 80GB
		MaxPowerW:    400,
		MaxTempC:     83,
		BaseSMClock:  1410,
		BaseMemClock: 1593,
	},
	GPUModelH100: {
		Model:        GPUModelH100,
		MemoryMiB:    81920, // 80GB
		MaxPowerW:    700,
		MaxTempC:     83,
		BaseSMClock:  1980,
		BaseMemClock: 2619,
	},
}

// GPU represents a single GPU
type GPU struct {
	Index       int
	Model       GPUModel
	Spec        GPUSpec
	Utilization float64
	MemUsed     float64
	Temperature float64
	PowerUsage  float64
	SMClock     float64
	MemClock    float64
	ECCErrors   float64
	PCIeTx      float64
	PCIeRx      float64
}

// Node represents a compute node
type Node struct {
	ID             string
	Type           string // "gpu" or "cpu"
	GPUs           []*GPU
	CPUUtilization float64
	MemoryUsed     float64
	MemoryTotal    float64
	NetworkRx      float64
	NetworkTx      float64
	IsUp           bool
	mu             sync.RWMutex
}

// Cluster manages all nodes
type Cluster struct {
	Nodes  []*Node
	config Config
	mu     sync.RWMutex
}

// NewCluster creates a new cluster with simulated nodes
func NewCluster(config Config) *Cluster {
	cluster := &Cluster{
		Nodes:  make([]*Node, 0),
		config: config,
	}

	// Create GPU nodes
	for i := 0; i < config.GPUNodes; i++ {
		model := GPUModelA100
		if i%2 == 1 {
			model = GPUModelH100
		}
		node := cluster.createGPUNode(fmt.Sprintf("gpu-node-%02d", i+1), model, 8)
		cluster.Nodes = append(cluster.Nodes, node)
	}

	// Create CPU nodes
	for i := 0; i < config.CPUNodes; i++ {
		node := cluster.createCPUNode(fmt.Sprintf("cpu-node-%02d", i+1))
		cluster.Nodes = append(cluster.Nodes, node)
	}

	// Set cluster-level metrics
	clusterNodesTotal.Set(float64(len(cluster.Nodes)))
	totalGPUs := config.GPUNodes * 8
	clusterGPUsTotal.Set(float64(totalGPUs))

	slog.Info("Cluster initialized",
		"total_nodes", len(cluster.Nodes),
		"gpu_nodes", config.GPUNodes,
		"cpu_nodes", config.CPUNodes,
		"total_gpus", totalGPUs,
	)

	return cluster
}

func (c *Cluster) createGPUNode(id string, model GPUModel, gpuCount int) *Node {
	spec := gpuSpecs[model]
	node := &Node{
		ID:          id,
		Type:        "gpu",
		GPUs:        make([]*GPU, gpuCount),
		MemoryTotal: 2048 * 1024 * 1024 * 1024, // 2TB RAM
		IsUp:        true,
	}

	for i := 0; i < gpuCount; i++ {
		node.GPUs[i] = &GPU{
			Index:       i,
			Model:       model,
			Spec:        spec,
			Temperature: 35 + rand.Float64()*5, // Start at idle temp
			SMClock:     spec.BaseSMClock,
			MemClock:    spec.BaseMemClock,
		}
	}

	return node
}

func (c *Cluster) createCPUNode(id string) *Node {
	return &Node{
		ID:          id,
		Type:        "cpu",
		GPUs:        nil,
		MemoryTotal: 512 * 1024 * 1024 * 1024, // 512GB RAM
		IsUp:        true,
	}
}

// Run starts the simulation loop
func (c *Cluster) Run() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for range ticker.C {
		c.simulateTick()
	}
}

func (c *Cluster) simulateTick() {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, node := range c.Nodes {
		node.mu.Lock()

		if !node.IsUp {
			// Node is down - set metrics accordingly
			nodeUp.WithLabelValues(node.ID, node.Type).Set(0)
			node.mu.Unlock()
			continue
		}

		nodeUp.WithLabelValues(node.ID, node.Type).Set(1)

		// Simulate CPU utilization with some variance
		baseLoad := 20.0 + rand.Float64()*30 // 20-50% base load
		node.CPUUtilization = clamp(baseLoad+rand.NormFloat64()*10, 0, 100)
		cpuUtilization.WithLabelValues(node.ID, node.Type).Set(node.CPUUtilization)

		// Simulate memory utilization
		memUtil := 30.0 + rand.Float64()*40 // 30-70% typical
		node.MemoryUsed = node.MemoryTotal * (memUtil / 100)
		memoryUtilization.WithLabelValues(node.ID, node.Type).Set(memUtil)
		memoryUsedBytes.WithLabelValues(node.ID, node.Type).Set(node.MemoryUsed)
		memoryTotalBytes.WithLabelValues(node.ID, node.Type).Set(node.MemoryTotal)

		// Simulate network traffic
		rxDelta := rand.Float64() * 100 * 1024 * 1024 // Up to 100MB/s
		txDelta := rand.Float64() * 100 * 1024 * 1024
		node.NetworkRx += rxDelta
		node.NetworkTx += txDelta
		networkReceiveBytes.WithLabelValues(node.ID, node.Type).Add(rxDelta)
		networkTransmitBytes.WithLabelValues(node.ID, node.Type).Add(txDelta)

		// Simulate GPU metrics if this is a GPU node
		if node.Type == "gpu" {
			c.simulateGPUs(node)
		}

		node.mu.Unlock()
	}
}

func (c *Cluster) simulateGPUs(node *Node) {
	for _, gpu := range node.GPUs {
		gpuIndex := fmt.Sprintf("%d", gpu.Index)
		gpuModel := string(gpu.Model)

		// Simulate GPU utilization with realistic patterns
		// Some GPUs are heavily loaded (training), some idle
		if rand.Float64() < 0.7 { // 70% chance of being active
			gpu.Utilization = clamp(60+rand.NormFloat64()*20, 0, 100)
		} else {
			gpu.Utilization = clamp(rand.Float64()*20, 0, 100) // Idle
		}
		gpuUtilization.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.Utilization)

		// Memory utilization correlates with GPU utilization
		memUtil := gpu.Utilization * 0.8 + rand.Float64()*20
		gpu.MemUsed = gpu.Spec.MemoryMiB * clamp(memUtil, 0, 100) / 100
		gpuMemoryUtilization.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(memUtil)
		gpuMemoryUsed.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.MemUsed)
		gpuMemoryTotal.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.Spec.MemoryMiB)

		// Temperature increases with utilization
		targetTemp := 35 + (gpu.Utilization/100)*45 // 35C idle, up to 80C at full load
		gpu.Temperature = gpu.Temperature*0.9 + targetTemp*0.1 // Smooth transition
		if gpu.Temperature > gpu.Spec.MaxTempC {
			gpu.Temperature = gpu.Spec.MaxTempC // Throttle kicks in
		}
		gpuTemperature.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.Temperature)

		// Power usage correlates with utilization
		gpu.PowerUsage = gpu.Spec.MaxPowerW * (0.1 + 0.9*(gpu.Utilization/100))
		gpuPowerUsage.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.PowerUsage)

		// Clock speeds - may throttle at high temps
		throttleFactor := 1.0
		if gpu.Temperature > 80 {
			throttleFactor = 0.9 // 10% throttle
		}
		gpu.SMClock = gpu.Spec.BaseSMClock * throttleFactor
		gpu.MemClock = gpu.Spec.BaseMemClock * throttleFactor
		gpuSMClock.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.SMClock)
		gpuMemoryClock.WithLabelValues(node.ID, gpuIndex, gpuModel).Set(gpu.MemClock)

		// Rare ECC errors
		if rand.Float64() < 0.001 { // 0.1% chance per tick
			gpu.ECCErrors++
			gpuECCErrors.WithLabelValues(node.ID, gpuIndex, gpuModel).Add(1)
			slog.Warn("ECC error detected",
				"node", node.ID,
				"gpu", gpuIndex,
				"total_errors", gpu.ECCErrors,
			)
		}

		// PCIe traffic
		pcieDelta := gpu.Utilization * 1024 * 1024 // Scale with utilization
		gpu.PCIeTx += pcieDelta
		gpu.PCIeRx += pcieDelta
		gpuPCIeTxBytes.WithLabelValues(node.ID, gpuIndex, gpuModel).Add(pcieDelta)
		gpuPCIeRxBytes.WithLabelValues(node.ID, gpuIndex, gpuModel).Add(pcieDelta)
	}
}

// HandleNodesAPI returns node information as JSON
func (c *Cluster) HandleNodesAPI(w http.ResponseWriter, r *http.Request) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	type NodeInfo struct {
		ID             string  `json:"id"`
		Type           string  `json:"type"`
		IsUp           bool    `json:"is_up"`
		CPUUtilization float64 `json:"cpu_utilization"`
		MemoryUsedGB   float64 `json:"memory_used_gb"`
		MemoryTotalGB  float64 `json:"memory_total_gb"`
		GPUCount       int     `json:"gpu_count,omitempty"`
	}

	nodes := make([]NodeInfo, 0, len(c.Nodes))
	for _, node := range c.Nodes {
		node.mu.RLock()
		info := NodeInfo{
			ID:             node.ID,
			Type:           node.Type,
			IsUp:           node.IsUp,
			CPUUtilization: math.Round(node.CPUUtilization*100) / 100,
			MemoryUsedGB:   math.Round(node.MemoryUsed/1024/1024/1024*100) / 100,
			MemoryTotalGB:  math.Round(node.MemoryTotal/1024/1024/1024*100) / 100,
		}
		if node.GPUs != nil {
			info.GPUCount = len(node.GPUs)
		}
		node.mu.RUnlock()
		nodes = append(nodes, info)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"nodes": nodes,
		"total": len(nodes),
	})
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
