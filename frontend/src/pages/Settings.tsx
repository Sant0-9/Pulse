import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ExternalLink, Github, Database, Activity, Settings as SettingsIcon, Code } from 'lucide-react'

export function Settings() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-bright">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">Configure your Pulse instance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* External Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-text-muted" />
              External Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <ServiceLink
                href="http://localhost:3001"
                icon={Activity}
                iconColor="text-primary"
                title="Grafana"
                description="Metrics visualization"
              />
              <ServiceLink
                href="http://localhost:9090"
                icon={Database}
                iconColor="text-warning"
                title="Prometheus"
                description="Metrics database"
              />
              <ServiceLink
                href="http://localhost:9093"
                icon={Activity}
                iconColor="text-danger"
                title="Alertmanager"
                description="Alert routing"
              />
              <ServiceLink
                href="http://localhost:8428"
                icon={Database}
                iconColor="text-info"
                title="VictoriaMetrics"
                description="Long-term storage"
              />
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About Pulse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-muted">
              Pulse is an HPC cluster observability platform designed for monitoring
              high-performance computing environments with GPU workloads.
            </p>

            <div className="p-3 bg-surface-secondary rounded border border-border">
              <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                Tech Stack
              </h4>
              <ul className="text-sm text-text space-y-1">
                <li>Frontend: React 19 + TypeScript + Tailwind CSS v4</li>
                <li>API Gateway: Go + Fiber</li>
                <li>Job Scheduler: Python + FastAPI</li>
                <li>Metrics: Prometheus + VictoriaMetrics</li>
                <li>Visualization: Grafana</li>
                <li>Alerting: Alertmanager</li>
                <li>Telemetry: OpenTelemetry Collector</li>
              </ul>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded border border-border">
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Version
                </h4>
                <p className="text-sm text-text font-mono mt-0.5">v0.1.0-dev</p>
              </div>
              <a
                href="https://github.com/Sant0-9/Pulse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-4 h-4 text-text-muted" />
            API Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <EndpointCard method="GET" path="/api/v1/cluster/status" description="Cluster health status" />
            <EndpointCard method="GET" path="/api/v1/cluster/nodes" description="List all nodes" />
            <EndpointCard method="GET" path="/api/v1/jobs" description="List all jobs" />
            <EndpointCard method="POST" path="/api/v1/jobs" description="Submit a new job" />
            <EndpointCard method="GET" path="/api/v1/alerts" description="List active alerts" />
            <EndpointCard method="GET" path="/api/v1/partitions" description="List partitions" />
            <EndpointCard method="POST" path="/api/v1/ai/chat" description="AI assistant chat" />
            <EndpointCard method="POST" path="/api/v1/ai/investigate" description="AI alert investigation" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ServiceLink({
  href,
  icon: Icon,
  iconColor,
  title,
  description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <div>
          <p className="text-sm font-medium text-text">{title}</p>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-text-muted" />
    </a>
  )
}

function EndpointCard({
  method,
  path,
  description,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
}) {
  const methodColors = {
    GET: 'text-success',
    POST: 'text-warning',
    PUT: 'text-info',
    DELETE: 'text-danger',
  }

  return (
    <div className="p-3 bg-surface-secondary rounded border border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${methodColors[method]}`}>{method}</span>
        <code className="text-xs text-text truncate">{path}</code>
      </div>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  )
}
