import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { GenerateQrPanel } from '../components/GenerateQrPanel'
import { useAuth } from '../auth/AuthSessionProvider'

// Shared shell for all /dashboard/* routes. Admin-only nav items are UX
// gating to match AdminRouteGuard — a Staff-role session never sees the
// links, on top of being blocked from the routes themselves. Generate QR
// (I1) is available to any authenticated staff member, not Admin-gated.
export function DashboardLayout() {
  const { role } = useAuth()
  const [showQrPanel, setShowQrPanel] = useState(false)

  return (
    <>
      <ThemedHeader />
      <nav>
        <NavLink to="/dashboard" end>
          Search
        </NavLink>
        <button type="button" onClick={() => setShowQrPanel((prev) => !prev)}>
          {showQrPanel ? 'Hide QR Panel' : 'Generate QR'}
        </button>
        {role === 'admin' && (
          <>
            <NavLink to="/dashboard/admin/access">Access Management</NavLink>
            <NavLink to="/dashboard/admin/legal-notice">Legal Notice Management</NavLink>
            <NavLink to="/dashboard/admin/audit-log">Audit Log</NavLink>
          </>
        )}
      </nav>
      {showQrPanel && <GenerateQrPanel />}
      <Outlet />
    </>
  )
}
