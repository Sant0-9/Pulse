import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-border border-t-primary',
        sizes[size],
        className
      )}
    />
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner size="lg" />
      <p className="mt-3 text-sm text-text-muted">{message}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="w-10 h-10 text-danger mb-3" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}

export function EmptyState({
  message = 'No data available',
  icon: Icon,
}: {
  message?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {Icon && <Icon className="w-8 h-8 text-text-muted mb-2" />}
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}
