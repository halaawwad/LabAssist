import { Link } from 'react-router-dom'
import type { WeeklyTeamReport } from '../../../data/supervisor/weeklyReportsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { issuesLabels } from '../../../pages/supervisor/issuesLabels'
import { confirmReportIssue, useIssues } from '../../../state/supervisor/issuesStore'
import './detectedIssues.css'

export function DetectedIssues({ report }: { report: WeeklyTeamReport }) {
  const { language } = useI18n()
  const l = issuesLabels[language]
  const [issues] = useIssues()
  return (
    <section className="report-detected-issues" aria-labelledby="report-detected-title">
      <h3 id="report-detected-title">{l.detectedIssues}</h3>
      {report.detectedIssues.length ? (
        <ul className="report-sheet-list">
          {report.detectedIssues.map((detected) => {
            const confirmed = issues.find(
              (issue) =>
                issue.source.kind === 'weekly-report' &&
                issue.source.reportId === report.id &&
                issue.source.detectedIssueId === detected.id,
            )
            return (
              <li key={detected.id}>
                <strong>{detected.title}</strong>
                <small>
                  {l.type}: {l[detected.type]} · {l.suggestedPriority}:{' '}
                  {l[detected.suggestedPriority]}
                </small>
                <p>{detected.reason}</p>
                <button
                  className="reports-secondary-button"
                  type="button"
                  disabled={!!confirmed}
                  onClick={() => confirmReportIssue(report, detected.id)}
                >
                  {confirmed ? l.confirmed : l.confirmIssue}
                </button>
                {confirmed && <Link to="/supervisor/issues">{l.viewIssue}</Link>}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="report-sheet-note">{l.noDetectedIssues}</p>
      )}
    </section>
  )
}
