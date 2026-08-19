import { useParams } from 'react-router-dom'

// Reachable from search_dashboard result rows (F7). Full record_detail
// implementation lands in F8.
export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <main>
      <h1>Record Detail</h1>
      <p>Record detail placeholder — id: {id}</p>
    </main>
  )
}
