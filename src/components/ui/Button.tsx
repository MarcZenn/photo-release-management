import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { useTheme } from '../../theme/ThemeProvider'
import { darkenHex, hexToRgba } from '../../lib/color'
import styles from './Button.module.css'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  children: ReactNode
  variant?: 'contained' | 'outlined' | 'text'
  color?: 'primary' | 'accent'
}

// Approximates a Material Design button (contained/outlined/text variants),
// using the theme's runtime primary/accent color rather than a hardcoded one.
export function Button({ children, variant = 'contained', color = 'primary', className, style, ...rest }: ButtonProps) {
  const theme = useTheme()
  const baseColor = color === 'accent' ? theme.colors.accent : theme.colors.primary

  const cssVars = {
    '--btn-color': baseColor,
    '--btn-color-hover': darkenHex(baseColor, 0.12),
    '--btn-color-tint': hexToRgba(baseColor, 0.08),
  } as CSSProperties

  return (
    <button
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      style={{ ...cssVars, ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}
