import React from 'react'
import { cn } from '../../lib/utils'

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[100px] rounded-xl border border-app bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ring-brand',
        className
      )}
      {...props}
    />
  )
}

export default Textarea
