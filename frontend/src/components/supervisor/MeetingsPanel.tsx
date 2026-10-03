import { ArrowRight, CalendarDays } from 'lucide-react'
import { meetings } from '../../data/supervisor/supervisorMockData'

export function MeetingsPanel() {
  return (
    <section className="glass-panel meetings-panel" aria-labelledby="meetings-title">
      <div className="panel-heading">
        <h2 id="meetings-title">Upcoming Meetings</h2>
        <button className="text-button" type="button">View all</button>
      </div>

      <div className="meeting-list">
        {meetings.map((meeting) => (
          <button className="meeting-row" type="button" key={meeting.project}>
            <span className={`meeting-icon tone-${meeting.tone}`}>
              <CalendarDays size={27} />
            </span>
            <span className="meeting-copy">
              <strong>{meeting.project}</strong>
              <small>{meeting.team}</small>
            </span>
            <span className="meeting-time">
              <span>{meeting.date}</span>
              <small>{meeting.time}</small>
            </span>
            <ArrowRight size={21} />
          </button>
        ))}
      </div>
    </section>
  )
}
