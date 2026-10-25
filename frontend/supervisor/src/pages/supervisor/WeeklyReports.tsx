import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  FileText,
  Layers,
  ListFilter,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { Notice } from '../../components/supervisor/account/Notice'
import { useNotice } from '../../components/supervisor/account/useNotice'
import { WeeklyProgressChart } from '../../components/supervisor/reports/ReportCharts'
import { ReportDetailsModal } from '../../components/supervisor/reports/ReportDetails'
import { ReportsList } from '../../components/supervisor/reports/ReportsList'
import { compareReports, matchesSearch } from '../../components/supervisor/reports/reportHelpers'
import {
  reportTeams,
  reportWeeks,
  weeklyTeamReports,
  type ReportStatus,
  type WeeklyTeamReport,
} from '../../data/supervisor/weeklyReportsMockData'
import { useI18n } from '../../i18n/i18nContext'
import { useLocalState } from '../../state/useLocalState'
import { downloadAttachment } from '../../components/supervisor/mockDownload'

const latestWeek = reportWeeks[reportWeeks.length - 1]
const statuses: ReportStatus[] = ['reviewed', 'pending', 'revision']

const todayIso = () => new Date().toISOString().slice(0, 10)

export function WeeklyReports() {
  const { t, formatDate } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedReport = weeklyTeamReports.find((report) => report.id === searchParams.get('report'))
  const [reports, setReports] = useLocalState('reports.v1', weeklyTeamReports)
  const [project, setProject] = useState('all')
  const [teamId, setTeamId] = useState('all')
  const [weekId, setWeekId] = useState(linkedReport?.weekId ?? latestWeek.id)
  const [status, setStatusFilter] = useState<ReportStatus | 'all'>(() => {
    const requested = searchParams.get('status')
    return statuses.includes(requested as ReportStatus) ? (requested as ReportStatus) : 'all'
  })
  const [query, setQuery] = useState('')
  // The URL identifies the specific team report, including links from Issues & Risks.
  const openId = linkedReport?.id ?? null
  const setOpenId = (id: string | null) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (id) next.set('report', id)
        else next.delete('report')
        return next
      },
      { replace: true },
    )
  }
  const [notice, setNotice] = useNotice()

  const week = reportWeeks.find((item) => item.id === weekId) ?? latestWeek
  const projects = [
    ...new Map(reportTeams.map((team) => [team.projectCode, team.projectName])).entries(),
  ]
  const teamOptions = reportTeams.filter(
    (team) => project === 'all' || team.projectCode === project,
  )
  // Project and team drive the chart; status and search only narrow the list.
  const weekReports = reports.filter(
    (report) =>
      report.weekId === week.id &&
      (project === 'all' || report.team.projectCode === project) &&
      (teamId === 'all' || report.team.id === teamId),
  )
  const visible = weekReports
    .filter(
      (report) => (status === 'all' || report.status === status) && matchesSearch(report, query),
    )
    .sort(compareReports)
  // Looked up in all reports so the modal stays open even if the filters change underneath it.
  const selected = reports.find((report) => report.id === openId) ?? null

  const updateReport = (
    id: string,
    change: (report: WeeklyTeamReport) => Partial<WeeklyTeamReport>,
  ) =>
    setReports((current) =>
      current.map((report) => (report.id === id ? { ...report, ...change(report) } : report)),
    )

  const setReportStatus = (next: ReportStatus) => {
    if (!selected) return
    updateReport(selected.id, () => ({ status: next }))
    setNotice(
      t(next === 'reviewed' ? 'reports.notices.reviewed' : 'reports.notices.revision', {
        name: selected.team.name,
      }),
    )
  }

  const sendFeedback = (text: string) => {
    if (!selected) return
    updateReport(selected.id, (report) => ({
      feedback: [
        ...report.feedback,
        { id: `${report.id}-fb-${report.feedback.length + 1}`, from: 'me', text, date: todayIso() },
      ],
    }))
    setNotice(t('reports.notices.feedback', { name: selected.team.name }))
  }

  return (
    <>
      <SupervisorTopBar />

      <section className="reports-page" aria-labelledby="reports-title">
        <header className="reports-hero">
          <span className="reports-hero-icon" aria-hidden="true">
            <FileText size={30} strokeWidth={1.6} />
          </span>
          <div className="reports-hero-copy">
            <small>{t('reports.eyebrow')}</small>
            <h1 id="reports-title">{t('reports.title')}</h1>
            <p>{t('reports.subtitle')}</p>
          </div>
        </header>

        <div className="reports-filters" role="group" aria-label={t('reports.filters.aria')}>
          <FilterCard icon={Layers} label={t('reports.filters.project')}>
            <select
              value={project}
              onChange={(event) => {
                setProject(event.target.value)
                // A team belongs to one project: changing the project resets the team.
                setTeamId('all')
              }}
            >
              <option value="all">{t('reports.filters.allProjects')}</option>
              {projects.map(([code, name]) => (
                <option value={code} key={code}>
                  {name}
                </option>
              ))}
            </select>
          </FilterCard>
          <FilterCard icon={Users} label={t('reports.filters.team')}>
            <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              <option value="all">{t('reports.filters.allTeams')}</option>
              {teamOptions.map((team) => (
                <option value={team.id} key={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </FilterCard>
          <FilterCard icon={CalendarDays} label={t('reports.filters.week')}>
            <select value={weekId} onChange={(event) => setWeekId(event.target.value)}>
              {[...reportWeeks].reverse().map((item) => (
                <option value={item.id} key={item.id}>
                  {formatDate(item.start)} –{' '}
                  {formatDate(item.end, { month: 'short', day: 'numeric', year: 'numeric' })}
                </option>
              ))}
            </select>
          </FilterCard>
          <FilterCard icon={ListFilter} label={t('reports.filters.status')}>
            <select
              value={status}
              onChange={(event) => setStatusFilter(event.target.value as ReportStatus | 'all')}
            >
              <option value="all">{t('reports.filters.allStatus')}</option>
              {statuses.map((item) => (
                <option value={item} key={item}>
                  {t(`reports.status.${item}`)}
                </option>
              ))}
            </select>
          </FilterCard>
        </div>

        <WeeklyProgressChart week={week} reports={weekReports} />

        <ReportsList
          reports={visible}
          week={week}
          selectedId={openId}
          query={query}
          onQueryChange={setQuery}
          onSelect={setOpenId}
        />
      </section>

      {selected ? (
        <ReportDetailsModal
          key={selected.id}
          report={selected}
          week={reportWeeks.find((item) => item.id === selected.weekId) ?? week}
          onClose={() => setOpenId(null)}
          onOpenFile={(name) =>
            downloadAttachment(
              name,
              `${selected.team.name} · ${selected.team.projectName}\n${selected.summary}`,
            )
          }
          onSendFeedback={sendFeedback}
          onSetStatus={setReportStatus}
        />
      ) : null}

      <Notice message={notice} />
    </>
  )
}

function FilterCard({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <label className="reports-glass reports-filter">
      <span className="reports-filter-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="reports-filter-copy">
        <small>{label}</small>
        {children}
      </span>
      <ChevronDown className="reports-filter-chevron" size={18} aria-hidden="true" />
    </label>
  )
}
