import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Server, Cpu, Activity, Thermometer } from 'lucide-react'
import { getNodes, drainNode, resumeNode } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
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

  const { nodes } = nodesQuery.data || { nodes: [] }
  const gpuNodes = nodes.filter((n) => n.type === 'gpu')
  const cpuNodes = nodes.filter((n) => n.type === 'cpu')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Cluster Nodes</h1>
        <p className="text-text-muted">
          Manage and monitor compute nodes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{nodes.length}</p>
              <p className="text-sm text-text-muted">Total Nodes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <Activity className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">
                {nodes.filter((n) => n.status === 'up').length}
              </p>
              <p className="text-sm text-text-muted">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-info/10 rounded-lg">
              <Cpu className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">
                {gpuNodes.reduce((acc, n) => acc + (n.gpus?.length || 0), 0)}
              </p>
              <p className="text-sm text-text-muted">Total GPUs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GPU Nodes</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="font-medium">{node.id}</TableCell>
                  <TableCell>
                    <StatusBadge status={node.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {node.gpus?.map((gpu) => (
                        <div
                          key={gpu.index}
                          className={cn(
                            'w-6 h-6 rounded flex items-center justify-center text-xs',
                            gpu.utilization > 80
                              ? 'bg-success/20 text-success'
                              : gpu.utilization > 50
                              ? 'bg-warning/20 text-warning'
                              : 'bg-surface-hover text-text-muted'
                          )}
                          title={`GPU ${gpu.index}: ${gpu.utilization}%`}
                        >
                          {gpu.index}
                        </div>
                      )) || '-'}
                    </div>
                  </TableCell>
                  <TableCell>{node.cpu_utilization?.toFixed(1) || '-'}%</TableCell>
                  <TableCell>
                    {node.memory_used_gb && node.memory_total_gb
                      ? `${node.memory_used_gb}/${node.memory_total_gb} GB`
                      : '-'}
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
                        variant="secondary"
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CPU Nodes</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="font-medium">{node.id}</TableCell>
                  <TableCell>
                    <StatusBadge status={node.status} />
                  </TableCell>
                  <TableCell>{node.cpu_utilization?.toFixed(1) || '-'}%</TableCell>
                  <TableCell>
                    {node.memory_used_gb && node.memory_total_gb
                      ? `${node.memory_used_gb}/${node.memory_total_gb} GB`
                      : '-'}
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
                        variant="secondary"
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {gpuNodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              GPU Temperature Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gpuNodes.flatMap((node) =>
                (node.gpus || []).map((gpu) => (
                  <div
                    key={`${node.id}-${gpu.index}`}
                    className="p-4 bg-background rounded-lg"
                  >
                    <p className="text-sm text-text-muted">
                      {node.id} GPU {gpu.index}
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        gpu.temp > 80
                          ? 'text-danger'
                          : gpu.temp > 70
                          ? 'text-warning'
                          : 'text-success'
                      )}
                    >
                      {gpu.temp}C
                    </p>
                    <p className="text-xs text-text-muted">
                      {gpu.utilization}% util | {gpu.power}W
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
