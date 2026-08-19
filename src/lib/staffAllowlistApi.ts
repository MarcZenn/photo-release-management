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

// In-memory stub for F9, seeded to match B15's real bootstrap admins plus
// one staff row. I4 replaces every function below with real
// list_staff_allowlist / update_staff_allowlist RPC calls.
//
// Mirrors B12's actual guardrail (NFR6): the min-2-active-Admin check
// applies to BOTH `revoke` and a `grant` that demotes an active Admin's role
// away from 'admin' in place — see
// supabase/migrations/20260816220809_update_staff_allowlist.sql.
let rows: StaffAllowlistRow[] = [
  {
    email: 'marcusareulius@gmail.com',
    displayName: 'Application Creator',
    role: 'admin',
    status: 'active',
    grantedBy: 'system-bootstrap',
    grantedAt: '2026-08-14T00:00:00Z',
    revokedBy: null,
    revokedAt: null,
  },
  {
    email: 'aschweng@msudenver.edu',
    displayName: 'Amanda Schwengel',
    role: 'admin',
    status: 'active',
    grantedBy: 'system-bootstrap',
    grantedAt: '2026-08-14T00:00:00Z',
    revokedBy: null,
    revokedAt: null,
  },
  {
    email: 'staffer@msudenver.edu',
    displayName: 'staffer@msudenver.edu',
    role: 'staff',
    status: 'active',
    grantedBy: 'aschweng@msudenver.edu',
    grantedAt: '2026-08-15T00:00:00Z',
    revokedBy: null,
    revokedAt: null,
  },
]

export async function listStaffAllowlist(): Promise<StaffAllowlistRow[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return rows.map((row) => ({ ...row }))
}

export async function updateStaffAllowlist(
  targetEmail: string,
  action: 'grant' | 'revoke',
  newRole?: 'admin' | 'staff',
): Promise<StaffAllowlistRow> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  const normalized = targetEmail.trim().toLowerCase()
  const existingIndex = rows.findIndex((row) => row.email === normalized)
  const existing = existingIndex >= 0 ? rows[existingIndex] : null

  // Guardrail (NFR6), matching B12: revoking, or demoting away from 'admin',
  // an active Admin must never drop the active-Admin count below 2. Covers
  // both `revoke` and a `grant` that changes an active Admin's role to
  // something other than 'admin'.
  const wouldRemoveActiveAdmin =
    existing?.role === 'admin' &&
    existing.status === 'active' &&
    (action === 'revoke' || (action === 'grant' && newRole != null && newRole !== 'admin'))

  if (wouldRemoveActiveAdmin) {
    const activeAdminCount = rows.filter((row) => row.role === 'admin' && row.status === 'active').length
    if (activeAdminCount <= 2) {
      throw new MinAdminGuardrailError('At least 2 active Admin accounts are required at all times.')
    }
  }

  if (action === 'grant') {
    const role = newRole ?? existing?.role ?? 'staff'
    const updated: StaffAllowlistRow = {
      email: normalized,
      displayName: existing?.displayName ?? normalized,
      role,
      status: 'active',
      grantedBy: 'you@msudenver.edu',
      grantedAt: new Date().toISOString(),
      revokedBy: null,
      revokedAt: null,
    }
    if (existingIndex >= 0) {
      rows[existingIndex] = updated
    } else {
      rows = [...rows, updated]
    }
    return updated
  }

  if (action === 'revoke') {
    if (!existing) throw new Error('Staff member not found.')

    const updated: StaffAllowlistRow = {
      ...existing,
      status: 'revoked',
      revokedBy: 'you@msudenver.edu',
      revokedAt: new Date().toISOString(),
    }
    rows[existingIndex] = updated
    return updated
  }

  throw new Error('Invalid action.')
}
