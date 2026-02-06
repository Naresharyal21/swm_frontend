import React from 'react'
import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-black/5 dark:bg-white/10 text-app',
  success: 'bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand2))]',
  warning: 'bg-[rgba(var(--warning),0.15)] text-[rgb(var(--warning))]',
  danger: 'bg-[rgba(var(--danger),0.15)] text-[rgb(var(--danger))]'
}

export function Badge({ variant='default', className, ...props }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variants[variant], className)}
      {...props}
    />
  )
}
