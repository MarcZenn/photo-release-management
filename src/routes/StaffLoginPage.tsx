import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { Card } from '../components/ui/Card'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthSessionProvider'
import { isValidEmail } from '../lib/validators'
import styles from './StaffLoginPage.module.css'

type LoginState = 'idle' | 'sending' | 'sent' | 'error'

// No client-side domain restriction on the email input — B8's
// custom_access_token_hook is the real, server-side allowlist gate.
export function StaffLoginPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [state, setState] = useState<LoginState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  // A denied magic-link click redirects back here with `#error=...` in the
  // URL fragment (GoTrue's rejection contract) instead of a session — that's
  // how B8's allowlist rejection surfaces to whoever clicked the link.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorDescription = hashParams.get('error_description')
    if (errorDescription) {
      setState('error')
      setMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')))
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // A successful magic-link click is picked up by supabase-js's own
  // detectSessionInUrl handling, which surfaces here as a session via
  // useAuthSession — at that point there's nothing left to do but leave.
  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, session, navigate])

  const emailValid = isValidEmail(email)
  const emailError = !emailTouched
    ? undefined
    : email.trim() === ''
      ? 'Email is required.'
      : !emailValid
        ? 'Enter a valid email address.'
        : undefined

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setEmailTouched(true)
    if (!emailValid) return

    setState('sending')
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })

    if (error) {
      setState('error')
      setMessage(error.message)
      return
    }

    setState('sent')
  }

  return (
    <>
      <ThemedHeader />
      <main className={styles.main}>
        <Card className={styles.card}>
          <h1 className={styles.title}>Staff Login</h1>

          {state === 'sent' ? (
            <div className={styles.sent}>
              <p>Check your email — we sent a sign-in link to {email}.</p>
              <Button type="button" variant="outlined" onClick={() => setState('idle')}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              {state === 'error' && message && <Alert severity="error">{message}</Alert>}
              <TextField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmailTouched(true)}
                autoComplete="email"
                required
                error={emailError}
              />
              <Button type="submit" disabled={!emailValid || state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send magic link'}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </>
  )
}
