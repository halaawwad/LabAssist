import { createContext, useContext } from 'react'
import type { SupervisorProfile } from '../../data/supervisor/profileMockData'

export type AccountContextValue = {
  profile: SupervisorProfile
  updateProfile: (changes: Partial<SupervisorProfile>) => void
  /** Mock session: there is no backend auth yet, only a signed-in / signed-out flag. */
  isSignedIn: boolean
  signIn: () => void
  signOut: () => void
}

export const AccountContext = createContext<AccountContextValue | null>(null)

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount must be used inside <AccountProvider>.')
  return context
}

/** First letter of the name, shown when there is no profile photo. */
export function profileInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}
