import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ExternalLink, Github, Database, Activity } from 'lucide-react'

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-text-muted">Configure your Pulse instance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>External Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-text">Grafana</p>
                  <p className="text-sm text-text-muted">Metrics visualization</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-text-muted" />
            </a>

            <a
              href="http://localhost:9090"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-text">Prometheus</p>
                  <p className="text-sm text-text-muted">Metrics database</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-text-muted" />
            </a>

            <a
              href="http://localhost:9093"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-danger" />
                <div>
                  <p className="font-medium text-text">Alertmanager</p>
                  <p className="text-sm text-text-muted">Alert routing</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-text-muted" />
            </a>

            <a
              href="http://localhost:8428"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-info" />
                <div>
                  <p className="font-medium text-text">VictoriaMetrics</p>
                  <p className="text-sm text-text-muted">Long-term storage</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-text-muted" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Pulse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-muted">
              Pulse is an HPC cluster observability platform designed for monitoring
              high-performance computing environments with GPU workloads.
            </p>

            <div className="p-4 bg-background rounded-lg">
              <h4 className="font-medium text-text mb-2">Tech Stack</h4>
              <ul className="text-sm text-text-muted space-y-1">
                <li>Frontend: React 19 + TypeScript + Tailwind CSS v4</li>
                <li>API Gateway: Go + Fiber</li>
                <li>Job Scheduler: Python + FastAPI</li>
                <li>Metrics: Prometheus + VictoriaMetrics</li>
                <li>Visualization: Grafana</li>
                <li>Alerting: Alertmanager</li>
                <li>Telemetry: OpenTelemetry Collector</li>
              </ul>
            </div>

            <div className="p-4 bg-background rounded-lg">
              <h4 className="font-medium text-text mb-2">Version</h4>
              <p className="text-sm text-text-muted font-mono">v0.1.0-dev</p>
            </div>

            <a
              href="https://github.com/Sant0-9/Pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-background rounded-lg">
              <p className="font-mono text-sm text-primary">GET /api/v1/cluster/status</p>
              <p className="text-sm text-text-muted mt-1">Cluster health status</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="font-mono text-sm text-primary">GET /api/v1/cluster/nodes</p>
              <p className="text-sm text-text-muted mt-1">List all nodes</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="font-mono text-sm text-primary">GET /api/v1/jobs</p>
              <p className="text-sm text-text-muted mt-1">List all jobs</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="font-mono text-sm text-primary">POST /api/v1/jobs</p>
              <p className="text-sm text-text-muted mt-1">Submit a new job</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="font-mono text-sm text-primary">GET /api/v1/alerts</p>
              <p className="text-sm text-text-muted mt-1">List active alerts</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="font-mono text-sm text-primary">GET /api/v1/partitions</p>
              <p className="text-sm text-text-muted mt-1">List partitions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
