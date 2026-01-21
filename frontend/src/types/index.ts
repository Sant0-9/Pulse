export interface Node {
  id: string
  type: 'gpu' | 'cpu'
  status: 'up' | 'down' | 'draining'
  cpu_utilization?: number
  memory_used_gb?: number
  memory_total_gb?: number
  gpus?: GPU[]
}

export interface GPU {
  index: number
  utilization: number
  temp: number
  power: number
  memory_used?: number
  memory_total?: number
}

export interface Job {
  id: string
  name: string
  user: string
  partition: string
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  num_nodes: number
  num_gpus: number
  time_limit: number
  elapsed_time: number
  priority: number
  submit_time: string
  start_time?: string
  end_time?: string
}

export interface Partition {
  name: string
  nodes: number
  nodes_available: number
  state: string
  max_time: number
  default_time: number
}

export interface Alert {
  fingerprint: string
  status: 'firing' | 'resolved'
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: string
  endsAt: string
}

export interface ClusterStatus {
  status: string
  nodes_total: number
  nodes_up: number
  gpus_total: number
  gpus_active: number
}

export interface MetricData {
  metric: Record<string, string>
  values: [number, string][]
}
