import { useEffect, useState, type ReactNode } from 'react'
import { Box } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogoutDialog } from '../../components/supervisor/account/LogoutDialog'
import { sidebarItems, type SidebarItem } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'
import { useNotifications } from '../../state/supervisor/notificationsContext'

type SupervisorLayoutProps = {
  children?: ReactNode
}

const primaryItems = sidebarItems.filter((item) => !item.footer)
const footerItems = sidebarItems.filter((item) => item.footer)

/** How long a section reached from a notification stays highlighted. */
const targetHighlightMs = 1800

export function SupervisorLayout({ children }: SupervisorLayoutProps) {
  const location = useLocation()
  const { t, tp } = useI18n()
  const { unreadCount } = useNotifications()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const routeClass = {
    '/supervisor/projects': 'is-projects-route',
    '/supervisor/students': 'is-students-route',
    '/supervisor/progress': 'is-progress-route',
    '/supervisor/tasks': 'is-tasks-route',
    '/supervisor/issues': 'is-issues-route',
    '/supervisor/reports': 'is-account-route',
    '/supervisor/meetings': 'is-account-route',
    '/supervisor/messages': 'is-account-route',
    '/supervisor/final-reports': 'is-account-route',
    '/supervisor/notifications': 'is-account-route',
    '/supervisor/profile': 'is-account-route',
    '/supervisor/settings': 'is-account-route',
  }[location.pathname] ?? ''

  // Links such as notifications point at a section (#id): scroll it into view and flash it briefly.
  useEffect(() => {
    if (!location.hash) return
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (!target) return
    const section = target.closest('section') ?? target
    section.scrollIntoView({ behavior: 'smooth', block: 'center' })
    section.classList.add('is-linked-target')
    const timer = window.setTimeout(() => section.classList.remove('is-linked-target'), targetHighlightMs)
    return () => {
      window.clearTimeout(timer)
      section.classList.remove('is-linked-target')
    }
  }, [location])

  const renderItem = (item: SidebarItem) => {
    const label = t(`nav.${item.id}`)
    const showBadge = item.id === 'notifications' && unreadCount > 0
    const icon = showBadge ? (
      <span className="nav-icon-with-badge">
        <item.icon size={21} />
        <small aria-hidden="true">{unreadCount}</small>
      </span>
    ) : (
      <item.icon size={21} />
    )

    if (item.route) {
      return (
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
          key={item.id}
          to={item.route}
          aria-label={showBadge ? tp('topbar.notificationsUnread', unreadCount) : undefined}
        >
          {icon}
          <span>{label}</span>
        </NavLink>
      )
    }

    return (
      <button
        className="nav-item"
        key={item.id}
        type="button"
        aria-haspopup={item.id === 'logout' ? 'dialog' : undefined}
        onClick={item.id === 'logout' ? () => setConfirmLogout(true) : undefined}
      >
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div className={`supervisor-shell ${routeClass}`}>
      <aside className="supervisor-sidebar" aria-label={t('nav.aria')}>
        <div className="brand-mark">
          <div className="brand-icon" aria-hidden="true">
            <Box size={32} strokeWidth={1.8} />
          </div>
          <div>
            <strong>{t('app.brand')}</strong>
            <span>{t('app.portal')}</span>
          </div>
        </div>

        <nav className="sidebar-nav">{primaryItems.map(renderItem)}</nav>

        <nav className="sidebar-nav sidebar-nav-bottom">{footerItems.map(renderItem)}</nav>
      </aside>

      <main className="dashboard-canvas">{children ?? <Outlet />}</main>

      {confirmLogout ? <LogoutDialog onClose={() => setConfirmLogout(false)} /> : null}
    </div>
  )
}
