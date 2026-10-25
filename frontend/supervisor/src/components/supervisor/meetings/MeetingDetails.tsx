import { CalendarDays, Clock, MapPin, PencilLine, Users, Video, X } from 'lucide-react'
import type { SupervisorMeeting } from '../../../data/supervisor/meetingsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { reviewLocationLabelKeys } from '../../../i18n/labels'
import { meetingProject, meetingStatus } from './meetingHelpers'
import { useState } from 'react'
import { ActionDialog } from '../tasks/ActionDialog'
import { interactionLabels } from '../interactionLabels'

type MeetingDetailsProps = {
  meeting: SupervisorMeeting
  onClose: () => void
  onEdit: () => void
}

const attendeeTones = ['blue', 'violet', 'gold', 'coral'] as const

export function MeetingDetails({ meeting, onClose, onEdit }: MeetingDetailsProps) {
  const { t, formatDate, formatTime, language } = useI18n()
  const [joined, setJoined] = useState(false)
  const status = meetingStatus(meeting)
  const project = meetingProject(meeting.projectCode)
  const attendees = project?.students ?? []
  const online = meeting.location === 'Online Meeting'
  const canJoin = online && Boolean(meeting.meetingUrl) && status !== 'past'
  const joinHint = !online
    ? t('meetings.details.joinInPerson')
    : !meeting.meetingUrl
      ? t('meetings.details.joinNoLink')
      : status === 'past'
        ? t('meetings.details.joinEnded')
        : ''

  const join = () => {
    if (!canJoin) return
    if (!meeting.googleEventId || meeting.googleEventId.startsWith('mock-')) setJoined(true)
    else if (meeting.meetingUrl) window.open(meeting.meetingUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <aside className="glass-panel meetings-details-panel" aria-labelledby="meeting-details-title">
      <header className="meetings-details-header">
        <h2 id="meeting-details-title">{t('meetings.details.title')}</h2>
        <button
          className="tasks-menu meetings-details-close"
          type="button"
          aria-label={t('meetings.details.close')}
          title={t('meetings.details.close')}
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>

      <div className="meetings-details-scroll">
        <div className="meetings-details-hero">
          <span className={`meetings-details-icon tone-${meeting.tone}`} aria-hidden="true">
            <CalendarDays size={26} strokeWidth={1.7} />
          </span>
          <div>
            <h3>{meeting.title}</h3>
            <span className={`meetings-status is-${status}`}>{t(`meetings.status.${status}`)}</span>
          </div>
        </div>

        <dl className="meetings-details-facts">
          <div>
            <dt>
              <CalendarDays size={18} aria-hidden="true" />
              {t('meetings.details.date')}
            </dt>
            <dd>
              {formatDate(meeting.date, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt>
              <Clock size={18} aria-hidden="true" />
              {t('meetings.details.time')}
            </dt>
            <dd>
              {formatTime(meeting.start)} – {formatTime(meeting.end)}
            </dd>
          </div>
          <div>
            <dt>
              <MapPin size={18} aria-hidden="true" />
              {t('meetings.details.location')}
            </dt>
            <dd>{t(reviewLocationLabelKeys[meeting.location])}</dd>
          </div>
          <div>
            <dt>
              <Users size={18} aria-hidden="true" />
              {t('meetings.details.project')}
            </dt>
            <dd>
              {meeting.projectCode} – {project?.name}
            </dd>
          </div>
        </dl>
        {meeting.agenda && <p>{meeting.agenda}</p>}
        {meeting.locationDetails && <p>{meeting.locationDetails}</p>}

        <section className="meetings-attendees">
          <h3>{t('meetings.details.attendees', { count: attendees.length })}</h3>
          <ul>
            {attendees.map((student, index) => (
              <li key={student.universityId}>
                <span
                  className={`student-initials tone-${attendeeTones[index % attendeeTones.length]}`}
                  aria-hidden="true"
                >
                  {student.initials}
                </span>
                <span>
                  <strong>{student.name}</strong>
                  <small>
                    {index === 0 ? t('meetings.details.leader') : t('meetings.details.member')}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="meetings-details-actions">
        <button
          className="meetings-primary-button"
          type="button"
          disabled={!canJoin}
          title={joinHint || undefined}
          aria-describedby={joinHint ? 'meeting-join-hint' : undefined}
          onClick={join}
        >
          <Video size={19} aria-hidden="true" />
          {t('meetings.details.join')}
        </button>
        {joinHint ? (
          <p className="meetings-join-hint" id="meeting-join-hint">
            {joinHint}
          </p>
        ) : null}
        <button className="meetings-secondary-button" type="button" onClick={onEdit}>
          <PencilLine size={18} aria-hidden="true" />
          {t('meetings.details.edit')}
        </button>
      </div>
      {joined && (
        <ActionDialog
          title={interactionLabels[language].joined}
          description={interactionLabels[language].room}
          icon={Video}
          onClose={() => setJoined(false)}
        >
          <h3>{meeting.title}</h3>
          <p>
            {project?.name} · {formatDate(meeting.date)} · {formatTime(meeting.start)}
          </p>
          <p>{attendees.map((student) => student.name).join(', ')}</p>
        </ActionDialog>
      )}
    </aside>
  )
}
