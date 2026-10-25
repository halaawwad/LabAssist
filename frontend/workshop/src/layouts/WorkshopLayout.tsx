import { CircleCheck, LogIn } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { DialogHost } from '../components/DialogHost'
import { LeafLogo } from '../components/LeafLogo'
import { Sidebar } from '../components/Sidebar'
import { useI18n } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'

export function WorkshopLayout() {
  const { t } = useI18n()
  const { toasts, signedOut, setSignedOut } = useWorkshop()

  if (signedOut) {
    return (
      <div className="signed-out">
        <section className="signed-out-card">
          <LeafLogo size={64} />
          <h1>{t('logout.signedOut')}</h1>
          <p>{t('logout.signedOutHint')}</p>
          <button className="btn btn-primary" type="button" onClick={() => setSignedOut(false)}>
            <LogIn size={17} />
            {t('logout.signIn')}
          </button>
        </section>
      </div>
    )
  }

  return (
    <DialogHost>
      <div className="workshop-shell">
        <Sidebar />
        <main className="workshop-main">
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
