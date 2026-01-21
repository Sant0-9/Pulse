import { useQuery } from '@tanstack/react-query'
import { Server, Cpu, AlertTriangle, Layers, Activity, Zap } from 'lucide-react'
import { getClusterStatus, getJobs, getAlerts } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'

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
  const pieData = [
    { name: 'Running', value: jobStats.running || 0, color: '#22c55e' },
    { name: 'Pending', value: jobStats.pending || 0, color: '#f59e0b' },
    { name: 'Completed', value: jobStats.completed || 0, color: '#3b82f6' },
    { name: 'Failed', value: jobStats.failed || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0)

  const mockTimeData = Array.from({ length: 12 }, (_, i) => ({
    time: `${i * 5}m`,
    cpu: Math.floor(40 + Math.random() * 30),
    gpu: Math.floor(60 + Math.random() * 30),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Cluster Dashboard</h1>
        <p className="text-text-muted">Overview of your HPC cluster</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Nodes"
          value={cluster?.nodes_total || 0}
          icon={Server}
        />
        <StatCard
          title="Nodes Online"
          value={cluster?.nodes_up || 0}
          icon={Activity}
        />
        <StatCard
          title="Total GPUs"
          value={cluster?.gpus_total || 0}
          icon={Cpu}
        />
        <StatCard
          title="Active GPUs"
          value={cluster?.gpus_active || 0}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="CPU %"
                  />
                  <Area
                    type="monotone"
                    dataKey="gpu"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                    name="GPU %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-text-muted">No jobs to display</p>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-text-muted">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs?.jobs && jobs.jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-text">{job.name}</p>
                      <p className="text-sm text-text-muted">
                        {job.user} - {job.partition}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={job.state} />
                      <p className="text-xs text-text-muted mt-1">
                        {formatDuration(job.elapsed_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">No recent jobs</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts ({alerts?.firing || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.alerts && alerts.alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.fingerprint}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border-l-4 border-danger"
                  >
                    <div>
                      <p className="font-medium text-text">
                        {alert.labels.alertname}
                      </p>
                      <p className="text-sm text-text-muted">
                        {alert.labels.severity} - {alert.labels.node || 'cluster'}
                      </p>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-success text-center py-8">No active alerts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
