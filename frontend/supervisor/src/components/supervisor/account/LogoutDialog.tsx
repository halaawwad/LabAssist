import { startTransition } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../../i18n/i18nContext'
import { useAccount } from '../../../state/supervisor/accountContext'
import { ActionDialog } from '../tasks/ActionDialog'

type LogoutDialogProps = {
  onClose: () => void
}

/** Confirmation before ending the (mock) session; confirming returns to the sign-in entry. */
export function LogoutDialog({ onClose }: LogoutDialogProps) {
  const { t } = useI18n()
  const { signOut } = useAccount()
  const navigate = useNavigate()

  // Same transition as the router's navigation, so the session guard never redirects first
  // (which would drop the "logged out" state).
  const confirm = () => {
    startTransition(() => {
      navigate('/login', { replace: true, state: { signedOut: true } })
      signOut()
    })
  }

  return (
    <ActionDialog
      title={t('logout.title')}
      description={t('logout.description')}
      icon={LogOut}
      submitLabel={t('logout.confirm')}
      onSubmit={confirm}
      onClose={onClose}
    />
  )
}
