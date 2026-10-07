import { Box, CheckSquare, FileText } from 'lucide-react'
import { activities } from '../../data/supervisor/supervisorMockData'

const statusIcon = {
  report: FileText,
  task: CheckSquare,
  model: Box,
}

export function ActivityPanel() {
  return (
    <section className="glass-panel activity-panel" aria-labelledby="activity-title">
      <div className="panel-heading">
        <h2 id="activity-title">Recent Student Activity</h2>
        <button className="text-button" type="button">View all</button>
      </div>

      <div className="activity-list">
        {activities.map((activity) => {
          const Icon = statusIcon[activity.status]

          return (
            <div className="activity-row" key={`${activity.initials}-${activity.time}`}>
              <span className={`activity-avatar tone-${activity.tone}`}>{activity.initials}</span>
              <div>
                <p>
                  <strong>{activity.student}</strong> {activity.action}
                </p>
                <small>{activity.project} · {activity.time}</small>
              </div>
              <Icon size={22} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
