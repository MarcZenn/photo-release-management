import { ThemedHeader } from '../components/ThemedHeader'
import { Card } from '../components/ui/Card'
import styles from './ConfirmationScreen.module.css'

// Shown after a successful consent-form submit. Deliberately stateless — no
// route param, no data passed in — so there is no PII to accidentally
// redisplay (matches TDD's confirmation_screen spec: generic thank-you only).
export function ConfirmationScreen() {
  return (
    <>
      <ThemedHeader />
      <main className={styles.main}>
        <Card className={styles.card}>
          <h1 className={styles.title}>Thank you!</h1>
          <p>Your photo release has been submitted.</p>
        </Card>
      </main>
    </>
  )
}
