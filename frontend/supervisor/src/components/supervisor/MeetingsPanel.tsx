import { ArrowRight, CalendarDays } from 'lucide-react'
import { meetings } from '../../data/supervisor/supervisorMockData'
import { tasksMockToday } from '../../data/supervisor/tasksMockData'
import { useI18n } from '../../i18n/i18nContext'

export function MeetingsPanel() {
  const { t, formatDay, formatTime } = useI18n()

  return (
    <section className="glass-panel meetings-panel" aria-labelledby="meetings-title">
      <div className="panel-heading">
        <h2 id="meetings-title">{t('dashboard.meetingsTitle')}</h2>
        <button className="text-button" type="button">{t('common.viewAll')}</button>
      </div>

      <div className="meeting-list">
        {meetings.map((meeting) => (
          <button className="meeting-row" type="button" key={meeting.projectCode}>
            <span className={`meeting-icon tone-${meeting.tone}`}>
              <CalendarDays size={27} />
            </span>
            <span className="meeting-copy">
              <strong>{t('dashboard.meetingProject', { code: meeting.projectCode })}</strong>
              <small>{meeting.team}</small>
            </span>
            <span className="meeting-time">
              <span>{formatDay(meeting.date, tasksMockToday)}</span>
              <small>{formatTime(meeting.time)}</small>
            </span>
            <ArrowRight size={21} />
          </button>
        ))}
      </div>
    </section>
  )
}
