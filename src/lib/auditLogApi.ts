import { supabase } from './supabaseClient'

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

// list_audit_log's outer wrapper is jsonb_build_object('rows', ...,
// 'totalCount', ...) — camelCase — but each row inside `rows` is built via
// row_to_json against audit_log's own columns, so those are snake_case.
interface AuditLogRowFromApi {
  id: string
  actor_email: string
  action: AuditLogAction
  target_id: string | null
  metadata: unknown
  created_at: string
}

interface AuditLogPageFromApi {
  rows: AuditLogRowFromApi[]
  totalCount: number
}

function isInvalidDateRangeError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    (err as { message: unknown }).message === 'invalid_date_range'
  )
}

// Admin-only, authenticated. Note: actor/target filters are EXACT matches
// server-side (unlike the fuzzy/partial search on get_photo_release) — the
// text inputs here don't do substring matching, matching B14 as written.
export async function listAuditLog(
  filters: AuditLogFilters,
  pageLimit: number,
  pageOffset: number,
): Promise<AuditLogPage> {
  const { data, error } = await supabase.rpc('list_audit_log', {
    actor_email: filters.actorEmail || null,
    action: filters.action || null,
    target_id: filters.targetId || null,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    page_limit: pageLimit,
    page_offset: pageOffset,
  })

  if (error) {
    if (isInvalidDateRangeError(error)) {
      throw new Error('Invalid date range — "From" must not be after "To".')
    }
    throw error
  }

  const page = data as AuditLogPageFromApi
  return {
    rows: page.rows.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      targetId: row.target_id,
      createdAt: row.created_at,
    })),
    totalCount: page.totalCount,
  }
}
