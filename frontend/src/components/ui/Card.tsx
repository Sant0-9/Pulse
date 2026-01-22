import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface rounded border border-border',
        'flex flex-col',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-border',
        'flex items-center justify-between min-h-[48px]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3
      className={cn(
        'text-sm font-medium text-text tracking-tight',
        className
      )}
    >
      {children}
    </h3>
  )
}

export function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn('p-4 flex-1', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-border bg-surface-secondary/50',
        className
      )}
    >
      {children}
    </div>
  )
}
