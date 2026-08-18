import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthSessionProvider'

// Client-side UX guard only, per F6's acceptance criteria — B12/B13/B14
// enforce the real Admin-only check server-side regardless. A Staff-role
// session that navigates directly to an Admin route (typed URL, bookmark,
// stale nav state) is bounced back to the dashboard home instead of seeing
// the page render.
export function AdminRouteGuard() {
  const { role } = useAuth()

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
