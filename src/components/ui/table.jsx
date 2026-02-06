import React from 'react'
import { cn } from '../../lib/utils'

export function Table({ className, ...props }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-app bg-[rgb(var(--card))]', className)}>
      <table className="w-full text-left text-sm" {...props} />
    </div>
  )
}

export function THead({ ...props }) {
  return <thead className="bg-black/5 dark:bg-white/5" {...props} />
}

export function TH({ className, ...props }) {
  return <th className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-muted', className)} {...props} />
}

export function TR({ className, ...props }) {
  return <tr className={cn('border-t border-app', className)} {...props} />
}

export function TD({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-top', className)} {...props} />
}
