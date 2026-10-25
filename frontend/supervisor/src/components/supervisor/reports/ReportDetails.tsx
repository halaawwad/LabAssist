import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Flag,
  RotateCcw,
  Send,
  X,
} from 'lucide-react'
import { progressProjects, projectMilestones } from '../../../data/supervisor/progressMockData'
import type { ReportWeek, WeeklyTeamReport } from '../../../data/supervisor/weeklyReportsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { ProgressRing } from './ReportCharts'
import { avatarTone } from './reportHelpers'
import { DetectedIssues } from './DetectedIssues'

type ReportDetailsModalProps = {
  report: WeeklyTeamReport
  week: ReportWeek
  onClose: () => void
  onOpenFile: (name: string) => void
  onSendFeedback: (text: string) => void
  onSetStatus: (status: WeeklyTeamReport['status']) => void
}

/** A report shown as a ruled paper sheet in a modal. Closes with Esc, the X button or a click outside. */
export function ReportDetailsModal({
  report,
  week,
  onClose,
  onOpenFile,
  onSendFeedback,
  onSetStatus,
}: ReportDetailsModalProps) {
  const { t, tp, formatDate } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState('')
  const { team } = report
  const project = progressProjects.find((item) => item.code === team.projectCode)
  // Milestones before the project's current stage are complete.
  const milestonesDone = project?.milestoneStage ?? 0
  const blockers = project?.issues ?? []

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSendFeedback(text)
    setDraft('')
  }

  return (
    <dialog
      className="report-sheet"
      ref={dialogRef}
      aria-labelledby="report-sheet-name"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <article className="report-sheet-paper">
        <button
          className="report-sheet-close"
          type="button"
          aria-label={t('reports.details.close')}
          title={t('reports.details.close')}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <header className="report-sheet-header">
          <span
            className={`student-initials report-sheet-avatar tone-${avatarTone(team.id)}`}
            aria-hidden="true"
          >
            {team.initials}
          </span>
          <div>
            <small>
              {t('reports.details.weekLabel', {
                week: week.number,
                range: `${formatDate(week.start)} – ${formatDate(week.end, { month: 'short', day: 'numeric', year: 'numeric' })}`,
              })}
            </small>
            <h2 id="report-sheet-name">{team.name}</h2>
            <p>
              {team.projectCode} · {team.projectName}
            </p>
            <ul
              className="report-sheet-members"
              aria-label={tp('reports.list.members', team.members.length)}
            >
              {team.members.map((member) => (
                <li key={member.universityId}>
                  <span
                    className={`student-initials tone-${avatarTone(member.universityId)}`}
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  {member.name}
                </li>
              ))}
            </ul>
          </div>
          <span className={`report-sheet-stamp is-${report.status}`}>
            {t(`reports.status.${report.status}`)}
          </span>
        </header>

        <section className="report-sheet-figures" aria-label={t('reports.details.figuresAria')}>
          <ProgressRing
            value={report.progress}
            label={t('reports.details.projectProgress')}
            size="md"
          />
          <dl>
            <div>
              <dt>
                <CircleCheck className="is-good" size={18} aria-hidden="true" />
                {t('reports.details.tasksCompleted')}
              </dt>
              <dd>
                {report.tasksDone}
                <small>/{report.tasksTotal}</small>
              </dd>
            </div>
            <div>
              <dt>
                <Flag className="is-warn" size={18} aria-hidden="true" />
                {t('reports.details.milestonesCompleted')}
              </dt>
              <dd>
                {milestonesDone}
                <small>/{projectMilestones.length}</small>
              </dd>
            </div>
            <div>
              <dt>
                <CircleAlert className="is-risk" size={18} aria-hidden="true" />
                {t('reports.details.issuesOpen')}
              </dt>
              <dd>{report.issuesOpen}</dd>
            </div>
          </dl>
        </section>

        <div className="report-sheet-body">
          <section>
            <h3>{t('reports.details.summary')}</h3>
            <p>{report.summary}</p>
            <small className="report-sheet-note">
              {t('reports.details.submitted', {
                date: formatDate(report.submittedOn, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                }),
              })}
            </small>
          </section>

          <section>
            <h3>{t('reports.details.nextSteps')}</h3>
            <ul className="report-sheet-list">
              {report.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>{t('reports.details.blockers')}</h3>
            {blockers.length > 0 ? (
              <ul className="report-sheet-list is-blockers">
                {blockers.map((issue) => (
                  <li key={issue.title}>
                    <strong>{issue.title}</strong>
                    <span>{issue.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="report-sheet-note">{t('reports.details.noBlockers')}</p>
            )}
          </section>

          <DetectedIssues report={report} />

          {report.files.length > 0 ? (
            <section>
              <h3>{t('reports.details.files')}</h3>
              <ul className="report-sheet-files">
                {report.files.map((file) => (
                  <li key={file.name}>
                    <button
                      type="button"
                      aria-label={t('reports.details.download', { name: file.name })}
                      onClick={() => onOpenFile(file.name)}
                    >
                      <FileText size={18} aria-hidden="true" />
                      <span>
                        <strong>{file.name}</strong>
                        <small>{file.size}</small>
                      </span>
                      <Download size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <section className="report-sheet-feedback">
          <h3>{t('reports.details.feedback')}</h3>
          {report.feedback.length > 0 ? (
            <ul>
              {report.feedback.map((item) => (
                <li key={item.id}>
                  <p>“{item.text}”</p>
                  <small>
                    — {item.from === 'me' ? t('reports.details.you') : item.from} ·{' '}
                    {formatDate(item.date)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="report-sheet-note">{t('reports.details.noFeedback')}</p>
          )}
          <form onSubmit={submitFeedback}>
            <textarea
              rows={2}
              value={draft}
              maxLength={600}
              placeholder={t('reports.details.feedbackPlaceholder')}
              aria-label={t('reports.details.feedbackPlaceholder')}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              className="reports-primary-button is-small"
              type="submit"
              disabled={!draft.trim()}
            >
              <Send size={16} aria-hidden="true" />
              {t('reports.details.sendFeedback')}
            </button>
          </form>
        </section>

        <footer className="report-sheet-actions">
          <button
            className="reports-primary-button"
            type="button"
            disabled={report.status === 'reviewed'}
            onClick={() => onSetStatus('reviewed')}
          >
            <CircleCheck size={18} aria-hidden="true" />
            {report.status === 'reviewed'
              ? t('reports.details.alreadyReviewed')
              : t('reports.details.markReviewed')}
          </button>
          <button
            className="reports-secondary-button"
            type="button"
            disabled={report.status === 'revision'}
            title={report.status === 'revision' ? t('reports.status.revision') : undefined}
            onClick={() => onSetStatus('revision')}
          >
            <RotateCcw size={17} aria-hidden="true" />
            {t('reports.details.requestRevision')}
          </button>
        </footer>
      </article>
    </dialog>
  )
}
