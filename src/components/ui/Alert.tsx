import type { HTMLAttributes } from 'react'
import styles from './Alert.module.css'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  severity?: 'error' | 'info' | 'success'
}

// Inline message banner (validation errors, guardrail responses, status
// text) — used instead of a toast throughout, since several acceptance
// criteria in this project explicitly call for inline, not toast, errors.
export function Alert({ severity = 'error', className, role, ...rest }: AlertProps) {
  return (
    <div
      className={[styles.alert, styles[severity], className].filter(Boolean).join(' ')}
      role={role ?? (severity === 'error' ? 'alert' : 'status')}
      {...rest}
    />
  )
}
