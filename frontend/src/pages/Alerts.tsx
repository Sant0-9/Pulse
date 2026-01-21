import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, CheckCircle, Clock } from 'lucide-react'
import { getAlerts, acknowledgeAlert } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, Badge } from '@/components/ui/Badge'
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

  const { alerts, total, firing } = alertsQuery.data || { alerts: [], total: 0, firing: 0 }

  const criticalAlerts = alerts.filter((a: Alert) => a.labels.severity === 'critical')
  const warningAlerts = alerts.filter((a: Alert) => a.labels.severity === 'warning')
  const infoAlerts = alerts.filter((a: Alert) => a.labels.severity === 'info')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-danger'
      case 'warning':
        return 'border-warning'
      default:
        return 'border-info'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Alerts</h1>
          <p className="text-text-muted">
            Monitor and respond to cluster alerts
          </p>
        </div>
        {firing > 0 && (
          <Badge variant="danger" className="text-base px-4 py-2">
            <Bell className="w-4 h-4 mr-2" />
            {firing} Active Alert{firing > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{total}</p>
              <p className="text-sm text-text-muted">Total Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-danger/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-danger">{criticalAlerts.length}</p>
              <p className="text-sm text-text-muted">Critical</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{warningAlerts.length}</p>
              <p className="text-sm text-text-muted">Warning</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-info/10 rounded-lg">
              <Bell className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-info">{infoAlerts.length}</p>
              <p className="text-sm text-text-muted">Info</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert: Alert) => (
                <div
                  key={alert.fingerprint}
                  className={cn(
                    'p-4 bg-background rounded-lg border-l-4',
                    getSeverityColor(alert.labels.severity)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-text">
                          {alert.labels.alertname}
                        </h3>
                        <Badge variant={getSeverityBadgeVariant(alert.labels.severity)}>
                          {alert.labels.severity}
                        </Badge>
                        <StatusBadge status={alert.status} />
                      </div>
                      <p className="text-text-muted mb-2">
                        {alert.annotations.summary || alert.annotations.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {alert.labels.node && (
                          <span className="px-2 py-1 bg-surface rounded text-text-muted">
                            Node: {alert.labels.node}
                          </span>
                        )}
                        {alert.labels.gpu && (
                          <span className="px-2 py-1 bg-surface rounded text-text-muted">
                            GPU: {alert.labels.gpu}
                          </span>
                        )}
                        {alert.labels.partition && (
                          <span className="px-2 py-1 bg-surface rounded text-text-muted">
                            Partition: {alert.labels.partition}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-surface rounded text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(alert.startsAt)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => ackMutation.mutate(alert.fingerprint)}
                        disabled={ackMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <p className="text-lg font-medium text-text">All Clear</p>
              <p className="text-text-muted">No active alerts at this time</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Table</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableCell className="font-medium">{alert.labels.alertname}</TableCell>
                    <TableCell>
                      <Badge variant={getSeverityBadgeVariant(alert.labels.severity)}>
                        {alert.labels.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alert.status} />
                    </TableCell>
                    <TableCell className="text-text-muted">
                      {alert.labels.node || alert.labels.instance || 'cluster'}
                    </TableCell>
                    <TableCell className="text-text-muted">
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
            <p className="text-text-muted text-center py-8">No alerts to display</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
