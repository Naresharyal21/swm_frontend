import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { LoadingScreen } from '../components/ui/loading'

export function ProtectedRoute() {
  const { isAuthed, booting } = useAuth()
  const loc = useLocation()

  if (booting) return <LoadingScreen />
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <Outlet />
}
