import { ChevronRight, FileSearch, Search } from 'lucide-react'
import type { ReportWeek, WeeklyTeamReport } from '../../../data/supervisor/weeklyReportsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { avatarTone } from './reportHelpers'

type ReportsListProps = {
  reports: WeeklyTeamReport[]
  week: ReportWeek
  selectedId: string | null
  query: string
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
}

export function ReportsList({ reports, week, selectedId, query, onQueryChange, onSelect }: ReportsListProps) {
  const { t, tp, formatDate } = useI18n()
  const weekLabel = `${formatDate(week.start)} – ${formatDate(week.end)}`

  return (
    <section className="reports-glass reports-list-panel" aria-labelledby="reports-list-title">
      <header className="reports-list-header">
        <h2 id="reports-list-title">{t('reports.list.title')}</h2>
        <label className="reports-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder={t('reports.list.searchPlaceholder')}
            aria-label={t('reports.list.searchPlaceholder')}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </header>

      <div className="reports-table-head" aria-hidden="true">
        <span>{t('reports.list.team')}</span>
        <span>{t('reports.list.project')}</span>
        <span>{t('reports.list.week')}</span>
        <span>{t('reports.list.progress')}</span>
        <span>{t('reports.list.status')}</span>
      </div>

      <ul className="reports-rows">
        {reports.map((report) => {
          const { team } = report
          return (
            <li key={report.id}>
              <button
                className={`reports-row ${report.id === selectedId ? 'is-selected' : ''}`}
                type="button"
                aria-haspopup="dialog"
                aria-label={t('reports.list.rowAria', {
                  name: team.name,
                  project: team.projectName,
                  progress: report.progress,
                  status: t(`reports.status.${report.status}`),
                })}
                onClick={() => onSelect(report.id)}
              >
                <span className="reports-row-student">
                  <span className={`student-initials reports-avatar tone-${avatarTone(team.id)}`} aria-hidden="true">
                    {team.initials}
                  </span>
                  <span className="reports-row-team">
                    <strong>{team.name}</strong>
                    <small>{tp('reports.list.members', team.members.length)}</small>
                  </span>
                </span>
                <span className="reports-row-project">
                  {team.projectCode} · {team.projectName}
                </span>
                <span className="reports-row-week">{weekLabel}</span>
                <span className="reports-row-progress">
                  <span className="reports-bar">
                    <i style={{ width: `${report.progress}%` }} />
                  </span>
                  <b>{report.progress}%</b>
                </span>
                <span className={`reports-status is-${report.status}`}>{t(`reports.status.${report.status}`)}</span>
                <ChevronRight className="reports-row-arrow" size={19} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      {reports.length === 0 ? (
        <div className="reports-empty">
          <FileSearch size={30} strokeWidth={1.5} aria-hidden="true" />
          <p>{t('reports.list.empty')}</p>
        </div>
      ) : null}
    </section>
  )
}
