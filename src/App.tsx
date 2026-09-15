import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteGuard } from './components/RouteGuard'
import { AdminRouteGuard } from './components/AdminRouteGuard'
import { ConsentFormPage } from './routes/ConsentFormPage'
import { ConfirmationScreen } from './routes/ConfirmationScreen'
import { StaffLoginPage } from './routes/StaffLoginPage'
import { DashboardLayout } from './routes/DashboardLayout'
import { SearchDashboardPage } from './routes/SearchDashboardPage'
import { RecordDetailPage } from './routes/RecordDetailPage'
import { EventsListPage } from './routes/EventsListPage'
import { EventDetailPage } from './routes/EventDetailPage'
import { AdminAccessManagementPage } from './routes/admin/AdminAccessManagementPage'
import { AdminLegalNoticeManagementPage } from './routes/admin/AdminLegalNoticeManagementPage'
import { AdminAuditLogPage } from './routes/admin/AdminAuditLogPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/consent/confirmation" element={<ConfirmationScreen />} />
      <Route path="/consent/:token" element={<ConsentFormPage />} />
      <Route path="/login" element={<StaffLoginPage />} />
      <Route element={<RouteGuard />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<SearchDashboardPage />} />
          <Route path="records/:id" element={<RecordDetailPage />} />
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route element={<AdminRouteGuard />}>
            <Route path="admin/access" element={<AdminAccessManagementPage />} />
            <Route path="admin/legal-notice" element={<AdminLegalNoticeManagementPage />} />
            <Route path="admin/audit-log" element={<AdminAuditLogPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
