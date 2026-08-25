import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad'
import { Card } from '../components/ui/Card'
import { TextField } from '../components/ui/TextField'
import { Checkbox } from '../components/ui/Checkbox'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { isValidEmail, isValidPhone } from '../lib/validators'
import { createPhotoRelease, getConsentTokenStatus, isInvalidTokenError } from '../lib/consentApi'
import styles from './ConsentFormPage.module.css'

interface TouchedFields {
  fullName: boolean
  phone: boolean
  email: boolean
}

type LoadStatus = 'loading' | 'invalid' | 'valid'
type SubmitStatus = 'idle' | 'submitting' | 'error'

// Public, unauthenticated. Route: /consent/:token. Server independently
// re-validates everything per FR6 regardless of this client-side gating.
export function ConsentFormPage() {
  const { token } = useParams<{ token: string }>()
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

  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const signaturePadRef = useRef<SignaturePadHandle>(null)
  // React state updates aren't synchronous — two clicks dispatched in the
  // same tick (a real risk from scripted/automated resubmission, not just a
  // human double-tap) can both read `submitStatus` before either commit sees
  // 'submitting'. A ref closes that gap because it updates immediately.
  const isSubmittingRef = useRef(false)

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // The ref check (not just canSubmit/submitStatus) is the double-tap/
    // double-dispatch guard — the backend itself now happily accepts a
    // second real submission on the same token (see I1's multi-submission
    // revision), so this has to be a client-side concern. It has to be a
    // ref, not just state: two clicks dispatched before React re-renders
    // would both see the same stale `submitStatus` value otherwise.
    if (!canSubmit || !token || isSubmittingRef.current) return
    isSubmittingRef.current = true

    setSubmitStatus('submitting')
    setSubmitError(null)

    try {
      await createPhotoRelease({
        consentToken: token,
        fullName,
        phone,
        email,
        signatureImage: signaturePadRef.current?.toDataUrl() ?? '',
        ageAttested,
        noticeAcknowledged,
      })
      navigate('/consent/confirmation')
    } catch (err) {
      isSubmittingRef.current = false
      if (isInvalidTokenError(err)) {
        setLoadStatus('invalid')
        return
      }
      setSubmitStatus('error')
      setSubmitError('Something went wrong submitting your release. Please check your entries and try again.')
    }
  }

  if (loadStatus === 'loading') {
    return (
      <>
        <ThemedHeader />
        <main className={styles.main}>
          <p role="status">Loading…</p>
        </main>
      </>
    )
  }

  if (loadStatus === 'invalid') {
    return (
      <>
        <ThemedHeader />
        <main className={styles.main}>
          <Alert severity="error">
            This link is no longer valid. Please ask MSU Denver staff to generate a new QR code.
          </Alert>
        </main>
      </>
    )
  }

  return (
    <>
      <ThemedHeader />
      <main className={styles.main}>
        <Card>
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <input type="hidden" value={token ?? ''} readOnly />

            <div className={styles.notice} aria-label="Legal notice">
              {noticeText}
              <div className={styles.noticeVersion}>Source: {noticeSourceReference}</div>
            </div>

            <div className={styles.checkboxGroup}>
              <Checkbox
                checked={noticeAcknowledged}
                onChange={(event) => setNoticeAcknowledged(event.target.checked)}
                required
                label="I have read and acknowledge the legal notice above."
              />
              <Checkbox
                checked={ageAttested}
                onChange={(event) => setAgeAttested(event.target.checked)}
                required
                label="I am 18 years of age or older."
              />
            </div>

            {!ageAttested && (
              <Alert severity="error">
                Digital consent is only available for participants 18 or older. If you're under 18, please ask
                MSU Denver staff for the paper photo release form instead.
              </Alert>
            )}

            <TextField
              id="fullName"
              label="Full name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
              autoComplete="name"
              required
              error={touched.fullName && !fullNameValid ? 'Name is required.' : undefined}
            />

            <TextField
              id="phone"
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              autoComplete="tel"
              required
              error={touched.phone && !phoneValid ? 'Enter a valid phone number.' : undefined}
            />

            <TextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              autoComplete="email"
              required
              error={touched.email && !emailValid ? 'Enter a valid email address.' : undefined}
            />

            <div>
              <label htmlFor="signature-pad" className={styles.signatureLabel}>
                Signature
              </label>
              <SignaturePad
                ref={signaturePadRef}
                onStrokeEnd={() => setHasSignature(!(signaturePadRef.current?.isEmpty() ?? true))}
              />
              <div className={styles.signatureActions}>
                <Button type="button" variant="outlined" onClick={handleClearSignature}>
                  Clear
                </Button>
              </div>
            </div>

            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Button type="submit" disabled={!canSubmit || submitStatus === 'submitting'}>
              {submitStatus === 'submitting' ? 'Submitting…' : 'Submit'}
            </Button>
          </form>
        </Card>
      </main>
    </>
  )
}
