import { cn } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import type { LucideIcon } from 'lucide-react'

type ColorVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'orange'

interface SparklineData {
  value: number
}

interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: LucideIcon
  color?: ColorVariant
  sparklineData?: SparklineData[]
  subtitle?: string
  className?: string
}

const colorMap: Record<ColorVariant, { text: string; bg: string; sparkline: string }> = {
  default: {
    text: 'text-text-bright',
    bg: 'bg-primary/10',
    sparkline: '#3b82f6',
  },
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    sparkline: '#73bf69',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    sparkline: '#f2cc0c',
  },
  danger: {
    text: 'text-danger',
    bg: 'bg-danger/10',
    sparkline: '#f2495c',
  },
  info: {
    text: 'text-info',
    bg: 'bg-info/10',
    sparkline: '#5794f2',
  },
  purple: {
    text: 'text-purple',
    bg: 'bg-purple/10',
    sparkline: '#b877d9',
  },
  orange: {
    text: 'text-orange',
    bg: 'bg-orange/10',
    sparkline: '#ff9830',
  },
}

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  color = 'default',
  sparklineData,
  subtitle,
  className,
}: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div
      className={cn(
        'bg-surface rounded border border-border',
        'flex flex-col min-h-[120px]',
        'hover:border-border-light transition-colors',
        className
      )}
    >
      {/* Header with title */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {title}
        </span>
        {Icon && (
          <div className={cn('p-1.5 rounded', colors.bg)}>
            <Icon className={cn('w-4 h-4', colors.text)} />
          </div>
        )}
      </div>

      {/* Value section */}
      <div className="px-4 flex items-baseline gap-1.5">
        <span className={cn('text-3xl font-semibold tracking-tight', colors.text)}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-text-muted font-normal">
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="px-4 mt-1">
          <span className="text-xs text-text-muted">{subtitle}</span>
        </div>
      )}

      {/* Sparkline chart */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-auto px-2 pb-2 h-[40px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.sparkline} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.sparkline} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.sparkline}
                strokeWidth={1.5}
                fill={`url(#gradient-${color})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom padding if no sparkline */}
      {!sparklineData && <div className="pb-3" />}
    </div>
  )
}

// Compact stat for inline use
interface CompactStatProps {
  label: string
  value: string | number
  color?: ColorVariant
}

export function CompactStat({ label, value, color = 'default' }: CompactStatProps) {
  const colors = colorMap[color]

  return (
    <div className="flex flex-col">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn('text-lg font-semibold', colors.text)}>{value}</span>
    </div>
  )
}
