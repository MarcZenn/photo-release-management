import { ThemedHeader } from '../components/ThemedHeader'

// Shown after a successful consent-form submit. Deliberately stateless — no
// route param, no data passed in — so there is no PII to accidentally
// redisplay (matches TDD's confirmation_screen spec: generic thank-you only).
export function ConfirmationScreen() {
  return (
    <>
      <ThemedHeader />
      <main>
        <h1>Thank you!</h1>
        <p>Your photo release has been submitted.</p>
      </main>
    </>
  )
}
