import React from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../providers/AuthProvider'

export function AuthLayout() {
  const { isAuthed } = useAuth()
  const loc = useLocation()
  if (isAuthed) {
    const to = loc.state?.from || '/app'
    return <Navigate to={to} replace />
  }

  return (
    <div className="min-h-screen bg-app text-app grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-app">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(var(--brand),0.14)]">
            <img src="/brand/mark.svg" alt="Smart Waste" className="h-12 w-12" />
          </div>
          <div>
            <div className="text-lg font-semibold">Smart Waste Management</div>
            <div className="text-sm text-muted">Cleaner city • Greener future</div>
          </div>
        </div>

        {/* <div className="rounded-2xl border border-app bg-[rgb(var(--card))] p-6 shadow-soft">
          <div className="text-sm font-semibold">Why this system?</div>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>• Role-based operations (Admin / Supervisor / Crew / Citizen)</li>
            <li>• Billing plans + membership benefits</li>
            <li>• Recyclable rewards credited to wallet</li>
            <li>• Digital twin aggregation for bins & risk thresholds</li>
          </ul>
        </div> */}

        <div className="text-xs text-muted">© {new Date().getFullYear()} Smart Waste Management</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
