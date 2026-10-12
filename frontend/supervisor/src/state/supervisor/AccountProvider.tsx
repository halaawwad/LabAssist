import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { defaultSupervisorProfile, type SupervisorProfile } from '../../data/supervisor/profileMockData'
import { readStored, writeStored } from '../storage'
import { AccountContext, type AccountContextValue } from './accountContext'

type Session = 'signed-in' | 'signed-out'

export function AccountProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SupervisorProfile>(() => ({
    ...defaultSupervisorProfile,
    ...readStored<Partial<SupervisorProfile>>('profile', {}),
  }))
  // Signed in by default so opening the portal keeps landing on the dashboard.
  const [session, setSession] = useState<Session>(() => readStored<Session>('session', 'signed-in'))

  const updateProfile = useCallback((changes: Partial<SupervisorProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...changes }
      writeStored('profile', next)
      return next
    })
  }, [])

  const changeSession = useCallback((next: Session) => {
    setSession(next)
    writeStored('session', next)
  }, [])

  const value = useMemo<AccountContextValue>(
    () => ({
      profile,
      updateProfile,
      isSignedIn: session === 'signed-in',
      signIn: () => changeSession('signed-in'),
      signOut: () => changeSession('signed-out'),
    }),
    [changeSession, profile, session, updateProfile],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
