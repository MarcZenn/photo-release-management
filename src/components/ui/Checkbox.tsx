import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { useTheme } from '../../theme/ThemeProvider'
import styles from './Checkbox.module.css'

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
}

// A native <input type="checkbox"> styled to approximate Material Design's
// checkbox (appearance:none + custom checkmark), rather than a fully custom
// widget — keeps real keyboard/screen-reader behavior for free.
export function Checkbox({ label, style, ...rest }: CheckboxProps) {
  const theme = useTheme()
  const cssVars = { '--cb-color': theme.colors.primary } as CSSProperties

  return (
    <label className={styles.row} style={{ ...cssVars, ...style }}>
      <input type="checkbox" className={styles.checkbox} {...rest} />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
