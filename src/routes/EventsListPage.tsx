import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllEvents, renameEvent, isEventNameTakenError, type EventSummary } from '../lib/eventsApi'
import { useAuth } from '../auth/AuthSessionProvider'
import { Table } from '../components/ui/Table'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import styles from './EventsListPage.module.css'

type Status = 'loading' | 'done' | 'error'

export function EventsListPage() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [events, setEvents] = useState<EventSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  function load() {
    setStatus('loading')
    listAllEvents()
      .then((rows) => {
        setEvents(rows)
        setStatus('done')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load events.')
        setStatus('error')
      })
  }

  useEffect(load, [])

  async function handleSaveRename(id: string) {
    setRenameError(null)
    try {
      await renameEvent(id, draftName)
      setEditingId(null)
      load()
    } catch (err) {
      setRenameError(isEventNameTakenError(err) ? 'That event name is already in use.' : 'Rename failed.')
    }
  }

  if (status === 'loading') return <p role="status">Loading…</p>
  if (status === 'error') return <Alert severity="error">{error}</Alert>

  return (
    <main>
      <h1 className={styles.title}>Events</h1>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Submissions</th>
            <th>Created</th>
            {role === 'admin' && <th />}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                {editingId === event.id ? (
                  <TextField
                    id={`rename-${event.id}`}
                    label=""
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.eventNameButton}
                    onClick={() => navigate(`/dashboard/events/${event.id}`)}
                  >
                    {event.name}
                  </button>
                )}
              </td>
              <td>{event.submissionCount}</td>
              <td>{new Date(event.createdAt).toLocaleDateString()}</td>
              {role === 'admin' && (
                <td>
                  {editingId === event.id ? (
                    <div className={styles.actions}>
                      <Button type="button" onClick={() => handleSaveRename(event.id)}>Save</Button>
                      <Button type="button" variant="outlined" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="text"
                      onClick={() => {
                        setEditingId(event.id)
                        setDraftName(event.name)
                        setRenameError(null)
                      }}
                    >
                      Rename
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      {renameError && <Alert severity="error">{renameError}</Alert>}
    </main>
  )
}
