import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

// A Material "surface"/paper: elevated white card used as the base
// container for form sections and content blocks throughout the app.
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className].filter(Boolean).join(' ')} {...rest} />
}
