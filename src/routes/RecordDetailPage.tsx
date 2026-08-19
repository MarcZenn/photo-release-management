import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPhotoReleaseById, type PhotoReleaseDetail } from '../lib/photoReleaseApi'

type LoadStatus = 'loading' | 'found' | 'not-found'

// Reachable from search_dashboard result rows (F7). getPhotoReleaseById is a
// stub — I3 wires it to the real get_photo_release(releaseId) RPC.
export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [record, setRecord] = useState<PhotoReleaseDetail | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    setStatus('loading')
    getPhotoReleaseById(id).then((result) => {
      if (cancelled) return
      setRecord(result)
      setStatus(result ? 'found' : 'not-found')
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

  if (status === 'not-found' || !record) {
    return (
      <main>
        <p>Record not found.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Release Record</h1>
      <dl>
        <dt>Name</dt>
        <dd>{record.fullName}</dd>
        <dt>Phone</dt>
        <dd>{record.phone}</dd>
        <dt>Email</dt>
        <dd>{record.email}</dd>
        <dt>Submitted</dt>
        <dd>{new Date(record.submittedAt).toLocaleString()}</dd>
        <dt>Legal notice version</dt>
        <dd>{record.legalNoticeVersion}</dd>
      </dl>
      <div>
        <p>Signature</p>
        <img
          src={record.signatureImage}
          alt={`Signature of ${record.fullName}`}
          style={{ maxWidth: '100%', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </div>
    </main>
  )
}
