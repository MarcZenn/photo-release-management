import { ThemedHeader } from '../components/ThemedHeader'

// Stubbed authenticated route, reachable only through RouteGuard. Real
// search_dashboard implementation lands in F7.
export function DashboardPage() {
  return (
    <>
      <ThemedHeader />
      <main>
        <h1>Dashboard</h1>
        <p>Authenticated dashboard placeholder.</p>
      </main>
    </>
  )
}
