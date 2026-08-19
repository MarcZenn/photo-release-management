import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPhotoReleases, type SearchResultRow } from '../lib/photoReleaseApi'
import { maskEmail, maskPhone } from '../lib/mask'
import './SearchDashboardPage.css'

type SearchStatus = 'idle' | 'loading' | 'done'

// Index route under DashboardLayout. searchPhotoReleases is a stub — I3
// wires it to the real get_photo_release RPC.
export function SearchDashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [results, setResults] = useState<SearchResultRow[]>([])

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setStatus('loading')
    const rows = await searchPhotoReleases(trimmed)
    setResults(rows)
    setStatus('done')
  }

  return (
    <main className="search-dashboard">
      <h1>Search Records</h1>

      <form onSubmit={handleSearch} className="search-dashboard__form">
        <div>
          <label htmlFor="search-query">Name, email, or phone</label>
          <input id="search-query" type="text" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <button type="submit" disabled={!query.trim() || status === 'loading'}>
          Search
        </button>
      </form>

      {status === 'idle' && (
        <p className="search-dashboard__hint">Enter a name, email, or phone number to search.</p>
      )}

      {status === 'loading' && <p role="status">Searching…</p>}

      {status === 'done' && results.length === 0 && (
        <p className="search-dashboard__empty">No records found for &quot;{query}&quot;.</p>
      )}

      {status === 'done' && results.length > 0 && (
        <ul className="search-dashboard__results">
          {results.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => navigate(`/dashboard/records/${row.id}`)}>
                <span className="search-dashboard__name">{row.fullName}</span>
                <span className="search-dashboard__contact">
                  {maskPhone(row.phone)} · {maskEmail(row.email)}
                </span>
                <span className="search-dashboard__date">{new Date(row.submittedAt).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
