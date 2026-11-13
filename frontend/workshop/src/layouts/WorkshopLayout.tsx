import { LocalStorageNotice } from "../../../../shared/web/LocalStorageNotice";
import { CircleCheck } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { DialogHost } from '../components/DialogHost'
import { SharedLoginRedirect } from './SharedLoginRedirect'
import { Sidebar } from '../components/Sidebar'
import { useI18n } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'

export function WorkshopLayout() {
  const { t } = useI18n()
  const { toasts, signedOut } = useWorkshop()

  if (signedOut) {
    return <SharedLoginRedirect signedOut />
  }

  return (
    <DialogHost>
      <div className="workshop-shell">
        <Sidebar />
        <main className="workshop-main"><LocalStorageNotice />
          <Outlet />
        </main>
      </div>
      <div className="toast-region" role="status" aria-live="polite" aria-label={t('toast.region')}>
        {toasts.map((toast) => (
          <p className="toast" key={toast.id}>
            <CircleCheck size={18} aria-hidden="true" />
            {toast.text}
          </p>
        ))}
      </div>
    </DialogHost>
  )
}
