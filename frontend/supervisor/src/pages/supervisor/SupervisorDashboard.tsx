import { ActivityPanel } from '../../components/supervisor/ActivityPanel'
import { DashboardHeader } from '../../components/supervisor/DashboardHeader'
import { HardwareSupportCard } from '../../components/supervisor/HardwareSupportCard'
import { MeetingsPanel } from '../../components/supervisor/MeetingsPanel'
import { ProgressOverview } from '../../components/supervisor/ProgressOverview'
import { StatCard } from '../../components/supervisor/StatCard'
import { stats } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'

export function SupervisorDashboard() {
  const { t } = useI18n()

  return (
    <div className="dashboard-page">
      <DashboardHeader />

      <section className="stats-grid" aria-label={t('dashboard.statsAria')}>
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      <section className="dashboard-grid" aria-label={t('dashboard.detailsAria')}>
        <div className="main-stack">
          <ProgressOverview />
          <ActivityPanel />
        </div>
        <HardwareSupportCard />
        <MeetingsPanel />
      </section>
    </div>
  )
}
