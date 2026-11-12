import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LabAssistBrand } from '../../../../../shared/web/LabAssistBrand'
import { redirectToSharedLogin } from '../../../../../shared/web/demoSession'

/** Legacy route: Noor's Student /login is the only web login interface. */
export function Login() {
  const location = useLocation()
  const [error, setError] = useState('')
  const signedOut = (location.state as { signedOut?: boolean } | null)?.signedOut === true
  useEffect(() => {
    try { redirectToSharedLogin('supervisor', import.meta.env, signedOut) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the shared demo login.') }
  }, [signedOut])
  return <main role={error ? 'alert' : 'status'}><LabAssistBrand /><p>{error || 'Opening the shared demo login...'}</p></main>
}
