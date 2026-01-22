import { cn } from '@/lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
  colSpan?: number
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-surface-secondary/50', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={cn('divide-y divide-border', className)}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn('hover:bg-surface-hover transition-colors', className)}>
      {children}
    </tr>
  )
}

export function TableHead({ children, className }: TableProps) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wide',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, className, colSpan }: TableProps) {
  return (
    <td className={cn('px-4 py-3 text-text', className)} colSpan={colSpan}>
      {children}
    </td>
  )
}
