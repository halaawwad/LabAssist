import { CalendarX2, ChevronDown, ChevronRight, Clock, MapPin, X } from 'lucide-react'
import type { SupervisorMeeting } from '../../../data/supervisor/meetingsMockData'
import { progressProjects } from '../../../data/supervisor/progressMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { reviewLocationLabelKeys } from '../../../i18n/labels'
import { MeetingCalendar } from './MeetingCalendar'
import { meetingStatus, meetingTabs, type MeetingTab } from './meetingHelpers'

type MeetingListProps = {
  meetings: SupervisorMeeting[]
  /** Every meeting (before filters), so the calendar can mark all scheduled days. */
  allMeetings: SupervisorMeeting[]
  selectedId: string | null
  tab: MeetingTab
  project: string
  date: string | null
  onTabChange: (tab: MeetingTab) => void
  onProjectChange: (code: string) => void
  onDateChange: (date: string | null) => void
  onSelect: (id: string) => void
}

export function MeetingList({
  meetings,
  allMeetings,
  selectedId,
  tab,
  project,
  date,
  onTabChange,
  onProjectChange,
  onDateChange,
  onSelect,
}: MeetingListProps) {
  const { t, formatDate } = useI18n()

  return (
    <section className="glass-panel meetings-list-panel" aria-label={t('meetings.listAria')}>
      <div className="meetings-controls">
        <div className="meetings-tabs" role="group" aria-label={t('meetings.tabsAria')}>
          {meetingTabs.map((item) => (
            <button
              type="button"
              aria-pressed={date === null && tab === item}
              onClick={() => {
                onTabChange(item)
                onDateChange(null)
              }}
              key={item}
            >
              {t(`meetings.tabs.${item}`)}
            </button>
          ))}
        </div>

        <div className="meetings-controls-end">
          {date ? (
            <span className="meetings-date-chip">
              {formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}
              <button type="button" aria-label={t('meetings.calendar.clear')} title={t('meetings.calendar.clear')} onClick={() => onDateChange(null)}>
                <X size={14} />
              </button>
            </span>
          ) : null}
          <MeetingCalendar meetings={allMeetings} selectedDate={date} onSelectDate={onDateChange} />
          <label className="meetings-project-filter">
            <span className="visually-hidden">{t('meetings.projectFilter')}</span>
            <select value={project} onChange={(event) => onProjectChange(event.target.value)}>
              <option value="all">{t('meetings.allProjects')}</option>
              {progressProjects.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
        </div>
      </div>

      <ul className="meetings-list">
        {meetings.map((meeting) => (
          <MeetingRow meeting={meeting} selected={meeting.id === selectedId} onSelect={() => onSelect(meeting.id)} key={meeting.id} />
        ))}
      </ul>

      {meetings.length === 0 ? (
        <div className="meetings-empty">
          <CalendarX2 size={34} strokeWidth={1.5} aria-hidden="true" />
          <p>{date ? t('meetings.emptyDay') : t('meetings.empty')}</p>
          {date || project !== 'all' ? (
            <button
              className="dialog-secondary-button"
              type="button"
              onClick={() => {
                onDateChange(null)
                onProjectChange('all')
                onTabChange('upcoming')
              }}
            >
              {t('meetings.showUpcoming')}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

type MeetingRowProps = {
  meeting: SupervisorMeeting
  selected: boolean
  onSelect: () => void
}

function MeetingRow({ meeting, selected, onSelect }: MeetingRowProps) {
  const { t, formatDate, formatTime } = useI18n()
  const status = meetingStatus(meeting)

  return (
    <li>
      <button
        className={`meetings-row tone-${meeting.tone} ${selected ? 'is-selected' : ''} ${status === 'past' ? 'is-past' : ''}`}
        type="button"
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        <span className="meetings-row-date">
          <strong>{formatDate(meeting.date, { day: 'numeric' })}</strong>
          <span>{formatDate(meeting.date, { month: 'short' })}</span>
          <small>{formatDate(meeting.date, { weekday: 'short' })}</small>
        </span>
        <span className="meetings-row-copy">
          <strong>{meeting.title}</strong>
          <span>
            <Clock size={16} aria-hidden="true" />
            {formatTime(meeting.start)} – {formatTime(meeting.end)}
          </span>
          <span>
            <MapPin size={16} aria-hidden="true" />
            {t(reviewLocationLabelKeys[meeting.location])}
          </span>
        </span>
        <span className={`meetings-status is-${status}`}>{t(`meetings.status.${status}`)}</span>
        <ChevronRight className="meetings-row-arrow" size={20} aria-hidden="true" />
      </button>
    </li>
  )
}
