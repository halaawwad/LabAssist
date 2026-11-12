import { useEffect, useState } from 'react'
import { LabAssistBrand } from '../../../../shared/web/LabAssistBrand'
import { redirectToSharedLogin } from '../../../../shared/web/demoSession'

export function SharedLoginRedirect({ signedOut = false }: { signedOut?: boolean }) {
  const [error, setError] = useState('')
  useEffect(() => {
    try { redirectToSharedLogin('workshop', import.meta.env, signedOut) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the shared demo login.') }
  }, [signedOut])
  return <main role={error ? 'alert' : 'status'}><LabAssistBrand /><p>{error || 'Opening the shared demo login…'}</p></main>
}
