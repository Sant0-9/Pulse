import type { Node, Job, Partition, Alert, ClusterStatus } from '@/types'

const API_BASE = '/api/v1'

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Cluster
export async function getClusterStatus(): Promise<ClusterStatus> {
  return fetchAPI<ClusterStatus>('/cluster/status')
}

// Nodes
export async function getNodes(): Promise<{ nodes: Node[]; total: number }> {
  return fetchAPI('/cluster/nodes')
}

export async function getNode(id: string): Promise<Node> {
  return fetchAPI<Node>(`/cluster/nodes/${id}`)
}

export async function drainNode(id: string): Promise<{ message: string }> {
  return fetchAPI(`/cluster/nodes/${id}/drain`, { method: 'POST' })
}

export async function resumeNode(id: string): Promise<{ message: string }> {
  return fetchAPI(`/cluster/nodes/${id}/resume`, { method: 'POST' })
}

// Jobs
export async function getJobs(params?: {
  state?: string
  partition?: string
  limit?: number
  offset?: number
}): Promise<{ jobs: Job[]; total: number; stats: Record<string, number> }> {
  const searchParams = new URLSearchParams()
  if (params?.state) searchParams.set('state', params.state)
  if (params?.partition) searchParams.set('partition', params.partition)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  return fetchAPI(`/jobs${query ? `?${query}` : ''}`)
}

export async function getJob(id: string): Promise<Job> {
  return fetchAPI<Job>(`/jobs/${id}`)
}

export async function createJob(job: Partial<Job>): Promise<Job> {
  return fetchAPI<Job>('/jobs', {
    method: 'POST',
    body: JSON.stringify(job),
  })
}

export async function cancelJob(id: string): Promise<{ message: string }> {
  return fetchAPI(`/jobs/${id}`, { method: 'DELETE' })
}

export async function generateDemoJobs(): Promise<{ message: string; jobs: Job[] }> {
  return fetchAPI('/demo/generate-jobs', { method: 'POST' })
}

// Partitions
export async function getPartitions(): Promise<{ partitions: Partition[] }> {
  return fetchAPI('/partitions')
}

export async function getPartition(name: string): Promise<Partition> {
  return fetchAPI<Partition>(`/partitions/${name}`)
}

// Alerts
export async function getAlerts(): Promise<{ alerts: Alert[]; total: number; firing: number }> {
  return fetchAPI('/alerts')
}

export async function acknowledgeAlert(id: string): Promise<{ message: string }> {
  return fetchAPI(`/alerts/acknowledge/${id}`, { method: 'POST' })
}

// AI Assistant
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface ChatResponse {
  message: string
  conversation_id: string
  context_used: string[]
  model: string
}

export interface InvestigationResponse {
  summary: string
  probable_causes: string[]
  recommendations: string[]
  related_metrics: string[]
  runbook_steps: string[]
}

export async function sendChatMessage(
  message: string,
  conversationId?: string,
  includeContext: boolean = true
): Promise<ChatResponse> {
  return fetchAPI<ChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      include_context: includeContext,
    }),
  })
}

export async function investigateAlert(
  alertName: string,
  node?: string,
  severity?: string
): Promise<InvestigationResponse> {
  return fetchAPI<InvestigationResponse>('/ai/investigate', {
    method: 'POST',
    body: JSON.stringify({
      alert_name: alertName,
      node,
      severity,
    }),
  })
}

export async function clearConversation(conversationId: string): Promise<{ message: string }> {
  return fetchAPI(`/ai/conversations/${conversationId}`, { method: 'DELETE' })
}

export async function getAIHealth(): Promise<{ status: string; ollama_connected: boolean }> {
  return fetchAPI('/ai/health')
}
