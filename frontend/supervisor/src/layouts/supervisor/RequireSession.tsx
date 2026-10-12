import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccount } from '../../state/supervisor/accountContext'

/** Sends signed-out visitors to the sign-in entry instead of the portal. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAccount()
  return isSignedIn ? children : <Navigate to="/login" replace />
}
