import { useState } from 'react'
import { CalendarDays, ChartColumn, Check, FilePlus2, MessageCircle } from 'lucide-react'
import {
  tasksMockToday,
  weeklyReports,
  type SupervisorTask,
  type TaskPriority,
} from '../../../data/supervisor/tasksMockData'
import { ActionDialog, ProjectSelect } from './ActionDialog'
import { findProject, formatDueDate } from './taskHelpers'

export type NewTask = Omit<SupervisorTask, 'id' | 'status'>

type DialogProps = {
  onClose: () => void
  onNotice: (message: string) => void
}

const priorities: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low']

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

export function CreateTaskDialog({ onClose, onNotice, onCreate }: DialogProps & { onCreate: (task: NewTask) => void }) {
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
    onNotice(`Task added for ${project.code}.`)
    onClose()
  }

  return (
    <ActionDialog
      title="Create Task"
      description="Add a supervision task to your task list."
      icon={FilePlus2}
      submitLabel="Create Task"
      onSubmit={submit}
      onClose={onClose}
    >
      <label className="dialog-field">
        <span>Task</span>
        <input name="title" type="text" required maxLength={80} placeholder="e.g. Review weekly report" autoFocus />
      </label>
      <ProjectSelect />
      <fieldset className="dialog-field">
        <legend>Priority</legend>
        <div className="dialog-segmented">
          {priorities.map((priority) => (
            <label key={priority}>
              <input type="radio" name="priority" value={priority} defaultChecked={priority === 'Medium'} />
              <span>{priority}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="dialog-field">
        <span>Due date</span>
        <input name="dueDate" type="date" required min={tasksMockToday} defaultValue={tasksMockToday} />
      </label>
    </ActionDialog>
  )
}

export function ScheduleMeetingDialog({ onClose, onNotice, onCreate }: DialogProps & { onCreate: (task: NewTask) => void }) {
  const submit = (data: FormData) => {
    const project = findProject(text(data, 'project'))
    if (!project) return
    const date = text(data, 'date')
    const time = text(data, 'time')
    const mode = text(data, 'mode')
    onCreate({
      title: `Supervision meeting · ${time}, ${mode}`,
      projectCode: project.code,
      projectName: project.name,
      priority: 'Medium',
      dueDate: date,
    })
    onNotice(`Meeting with the ${project.code} team scheduled for ${formatDueDate(date, tasksMockToday)} at ${time}.`)
    onClose()
  }

  return (
    <ActionDialog
      title="Schedule Meeting"
      description="Book a supervision meeting with a project team."
      icon={CalendarDays}
      submitLabel="Schedule Meeting"
      onSubmit={submit}
      onClose={onClose}
    >
      <ProjectSelect />
      <div className="dialog-row">
        <label className="dialog-field">
          <span>Date</span>
          <input name="date" type="date" required min={tasksMockToday} defaultValue={tasksMockToday} />
        </label>
        <label className="dialog-field">
          <span>Time</span>
          <input name="time" type="time" required defaultValue="10:00" />
        </label>
      </div>
      <fieldset className="dialog-field">
        <legend>Meeting type</legend>
        <div className="dialog-segmented">
          {['In person', 'Online'].map((mode) => (
            <label key={mode}>
              <input type="radio" name="mode" value={mode} defaultChecked={mode === 'In person'} />
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="dialog-field">
        <span>Location or link</span>
        <input name="location" type="text" placeholder="e.g. Room A-105 or Teams link" />
      </label>
      <label className="dialog-field">
        <span>Agenda</span>
        <textarea name="agenda" rows={3} placeholder="What do you want to discuss?" />
      </label>
    </ActionDialog>
  )
}

const feedbackTopics = ['Weekly report', '3D circuit version', 'Reported issue', 'Final report draft', 'General progress']

export function SendFeedbackDialog({ onClose, onNotice }: DialogProps) {
  const [projectCode, setProjectCode] = useState('')
  const project = findProject(projectCode)

  const submit = () => {
    if (!project) return
    const count = project.students.length
    onNotice(`Feedback sent to the ${project.code} team (${count} ${count === 1 ? 'student' : 'students'}).`)
    onClose()
  }

  return (
    <ActionDialog
      title="Send Feedback"
      description="Share feedback with a project team."
      icon={MessageCircle}
      submitLabel="Send Feedback"
      onSubmit={submit}
      onClose={onClose}
    >
      <ProjectSelect value={projectCode} onChange={setProjectCode} />
      {project ? (
        <div className="dialog-recipients">
          <span>Sent to</span>
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
        <span>Topic</span>
        <select name="topic" defaultValue={feedbackTopics[0]}>
          {feedbackTopics.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
      </label>
      <label className="dialog-field">
        <span>Feedback</span>
        <textarea name="message" rows={5} required placeholder="Write your feedback for the team..." />
      </label>
    </ActionDialog>
  )
}

export function ReportsDialog({ onClose, onNotice }: DialogProps) {
  const [reports, setReports] = useState(weeklyReports)
  const waiting = reports.filter((report) => report.status !== 'Reviewed').length

  const markReviewed = (id: string) => {
    const report = reports.find((item) => item.id === id)
    setReports((current) => current.map((item) => (item.id === id ? { ...item, status: 'Reviewed' } : item)))
    if (report) onNotice(`Week ${report.week} report of ${report.projectCode} marked as reviewed.`)
  }

  return (
    <ActionDialog
      title="Weekly Reports"
      description={waiting > 0 ? `${waiting} reports need your review.` : 'All weekly reports are reviewed.'}
      icon={ChartColumn}
      onClose={onClose}
    >
      <ul className="dialog-report-list">
        {reports.map((report) => (
          <li key={report.id}>
            <div>
              <strong>
                {report.projectCode} · Week {report.week}
              </strong>
              <small>
                {report.projectName} · Submitted {formatDueDate(report.submittedOn, tasksMockToday)}
              </small>
            </div>
            <span className={`tasks-status status-${report.status.toLowerCase().replaceAll(' ', '-')}`}>
              {report.status}
            </span>
            {report.status === 'Reviewed' ? (
              <span className="dialog-report-done" aria-label="Reviewed">
                <Check size={16} strokeWidth={2.6} />
              </span>
            ) : (
              <button className="dialog-secondary-button" type="button" onClick={() => markReviewed(report.id)}>
                Mark Reviewed
              </button>
            )}
          </li>
        ))}
      </ul>
    </ActionDialog>
  )
}
