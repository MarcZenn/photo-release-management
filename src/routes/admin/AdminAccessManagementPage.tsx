import { useEffect, useState, type FormEvent } from 'react'
import {
  listStaffAllowlist,
  updateStaffAllowlist,
  MinAdminGuardrailError,
  type StaffAllowlistRow,
} from '../../lib/staffAllowlistApi'
import { isValidEmail } from '../../lib/validators'
import { TextField } from '../../components/ui/TextField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Table } from '../../components/ui/Table'
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
      <main>
        <Alert severity="error">{loadError}</Alert>
      </main>
    )
  }

  if (!rows) {
    return (
      <main>
        <p role="status">Loading…</p>
      </main>
    )
  }

  return (
    <main>
      <h1 className={styles.title}>Staff Access Management</h1>

      <form onSubmit={handleAddStaff} className={styles.addForm}>
        <TextField
          id="new-staff-email"
          label="Email"
          type="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          required
        />
        <Select
          id="new-staff-role"
          label="Role"
          value={newRole}
          onChange={(event) => setNewRole(event.target.value as Role)}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
        <Button type="submit" disabled={!isValidEmail(newEmail) || addBusy}>
          Add
        </Button>
        {addError && (
          <div className={styles.addFormError}>
            <Alert severity="error">{addError}</Alert>
          </div>
        )}
      </form>

      <Table>
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
                <td data-label="Email">{row.email}</td>
                <td data-label="Role" className={styles.roleCell}>{row.role}</td>
                <td data-label="Status">
                  <span
                    className={[
                      styles.statusChip,
                      row.status === 'active' ? styles.statusActive : styles.statusRevoked,
                    ].join(' ')}
                  >
                    {row.status}
                  </span>
                </td>
                <td data-label="Granted / Revoked">
                  {row.status === 'active'
                    ? `${row.grantedBy} · ${new Date(row.grantedAt).toLocaleDateString()}`
                    : `${row.revokedBy} · ${row.revokedAt ? new Date(row.revokedAt).toLocaleDateString() : ''}`}
                </td>
                <td data-label="Actions">
                  {row.status === 'active' ? (
                    isPendingRevoke ? (
                      <div className={styles.confirm}>
                        <span>Revoke access for {row.email}?</span>
                        <span className={styles.confirmActions}>
                          <Button type="button" color="accent" onClick={confirmPending} disabled={isBusy}>
                            Confirm
                          </Button>
                          <Button type="button" variant="outlined" onClick={() => setPending(null)} disabled={isBusy}>
                            Cancel
                          </Button>
                        </span>
                      </div>
                    ) : isPendingDemote ? (
                      <div className={styles.confirm}>
                        <span>Change role to Staff for {row.email}? This removes Admin access.</span>
                        <span className={styles.confirmActions}>
                          <Button type="button" color="accent" onClick={confirmPending} disabled={isBusy}>
                            Confirm
                          </Button>
                          <Button type="button" variant="outlined" onClick={() => setPending(null)} disabled={isBusy}>
                            Cancel
                          </Button>
                        </span>
                      </div>
                    ) : (
                      <div className={styles.actions}>
                        <Select
                          id={`role-${row.email}`}
                          aria-label={`Role for ${row.email}`}
                          value={row.role}
                          disabled={isBusy}
                          onChange={(event) => handleRoleChange(row, event.target.value as Role)}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </Select>
                        <Button
                          type="button"
                          variant="outlined"
                          color="accent"
                          onClick={() => setPending({ kind: 'revoke', email: row.email })}
                          disabled={isBusy}
                        >
                          Revoke
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button type="button" variant="outlined" onClick={() => handleRegrant(row.email)} disabled={isBusy}>
                      Re-grant
                    </Button>
                  )}
                  {rowErrors[row.email] && (
                    <div className={styles.rowError}>
                      <Alert severity="error">{rowErrors[row.email]}</Alert>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </main>
  )
}
