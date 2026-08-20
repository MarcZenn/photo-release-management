import { useEffect, useState } from 'react'
import { listAuditLog, AUDIT_LOG_ACTIONS, type AuditLogAction, type AuditLogRow } from '../../lib/auditLogApi'
import styles from './AdminAuditLogPage.module.css'

const PAGE_LIMIT = 50

interface Filters {
  actorEmail: string
  action: AuditLogAction | ''
  targetId: string
  dateFrom: string
  dateTo: string
}

const emptyFilters: Filters = { actorEmail: '', action: '', targetId: '', dateFrom: '', dateTo: '' }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to load audit log.'
}

// Admin-only, reachable only through AdminRouteGuard. Backed by a stub —
// I6 wires it to the real list_audit_log RPC.
export function AdminAuditLogPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [pageOffset, setPageOffset] = useState(0)
  const [rows, setRows] = useState<AuditLogRow[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)

    listAuditLog(
      {
        actorEmail: filters.actorEmail || undefined,
        action: filters.action || undefined,
        targetId: filters.targetId || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
      },
      PAGE_LIMIT,
      pageOffset,
    )
      .then((page) => {
        if (cancelled) return
        setRows(page.rows)
        setTotalCount(page.totalCount)
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err))
        setRows([])
        setTotalCount(0)
      })

    return () => {
      cancelled = true
    }
  }, [filters, pageOffset])

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPageOffset(0) // any filter change resets pagination to page 1
  }

  const currentPage = Math.floor(pageOffset / PAGE_LIMIT) + 1
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT))

  return (
    <main className={styles.main}>
      <h1>Audit Log</h1>

      <div className={styles.filters}>
        <div>
          <label htmlFor="filter-actor">Actor</label>
          <input
            id="filter-actor"
            type="text"
            value={filters.actorEmail}
            onChange={(event) => updateFilter('actorEmail', event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filter-action">Action</label>
          <select
            id="filter-action"
            value={filters.action}
            onChange={(event) => updateFilter('action', event.target.value as AuditLogAction | '')}
          >
            <option value="">All</option>
            {AUDIT_LOG_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-target">Target</label>
          <input
            id="filter-target"
            type="text"
            value={filters.targetId}
            onChange={(event) => updateFilter('targetId', event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filter-date-from">From</label>
          <input
            id="filter-date-from"
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filter-date-to">To</label>
          <input
            id="filter-date-to"
            type="datetime-local"
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {rows === null ? (
        <p role="status">Loading…</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.actorEmail}</td>
                <td>{row.action}</td>
                <td>{row.targetId ?? '—'}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.pagination}>
        <button
          type="button"
          onClick={() => setPageOffset((prev) => Math.max(0, prev - PAGE_LIMIT))}
          disabled={pageOffset === 0}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages} ({totalCount} total)
        </span>
        <button
          type="button"
          onClick={() => setPageOffset((prev) => prev + PAGE_LIMIT)}
          disabled={pageOffset + PAGE_LIMIT >= totalCount}
        >
          Next
        </button>
      </div>
    </main>
  )
}
