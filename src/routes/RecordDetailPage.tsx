import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPhotoReleaseById, type PhotoReleaseDetail } from '../lib/photoReleaseApi'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import styles from './RecordDetailPage.module.css'

type LoadStatus = 'loading' | 'found' | 'not-found' | 'error'

// Reachable from search_dashboard result rows (F7). Wired to the real
// get_photo_release(releaseId) RPC (I3) — every view writes one RECORD_VIEW
// audit_log row server-side.
export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [record, setRecord] = useState<PhotoReleaseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    setStatus('loading')
    getPhotoReleaseById(id)
      .then((result) => {
        if (cancelled) return
        setRecord(result)
        setStatus(result ? 'found' : 'not-found')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load this record.')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') {
    return (
      <main>
        <p role="status">Loading…</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main>
        <Alert severity="error">{error}</Alert>
      </main>
    )
  }

  if (status === 'not-found' || !record) {
    return (
      <main>
        <p>Record not found.</p>
      </main>
    )
  }

  return (
    <main>
      <h1 className={styles.title}>Release Record</h1>
      <Card className={styles.card}>
        <dl className={styles.fields}>
          <dt>Name</dt>
          <dd>{record.fullName}</dd>
          <dt>Phone</dt>
          <dd>{record.phone}</dd>
          <dt>Email</dt>
          <dd>{record.email}</dd>
          <dt>Event</dt>
          <dd>{record.eventName ?? '—'}</dd>
          <dt>Appearance notes</dt>
          <dd>{record.appearanceDescription ?? '—'}</dd>
          <dt>Submitted</dt>
          <dd>{new Date(record.submittedAt).toLocaleString()}</dd>
          <dt>Legal notice version</dt>
          <dd>{record.legalNoticeVersion}</dd>
        </dl>
        <div>
          <p className={styles.signatureLabel}>Signature</p>
          <img
            src={record.signatureImage}
            alt={`Signature of ${record.fullName}`}
            className={styles.signature}
          />
        </div>
      </Card>
    </main>
  )
}
