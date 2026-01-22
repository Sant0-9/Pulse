import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, CheckCircle, Clock } from 'lucide-react'
import { getAlerts, acknowledgeAlert } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { LoadingState, ErrorState } from '@/components/ui/Spinner'
import { formatTimestamp, cn } from '@/lib/utils'
import type { Alert } from '@/types'

export function Alerts() {
  const queryClient = useQueryClient()

  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
    refetchInterval: 5000,
  })

  const ackMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  if (alertsQuery.isLoading) {
    return <LoadingState message="Loading alerts..." />
  }

  if (alertsQuery.isError) {
    return <ErrorState message="Failed to load alerts" />
  }

  const data = alertsQuery.data || { alerts: [], total: 0, firing: 0 }
  const alerts = data.alerts || []
  const total = data.total || 0
  const firing = data.firing || 0

  const criticalAlerts = alerts.filter((a: Alert) => a.labels.severity === 'critical')
  const warningAlerts = alerts.filter((a: Alert) => a.labels.severity === 'warning')
  const infoAlerts = alerts.filter((a: Alert) => a.labels.severity === 'info')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-danger'
      case 'warning':
        return 'bg-warning'
      default:
        return 'bg-info'
    }
  }

  const getSeverityBadgeVariant = (severity: string): 'danger' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical':
        return 'danger'
      case 'warning':
        return 'warning'
      default:
        return 'info'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-bright">Alerts</h1>
          <p className="text-sm text-text-muted mt-0.5">Monitor and respond to cluster alerts</p>
        </div>
        {firing > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 border border-danger/30 rounded">
            <Bell className="w-4 h-4 text-danger" />
            <span className="text-sm font-medium text-danger">
              {firing} Active Alert{firing > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Alerts"
          value={total}
          icon={AlertTriangle}
          color="info"
        />
        <StatCard
          title="Critical"
          value={criticalAlerts.length}
          icon={AlertTriangle}
          color="danger"
        />
        <StatCard
          title="Warning"
          value={warningAlerts.length}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Info"
          value={infoAlerts.length}
          icon={Bell}
          color="info"
        />
      </div>

      {/* Active Alerts Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-text-muted" />
            Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length > 0 ? (
            <div className="divide-y divide-border">
              {alerts.map((alert: Alert) => (
                <div
                  key={alert.fingerprint}
                  className="flex items-start gap-4 p-4 hover:bg-surface-hover transition-colors"
                >
                  {/* Severity indicator */}
                  <div
                    className={cn(
                      'w-1 h-full min-h-[60px] rounded-full flex-shrink-0',
                      getSeverityColor(alert.labels.severity)
                    )}
                  />

                  {/* Alert content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-medium text-text-bright">
                        {alert.labels.alertname}
                      </h3>
                      <Badge variant={getSeverityBadgeVariant(alert.labels.severity)} size="sm">
                        {alert.labels.severity}
                      </Badge>
                      <StatusBadge status={alert.status} />
                    </div>

                    <p className="text-sm text-text-muted mb-2">
                      {alert.annotations.summary || alert.annotations.description || 'No description'}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {alert.labels.node && (
                        <span className="px-2 py-1 bg-surface-secondary rounded text-text-muted">
                          Node: {alert.labels.node}
                        </span>
                      )}
                      {alert.labels.gpu && (
                        <span className="px-2 py-1 bg-surface-secondary rounded text-text-muted">
                          GPU: {alert.labels.gpu}
                        </span>
                      )}
                      {alert.labels.partition && (
                        <span className="px-2 py-1 bg-surface-secondary rounded text-text-muted">
                          Partition: {alert.labels.partition}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-surface-secondary rounded text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(alert.startsAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => ackMutation.mutate(alert.fingerprint)}
                    disabled={ackMutation.isPending}
                    className="flex-shrink-0"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-sm font-medium text-success">All Clear</p>
              <p className="text-xs text-text-muted mt-1">No active alerts at this time</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-text-muted" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert: Alert) => (
                  <TableRow key={alert.fingerprint}>
                    <TableCell>
                      <span className="font-medium">{alert.labels.alertname}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityBadgeVariant(alert.labels.severity)} size="sm">
                        {alert.labels.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alert.status} />
                    </TableCell>
                    <TableCell className="text-text-muted">
                      {alert.labels.node || alert.labels.instance || 'cluster'}
                    </TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {formatTimestamp(alert.startsAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => ackMutation.mutate(alert.fingerprint)}
                        disabled={ackMutation.isPending}
                      >
                        Acknowledge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-text-muted">No alerts to display</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
