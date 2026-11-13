import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { defaultSupervisorProfile, type SupervisorProfile } from '../../data/supervisor/profileMockData'
import { readStored, writeStoredOrThrow } from '../storage'
import { AccountContext, type AccountContextValue } from './accountContext'

type Session = 'signed-in' | 'signed-out'

export function AccountProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SupervisorProfile>(() => ({
    ...defaultSupervisorProfile,
    ...readStored<Partial<SupervisorProfile>>('profile', {}),
  }))
  // The shared login initializes this existing flag before providers mount.
  const [session, setSession] = useState<Session>(() => readStored<Session>('session', 'signed-out'))

  const currentProfile = useRef(profile)
  const updateProfile = useCallback((changes: Partial<SupervisorProfile>) => {
    const next = { ...currentProfile.current, ...changes }
    writeStoredOrThrow('profile', next)
    currentProfile.current = next
    setProfile(next)
  }, [])

  const changeSession = useCallback((next: Session) => {
    writeStoredOrThrow('session', next)
    setSession(next)
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
