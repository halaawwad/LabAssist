import { Box, CheckSquare, FileText } from 'lucide-react'
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

  return (
    <section className="glass-panel activity-panel" aria-labelledby="activity-title">
      <div className="panel-heading">
        <h2 id="activity-title">{t('dashboard.activityTitle')}</h2>
        <button className="text-button" type="button">{t('common.viewAll')}</button>
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
                  {activity.project} · {formatRelative(new Date(loadedAt - activity.hoursAgo * 3_600_000))}
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
