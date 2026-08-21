import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad'
import { useTheme } from '../theme/ThemeProvider'
import { isValidEmail, isValidPhone } from '../lib/validators'
import { getConsentTokenStatus } from '../lib/consentApi'
import styles from './ConsentFormPage.module.css'

interface TouchedFields {
  fullName: boolean
  phone: boolean
  email: boolean
}

type LoadStatus = 'loading' | 'invalid' | 'valid'

// Public, unauthenticated. Route: /consent/:token. Submit navigates straight
// to the confirmation screen for now — I2 wires the actual
// create_photo_release call in before that navigation (server independently
// re-validates everything per FR6 regardless of this client-side gating).
export function ConsentFormPage() {
  const { token } = useParams<{ token: string }>()
  const theme = useTheme()
  const navigate = useNavigate()

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [noticeText, setNoticeText] = useState('')
  const [noticeSourceReference, setNoticeSourceReference] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(false)
  const [ageAttested, setAgeAttested] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [touched, setTouched] = useState<TouchedFields>({ fullName: false, phone: false, email: false })

  const signaturePadRef = useRef<SignaturePadHandle>(null)

  useEffect(() => {
    if (!token) {
      setLoadStatus('invalid')
      return
    }

    let cancelled = false
    getConsentTokenStatus(token)
      .then((status) => {
        if (cancelled) return
        if (!status.valid || !status.legalNoticeText) {
          setLoadStatus('invalid')
          return
        }
        setNoticeText(status.legalNoticeText)
        setNoticeSourceReference(status.legalNoticeSourceReference ?? '')
        setLoadStatus('valid')
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const fullNameValid = fullName.trim().length > 0
  const phoneValid = isValidPhone(phone)
  const emailValid = isValidEmail(email)

  const canSubmit = useMemo(
    () => fullNameValid && phoneValid && emailValid && noticeAcknowledged && ageAttested && hasSignature,
    [fullNameValid, phoneValid, emailValid, noticeAcknowledged, ageAttested, hasSignature],
  )

  function handleClearSignature() {
    signaturePadRef.current?.clear()
    setHasSignature(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    // Stubbed success path. I2 replaces this with a real
    // create_photo_release(consent_token, ...) call, keeping this same
    // navigation on success and surfacing 400/401 errors inline otherwise.
    navigate('/consent/confirmation')
  }

  if (loadStatus === 'loading') {
    return (
      <>
        <ThemedHeader />
        <main className={styles.consentForm}>
          <p role="status">Loading…</p>
        </main>
      </>
    )
  }

  if (loadStatus === 'invalid') {
    return (
      <>
        <ThemedHeader />
        <main className={styles.consentForm}>
          <p role="alert">
            This link is no longer valid. Please ask MSU Denver staff to generate a new QR code.
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <ThemedHeader />
      <main className={styles.consentForm}>
        <form onSubmit={handleSubmit} noValidate>
          <input type="hidden" value={token ?? ''} readOnly />

          <div className={styles.notice} aria-label="Legal notice">
            {noticeText}
            <div className={styles.noticeVersion}>Source: {noticeSourceReference}</div>
          </div>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={noticeAcknowledged}
              onChange={(event) => setNoticeAcknowledged(event.target.checked)}
              required
            />
            <span>I have read and acknowledge the legal notice above.</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={ageAttested}
              onChange={(event) => setAgeAttested(event.target.checked)}
              required
            />
            <span>I am 18 years of age or older.</span>
          </label>

          {!ageAttested && (
            <p className={styles.ageGateMessage} role="alert">
              Digital consent is only available for participants 18 or older. If you're under 18, please ask
              MSU Denver staff for the paper photo release form instead.
            </p>
          )}

          <div className={styles.field}>
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
              autoComplete="name"
              required
            />
            {touched.fullName && !fullNameValid && <p className={styles.error}>Name is required.</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              autoComplete="tel"
              required
            />
            {touched.phone && !phoneValid && <p className={styles.error}>Enter a valid phone number.</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              autoComplete="email"
              required
            />
            {touched.email && !emailValid && <p className={styles.error}>Enter a valid email address.</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="signature-pad">Signature</label>
            <SignaturePad
              ref={signaturePadRef}
              onStrokeEnd={() => setHasSignature(!(signaturePadRef.current?.isEmpty() ?? true))}
            />
            <div className={styles.signatureActions}>
              <button type="button" onClick={handleClearSignature}>
                Clear
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submit}
            disabled={!canSubmit}
            style={{ backgroundColor: canSubmit ? theme.colors.primary : undefined }}
          >
            Submit
          </button>
        </form>
      </main>
    </>
  )
}
