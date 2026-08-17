import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteGuard } from './components/RouteGuard'
import { ConsentFormPage } from './routes/ConsentFormPage'
import { StaffLoginPage } from './routes/StaffLoginPage'
import { DashboardPage } from './routes/DashboardPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/consent/:token" element={<ConsentFormPage />} />
      <Route path="/login" element={<StaffLoginPage />} />
      <Route element={<RouteGuard />}>
        <Route path="/dashboard/*" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}
