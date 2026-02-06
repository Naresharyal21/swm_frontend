import React from 'react'
import { cn } from '../../lib/utils'

const styles = {
  base: 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 ring-brand disabled:opacity-50 disabled:pointer-events-none',
  primary: 'bg-[rgb(var(--brand))] text-white hover:opacity-90 shadow-soft',
  secondary: 'bg-[rgb(var(--card))] border border-app hover:bg-black/5 dark:hover:bg-white/5',
  outline: 'border border-app hover:bg-black/5 dark:hover:bg-white/5',
  ghost: 'hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'bg-[rgb(var(--danger))] text-white hover:opacity-90'
}

export function Button({ variant='primary', className, ...props }) {
  return <button className={cn(styles.base, styles[variant], className)} {...props} />
}

// keep default export for any existing default imports
export default Button
