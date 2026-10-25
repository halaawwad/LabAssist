import { useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckCheck,
  FileText,
  Mail,
  Megaphone,
  TriangleAlert,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import {
  notificationTypes,
  type NotificationType,
} from '../../data/supervisor/notificationsMockData'
import { useI18n } from '../../i18n/i18nContext'
import {
  useNotifications,
  type NotificationItem,
} from '../../state/supervisor/notificationsContext'

type ReadFilter = 'all' | 'unread'

const typeIcons: Record<NotificationType, LucideIcon> = {
  meeting: CalendarDays,
  report: FileText,
  attendance: UserX,
  issue: TriangleAlert,
  workshop: Megaphone,
}

export function Notifications() {
  const { t, tp } = useI18n()
  const { notifications, unreadCount, mutedTypes, setRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [typeFilter, setTypeFilter] = useState<NotificationType | null>(null)

  const visibleTypes = notificationTypes.filter((type) => !mutedTypes.includes(type))
  const visible = notifications.filter(
    (item) =>
      (readFilter === 'all' || !item.read) && (typeFilter === null || item.type === typeFilter),
  )

  const open = (item: NotificationItem) => {
    setRead(item.id, true)
    navigate(item.target)
  }

  return (
    <>
      <SupervisorTopBar />

      <section className="account-page notifications-page" aria-labelledby="notifications-title">
        <header className="account-heading">
          <div>
            <h1 id="notifications-title">{t('notifications.title')}</h1>
            <p>{t('notifications.subtitle')}</p>
          </div>
          <button
            className="dialog-secondary-button account-heading-action"
            type="button"
            disabled={unreadCount === 0}
            title={unreadCount === 0 ? t('notifications.allCaughtUp') : undefined}
            onClick={markAllRead}
          >
            <CheckCheck size={18} aria-hidden="true" />
            {t('notifications.markAllRead')}
          </button>
        </header>

        <div className="notifications-toolbar">
          <div className="tasks-filters" role="group" aria-label={t('notifications.filterAria')}>
            <button
              type="button"
              aria-pressed={readFilter === 'all'}
              onClick={() => setReadFilter('all')}
            >
              {t('notifications.filters.all')}
            </button>
            <button
              type="button"
              aria-pressed={readFilter === 'unread'}
              onClick={() => setReadFilter('unread')}
            >
              {t('notifications.filters.unread')}
              {unreadCount > 0 ? (
                <span className="notifications-filter-count">{unreadCount}</span>
              ) : null}
            </button>
          </div>

          <div
            className="tasks-filters notifications-type-filters"
            role="group"
            aria-label={t('notifications.filterAria')}
          >
            {visibleTypes.map((type) => {
              const Icon = typeIcons[type]
              const isActive = typeFilter === type
              return (
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setTypeFilter(isActive ? null : type)}
                  key={type}
                >
                  <Icon size={15} aria-hidden="true" />
                  {t(`notifications.types.${type}`)}
                </button>
              )
            })}
          </div>
        </div>

        <section
          className="glass-panel notifications-panel"
          aria-label={t('notifications.listAria')}
        >
          <p className="notifications-summary" role="status">
            {unreadCount > 0
              ? tp('notifications.unreadCount', unreadCount)
              : t('notifications.allCaughtUp')}
          </p>

          <ul className="notification-list">
            {visible.map((item) => (
              <NotificationRow
                item={item}
                onOpen={open}
                onToggleRead={() => setRead(item.id, !item.read)}
                key={item.id}
              />
            ))}
            {visible.length === 0 ? (
              <li className="tasks-empty">{t('notifications.empty')}</li>
            ) : null}
          </ul>

          {mutedTypes.length > 0 ? (
            <p className="notifications-muted">
              {tp('notifications.mutedHint', mutedTypes.length)}{' '}
              <Link to="/supervisor/settings#notification-preferences-title">
                {t('notifications.manage')}
              </Link>
            </p>
          ) : null}
        </section>
      </section>
    </>
  )
}

type NotificationRowProps = {
  item: NotificationItem
  onOpen: (item: NotificationItem) => void
  onToggleRead: () => void
}

function NotificationRow({ item, onOpen, onToggleRead }: NotificationRowProps) {
  const { t, formatDate, formatTime, formatRelative } = useI18n()
  const Icon = typeIcons[item.type]

  // Dates and times in the template values follow the current language.
  const params = { ...item.params }
  if (typeof params.date === 'string') params.date = formatDate(params.date)
  if (typeof params.time === 'string') params.time = formatTime(params.time)
  if (typeof params.closesAt === 'string') params.closesAt = formatTime(params.closesAt)

  return (
    <li className={`notification-row ${item.read ? '' : 'is-unread'}`}>
      <button className="notification-open" type="button" onClick={() => onOpen(item)}>
        <span className={`notification-icon type-${item.type}`} aria-hidden="true">
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <span className="notification-copy">
          <strong>{t(`notifications.templates.${item.template}.title`, params)}</strong>
          <span>{t(`notifications.templates.${item.template}.body`, params)}</span>
          <small>
            {t(`notifications.types.${item.type}`)} ·{' '}
            <time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>
          </small>
        </span>
        {item.read ? null : (
          <i className="notification-dot">
            <span className="visually-hidden">{t('notifications.unread')}</span>
          </i>
        )}
      </button>
      <button
        className="tasks-menu notification-toggle"
        type="button"
        aria-label={item.read ? t('notifications.markUnread') : t('notifications.markRead')}
        title={item.read ? t('notifications.markUnread') : t('notifications.markRead')}
        onClick={onToggleRead}
      >
        {item.read ? <Mail size={18} /> : <Check size={18} />}
      </button>
    </li>
  )
}
