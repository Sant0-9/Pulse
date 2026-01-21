import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Server,
  Layers,
  AlertTriangle,
  Settings,
  Activity,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/nodes', icon: Server, label: 'Nodes' },
  { to: '/jobs', icon: Layers, label: 'Jobs' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-surface border-r border-border min-h-screen">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">Pulse</h1>
            <p className="text-xs text-text-muted">HPC Observability</p>
          </div>
        </div>
      </div>

      <nav className="px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text hover:bg-surface-hover'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">A</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text">Admin</p>
            <p className="text-xs text-text-muted">admin@pulse.local</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
