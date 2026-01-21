import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-surface-hover text-text-muted',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    info: 'bg-info/20 text-info',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const getVariant = (s: string): BadgeProps['variant'] => {
    const statusLower = s.toLowerCase()
    if (['running', 'up', 'healthy', 'completed', 'resolved'].includes(statusLower)) return 'success'
    if (['pending', 'draining', 'warning'].includes(statusLower)) return 'warning'
    if (['failed', 'down', 'critical', 'firing', 'error'].includes(statusLower)) return 'danger'
    if (['info'].includes(statusLower)) return 'info'
    return 'default'
  }

  return <Badge variant={getVariant(status)}>{status}</Badge>
}
