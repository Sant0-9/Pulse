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
    <aside className="w-56 flex-shrink-0 bg-surface border-r border-border h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-text-bright leading-tight">
              Pulse
            </span>
            <span className="text-[10px] text-text-muted leading-tight">
              HPC Observability
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors',
                'hover:bg-surface-hover',
                isActive
                  ? 'bg-surface-hover text-text-bright border-l-2 border-primary ml-0 pl-[10px]'
                  : 'text-text-muted hover:text-text border-l-2 border-transparent'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer - User info */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-surface-hover transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text truncate">Admin</p>
            <p className="text-[11px] text-text-muted truncate">admin@pulse.local</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
