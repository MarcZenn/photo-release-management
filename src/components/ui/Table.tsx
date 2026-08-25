import type { TableHTMLAttributes } from 'react'
import styles from './Table.module.css'

// Consistent Material-ish table chrome (elevated card, uppercase header row,
// row hover) — consumers still write native <thead>/<tbody>/<tr>/<td>.
export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className={styles.wrapper}>
      <table className={[styles.table, className].filter(Boolean).join(' ')} {...rest} />
    </div>
  )
}
