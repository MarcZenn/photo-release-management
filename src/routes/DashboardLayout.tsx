import { useState, type CSSProperties } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { GenerateQrPanel } from '../components/GenerateQrPanel'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthSessionProvider'
import { useTheme } from '../theme/ThemeProvider'
import styles from './DashboardLayout.module.css'

// Shared shell for all /dashboard/* routes. Admin-only nav items are UX
// gating to match AdminRouteGuard — a Staff-role session never sees the
// links, on top of being blocked from the routes themselves. Generate QR
// (I1) is available to any authenticated staff member, not Admin-gated.
export function DashboardLayout() {
  const { role } = useAuth()
  const theme = useTheme()
  const [showQrPanel, setShowQrPanel] = useState(false)

  const cssVars = { '--nav-active-color': theme.colors.primary } as CSSProperties
  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')

  return (
    <>
      <ThemedHeader />
      <nav className={styles.nav} style={cssVars}>
        <NavLink to="/dashboard" end className={linkClassName}>
          Search
        </NavLink>
        {role === 'admin' && (
          <>
            <NavLink to="/dashboard/admin/access" className={linkClassName}>
              Access Management
            </NavLink>
            <NavLink to="/dashboard/admin/legal-notice" className={linkClassName}>
              Legal Notice Management
            </NavLink>
            <NavLink to="/dashboard/admin/audit-log" className={linkClassName}>
              Audit Log
            </NavLink>
          </>
        )}
        <span className={styles.spacer} />
        <Button type="button" variant="text" onClick={() => setShowQrPanel((prev) => !prev)}>
          {showQrPanel ? 'Hide QR Panel' : 'Generate QR'}
        </Button>
      </nav>
      <div className={styles.content}>
        {showQrPanel && <GenerateQrPanel />}
        <Outlet />
      </div>
    </>
  )
}
