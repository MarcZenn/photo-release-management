import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { generateConsentToken, listActiveConsentTokens, type ActiveConsentToken } from '../lib/consentApi'
import { findOrCreateEvent } from '../lib/eventsApi'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { TextField } from './ui/TextField'
import styles from './GenerateQrPanel.module.css'

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Expired'
  const totalSeconds = Math.floor(msRemaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedMinutes = String(minutes).padStart(2, '0')
  const paddedSeconds = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${minutes}:${paddedSeconds}`
}

type View = 'chooser' | 'create' | 'existing' | 'result'

const MODAL_TITLES: Record<View, string> = {
  chooser: 'Generate QR Code',
  create: 'New Event QR Code',
  existing: 'Use Existing QR Code',
  result: 'QR Code',
}

// Staff dashboard shell action (I1). Tokens allow unlimited submissions
// until they expire (product decision, 2026-08-21) — one QR can serve a
// whole group or a session spanning several hours, not just one person.
//
// Modal-based (added on request, 2026-09-15): the panel used to be an
// always-inline Card toggled by one nav button, with a typeahead against
// event names to avoid accidental duplicate events. The typeahead was
// confusing in practice, so it's gone — reusing an event now happens
// through an explicit "Use Existing QR code" list of currently-active
// tokens instead of guessing at exact-name matches while typing. The modal
// stays open after a successful generate/select (staff need the QR visible
// on-screen for participants to scan, often for a long stretch), and a
// separate "Show QR" nav button reappears whenever the modal is closed but
// a still-unexpired QR exists, so closing the modal doesn't lose it.
export function GenerateQrPanel() {
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<View>('chooser')

  const [eventName, setEventName] = useState('')
  const [resolvedEventName, setResolvedEventName] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [consentUrl, setConsentUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const [existingTokens, setExistingTokens] = useState<ActiveConsentToken[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const msRemaining = expiresAt ? new Date(expiresAt).getTime() - now : null
  const isExpired = msRemaining !== null && msRemaining <= 0
  const hasReopenableQr = qrDataUrl !== null && !isExpired

  function handleOpenGenerate() {
    setError(null)
    setView('chooser')
    setModalOpen(true)
  }

  async function handleShowExisting() {
    setView('existing')
    setError(null)
    setLoadingExisting(true)
    try {
      setExistingTokens(await listActiveConsentTokens())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load existing QR codes.')
    } finally {
      setLoadingExisting(false)
    }
  }

  async function handleGenerate() {
    const trimmedName = eventName.trim()
    if (!trimmedName) return

    setBusy(true)
    setError(null)
    try {
      const { eventId, name } = await findOrCreateEvent(trimmedName)
      const { tokenId, expiresAt: expiry } = await generateConsentToken(eventId)
      const url = `${window.location.origin}/consent/${tokenId}`
      const dataUrl = await QRCode.toDataURL(url)
      setResolvedEventName(name)
      setConsentUrl(url)
      setQrDataUrl(dataUrl)
      setExpiresAt(expiry)
      setEventName('')
      setView('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSelectExisting(token: ActiveConsentToken) {
    setError(null)
    try {
      const url = `${window.location.origin}/consent/${token.tokenId}`
      const dataUrl = await QRCode.toDataURL(url)
      setResolvedEventName(token.eventName)
      setConsentUrl(url)
      setQrDataUrl(dataUrl)
      setExpiresAt(token.expiresAt)
      setView('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QR code.')
    }
  }

  return (
    <>
      <Button type="button" variant="text" onClick={handleOpenGenerate}>
        Generate QR
      </Button>
      {hasReopenableQr && !modalOpen && (
        <Button type="button" variant="text" onClick={() => setModalOpen(true)}>
          Show QR
        </Button>
      )}

      {modalOpen && (
        <Modal title={MODAL_TITLES[view]} onClose={() => setModalOpen(false)}>
          {error && <Alert severity="error">{error}</Alert>}

          {view === 'chooser' && (
            <div className={styles.chooser}>
              <Button type="button" variant="outlined" onClick={() => setView('create')}>
                Generate QR code
              </Button>
              <Button type="button" variant="outlined" onClick={handleShowExisting}>
                Use Existing QR code
              </Button>
            </div>
          )}

          {view === 'create' && (
            <div className={styles.createView}>
              <TextField
                id="event-name"
                label="Event name"
                type="text"
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                required
              />
              <Button type="button" onClick={handleGenerate} disabled={busy || !eventName.trim()}>
                Generate
              </Button>
              <Button type="button" variant="text" onClick={() => setView('chooser')}>
                Back
              </Button>
            </div>
          )}

          {view === 'existing' && (
            <div className={styles.existingView}>
              {loadingExisting && <p role="status">Loading…</p>}
              {!loadingExisting && existingTokens.length === 0 && (
                <p className={styles.emptyState}>No active QR codes right now.</p>
              )}
              {!loadingExisting && existingTokens.length > 0 && (
                <ul className={styles.existingList}>
                  {existingTokens.map((token) => (
                    <li key={token.tokenId}>
                      <button
                        type="button"
                        className={styles.existingItem}
                        onClick={() => handleSelectExisting(token)}
                      >
                        <span className={styles.existingName}>{token.eventName}</span>
                        <span className={styles.existingTime}>
                          Expires in {formatCountdown(new Date(token.expiresAt).getTime() - now)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button type="button" variant="text" onClick={() => setView('chooser')}>
                Back
              </Button>
            </div>
          )}

          {view === 'result' && qrDataUrl && consentUrl && (
            <div className={styles.result}>
              {resolvedEventName && <p className={styles.eventLabel}>Event: {resolvedEventName}</p>}
              <img
                src={qrDataUrl}
                alt="QR code linking to the consent form"
                width={200}
                height={200}
                className={styles.qrImage}
              />
              <p className={styles.url}>{consentUrl}</p>
              {isExpired ? (
                <Alert severity="error">This code has expired — generate a new one.</Alert>
              ) : (
                <p className={styles.countdown} role="status">
                  Expires in {formatCountdown(msRemaining ?? 0)}
                </p>
              )}
              <Button type="button" variant="text" onClick={() => setView('chooser')}>
                Choose a different event
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
