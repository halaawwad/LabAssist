import { Link } from 'react-router-dom'
import type { Issue } from '../../../data/supervisor/issuesMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { issuesLabels } from '../../../pages/supervisor/issuesLabels'

export function IssueSourceDetails({ issue }: { issue: Issue }) {
  const { language } = useI18n()
  const l = issuesLabels[language]
  const source = issue.source
  return (
    <span className="issue-source">
      {l.source}:{' '}
      {source.kind === 'manual' ? (
        l.manual
      ) : (
        <Link to={`/supervisor/reports?report=${encodeURIComponent(source.reportId)}`}>
          {l.weeklyReport} · {l.week} {source.weekNumber}
        </Link>
      )}
    </span>
  )
}
