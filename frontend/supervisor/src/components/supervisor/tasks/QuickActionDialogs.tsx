import { useState } from 'react'
import { CalendarDays, ChartColumn, Check, FilePlus2, MessageCircle } from 'lucide-react'
import {
  tasksMockToday,
  weeklyReports,
  type SupervisorTask,
  type TaskPriority,
} from '../../../data/supervisor/tasksMockData'
import { useI18n, type TranslationKey } from '../../../i18n/i18nContext'
import { priorityLabelKeys, reportStatusLabelKeys } from '../../../i18n/labels'
import { ActionDialog, ProjectSelect } from './ActionDialog'
import { findProject } from './taskHelpers'

export type NewTask = Omit<SupervisorTask, 'id' | 'status'>

type DialogProps = {
  onClose: () => void
  onNotice: (message: string) => void
}

const priorities: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low']

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

export function CreateTaskDialog({ onClose, onNotice, onCreate }: DialogProps & { onCreate: (task: NewTask) => void }) {
  const { t } = useI18n()

  const submit = (data: FormData) => {
    const project = findProject(text(data, 'project'))
    if (!project) return
    onCreate({
      title: text(data, 'title'),
      projectCode: project.code,
      projectName: project.name,
      priority: text(data, 'priority') as TaskPriority,
      dueDate: text(data, 'dueDate'),
    })
    onNotice(t('tasks.dialogs.create.notice', { code: project.code }))
    onClose()
  }

  return (
    <ActionDialog
      title={t('tasks.dialogs.create.title')}
      description={t('tasks.dialogs.create.description')}
      icon={FilePlus2}
      submitLabel={t('tasks.dialogs.create.submit')}
      onSubmit={submit}
      onClose={onClose}
    >
      <label className="dialog-field">
        <span>{t('tasks.dialogs.create.task')}</span>
        <input
          name="title"
          type="text"
          required
          maxLength={80}
          placeholder={t('tasks.dialogs.create.taskPlaceholder')}
          autoFocus
        />
      </label>
      <ProjectSelect />
      <fieldset className="dialog-field">
        <legend>{t('tasks.dialogs.create.priority')}</legend>
        <div className="dialog-segmented">
          {priorities.map((priority) => (
            <label key={priority}>
              <input type="radio" name="priority" value={priority} defaultChecked={priority === 'Medium'} />
              <span>{t(priorityLabelKeys[priority])}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="dialog-field">
        <span>{t('tasks.dialogs.create.dueDate')}</span>
        <input name="dueDate" type="date" required min={tasksMockToday} defaultValue={tasksMockToday} />
      </label>
    </ActionDialog>
  )
}

const meetingModes: { value: 'inPerson' | 'online'; label: TranslationKey }[] = [
  { value: 'inPerson', label: 'tasks.dialogs.meeting.inPerson' },
  { value: 'online', label: 'tasks.dialogs.meeting.online' },
]

export function ScheduleMeetingDialog({ onClose, onNotice, onCreate }: DialogProps & { onCreate: (task: NewTask) => void }) {
  const { t, formatDay, formatTime } = useI18n()

  const submit = (data: FormData) => {
    const project = findProject(text(data, 'project'))
    if (!project) return
    const date = text(data, 'date')
    const time = formatTime(text(data, 'time'))
    const mode = meetingModes.find((item) => item.value === text(data, 'mode')) ?? meetingModes[0]
    onCreate({
      title: t('tasks.dialogs.meeting.taskTitle', { time, mode: t(mode.label) }),
      projectCode: project.code,
      projectName: project.name,
      priority: 'Medium',
      dueDate: date,
    })
    onNotice(t('tasks.dialogs.meeting.notice', { code: project.code, date: formatDay(date, tasksMockToday), time }))
    onClose()
  }

  return (
    <ActionDialog
      title={t('tasks.dialogs.meeting.title')}
      description={t('tasks.dialogs.meeting.description')}
      icon={CalendarDays}
      submitLabel={t('tasks.dialogs.meeting.submit')}
      onSubmit={submit}
      onClose={onClose}
    >
      <ProjectSelect />
      <div className="dialog-row">
        <label className="dialog-field">
          <span>{t('tasks.dialogs.meeting.date')}</span>
          <input name="date" type="date" required min={tasksMockToday} defaultValue={tasksMockToday} />
        </label>
        <label className="dialog-field">
          <span>{t('tasks.dialogs.meeting.time')}</span>
          <input name="time" type="time" required defaultValue="10:00" />
        </label>
      </div>
      <fieldset className="dialog-field">
        <legend>{t('tasks.dialogs.meeting.type')}</legend>
        <div className="dialog-segmented">
          {meetingModes.map((mode) => (
            <label key={mode.value}>
              <input type="radio" name="mode" value={mode.value} defaultChecked={mode.value === 'inPerson'} />
              <span>{t(mode.label)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="dialog-field">
        <span>{t('tasks.dialogs.meeting.location')}</span>
        <input name="location" type="text" placeholder={t('tasks.dialogs.meeting.locationPlaceholder')} />
      </label>
      <label className="dialog-field">
        <span>{t('tasks.dialogs.meeting.agenda')}</span>
        <textarea name="agenda" rows={3} placeholder={t('tasks.dialogs.meeting.agendaPlaceholder')} />
      </label>
    </ActionDialog>
  )
}

const feedbackTopics = ['weeklyReport', 'circuit', 'issue', 'finalDraft', 'general'] as const

export function SendFeedbackDialog({ onClose, onNotice }: DialogProps) {
  const { t, tp } = useI18n()
  const [projectCode, setProjectCode] = useState('')
  const project = findProject(projectCode)

  const submit = () => {
    if (!project) return
    onNotice(tp('tasks.dialogs.feedback.notice', project.students.length, { code: project.code }))
    onClose()
  }

  return (
    <ActionDialog
      title={t('tasks.dialogs.feedback.title')}
      description={t('tasks.dialogs.feedback.description')}
      icon={MessageCircle}
      submitLabel={t('tasks.dialogs.feedback.submit')}
      onSubmit={submit}
      onClose={onClose}
    >
      <ProjectSelect value={projectCode} onChange={setProjectCode} />
      {project ? (
        <div className="dialog-recipients">
          <span>{t('tasks.dialogs.feedback.sentTo')}</span>
          <ul>
            {project.students.map((student) => (
              <li key={student.universityId}>
                <i aria-hidden="true">{student.initials}</i>
                {student.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <label className="dialog-field">
        <span>{t('tasks.dialogs.feedback.topic')}</span>
        <select name="topic" defaultValue={feedbackTopics[0]}>
          {feedbackTopics.map((topic) => (
            <option value={topic} key={topic}>
              {t(`tasks.dialogs.feedback.topics.${topic}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="dialog-field">
        <span>{t('tasks.dialogs.feedback.message')}</span>
        <textarea name="message" rows={5} required placeholder={t('tasks.dialogs.feedback.messagePlaceholder')} />
      </label>
    </ActionDialog>
  )
}

export function ReportsDialog({ onClose, onNotice }: DialogProps) {
  const { t, tp, formatDay } = useI18n()
  const [reports, setReports] = useState(weeklyReports)
  const waiting = reports.filter((report) => report.status !== 'Reviewed').length

  const markReviewed = (id: string) => {
    const report = reports.find((item) => item.id === id)
    setReports((current) => current.map((item) => (item.id === id ? { ...item, status: 'Reviewed' } : item)))
    if (report) onNotice(t('tasks.dialogs.reports.notice', { week: report.week, code: report.projectCode }))
  }

  return (
    <ActionDialog
      title={t('tasks.dialogs.reports.title')}
      description={waiting > 0 ? tp('tasks.dialogs.reports.waiting', waiting) : t('tasks.dialogs.reports.allReviewed')}
      icon={ChartColumn}
      onClose={onClose}
    >
      <ul className="dialog-report-list">
        {reports.map((report) => (
          <li key={report.id}>
            <div>
              <strong>{t('tasks.dialogs.reports.item', { code: report.projectCode, week: report.week })}</strong>
              <small>
                {t('tasks.dialogs.reports.submitted', {
                  name: report.projectName,
                  date: formatDay(report.submittedOn, tasksMockToday),
                })}
              </small>
            </div>
            <span className={`tasks-status status-${report.status.toLowerCase().replaceAll(' ', '-')}`}>
              {t(reportStatusLabelKeys[report.status])}
            </span>
            {report.status === 'Reviewed' ? (
              <span className="dialog-report-done" aria-label={t('tasks.dialogs.reports.reviewed')}>
                <Check size={16} strokeWidth={2.6} />
              </span>
            ) : (
              <button className="dialog-secondary-button" type="button" onClick={() => markReviewed(report.id)}>
                {t('tasks.dialogs.reports.markReviewed')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </ActionDialog>
  )
}
