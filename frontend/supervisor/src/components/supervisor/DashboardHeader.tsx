import { Sun } from 'lucide-react'
import { useI18n } from '../../i18n/i18nContext'
import { useAccount } from '../../state/supervisor/accountContext'
import { SupervisorTopBar } from './SupervisorTopBar'

export function DashboardHeader() {
  const { t } = useI18n()
  const { profile } = useAccount()
  const firstName = profile.name.trim().split(/\s+/)[0]

  return (
    <header className="dashboard-header">
      <div className="greeting">
        <span>{t('dashboard.greeting')}</span>
        <div className="greeting-name">
          <h1>{t('common.honorific', { name: firstName })}</h1>
          <Sun size={36} aria-hidden="true" />
        </div>
        <p>{t('dashboard.subtitle')}</p>
      </div>

      <SupervisorTopBar />
    </header>
  )
}
