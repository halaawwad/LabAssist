import { ChevronDown, TrendingUp } from 'lucide-react'
import { progressItems } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'

export function ProgressOverview() {
  const { t } = useI18n()

  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="panel-heading">
        <h2 id="progress-title">{t('dashboard.progressTitle')}</h2>
        <button className="filter-pill" type="button">
          {t('dashboard.allProjects')}
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="progress-content">
        <div className="progress-ring" aria-label={t('dashboard.overallAria', { value: 62 })}>
          <svg viewBox="0 0 120 120" role="presentation" aria-hidden="true">
            <circle className="ring-track" cx="60" cy="60" r="49" />
            <circle className="ring-value" cx="60" cy="60" r="49" pathLength="100" />
          </svg>
          <div>
            <strong>62%</strong>
            <span>{t('dashboard.overallProgress')}</span>
            <small>
              <TrendingUp size={15} />
              +12%
            </small>
          </div>
        </div>

        <div className="progress-bars">
          {progressItems.map((item) => (
            <div className="progress-row" key={item.id}>
              <div className="progress-row-label">
                <span>{t(`dashboard.progressItems.${item.id}`)}</span>
                <strong>{item.value}%</strong>
              </div>
              <div className="bar-track">
                <span style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
