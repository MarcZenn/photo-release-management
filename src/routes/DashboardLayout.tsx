import { NavLink, Outlet } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { useAuth } from '../auth/AuthSessionProvider'

// Shared shell for all /dashboard/* routes. Admin-only nav items are UX
// gating to match AdminRouteGuard — a Staff-role session never sees the
// links, on top of being blocked from the routes themselves.
export function DashboardLayout() {
  const { role } = useAuth()

  return (
    <>
      <ThemedHeader />
      <nav>
        <NavLink to="/dashboard" end>
          Search
        </NavLink>
        {role === 'admin' && (
          <>
            <NavLink to="/dashboard/admin/access">Access Management</NavLink>
            <NavLink to="/dashboard/admin/legal-notice">Legal Notice Management</NavLink>
            <NavLink to="/dashboard/admin/audit-log">Audit Log</NavLink>
          </>
        )}
      </nav>
      <Outlet />
    </>
  )
}
