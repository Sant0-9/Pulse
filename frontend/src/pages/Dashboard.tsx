import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, Cpu, AlertTriangle, Layers, Activity, Zap, Clock, CheckCircle } from 'lucide-react'
import { getClusterStatus, getJobs, getAlerts } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge, StatusDot } from '@/components/ui/Badge'
import { LoadingState, ErrorState } from '@/components/ui/Spinner'
import { formatDuration } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Generate sparkline data for stats
function generateSparklineData(base: number, variance: number, points: number = 20): { value: number }[] {
  return Array.from({ length: points }, () => ({
    value: Math.max(0, base + (Math.random() - 0.5) * variance * 2),
  }))
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface-secondary border border-border rounded px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export function Dashboard() {
  const clusterQuery = useQuery({
    queryKey: ['cluster-status'],
    queryFn: getClusterStatus,
    refetchInterval: 5000,
  })

  const jobsQuery = useQuery({
    queryKey: ['jobs'],
    queryFn: () => getJobs({ limit: 5 }),
    refetchInterval: 5000,
  })

  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
    refetchInterval: 5000,
  })

  // Memoize sparkline data so it doesn't regenerate on every render
  const sparklineData = useMemo(() => ({
    nodes: generateSparklineData(85, 10),
    gpus: generateSparklineData(75, 15),
    jobs: generateSparklineData(12, 5),
    alerts: generateSparklineData(2, 3),
  }), [])

  // Generate time series data for the chart
  const timeSeriesData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      cpu: Math.floor(35 + Math.random() * 25 + Math.sin(i / 4) * 15),
      gpu: Math.floor(55 + Math.random() * 20 + Math.cos(i / 3) * 10),
      memory: Math.floor(45 + Math.random() * 15 + Math.sin(i / 5) * 10),
    }))
  }, [])

  if (clusterQuery.isLoading) {
    return <LoadingState message="Loading cluster data..." />
  }

  if (clusterQuery.isError) {
    return <ErrorState message="Failed to load cluster status" />
  }

  const cluster = clusterQuery.data
  const jobs = jobsQuery.data
  const alerts = alertsQuery.data

  const jobStats = jobs?.stats || {}
  const activeAlerts = alerts?.firing || 0
  const nodesOnline = cluster?.nodes_up || 0
  const nodesTotal = cluster?.nodes_total || 0
  const gpusActive = cluster?.gpus_active || 0
  const gpusTotal = cluster?.gpus_total || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-bright">Cluster Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Real-time HPC cluster monitoring</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid - 6 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Nodes"
          value={nodesTotal}
          unit="nodes"
          icon={Server}
          color="info"
          sparklineData={sparklineData.nodes}
        />
        <StatCard
          title="Nodes Online"
          value={nodesOnline}
          unit={`/ ${nodesTotal}`}
          icon={Activity}
          color="success"
          subtitle={`${nodesTotal > 0 ? ((nodesOnline / nodesTotal) * 100).toFixed(0) : 0}% available`}
        />
        <StatCard
          title="Total GPUs"
          value={gpusTotal}
          unit="GPUs"
          icon={Cpu}
          color="purple"
          sparklineData={sparklineData.gpus}
        />
        <StatCard
          title="Active GPUs"
          value={gpusActive}
          unit={`/ ${gpusTotal}`}
          icon={Zap}
          color="orange"
          subtitle={`${gpusTotal > 0 ? ((gpusActive / gpusTotal) * 100).toFixed(0) : 0}% utilized`}
        />
        <StatCard
          title="Running Jobs"
          value={jobStats.running || 0}
          icon={Layers}
          color="success"
          sparklineData={sparklineData.jobs}
          subtitle={`${jobStats.pending || 0} pending`}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlerts}
          icon={AlertTriangle}
          color={activeAlerts > 0 ? 'danger' : 'success'}
          sparklineData={sparklineData.alerts}
          subtitle={activeAlerts === 0 ? 'All systems healthy' : 'Requires attention'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource Utilization - Full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resource Utilization (24h)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[280px] px-4 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5794f2" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#5794f2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#73bf69" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#73bf69" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b877d9" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#b877d9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c3039" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#8e8e8e"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#8e8e8e"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-text-muted">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU"
                    stroke="#5794f2"
                    strokeWidth={2}
                    fill="url(#colorCpu)"
                  />
                  <Area
                    type="monotone"
                    dataKey="gpu"
                    name="GPU"
                    stroke="#73bf69"
                    strokeWidth={2}
                    fill="url(#colorGpu)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    name="Memory"
                    stroke="#b877d9"
                    strokeWidth={2}
                    fill="url(#colorMem)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Job Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <JobStatusRow
                label="Running"
                count={jobStats.running || 0}
                total={jobs?.total || 0}
                color="#73bf69"
              />
              <JobStatusRow
                label="Pending"
                count={jobStats.pending || 0}
                total={jobs?.total || 0}
                color="#f2cc0c"
              />
              <JobStatusRow
                label="Completed"
                count={jobStats.completed || 0}
                total={jobs?.total || 0}
                color="#5794f2"
              />
              <JobStatusRow
                label="Failed"
                count={jobStats.failed || 0}
                total={jobs?.total || 0}
                color="#f2495c"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Total Jobs</span>
                <span className="text-text-bright font-semibold">{jobs?.total || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Recent Jobs and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {jobs?.jobs && jobs.jobs.length > 0 ? (
              <div className="divide-y divide-border">
                {jobs.jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <StatusDot status={job.state} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">{job.name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {job.user} | {job.partition} | {job.num_gpus} GPUs
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={job.state} />
                      <span className="text-xs text-text-muted">
                        {formatDuration(job.elapsed_time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">No recent jobs</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-text-muted" />
              Active Alerts
              {activeAlerts > 0 && (
                <span className="ml-auto text-xs bg-danger/20 text-danger px-2 py-0.5 rounded">
                  {activeAlerts} firing
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {alerts?.alerts && alerts.alerts.length > 0 ? (
              <div className="divide-y divide-border">
                {alerts.alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.fingerprint}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <div
                      className={`w-1 h-8 rounded-full ${
                        alert.labels.severity === 'critical'
                          ? 'bg-danger'
                          : alert.labels.severity === 'warning'
                          ? 'bg-warning'
                          : 'bg-info'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">
                        {alert.labels.alertname}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {alert.labels.node || 'cluster'} | {alert.labels.severity}
                      </p>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-sm text-success">All systems healthy</p>
                <p className="text-xs text-text-muted mt-1">No active alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Job status row component
function JobStatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-bright font-medium">{count}</span>
      </div>
      <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
