import type { CSSProperties, SelectHTMLAttributes } from 'react'
import { useTheme } from '../../theme/ThemeProvider'
import styles from './TextField.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  id: string
}

// Shares TextField's visual language (same input styling) for consistency.
export function Select({ label, id, className, children, ...rest }: SelectProps) {
  const theme = useTheme()
  const cssVars = { '--tf-color': theme.colors.primary } as CSSProperties

  return (
    <div className={styles.wrapper} style={cssVars}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <select id={id} className={[styles.input, className].filter(Boolean).join(' ')} {...rest}>
        {children}
      </select>
    </div>
  )
}
