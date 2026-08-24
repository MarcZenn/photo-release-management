import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  listLegalNoticeVersions,
  addLegalNoticeVersion,
  type LegalNoticeVersionRow,
} from '../../lib/legalNoticeApi'
import { toDatetimeLocalValue } from '../../lib/datetimeLocal'
import styles from './AdminLegalNoticeManagementPage.module.css'

type FormStage = 'editing' | 'previewing'

interface FieldErrors {
  noticeText?: string
  sourceReference?: string
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to add legal notice version.'
}

// Admin-only, reachable only through AdminRouteGuard. Wired to the real
// add_legal_notice_version / list_legal_notice_versions RPCs (I5).
export function AdminLegalNoticeManagementPage() {
  const [versions, setVersions] = useState<LegalNoticeVersionRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [noticeText, setNoticeText] = useState('')
  const [sourceReference, setSourceReference] = useState('')
  const [effectiveAt, setEffectiveAt] = useState(() => toDatetimeLocalValue(new Date()))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [stage, setStage] = useState<FormStage>('editing')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)

  useEffect(() => {
    listLegalNoticeVersions()
      .then(setVersions)
      .catch((err) => setLoadError(errorMessage(err)))
  }, [])

  const currentVersion = useMemo(() => {
    if (!versions) return null
    const now = Date.now()
    return (
      versions
        .filter((row) => new Date(row.effectiveAt).getTime() <= now)
        .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0] ?? null
    )
  }, [versions])

  async function refresh() {
    setVersions(await listLegalNoticeVersions())
  }

  function handleReview(event: FormEvent) {
    event.preventDefault()

    const errors: FieldErrors = {}
    if (!noticeText.trim()) errors.noticeText = 'Notice text is required.'
    if (!sourceReference.trim()) errors.sourceReference = 'Source reference is required.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setStage('previewing')
  }

  async function handleConfirmPublish() {
    setSubmitBusy(true)
    setSubmitError(null)
    try {
      await addLegalNoticeVersion(noticeText, sourceReference, new Date(effectiveAt).toISOString())
      setNoticeText('')
      setSourceReference('')
      setEffectiveAt(toDatetimeLocalValue(new Date()))
      setStage('editing')
      await refresh()
    } catch (err) {
      setSubmitError(errorMessage(err))
    } finally {
      setSubmitBusy(false)
    }
  }

  if (loadError) {
    return (
      <main className={styles.main}>
        <p role="alert">{loadError}</p>
      </main>
    )
  }

  if (!versions) {
    return (
      <main className={styles.main}>
        <p role="status">Loading…</p>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <h1>Legal Notice Management</h1>

      <h2>Current Version</h2>
      {currentVersion ? (
        <div className={styles.currentVersion}>
          {currentVersion.noticeText}
          <div className={styles.meta}>
            Effective: {new Date(currentVersion.effectiveAt).toLocaleString()} · Source:{' '}
            {currentVersion.sourceReference}
          </div>
        </div>
      ) : (
        <p>No version is currently effective.</p>
      )}

      <h2>Version History</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Effective At</th>
            <th>Source Reference</th>
            <th>Notice Text</th>
            <th>Created By / At</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((row) => (
            <tr key={row.versionId}>
              <td>{new Date(row.effectiveAt).toLocaleString()}</td>
              <td>{row.sourceReference}</td>
              <td title={row.noticeText}>{row.noticeText}</td>
              <td>
                {row.createdBy} · {new Date(row.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add New Version</h2>

      {stage === 'editing' && (
        <form onSubmit={handleReview} noValidate>
          <div className={styles.field}>
            <label htmlFor="notice-text">Notice text</label>
            <textarea
              id="notice-text"
              className={styles.textarea}
              value={noticeText}
              onChange={(event) => setNoticeText(event.target.value)}
            />
            {fieldErrors.noticeText && <p className={styles.error}>{fieldErrors.noticeText}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="source-reference">Source reference</label>
            <input
              id="source-reference"
              type="text"
              className={styles.input}
              value={sourceReference}
              onChange={(event) => setSourceReference(event.target.value)}
              placeholder="e.g. UCM Photo/Video/Statement Release Form, 2023-24 edition, confirmed with [contact] on [date]"
            />
            {fieldErrors.sourceReference && <p className={styles.error}>{fieldErrors.sourceReference}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="effective-at">Effective at</label>
            <input
              id="effective-at"
              type="datetime-local"
              className={styles.input}
              value={effectiveAt}
              min={toDatetimeLocalValue(new Date())}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </div>

          <button type="submit">Review</button>
        </form>
      )}

      {stage === 'previewing' && (
        <div>
          <p>This is exactly what will become the live legal notice:</p>
          <div className={styles.previewBox}>
            {noticeText}
            <div className={styles.meta}>
              Effective: {new Date(effectiveAt).toLocaleString()} · Source: {sourceReference}
            </div>
          </div>
          {submitError && <p className={styles.error}>{submitError}</p>}
          <div className={styles.previewActions}>
            <button type="button" onClick={handleConfirmPublish} disabled={submitBusy}>
              Confirm & Publish
            </button>
            <button type="button" onClick={() => setStage('editing')} disabled={submitBusy}>
              Edit
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
