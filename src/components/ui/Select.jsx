import React from 'react'
import { cn } from '../../lib/utils'

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-app bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none transition focus:ring-2 ring-brand',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export default Select
