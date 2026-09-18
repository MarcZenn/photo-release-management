import { useEffect, useState } from 'react'
import { listAuditLog, AUDIT_LOG_ACTIONS, type AuditLogAction, type AuditLogRow } from '../../lib/auditLogApi'
import { TextField } from '../../components/ui/TextField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Table } from '../../components/ui/Table'
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

// Admin-only, reachable only through AdminRouteGuard. Wired to the real
// list_audit_log RPC (I6). Actor/target filters are exact matches, not
// substring search — see auditLogApi.ts.
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
    <main>
      <h1 className={styles.title}>Audit Log</h1>

      <div className={styles.filters}>
        <TextField
          id="filter-actor"
          label="Actor"
          type="text"
          value={filters.actorEmail}
          onChange={(event) => updateFilter('actorEmail', event.target.value)}
        />
        <Select
          id="filter-action"
          label="Action"
          value={filters.action}
          onChange={(event) => updateFilter('action', event.target.value as AuditLogAction | '')}
        >
          <option value="">All</option>
          {AUDIT_LOG_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
        <TextField
          id="filter-target"
          label="Target"
          type="text"
          value={filters.targetId}
          onChange={(event) => updateFilter('targetId', event.target.value)}
        />
        <TextField
          id="filter-date-from"
          label="From"
          type="datetime-local"
          value={filters.dateFrom}
          onChange={(event) => updateFilter('dateFrom', event.target.value)}
        />
        <TextField
          id="filter-date-to"
          label="To"
          type="datetime-local"
          value={filters.dateTo}
          onChange={(event) => updateFilter('dateTo', event.target.value)}
        />
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {rows === null ? (
        <p role="status">Loading…</p>
      ) : (
        <Table>
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
                <td data-label="Actor">{row.actorEmail}</td>
                <td data-label="Action">{row.action}</td>
                <td data-label="Target">{row.targetId ?? '—'}</td>
                <td data-label="Timestamp">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className={styles.pagination}>
        <Button
          type="button"
          variant="outlined"
          onClick={() => setPageOffset((prev) => Math.max(0, prev - PAGE_LIMIT))}
          disabled={pageOffset === 0}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages} ({totalCount} total)
        </span>
        <Button
          type="button"
          variant="outlined"
          onClick={() => setPageOffset((prev) => prev + PAGE_LIMIT)}
          disabled={pageOffset + PAGE_LIMIT >= totalCount}
        >
          Next
        </Button>
      </div>
    </main>
  )
}
