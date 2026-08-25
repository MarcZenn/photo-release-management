import type { CSSProperties, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useTheme } from '../../theme/ThemeProvider'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
}

// Approximates a Material Design outlined text field — a static label above
// the input rather than Material's animated floating label, which keeps
// this simple while still reading clearly as "Material-ish."
export function TextField({ label, id, error, className, ...rest }: TextFieldProps) {
  const theme = useTheme()
  const cssVars = { '--tf-color': theme.colors.primary } as CSSProperties

  return (
    <div className={styles.wrapper} style={cssVars}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={[styles.input, error ? styles.inputError : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-error`} className={styles.helperText} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  id: string
  error?: string
}

export function TextAreaField({ label, id, error, className, ...rest }: TextAreaFieldProps) {
  const theme = useTheme()
  const cssVars = { '--tf-color': theme.colors.primary } as CSSProperties

  return (
    <div className={styles.wrapper} style={cssVars}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        className={[styles.textarea, error ? styles.inputError : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-error`} className={styles.helperText} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
