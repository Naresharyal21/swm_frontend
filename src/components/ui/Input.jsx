import React from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-app bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ring-brand',
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('text-sm font-medium text-text/90', className)}
      {...props}
    />
  )
}

export default Input
