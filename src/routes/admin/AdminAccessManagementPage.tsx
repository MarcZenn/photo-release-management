import { useEffect, useState, type FormEvent } from 'react'
import {
  listStaffAllowlist,
  updateStaffAllowlist,
  MinAdminGuardrailError,
  type StaffAllowlistRow,
} from '../../lib/staffAllowlistApi'
import { isValidEmail } from '../../lib/validators'
import styles from './AdminAccessManagementPage.module.css'

type Role = 'admin' | 'staff'

type PendingAction = { kind: 'revoke' | 'demote'; email: string } | null

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Action failed.'
}

// Admin-only, reachable only through AdminRouteGuard. Wired to the real
// update_staff_allowlist / list_staff_allowlist RPCs (I4).
export function AdminAccessManagementPage() {
  const [rows, setRows] = useState<StaffAllowlistRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<Role>('staff')
  const [addError, setAddError] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)

  useEffect(() => {
    listStaffAllowlist()
      .then(setRows)
      .catch((err) => setLoadError(errorMessage(err)))
  }, [])

  async function refresh() {
    setRows(await listStaffAllowlist())
  }

  async function handleAddStaff(event: FormEvent) {
    event.preventDefault()
    if (!isValidEmail(newEmail)) return

    setAddBusy(true)
    setAddError(null)
    try {
      await updateStaffAllowlist(newEmail, 'grant', newRole)
      setNewEmail('')
      setNewRole('staff')
      await refresh()
    } catch (err) {
      setAddError(errorMessage(err))
    } finally {
      setAddBusy(false)
    }
  }

  async function confirmPending() {
    if (!pending) return
    const { email, kind } = pending

    setBusyEmail(email)
    try {
      if (kind === 'revoke') {
        await updateStaffAllowlist(email, 'revoke')
      } else {
        await updateStaffAllowlist(email, 'grant', 'staff')
      }
      setRowErrors((prev) => ({ ...prev, [email]: '' }))
      setPending(null)
      await refresh()
    } catch (err) {
      const message = err instanceof MinAdminGuardrailError ? err.message : errorMessage(err)
      setRowErrors((prev) => ({ ...prev, [email]: message }))
      setPending(null)
    } finally {
      setBusyEmail(null)
    }
  }

  async function handleRegrant(email: string) {
    setBusyEmail(email)
    try {
      await updateStaffAllowlist(email, 'grant')
      setRowErrors((prev) => ({ ...prev, [email]: '' }))
      await refresh()
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [email]: errorMessage(err) }))
    } finally {
      setBusyEmail(null)
    }
  }

  async function handleRoleChange(row: StaffAllowlistRow, value: Role) {
    if (value === row.role) return

    // Demoting an active Admin is consequential enough to require the same
    // inline confirmation step as Revoke — everything else (promote, or any
    // change on a Staff row) applies immediately.
    if (row.role === 'admin' && value === 'staff') {
      setPending({ kind: 'demote', email: row.email })
      return
    }

    setBusyEmail(row.email)
    try {
      await updateStaffAllowlist(row.email, 'grant', value)
      setRowErrors((prev) => ({ ...prev, [row.email]: '' }))
      await refresh()
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [row.email]: errorMessage(err) }))
    } finally {
      setBusyEmail(null)
    }
  }

  if (loadError) {
    return (
      <main className={styles.accessManagement}>
        <p role="alert">{loadError}</p>
      </main>
    )
  }

  if (!rows) {
    return (
      <main className={styles.accessManagement}>
        <p role="status">Loading…</p>
      </main>
    )
  }

  return (
    <main className={styles.accessManagement}>
      <h1>Staff Access Management</h1>

      <form onSubmit={handleAddStaff} className={styles.addForm}>
        <div>
          <label htmlFor="new-staff-email">Email</label>
          <input
            id="new-staff-email"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="new-staff-role">Role</label>
          <select id="new-staff-role" value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" disabled={!isValidEmail(newEmail) || addBusy}>
          Add
        </button>
        {addError && (
          <p className={styles.rowError} role="alert">
            {addError}
          </p>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Granted / Revoked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isBusy = busyEmail === row.email
            const isPendingRevoke = pending?.kind === 'revoke' && pending.email === row.email
            const isPendingDemote = pending?.kind === 'demote' && pending.email === row.email

            return (
              <tr key={row.email}>
                <td>{row.email}</td>
                <td>{row.role}</td>
                <td>{row.status}</td>
                <td>
                  {row.status === 'active'
                    ? `${row.grantedBy} · ${new Date(row.grantedAt).toLocaleDateString()}`
                    : `${row.revokedBy} · ${row.revokedAt ? new Date(row.revokedAt).toLocaleDateString() : ''}`}
                </td>
                <td>
                  {row.status === 'active' ? (
                    isPendingRevoke ? (
                      <span className={styles.confirm}>
                        Revoke access for {row.email}?
                        <span>
                          <button type="button" onClick={confirmPending} disabled={isBusy}>
                            Confirm
                          </button>{' '}
                          <button type="button" onClick={() => setPending(null)} disabled={isBusy}>
                            Cancel
                          </button>
                        </span>
                      </span>
                    ) : isPendingDemote ? (
                      <span className={styles.confirm}>
                        Change role to Staff for {row.email}? This removes Admin access.
                        <span>
                          <button type="button" onClick={confirmPending} disabled={isBusy}>
                            Confirm
                          </button>{' '}
                          <button type="button" onClick={() => setPending(null)} disabled={isBusy}>
                            Cancel
                          </button>
                        </span>
                      </span>
                    ) : (
                      <>
                        <select
                          aria-label={`Role for ${row.email}`}
                          value={row.role}
                          disabled={isBusy}
                          onChange={(event) => handleRoleChange(row, event.target.value as Role)}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>{' '}
                        <button type="button" onClick={() => setPending({ kind: 'revoke', email: row.email })} disabled={isBusy}>
                          Revoke
                        </button>
                      </>
                    )
                  ) : (
                    <button type="button" onClick={() => handleRegrant(row.email)} disabled={isBusy}>
                      Re-grant
                    </button>
                  )}
                  {rowErrors[row.email] && (
                    <p className={styles.rowError} role="alert">
                      {rowErrors[row.email]}
                    </p>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
