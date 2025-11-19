import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary/10 text-primary border border-primary/20',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
  outline: 'border border-border text-foreground',
};

export function Badge({ className = '', variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

