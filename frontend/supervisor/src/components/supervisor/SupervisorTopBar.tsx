import { Bell, CalendarDays, ChevronDown, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/i18nContext'
import { profileInitial, useAccount } from '../../state/supervisor/accountContext'
import { useNotifications } from '../../state/supervisor/notificationsContext'

export function SupervisorTopBar() {
  const { t, tp } = useI18n()
  const { profile } = useAccount()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <div className="header-actions supervisor-topbar" aria-label={t('topbar.aria')}>
      <label className="search-box">
        <Search size={22} aria-hidden="true" />
        <input type="search" placeholder={t('topbar.searchPlaceholder')} />
        <kbd>{t('topbar.shortcut')}</kbd>
      </label>

      <button
        className="icon-button notification-button"
        type="button"
        aria-label={unreadCount > 0 ? tp('topbar.notificationsUnread', unreadCount) : t('topbar.notifications')}
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

      <button className="semester-pill" type="button">
        <CalendarDays size={21} />
        <span>{t('topbar.semester')}</span>
        <ChevronDown size={18} />
      </button>
    </div>
  )
}
