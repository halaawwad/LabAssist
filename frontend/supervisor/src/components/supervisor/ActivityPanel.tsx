import { ArrowRight, Box, CheckSquare, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { activities } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'

/** Mock activity ages are counted back from when the portal loaded. */
const loadedAt = Date.now()

const statusIcon = {
  report: FileText,
  task: CheckSquare,
  model: Box,
}

export function ActivityPanel() {
  const { t, formatRelative } = useI18n()
  const navigate = useNavigate()

  return (
    <section className="glass-panel activity-panel" aria-labelledby="activity-title">
      <div className="panel-heading">
        <h2 id="activity-title">
          <span className="dashboard-heading-icon">
            <Users size={23} />
          </span>
          {t('dashboard.activityTitle')}
        </h2>
        <button
          className="text-button"
          type="button"
          onClick={() => navigate('/supervisor/students')}
        >
          {t('common.viewAll')} <ArrowRight size={17} />
        </button>
      </div>

      <div className="activity-list">
        {activities.map((activity) => {
          const Icon = statusIcon[activity.status]

          return (
            <div className="activity-row" key={`${activity.initials}-${activity.hoursAgo}`}>
              <span className={`activity-avatar tone-${activity.tone}`}>{activity.initials}</span>
              <div>
                <p>
                  <strong>{activity.student}</strong> {t(`dashboard.activity.${activity.status}`)}
                </p>
                <small>
                  {activity.project} ·{' '}
                  {formatRelative(new Date(loadedAt - activity.hoursAgo * 3_600_000))}
                </small>
              </div>
              <Icon size={22} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
