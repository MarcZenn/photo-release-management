import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { generateConsentToken } from '../lib/consentApi'
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

// Staff dashboard shell action (I1). Tokens allow unlimited submissions
// until they expire (product decision, 2026-08-21) — one QR can serve a
// whole group or a session spanning several hours, not just one person.
export function GenerateQrPanel() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [consentUrl, setConsentUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleGenerate() {
    setBusy(true)
    setError(null)
    try {
      const { tokenId, expiresAt: expiry } = await generateConsentToken()
      const url = `${window.location.origin}/consent/${tokenId}`
      const dataUrl = await QRCode.toDataURL(url)
      setConsentUrl(url)
      setQrDataUrl(dataUrl)
      setExpiresAt(expiry)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code.')
    } finally {
      setBusy(false)
    }
  }

  const msRemaining = expiresAt ? new Date(expiresAt).getTime() - now : null
  const isExpired = msRemaining !== null && msRemaining <= 0

  return (
    <div className={styles.panel}>
      <button type="button" onClick={handleGenerate} disabled={busy}>
        {qrDataUrl ? 'Generate New QR' : 'Generate QR'}
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {qrDataUrl && consentUrl && (
        <div className={styles.result}>
          <img src={qrDataUrl} alt="QR code linking to the consent form" width={200} height={200} />
          <p className={styles.url}>{consentUrl}</p>
          <p className={isExpired ? styles.expired : styles.countdown} role="status">
            {isExpired ? 'This code has expired — generate a new one.' : `Expires in ${formatCountdown(msRemaining ?? 0)}`}
          </p>
        </div>
      )}
    </div>
  )
}
