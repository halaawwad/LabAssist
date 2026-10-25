import { Bell, CalendarDays, ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/i18nContext'
import { profileInitial, useAccount } from '../../state/supervisor/accountContext'
import { useNotifications } from '../../state/supervisor/notificationsContext'
import { ActionDialog } from './tasks/ActionDialog'
import { interactionLabels } from './interactionLabels'
import { supervisedProjects } from '../../data/supervisor/projectsMockData'
import { supervisedStudents } from '../../data/supervisor/studentsMockData'
import { progressProjects } from '../../data/supervisor/progressMockData'
import { weeklyTeamReports, reportWeeks } from '../../data/supervisor/weeklyReportsMockData'
import { readStored } from '../../state/storage'
import { useIssues } from '../../state/supervisor/issuesStore'
import './interactions.css'

export function SupervisorTopBar() {
  const { t, tp, language } = useI18n()
  const l = interactionLabels[language]
  const { profile } = useAccount()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<'search' | 'semester' | null>(null)
  const [issues] = useIssues()
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        // Do not steal focus from an already open page dialog.
        if (document.querySelector('dialog[open]') && open !== 'search') return
        event.preventDefault()
        setOpen('search')
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [open])
  const targets = [
    ...(
      [
        'dashboard',
        'projects',
        'students',
        'progress',
        'tasks',
        'issues',
        'reports',
        'meetings',
        'messages',
        'notifications',
        'profile',
        'settings',
      ] as const
    ).map((id) => ({ label: t(`nav.${id}`), route: `/supervisor/${id}` })),
    ...readStored('projects.v1', supervisedProjects).map((p) => ({
      label: `${p.name} · ${p.code} · ${p.team ?? ''}`,
      route: `/supervisor/projects?project=${encodeURIComponent(p.code)}`,
    })),
    ...readStored('students.v1', supervisedStudents).map((s) => ({
      label: `${s.name} · ${s.universityId} · ${s.project}`,
      route: `/supervisor/students?student=${s.universityId}`,
    })),
    ...progressProjects.map((p) => ({
      label: `${p.code} · ${p.name}`,
      route: `/supervisor/progress?project=${p.code}`,
    })),
    ...weeklyTeamReports.map((r) => ({
      label: `${t('nav.reports')} · ${r.team.name} · ${r.team.projectName} · Week ${reportWeeks.find((w) => w.id === r.weekId)?.number}`,
      route: `/supervisor/reports?report=${r.id}`,
    })),
    ...issues.map((i) => ({
      label: `${t('nav.issues')} · ${i.title}`,
      route: `/supervisor/issues?issue=${encodeURIComponent(i.id)}`,
    })),
  ]
  const results = targets
    .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 40)

  return (
    <>
      <div className="header-actions supervisor-topbar" aria-label={t('topbar.aria')}>
        <label className="search-box">
          <Search size={22} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder={t('topbar.searchPlaceholder')}
            title={l.searchHint}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                setOpen('search')
              }
            }}
          />
          <kbd>{t('topbar.shortcut')}</kbd>
        </label>

        <button
          className="icon-button notification-button"
          type="button"
          aria-label={
            unreadCount > 0
              ? tp('topbar.notificationsUnread', unreadCount)
              : t('topbar.notifications')
          }
          onClick={() => navigate('/supervisor/notifications')}
        >
          <Bell size={23} />
          {unreadCount > 0 ? <span aria-hidden="true" /> : null}
        </button>

        <button
          className="profile-pill"
          type="button"
          aria-label={t('topbar.openProfile')}
          onClick={() => navigate('/supervisor/profile')}
        >
          <span className="avatar">
            {profile.photo ? <img src={profile.photo} alt="" /> : profileInitial(profile.name)}
          </span>
          <ChevronDown size={19} />
        </button>

        <button
          className="semester-pill"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen('semester')}
        >
          <CalendarDays size={21} />
          <span>{t('topbar.semester')}</span>
          <ChevronDown size={18} />
        </button>
      </div>
      {open === 'search' && (
        <ActionDialog
          title={l.search}
          description={l.searchHint}
          icon={Search}
          onClose={() => {
            setOpen(null)
            searchRef.current?.focus()
          }}
        >
          <label className="dialog-field">
            <span>{l.search}</span>
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul className="supervisor-search-results">
            {results.map((item) => (
              <li key={item.route}>
                <button
                  className="dialog-secondary-button"
                  type="button"
                  onClick={() => {
                    setOpen(null)
                    navigate(item.route)
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          {!results.length && <p role="status">{l.empty}</p>}
        </ActionDialog>
      )}
      {open === 'semester' && (
        <ActionDialog
          title={l.semester}
          description={l.semesterInfo}
          icon={CalendarDays}
          onClose={() => setOpen(null)}
        >
          <button
            className="dialog-primary-button"
            type="button"
            onClick={() => {
              setOpen(null)
              navigate('/supervisor/reports')
            }}
          >
            {l.reports}
          </button>
        </ActionDialog>
      )}
    </>
  )
}
