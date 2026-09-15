import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEventRoster, type EventRoster } from '../lib/photoReleaseApi'
import { maskEmail, maskPhone } from '../lib/mask'
import { Alert } from '../components/ui/Alert'
import styles from './EventDetailPage.module.css'

type Status = 'loading' | 'done' | 'error'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [roster, setRoster] = useState<EventRoster | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getEventRoster(id)
      .then((result) => {
        if (cancelled) return
        setRoster(result)
        setStatus('done')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load this event.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') return <p role="status">Loading…</p>
  if (status === 'error') return <Alert severity="error">{error}</Alert>
  if (!roster) return null

  return (
    <main>
      <h1 className={styles.title}>{roster.eventName}</h1>
      {roster.totalCount > roster.rows.length && (
        <Alert severity="info">
          Showing the first {roster.rows.length} of {roster.totalCount} submissions for this event.
        </Alert>
      )}
      <ul className={styles.results}>
        {roster.rows.map((row) => (
          <li key={row.id}>
            <button type="button" onClick={() => navigate(`/dashboard/records/${row.id}`)}>
              <span className={styles.name}>{row.fullName}</span>
              <span className={styles.contact}>
                {maskPhone(row.phone)} · {maskEmail(row.email)}
              </span>
              <span className={styles.date}>{new Date(row.submittedAt).toLocaleDateString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
