export interface SearchResultRow {
  id: string
  fullName: string
  phone: string
  email: string
  submittedAt: string
}

export interface PhotoReleaseDetail {
  id: string
  fullName: string
  phone: string
  email: string
  signatureImage: string // full data: URI, as produced by SignaturePad.toDataUrl() and stored as-is by create_photo_release
  submittedAt: string
  legalNoticeVersion: string
}

// A minimal 1x1 transparent PNG, standing in for a real captured signature.
const MOCK_SIGNATURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

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

// Stub for F8 — returns null for a "not-found" id so that state is
// exercisable too. I3 replaces this with a real get_photo_release(releaseId)
// call via the Supabase client.
export async function getPhotoReleaseById(id: string): Promise<PhotoReleaseDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (id === 'not-found') {
    return null
  }

  return {
    id,
    fullName: 'Jane Participant',
    phone: '3035550100',
    email: 'jane@example.com',
    signatureImage: MOCK_SIGNATURE_DATA_URL,
    submittedAt: '2026-08-01T12:00:00Z',
    legalNoticeVersion: 'Draft — pending UCM confirmation (see U4)',
  }
}
