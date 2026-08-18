import { useParams } from 'react-router-dom'
import { ThemedHeader } from '../components/ThemedHeader'

// Public, unauthenticated. Full consent_form implementation lands in F3.
export function ConsentFormPage() {
  const { token } = useParams<{ token: string }>()

  return (
    <>
      <ThemedHeader />
      <main>
        <p>Consent form placeholder — token: {token}</p>
      </main>
    </>
  )
}
