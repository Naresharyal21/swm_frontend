import React from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({ title='Nothing here', description='No data to show yet.', className, action }) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-app bg-[rgb(var(--card))] p-8 text-center', className)}>
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted">{description}</div>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
