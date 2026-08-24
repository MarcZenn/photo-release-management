import { supabase } from './supabaseClient'

export interface StaffAllowlistRow {
  email: string
  displayName: string
  role: 'admin' | 'staff'
  status: 'active' | 'revoked'
  grantedBy: string
  grantedAt: string
  revokedBy: string | null
  revokedAt: string | null
}

export class MinAdminGuardrailError extends Error {}

// list_staff_allowlist/update_staff_allowlist build their jsonb via
// row_to_json / jsonb_build_object with the table's own column names, so
// their keys are snake_case, not camelCase.
interface StaffAllowlistRowFromApi {
  email_normalized: string
  display_name: string
  role: 'admin' | 'staff'
  status: 'active' | 'revoked'
  granted_by: string
  granted_at: string
  revoked_by: string | null
  revoked_at: string | null
}

function isMinAdminGuardrailError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'PT409'
}

// Admin-only, authenticated.
export async function listStaffAllowlist(): Promise<StaffAllowlistRow[]> {
  const { data, error } = await supabase.rpc('list_staff_allowlist')
  if (error) throw error

  return (data as StaffAllowlistRowFromApi[]).map((row) => ({
    email: row.email_normalized,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at,
  }))
}

// Admin-only, authenticated. Callers always re-fetch via listStaffAllowlist()
// afterward rather than consuming this return value, so it's typed to match
// B12's actual (minimal) response rather than the full row shape.
export async function updateStaffAllowlist(
  targetEmail: string,
  action: 'grant' | 'revoke',
  newRole?: 'admin' | 'staff',
): Promise<{ email: string; status: 'active' | 'revoked'; role: 'admin' | 'staff' }> {
  const { data, error } = await supabase.rpc('update_staff_allowlist', {
    target_email: targetEmail,
    action,
    new_role: newRole ?? null,
  })

  if (error) {
    if (isMinAdminGuardrailError(error)) {
      throw new MinAdminGuardrailError('At least 2 active Admin accounts are required at all times.')
    }
    throw error
  }

  return data
}
