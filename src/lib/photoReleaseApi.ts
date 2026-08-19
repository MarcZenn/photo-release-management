export interface SearchResultRow {
  id: string
  fullName: string
  phone: string
  email: string
  submittedAt: string
}

// Stub for F7 — returns mock rows after a simulated delay (so the loading
// state is exercisable), with "noresults" as a deterministic hook to test
// the empty-state. I3 replaces this with a real get_photo_release(query)
// call via the Supabase client.
export async function searchPhotoReleases(query: string): Promise<SearchResultRow[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (query.trim().toLowerCase() === 'noresults') {
    return []
  }

  return [
    {
      id: 'mock-1',
      fullName: 'Jane Participant',
      phone: '3035550100',
      email: 'jane@example.com',
      submittedAt: '2026-08-01T12:00:00Z',
    },
    {
      id: 'mock-2',
      fullName: 'John Sample',
      phone: '7205550199',
      email: 'john@example.com',
      submittedAt: '2026-08-10T09:30:00Z',
    },
  ]
}
