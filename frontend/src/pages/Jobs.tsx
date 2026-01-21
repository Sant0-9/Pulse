import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, RefreshCw, X } from 'lucide-react'
import { getJobs, cancelJob, generateDemoJobs } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { LoadingState, ErrorState } from '@/components/ui/Spinner'
import { formatDuration } from '@/lib/utils'
import type { Job } from '@/types'

const stateFilters = ['all', 'pending', 'running', 'completed', 'failed', 'cancelled']

export function Jobs() {
  const [stateFilter, setStateFilter] = useState('all')
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

  const { jobs, total, stats } = jobsQuery.data || { jobs: [], total: 0, stats: {} }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Job Queue</h1>
          <p className="text-text-muted">
            Manage scheduled and running jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Demo Jobs
          </Button>
          <Button
            variant="ghost"
            onClick={() => jobsQuery.refetch()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-text">{total}</p>
            <p className="text-sm text-text-muted">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-warning">{stats.pending || 0}</p>
            <p className="text-sm text-text-muted">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-success">{stats.running || 0}</p>
            <p className="text-sm text-text-muted">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-primary">{stats.completed || 0}</p>
            <p className="text-sm text-text-muted">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-danger">{stats.failed || 0}</p>
            <p className="text-sm text-text-muted">Failed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Jobs ({jobs.length})
            </CardTitle>
            <div className="flex gap-2">
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
        <CardContent>
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
                    <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>{job.user}</TableCell>
                    <TableCell>
                      <Badge>{job.partition}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.state} />
                    </TableCell>
                    <TableCell>
                      <span className="text-text-muted text-sm">
                        {job.num_nodes}N / {job.num_gpus}G
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-text">{formatDuration(job.elapsed_time)}</p>
                        <p className="text-text-muted text-xs">
                          / {formatDuration(job.time_limit)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{job.priority}</span>
                    </TableCell>
                    <TableCell>
                      {(job.state === 'pending' || job.state === 'running') && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => cancelMutation.mutate(job.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-text-muted text-center py-8">
              No jobs found. Click "Generate Demo Jobs" to create sample jobs.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
