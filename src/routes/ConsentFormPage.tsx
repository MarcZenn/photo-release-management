import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad'
import { useTheme } from '../theme/ThemeProvider'
import { isValidEmail, isValidPhone } from '../lib/validators'
import { legalNoticeText, legalNoticeVersionLabel } from '../content/legalNotice'
import './ConsentFormPage.css'

interface TouchedFields {
  fullName: boolean
  phone: boolean
  email: boolean
}

// Public, unauthenticated. Route: /consent/:token. Submit navigates straight
// to the confirmation screen for now — I2 wires the actual
// create_photo_release call in before that navigation (server independently
// re-validates everything per FR6 regardless of this client-side gating).
export function ConsentFormPage() {
  const { token } = useParams<{ token: string }>()
  const theme = useTheme()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(false)
  const [ageAttested, setAgeAttested] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [touched, setTouched] = useState<TouchedFields>({ fullName: false, phone: false, email: false })

  const signaturePadRef = useRef<SignaturePadHandle>(null)

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

  return (
    <>
      <ThemedHeader />
      <main className="consent-form">
        <form onSubmit={handleSubmit} noValidate>
          <input type="hidden" value={token ?? ''} readOnly />

          <div className="consent-form__notice" aria-label="Legal notice">
            {legalNoticeText}
            <div className="consent-form__notice-version">Notice version: {legalNoticeVersionLabel}</div>
          </div>

          <label className="consent-form__checkbox">
            <input
              type="checkbox"
              checked={noticeAcknowledged}
              onChange={(event) => setNoticeAcknowledged(event.target.checked)}
              required
            />
            <span>I have read and acknowledge the legal notice above.</span>
          </label>

          <label className="consent-form__checkbox">
            <input
              type="checkbox"
              checked={ageAttested}
              onChange={(event) => setAgeAttested(event.target.checked)}
              required
            />
            <span>I am 18 years of age or older.</span>
          </label>

          {!ageAttested && (
            <p className="consent-form__age-gate-message" role="alert">
              Digital consent is only available for participants 18 or older. If you're under 18, please ask
              MSU Denver staff for the paper photo release form instead.
            </p>
          )}

          <div className="consent-form__field">
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
            {touched.fullName && !fullNameValid && <p className="consent-form__error">Name is required.</p>}
          </div>

          <div className="consent-form__field">
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
            {touched.phone && !phoneValid && <p className="consent-form__error">Enter a valid phone number.</p>}
          </div>

          <div className="consent-form__field">
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
            {touched.email && !emailValid && <p className="consent-form__error">Enter a valid email address.</p>}
          </div>

          <div className="consent-form__field">
            <label htmlFor="signature-pad">Signature</label>
            <SignaturePad
              ref={signaturePadRef}
              onStrokeEnd={() => setHasSignature(!(signaturePadRef.current?.isEmpty() ?? true))}
            />
            <div className="consent-form__signature-actions">
              <button type="button" onClick={handleClearSignature}>
                Clear
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="consent-form__submit"
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
