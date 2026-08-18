import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'
import { supabase } from '../lib/supabaseClient'
import { useAuthSession } from '../lib/useAuthSession'
import { isValidEmail } from '../lib/validators'

type LoginState = 'idle' | 'sending' | 'sent' | 'error'

// No client-side domain restriction on the email input — B8's
// custom_access_token_hook is the real, server-side allowlist gate.
export function StaffLoginPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuthSession()

  const [email, setEmail] = useState('')
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
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
      <main>
        <h1>Staff Login</h1>

        {state === 'sent' ? (
          <div>
            <p>Check your email — we sent a sign-in link to {email}.</p>
            <button type="button" onClick={() => setState('idle')}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {state === 'error' && message && <p role="alert">{message}</p>}
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <button type="submit" disabled={!emailValid || state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </main>
    </>
  )
}
