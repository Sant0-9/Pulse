import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark border-transparent',
    secondary: 'bg-surface-secondary border-border text-text hover:bg-surface-hover hover:border-border-light',
    danger: 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20',
    success: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
    ghost: 'bg-transparent border-transparent text-text-muted hover:text-text hover:bg-surface-hover',
  }

  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded border font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
