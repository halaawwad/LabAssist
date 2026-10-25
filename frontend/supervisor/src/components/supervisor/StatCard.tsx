import { ArrowRight, TrendingUp } from 'lucide-react'
import type { StatCard as StatCardType } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'
import { useNavigate } from 'react-router-dom'
import { progressProjects } from '../../data/supervisor/progressMockData'

type StatCardProps = {
  stat: StatCardType
}

export function StatCard({ stat }: StatCardProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const destination = {
    myProjects: 'projects',
    delayed: `progress?project=${progressProjects.find((project) => project.status === 'Delayed')?.code ?? progressProjects[0].code}`,
    reports: 'reports?status=pending',
    issues: 'issues',
  }[stat.id]
  const label = t(`dashboard.stats.${stat.id}.label`)

  return (
    <article
      className={`stat-card tone-${stat.tone} ${stat.highlighted ? 'is-highlighted' : ''}`}
      role="link"
      tabIndex={0}
      aria-label={t('dashboard.openStat', { label })}
      onClick={() => navigate(`/supervisor/${destination}`)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          navigate(`/supervisor/${destination}`)
        }
      }}
    >
      <svg className="dashboard-stat-sparkline" viewBox="0 0 210 90" aria-hidden="true">
        <path d="M5 70 Q20 52 36 67 T68 57 T100 52 T134 35 T170 16 T205 28" />
        <circle cx="170" cy="16" r="4" />
        <circle cx="205" cy="28" r="4" />
      </svg>
      <div className="stat-card-top">
        <span className="stat-icon">
          <stat.icon size={26} />
        </span>
        <button
          className="round-arrow"
          type="button"
          aria-label={t('dashboard.openStat', { label })}
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/supervisor/${destination}`)
          }}
        >
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
