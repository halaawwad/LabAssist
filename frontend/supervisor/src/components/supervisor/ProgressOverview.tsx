import { ChartPie, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { progressItems } from '../../data/supervisor/supervisorMockData'
import { progressProjects } from '../../data/supervisor/progressMockData'
import { useI18n } from '../../i18n/i18nContext'

export function ProgressOverview() {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="panel-heading">
        <h2 id="progress-title">
          <span className="dashboard-heading-icon">
            <ChartPie size={23} />
          </span>
          {t('dashboard.progressTitle')}
        </h2>
        <select
          className="filter-pill"
          aria-label={t('dashboard.allProjects')}
          value="all"
          onChange={(event) => {
            if (event.target.value !== 'all')
              navigate(`/supervisor/progress?project=${encodeURIComponent(event.target.value)}`)
          }}
        >
          <option value="all">{t('dashboard.allProjects')}</option>
          {progressProjects.map((project) => (
            <option key={project.code} value={project.code}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="progress-content">
        <div className="progress-ring" aria-label={t('dashboard.overallAria', { value: 62 })}>
          <svg viewBox="0 0 120 120" role="presentation" aria-hidden="true">
            <defs>
              <linearGradient id="dashboard-ring-gloss" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#a6bd83" />
                <stop offset=".5" stopColor="#64875a" />
                <stop offset="1" stopColor="#34552c" />
              </linearGradient>
            </defs>
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
