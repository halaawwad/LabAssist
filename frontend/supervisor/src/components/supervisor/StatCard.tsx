import { ArrowRight, TrendingUp } from 'lucide-react'
import type { StatCard as StatCardType } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'

type StatCardProps = {
  stat: StatCardType
}

export function StatCard({ stat }: StatCardProps) {
  const { t } = useI18n()
  const label = t(`dashboard.stats.${stat.id}.label`)

  return (
    <article className={`stat-card tone-${stat.tone} ${stat.highlighted ? 'is-highlighted' : ''}`}>
      <div className="stat-card-top">
        <span className="stat-icon">
          <stat.icon size={26} />
        </span>
        <button className="round-arrow" type="button" aria-label={t('dashboard.openStat', { label })}>
          <ArrowRight size={23} />
        </button>
      </div>
      <div>
        <h2>{label}</h2>
        <strong>{stat.value}</strong>
        <p>
          <TrendingUp size={16} />
          {t(`dashboard.stats.${stat.id}.trend`)}
        </p>
      </div>
    </article>
  )
}
