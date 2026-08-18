import { useTheme } from '../theme/ThemeProvider'

// Themed header used by both the public consent form and the staff/admin
// dashboard shell. Every visual value comes from useTheme() — see NFR11.
export function ThemedHeader() {
  const theme = useTheme()

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: theme.colors.primary,
        color: '#fff',
      }}
    >
      <img src={theme.logoUrl} alt={`${theme.legalEntityName} logo`} height={32} width={32} />
      <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{theme.appName}</span>
    </header>
  )
}
