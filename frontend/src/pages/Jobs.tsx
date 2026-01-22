import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, RefreshCw, X, Clock, CheckCircle } from 'lucide-react'
import { getJobs, cancelJob, generateDemoJobs } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, Badge, StatusDot } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { LoadingState, ErrorState } from '@/components/ui/Spinner'
import { formatDuration } from '@/lib/utils'
import type { Job } from '@/types'

const stateFilters = ['all', 'pending', 'running', 'completed', 'failed', 'cancelled'] as const

export function Jobs() {
  const [stateFilter, setStateFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const jobsQuery = useQuery({
    queryKey: ['jobs', stateFilter],
    queryFn: () => getJobs({ state: stateFilter === 'all' ? undefined : stateFilter }),
    refetchInterval: 5000,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: generateDemoJobs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  if (jobsQuery.isLoading) {
    return <LoadingState message="Loading jobs..." />
  }

  if (jobsQuery.isError) {
    return <ErrorState message="Failed to load jobs" />
  }

  const data = jobsQuery.data || { jobs: [], total: 0, stats: {} }
  const jobs = data.jobs || []
  const total = data.total || 0
  const stats = data.stats || {}

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-bright">Job Queue</h1>
          <p className="text-sm text-text-muted mt-0.5">Manage scheduled and running jobs</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Generate Demo Jobs
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => jobsQuery.refetch()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Jobs"
          value={total}
          icon={Layers}
          color="info"
        />
        <StatCard
          title="Pending"
          value={stats.pending || 0}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Running"
          value={stats.running || 0}
          color="success"
        />
        <StatCard
          title="Completed"
          value={stats.completed || 0}
          icon={CheckCircle}
          color="info"
        />
        <StatCard
          title="Failed"
          value={stats.failed || 0}
          color="danger"
        />
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted" />
              Jobs ({jobs.length})
            </CardTitle>
            <div className="flex gap-1">
              {stateFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={stateFilter === filter ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStateFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Partition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job: Job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <code className="text-xs bg-surface-secondary px-1.5 py-0.5 rounded">
                        {job.id.slice(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusDot status={job.state} />
                        <span className="font-medium">{job.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-muted">{job.user}</TableCell>
                    <TableCell>
                      <Badge>{job.partition}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.state} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>{job.num_nodes} nodes</span>
                        <span>{job.num_gpus} GPUs</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-text">{formatDuration(job.elapsed_time)}</span>
                        <span className="text-text-muted"> / {formatDuration(job.time_limit)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-text-muted">{job.priority}</span>
                    </TableCell>
                    <TableCell>
                      {(job.state === 'pending' || job.state === 'running') && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => cancelMutation.mutate(job.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancel job"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Layers className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">
                No jobs found. Click "Generate Demo Jobs" to create sample jobs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
