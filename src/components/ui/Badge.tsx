import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'primary' | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-status-up border-status-up text-success',
  danger: 'bg-status-down border-status-down text-danger',
  warning: 'bg-status-degraded border-status-degraded text-warning',
  info: 'bg-info/10 border-info/30 text-info',
  muted: 'bg-muted border-border text-muted-foreground',
  primary: 'bg-primary/10 border-primary/30 text-primary',
  accent: 'bg-accent/10 border-accent/30 text-accent',
};

export default function Badge({ variant = 'muted', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            variant === 'success' ? 'bg-success' :
            variant === 'danger' ? 'bg-danger' :
            variant === 'warning' ? 'bg-warning' :
            variant === 'info' ? 'bg-info' :
            variant === 'primary' ? 'bg-primary' :
            variant === 'accent' ? 'bg-accent' : 'bg-muted-foreground'
          }`}
        />
      )}
      {children}
    </span>
  );
}
