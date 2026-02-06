import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

export function RoleRoute({ roles }) {
  const { user } = useAuth()
  const role = user?.role
  if (!role) return <Navigate to="/app" replace />
  if (!roles.includes(role)) return <Navigate to="/app" replace />
  return <Outlet />
}
