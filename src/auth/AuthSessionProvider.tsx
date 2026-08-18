import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useAuthSession } from '../lib/useAuthSession'
import { decodeJwtClaims } from '../lib/jwt'

export type AppRole = 'admin' | 'staff' | null

interface AuthState {
  session: Session | null
  role: AppRole
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, role: null, loading: true })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

// Single Supabase session subscription for the whole app (mounted once in
// main.tsx). `role` is B8's `app_role` claim, which the hook stamps directly
// into the JWT — it isn't part of the session's user object, so it has to be
// read out of the access token itself.
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthSession()

  const role = useMemo<AppRole>(() => {
    if (!session) return null
    const claims = decodeJwtClaims(session.access_token)
    const claimedRole = claims?.app_role
    return claimedRole === 'admin' || claimedRole === 'staff' ? claimedRole : null
  }, [session])

  return <AuthContext.Provider value={{ session, role, loading }}>{children}</AuthContext.Provider>
}
