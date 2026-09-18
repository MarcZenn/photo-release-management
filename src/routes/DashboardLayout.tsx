import { type CSSProperties, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { GenerateQrPanel } from '../components/GenerateQrPanel'
import { useAuth } from '../auth/AuthSessionProvider'
import { useTheme } from '../theme/ThemeProvider'
import styles from './DashboardLayout.module.css'

// Shared shell for all /dashboard/* routes. Admin-only nav items are UX
// gating to match AdminRouteGuard — a Staff-role session never sees the
// links, on top of being blocked from the routes themselves. Generate QR
// (I1) is available to any authenticated staff member, not Admin-gated —
// and stays outside the collapsible nav links below, on its own, since
// photographers reach for it in the field and it needs to stay reachable
// without opening the hamburger menu first.
export function DashboardLayout() {
  const { role } = useAuth()
  const theme = useTheme()
  const [navOpen, setNavOpen] = useState(false)

  const cssVars = { '--nav-active-color': theme.colors.primary } as CSSProperties
  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')
  const navLinksClassName = [styles.navLinks, navOpen ? styles.navLinksOpen : ''].filter(Boolean).join(' ')

  return (
    <>
      <ThemedHeader />
      <nav className={styles.nav} style={cssVars}>
        <button
          type="button"
          className={styles.menuToggle}
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? '✕' : '☰'}
        </button>

        <div className={navLinksClassName} onClick={() => setNavOpen(false)}>
          <NavLink to="/dashboard" end className={linkClassName}>
            Search
          </NavLink>
          <NavLink to="/dashboard/events" className={linkClassName}>
            Events
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
        </div>

        <span className={styles.spacer} />
        <GenerateQrPanel />
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </>
  )
}
