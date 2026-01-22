import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-surface-hover text-text-muted border-border',
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    info: 'bg-info/15 text-info border-info/30',
    purple: 'bg-purple/15 text-purple border-purple/30',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const getVariant = (s: string): BadgeProps['variant'] => {
    const statusLower = s.toLowerCase()
    if (['running', 'up', 'healthy', 'completed', 'resolved'].includes(statusLower)) return 'success'
    if (['pending', 'draining', 'warning'].includes(statusLower)) return 'warning'
    if (['failed', 'down', 'critical', 'firing', 'error'].includes(statusLower)) return 'danger'
    if (['info'].includes(statusLower)) return 'info'
    return 'default'
  }

  return <Badge variant={getVariant(status)} size={size}>{status}</Badge>
}

// Dot indicator for status
export function StatusDot({ status }: { status: string }) {
  const getColor = (s: string): string => {
    const statusLower = s.toLowerCase()
    if (['running', 'up', 'healthy', 'completed', 'resolved'].includes(statusLower)) return 'bg-success'
    if (['pending', 'draining', 'warning'].includes(statusLower)) return 'bg-warning'
    if (['failed', 'down', 'critical', 'firing', 'error'].includes(statusLower)) return 'bg-danger'
    if (['info'].includes(statusLower)) return 'bg-info'
    return 'bg-text-muted'
  }

  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', getColor(status))} />
  )
}
