import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Server, Cpu, Activity, Thermometer, HardDrive } from 'lucide-react'
import { getNodes, drainNode, resumeNode } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, StatusDot } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { LoadingState, ErrorState } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

export function Nodes() {
  const queryClient = useQueryClient()

  const nodesQuery = useQuery({
    queryKey: ['nodes'],
    queryFn: getNodes,
    refetchInterval: 5000,
  })

  const drainMutation = useMutation({
    mutationFn: drainNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: resumeNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
    },
  })

  if (nodesQuery.isLoading) {
    return <LoadingState message="Loading nodes..." />
  }

  if (nodesQuery.isError) {
    return <ErrorState message="Failed to load nodes" />
  }

  const data = nodesQuery.data || { nodes: [] }
  const nodes = data.nodes || []
  const gpuNodes = nodes.filter((n) => n.type === 'gpu')
  const cpuNodes = nodes.filter((n) => n.type === 'cpu')
  const onlineNodes = nodes.filter((n) => n.status === 'up').length
  const totalGpus = gpuNodes.reduce((acc, n) => acc + (n.gpus?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-bright">Cluster Nodes</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage and monitor compute nodes</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Nodes"
          value={nodes.length}
          icon={Server}
          color="info"
        />
        <StatCard
          title="Online"
          value={onlineNodes}
          unit={`/ ${nodes.length}`}
          icon={Activity}
          color="success"
          subtitle={`${nodes.length > 0 ? ((onlineNodes / nodes.length) * 100).toFixed(0) : 0}% available`}
        />
        <StatCard
          title="GPU Nodes"
          value={gpuNodes.length}
          icon={Cpu}
          color="purple"
        />
        <StatCard
          title="Total GPUs"
          value={totalGpus}
          icon={HardDrive}
          color="orange"
        />
      </div>

      {/* GPU Nodes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-text-muted" />
            GPU Nodes ({gpuNodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GPUs</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gpuNodes.map((node) => (
                <TableRow key={node.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusDot status={node.status} />
                      <span className="font-medium">{node.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={node.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {node.gpus?.map((gpu) => (
                        <div
                          key={gpu.index}
                          className={cn(
                            'w-7 h-7 rounded flex items-center justify-center text-xs font-medium',
                            gpu.utilization > 80
                              ? 'bg-success/20 text-success border border-success/30'
                              : gpu.utilization > 50
                              ? 'bg-warning/20 text-warning border border-warning/30'
                              : 'bg-surface-secondary text-text-muted border border-border'
                          )}
                          title={`GPU ${gpu.index}: ${gpu.utilization}% | ${gpu.temp}C`}
                        >
                          {gpu.index}
                        </div>
                      )) || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-info rounded-full"
                          style={{ width: `${node.cpu_utilization || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-10">
                        {node.cpu_utilization?.toFixed(0) || 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {node.memory_used_gb && node.memory_total_gb ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple rounded-full"
                            style={{ width: `${(node.memory_used_gb / node.memory_total_gb) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">
                          {node.memory_used_gb}/{node.memory_total_gb}G
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {node.status === 'up' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => drainMutation.mutate(node.id)}
                        disabled={drainMutation.isPending}
                      >
                        Drain
                      </Button>
                    ) : node.status === 'draining' ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => resumeMutation.mutate(node.id)}
                        disabled={resumeMutation.isPending}
                      >
                        Resume
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {gpuNodes.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-text-muted py-8" colSpan={6}>
                    No GPU nodes available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CPU Nodes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-4 h-4 text-text-muted" />
            CPU Nodes ({cpuNodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cpuNodes.map((node) => (
                <TableRow key={node.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusDot status={node.status} />
                      <span className="font-medium">{node.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={node.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-info rounded-full"
                          style={{ width: `${node.cpu_utilization || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-10">
                        {node.cpu_utilization?.toFixed(0) || 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {node.memory_used_gb && node.memory_total_gb ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple rounded-full"
                            style={{ width: `${(node.memory_used_gb / node.memory_total_gb) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">
                          {node.memory_used_gb}/{node.memory_total_gb}G
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {node.status === 'up' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => drainMutation.mutate(node.id)}
                        disabled={drainMutation.isPending}
                      >
                        Drain
                      </Button>
                    ) : node.status === 'draining' ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => resumeMutation.mutate(node.id)}
                        disabled={resumeMutation.isPending}
                      >
                        Resume
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {cpuNodes.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-text-muted py-8" colSpan={5}>
                    No CPU nodes available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* GPU Temperature Overview */}
      {gpuNodes.length > 0 && gpuNodes.some((n) => n.gpus && n.gpus.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-text-muted" />
              GPU Temperature Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {gpuNodes.flatMap((node) =>
                (node.gpus || []).map((gpu) => (
                  <div
                    key={`${node.id}-${gpu.index}`}
                    className="p-3 bg-surface-secondary rounded border border-border"
                  >
                    <p className="text-xs text-text-muted mb-1">
                      {node.id} / GPU {gpu.index}
                    </p>
                    <p
                      className={cn(
                        'text-xl font-semibold',
                        gpu.temp > 80
                          ? 'text-danger'
                          : gpu.temp > 70
                          ? 'text-warning'
                          : 'text-success'
                      )}
                    >
                      {gpu.temp}C
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {gpu.utilization}% | {gpu.power}W
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
