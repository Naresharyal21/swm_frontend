import React from 'react'

export function Spinner() {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-[rgb(var(--brand))] dark:border-white/20" />
      <span className="text-sm text-muted">Loading...</span>
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-app text-app flex items-center justify-center">
      <Spinner />
    </div>
  )
}
