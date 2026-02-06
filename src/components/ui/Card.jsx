import clsx from 'clsx'

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={clsx('p-4 border-b border-slate-200 dark:border-slate-800', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={clsx('p-4', className)} {...props} />
}
