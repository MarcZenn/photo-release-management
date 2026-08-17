import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../lib/useAuthSession'

// Gates /dashboard/* behind an authenticated Supabase session. Server-side
// allowlist enforcement (B8) is the real security boundary — this is UX only.
export function RouteGuard() {
  const { session, loading } = useAuthSession()

  if (loading) {
    return <p>Loading…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
