export type AuditLogAction =
  | 'GRANT_ACCESS'
  | 'REVOKE_ACCESS'
  | 'RECORD_SEARCH'
  | 'RECORD_VIEW'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_DENIED'

export const AUDIT_LOG_ACTIONS: AuditLogAction[] = [
  'GRANT_ACCESS',
  'REVOKE_ACCESS',
  'RECORD_SEARCH',
  'RECORD_VIEW',
  'LOGIN_SUCCESS',
  'LOGIN_DENIED',
]

export interface AuditLogRow {
  id: string
  actorEmail: string
  action: AuditLogAction
  targetId: string | null
  createdAt: string
}

export interface AuditLogFilters {
  actorEmail?: string
  action?: AuditLogAction | ''
  targetId?: string
  dateFrom?: string
  dateTo?: string
}

export interface AuditLogPage {
  rows: AuditLogRow[]
  totalCount: number
}

const ACTORS = ['aschweng@msudenver.edu', 'marcusareulius@gmail.com', 'staffer@msudenver.edu']

function buildMockRows(): AuditLogRow[] {
  const rows: AuditLogRow[] = []
  const now = Date.now()

  for (let i = 0; i < 120; i++) {
    const action = AUDIT_LOG_ACTIONS[i % AUDIT_LOG_ACTIONS.length]
    const actorEmail = ACTORS[i % ACTORS.length]
    const targetId =
      action === 'GRANT_ACCESS' || action === 'REVOKE_ACCESS'
        ? 'target-staffer@msudenver.edu'
        : action === 'RECORD_VIEW'
          ? `release-${i}`
          : null

    rows.push({
      id: `audit-${i}`,
      actorEmail,
      action,
      targetId,
      createdAt: new Date(now - i * 1000 * 60 * 37).toISOString(), // spread ~37min apart
    })
  }

  return rows
}

const allRows = buildMockRows()

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Stub for F11, mirroring B14's list_audit_log contract (filters +
// limit/offset pagination, {rows, totalCount}), including its date-range
// validation. I6 replaces this with the real RPC call.
export async function listAuditLog(
  filters: AuditLogFilters,
  pageLimit: number,
  pageOffset: number,
): Promise<AuditLogPage> {
  await delay(200)

  if (filters.dateFrom && filters.dateTo && new Date(filters.dateFrom) > new Date(filters.dateTo)) {
    throw new Error('date_from must not be after date_to.')
  }

  const filtered = allRows.filter((row) => {
    if (filters.actorEmail && !row.actorEmail.toLowerCase().includes(filters.actorEmail.toLowerCase())) {
      return false
    }
    if (filters.action && row.action !== filters.action) {
      return false
    }
    if (filters.targetId && !(row.targetId ?? '').toLowerCase().includes(filters.targetId.toLowerCase())) {
      return false
    }
    if (filters.dateFrom && new Date(row.createdAt) < new Date(filters.dateFrom)) {
      return false
    }
    if (filters.dateTo && new Date(row.createdAt) > new Date(filters.dateTo)) {
      return false
    }
    return true
  })

  return {
    rows: filtered.slice(pageOffset, pageOffset + pageLimit),
    totalCount: filtered.length,
  }
}
