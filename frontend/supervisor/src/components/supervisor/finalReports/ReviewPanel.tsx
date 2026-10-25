import { useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  FileStack,
  FileText,
  GitCommitHorizontal,
  Info,
  MessageSquareText,
  Save,
  Upload,
} from 'lucide-react'
import {
  abetCriteria,
  nextMajorVersion,
  type AbetCriterionId,
  type FinalReportReview,
} from '../../../data/supervisor/finalReportsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { profileInitial } from '../../../state/supervisor/accountContext'
import { fill, type FinalReportsLabels } from './finalReportsLabels'
import { currentSubmission, isCovered, splitDateTime } from './finalReportsHelpers'
import { StatusPill } from './StatusPill'

type ReviewPanelProps = {
  review: FinalReportReview
  labels: FinalReportsLabels
  supervisor: { name: string; photo: string | null }
  onToggleCriterion: (criterion: AbetCriterionId) => void
  onOpenCriterion: (criterion: AbetCriterionId) => void
  onSaveFeedback: (text: string) => void
  onApprove: (text: string) => void
  onRequestRevision: (text: string) => void
  onSimulateResubmission: () => void
}

const ringRadius = 30
const ringLength = 2 * Math.PI * ringRadius

/** Review column: submitted PDF metadata and history, ABET-aligned checklist and the review decision. */
export function ReviewPanel({
  review,
  labels: l,
  supervisor,
  onToggleCriterion,
  onOpenCriterion,
  onSaveFeedback,
  onApprove,
  onRequestRevision,
  onSimulateResubmission,
}: ReviewPanelProps) {
  const { formatDate, formatTime } = useI18n()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const submission = currentSubmission(review)
  const covered = abetCriteria.filter((criterion) => isCovered(review, criterion)).length
  const percent = Math.round((covered / abetCriteria.length) * 100)
  const latest = review.feedback[review.feedback.length - 1]
  const earlier = review.feedback.slice(0, -1).reverse()
  // Only a submitted version awaiting review can be approved or sent back.
  const canDecide = submission.status === 'submitted'
  const trimmed = text.trim()
  const shortDate = (date: string) => formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' })
  const stamp = (value: string | null) => {
    if (!value) return l.notSubmitted
    const [date, time] = splitDateTime(value)
    return `${shortDate(date)}, ${formatTime(time)}`
  }

  const act = (action: (value: string) => void) => {
    action(trimmed)
    setText('')
    setError('')
  }

  return (
    <aside className="fr-side" aria-label={l.reportStatus}>
      <section className="fr-card fr-status-card" aria-labelledby="fr-status-title">
        <div className="fr-card-heading">
          <h2 id="fr-status-title">{l.reportStatus}</h2>
          <StatusPill status={submission.status} labels={l} />
        </div>
        <dl className="fr-meta">
          <div className="is-wide">
            <CalendarDays size={17} strokeWidth={1.7} aria-hidden="true" />
            <dt>{l.submittedOnLabel}</dt>
            <dd>{stamp(submission.submittedAt)}</dd>
          </div>
          <div className="is-wide">
            <FileText size={17} strokeWidth={1.7} aria-hidden="true" />
            <dt>{l.fileName}</dt>
            <dd className="fr-file-name" title={submission.fileName}>
              {submission.fileName}
            </dd>
          </div>
          <div>
            <GitCommitHorizontal size={17} strokeWidth={1.7} aria-hidden="true" />
            <dt>{l.version}</dt>
            <dd>{submission.version}</dd>
          </div>
          <div>
            <FileStack size={17} strokeWidth={1.7} aria-hidden="true" />
            <dt>{l.pdfFile}</dt>
            <dd>{fill(l.pdfValue, { size: submission.fileSizeMb, pages: submission.pageCount })}</dd>
          </div>
        </dl>
        <details className="fr-history">
          <summary>
            {l.versionHistory} ({review.submissions.length})
          </summary>
          <ol>
            {[...review.submissions].reverse().map((item) => (
              <li key={item.version}>
                <strong>{item.version}</strong>
                <StatusPill status={item.status} labels={l} />
                <small>{item.submittedAt ? shortDate(splitDateTime(item.submittedAt)[0]) : l.notSubmitted}</small>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <section className="fr-card fr-abet-card" aria-labelledby="fr-abet-title">
        <div className="fr-card-heading">
          <h2 id="fr-abet-title">{l.abetTitle}</h2>
          <span className="fr-info" tabIndex={0} aria-label={l.abetInfo} data-tip={l.abetInfo}>
            <Info size={16} aria-hidden="true" />
          </span>
        </div>
        <div className="fr-coverage">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle className="fr-ring-track" cx="36" cy="36" r={ringRadius} />
            <circle
              className="fr-ring-value"
              cx="36"
              cy="36"
              r={ringRadius}
              strokeDasharray={`${(percent / 100) * ringLength} ${ringLength}`}
            />
          </svg>
          <strong>{percent}%</strong>
          <span>
            <b>{l.coverage}</b>
            <small>{fill(l.covered, { done: covered, total: abetCriteria.length })}</small>
          </span>
        </div>
        <ul className="fr-criteria">
          {abetCriteria.map((criterion) => {
            const ok = isCovered(review, criterion)
            const name = l.criteria[criterion]
            return (
              <li key={criterion} className={ok ? 'is-covered' : 'is-missing'}>
                <button
                  type="button"
                  className="fr-criterion-check"
                  aria-pressed={ok}
                  aria-label={fill(ok ? l.toggleMissing : l.toggleCovered, { name })}
                  title={fill(ok ? l.toggleMissing : l.toggleCovered, { name })}
                  onClick={() => onToggleCriterion(criterion)}
                >
                  {ok ? <Check size={13} strokeWidth={3} /> : <CircleAlert size={14} />}
                </button>
                <button
                  type="button"
                  className="fr-criterion-link"
                  aria-label={fill(l.goTo, { name })}
                  onClick={() => onOpenCriterion(criterion)}
                >
                  <span>
                    {name}
                    {ok ? null : <small>{l.missingDetails}</small>}
                  </span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="fr-card fr-feedback-card" aria-labelledby="fr-feedback-title">
        <h2 id="fr-feedback-title">{l.feedbackTitle}</h2>
        <div className="fr-feedback-author">
          <span className="avatar fr-avatar">
            {supervisor.photo ? <img src={supervisor.photo} alt="" /> : <span aria-hidden="true">{profileInitial(supervisor.name)}</span>}
          </span>
          <span>
            <strong>{supervisor.name}</strong>
            <small>
              {latest
                ? `${shortDate(latest.date)} · ${latest.version} · ${l.feedbackKinds[latest.kind]}`
                : l.noFeedback}
            </small>
          </span>
        </div>
        {latest ? <blockquote className={`fr-feedback-latest is-${latest.kind}`}>{latest.text}</blockquote> : null}
        {earlier.length ? (
          <details className="fr-feedback-history">
            <summary>
              {l.earlierFeedback} ({earlier.length})
            </summary>
            <ul>
              {earlier.map((item) => (
                <li key={item.id}>
                  <small>
                    {formatDate(item.date, { month: 'short', day: 'numeric' })} · {item.version} · {l.feedbackKinds[item.kind]}
                  </small>{' '}
                  {item.text}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="fr-feedback-compose">
          <textarea
            value={text}
            rows={3}
            maxLength={1000}
            aria-label={l.feedbackLabel}
            placeholder={l.feedbackPlaceholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'fr-feedback-error' : undefined}
            onChange={(event) => {
              setText(event.target.value)
              setError('')
            }}
          />
          <button
            type="button"
            className="fr-tool"
            aria-label={l.saveFeedback}
            title={l.saveFeedback}
            disabled={!trimmed}
            onClick={() => act(onSaveFeedback)}
          >
            <Save size={16} />
          </button>
        </div>
        {error ? (
          <p className="fr-feedback-error" id="fr-feedback-error" role="alert">
            {error}
          </p>
        ) : null}
        {submission.status === 'draft' ? <p className="fr-feedback-hint">{l.lockedDraft}</p> : null}
        {submission.status === 'revision' ? (
          <div className="fr-review-note is-revision">
            <p>
              {fill(l.revisionPending, { version: submission.version, next: nextMajorVersion(submission.version) })}
            </p>
            <button type="button" className="fr-simulate" title={l.simulateHint} onClick={onSimulateResubmission}>
              <Upload size={14} aria-hidden="true" />
              {fill(l.simulateResubmission, { next: nextMajorVersion(submission.version) })}
            </button>
          </div>
        ) : null}
        {submission.status === 'approved' ? (
          <p className="fr-review-note is-approved">
            {fill(l.approvedNote, {
              version: submission.version,
              date: submission.reviewedAt ? shortDate(submission.reviewedAt) : '',
            })}
          </p>
        ) : null}
        <div className="fr-decision">
          <button type="button" className="fr-primary-button" disabled={!canDecide} onClick={() => act(onApprove)}>
            <Check size={16} aria-hidden="true" />
            {l.approve}
          </button>
          <button
            type="button"
            className="fr-ghost-button"
            disabled={!canDecide}
            onClick={() => {
              if (!trimmed) {
                setError(l.feedbackRequired)
                return
              }
              act(onRequestRevision)
            }}
          >
            <MessageSquareText size={16} aria-hidden="true" />
            {l.requestRevision}
          </button>
        </div>
      </section>
    </aside>
  )
}
