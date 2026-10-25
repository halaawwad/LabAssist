import { NavLink } from 'react-router-dom'
import { footerNav, logoutNav, mainNav, type NavItem } from '../data/navigation'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'
import { LeafLogo } from './LeafLogo'

export function Sidebar() {
  const { t, tp } = useI18n()
  const { unreadCount } = useWorkshop()
  const { openDialog } = useDialogs()

  const renderItem = (item: NavItem) => {
    const label = t(`nav.${item.id}`)
    const icon = (
      <span className="nav-icon">
        <item.icon size={22} strokeWidth={1.7} />
        {item.id === 'notifications' && unreadCount > 0 ? <i className="nav-badge" aria-hidden="true" /> : null}
      </span>
    )

    if (!item.route) {
      return (
        <button className="nav-item" key={item.id} type="button" aria-haspopup="dialog" onClick={() => openDialog({ type: 'logout' })}>
          {icon}
          <span>{label}</span>
        </button>
      )
    }

    return (
      <NavLink
        key={item.id}
        to={item.route}
        className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
        aria-label={item.id === 'notifications' && unreadCount > 0 ? `${label}, ${tp('nav.unread', unreadCount)}` : undefined}
      >
        {icon}
        <span>{label}</span>
      </NavLink>
    )
  }

  return (
    <aside className="sidebar" aria-label={t('nav.aria')}>
      <div className="brand">
        <LeafLogo />
        <div>
          <strong>{t('app.brand')}</strong>
          <span>{t('app.portal')}</span>
        </div>
      </div>

      <nav className="nav-group">{mainNav.map(renderItem)}</nav>
      <nav className="nav-group nav-group-footer">{footerNav.map(renderItem)}</nav>
      <nav className="nav-group nav-group-logout">{renderItem(logoutNav)}</nav>
    </aside>
  )
}
