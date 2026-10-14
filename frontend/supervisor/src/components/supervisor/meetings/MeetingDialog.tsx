import { useState } from 'react'
import { CalendarPlus, PencilLine } from 'lucide-react'
import { meetingLocations, type SupervisorMeeting } from '../../../data/supervisor/meetingsMockData'
import type { ReviewLocation } from '../../../data/supervisor/projectsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { reviewLocationLabelKeys } from '../../../i18n/labels'
import { ActionDialog, ProjectSelect } from '../tasks/ActionDialog'
import { meetingProject, todayIso } from './meetingHelpers'

/** What the form edits; the id, tone and online-meeting link fields are owned by the page/backend. */
export type MeetingDraft = Omit<SupervisorMeeting, 'id' | 'tone' | 'googleEventId' | 'meetingUrl'>

type MeetingDialogProps = {
  /** When set, the dialog edits this meeting; otherwise it schedules a new one. */
  meeting?: SupervisorMeeting
  onClose: () => void
  onSave: (draft: MeetingDraft) => void
}

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

export function MeetingDialog({ meeting, onClose, onSave }: MeetingDialogProps) {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [projectCode, setProjectCode] = useState(meeting?.projectCode ?? '')
  const editing = Boolean(meeting)

  const submit = (data: FormData) => {
    const project = meetingProject(projectCode)
    const date = text(data, 'date')
    const start = text(data, 'start')
    const end = text(data, 'end')
    const location = text(data, 'location') as ReviewLocation
    if (!project || !date || !start || !end || !meetingLocations.includes(location)) {
      setError(t('meetings.dialog.errors.required'))
      return
    }
    if (end <= start) {
      setError(t('meetings.dialog.errors.endBeforeStart'))
      return
    }
    onSave({
      title: text(data, 'title') || t('meetings.dialog.defaultTitle', { name: project.name }),
      projectCode,
      date,
      start,
      end,
      location,
    })
    onClose()
  }

  return (
    <ActionDialog
      title={editing ? t('meetings.dialog.editTitle') : t('meetings.dialog.scheduleTitle')}
      description={editing ? t('meetings.dialog.editDescription') : t('meetings.dialog.scheduleDescription')}
      icon={editing ? PencilLine : CalendarPlus}
      submitLabel={editing ? t('meetings.dialog.saveChanges') : t('meetings.dialog.schedule')}
      onSubmit={submit}
      onClose={onClose}
    >
      <label className="dialog-field">
        <span>{t('meetings.dialog.title')}</span>
        <input
          name="title"
          type="text"
          maxLength={80}
          defaultValue={meeting?.title}
          placeholder={t('meetings.dialog.titlePlaceholder')}
          autoFocus
        />
      </label>
      <ProjectSelect value={projectCode} onChange={setProjectCode} />
      <label className="dialog-field">
        <span>{t('meetings.dialog.date')}</span>
        <input name="date" type="date" required min={editing ? undefined : todayIso()} defaultValue={meeting?.date ?? todayIso()} />
      </label>
      <div className="dialog-row">
        <label className="dialog-field">
          <span>{t('meetings.dialog.start')}</span>
          <input name="start" type="time" required defaultValue={meeting?.start ?? '10:00'} onChange={() => setError('')} />
        </label>
        <label className="dialog-field">
          <span>{t('meetings.dialog.end')}</span>
          <input name="end" type="time" required defaultValue={meeting?.end ?? '11:00'} onChange={() => setError('')} />
        </label>
      </div>
      <fieldset className="dialog-field">
        <legend>{t('meetings.dialog.location')}</legend>
        <div className="dialog-segmented">
          {meetingLocations.map((location) => (
            <label key={location}>
              <input
                type="radio"
                name="location"
                value={location}
                required
                defaultChecked={location === (meeting?.location ?? 'Workshop')}
              />
              <span>{t(reviewLocationLabelKeys[location])}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? (
        <p className="meetings-dialog-error" role="alert">
          {error}
        </p>
      ) : null}
    </ActionDialog>
  )
}
