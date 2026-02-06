import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

/**
 * Simple HOC to protect a component by role.
 * Usage: export default withRole(Component, ['ADMIN'])
 */
export function withRole(Component, roles = []) {
  return function RoleWrapped(props) {
    const { user, booting } = useAuth()
    const loc = useLocation()

    if (booting) return null
    const role = user?.role
    if (!role) return <Navigate to="/app" replace state={{ from: loc.pathname }} />
    if (roles.length && !roles.includes(role)) return <Navigate to="/app" replace />
    return <Component {...props} />
  }
}
