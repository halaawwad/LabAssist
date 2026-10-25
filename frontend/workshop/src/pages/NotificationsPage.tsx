import { BellRing, CalendarCheck, CheckCheck, Clock, Package, Reply, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import type { NotificationKind } from '../data/activity'
import { useI18n } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'

const icons: Record<NotificationKind, LucideIcon> = {
  attendance: CalendarCheck,
  managerAway: Clock,
  returnReminder: Package,
  supervisorReply: Reply,
  notice: BellRing,
}

export function NotificationsPage() {
  const { t, formatTime, formatDate, formatRelative } = useI18n()
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useWorkshop()
  const navigate = useNavigate()

  // Times and dates in the stored params are formatted for the current language.
  const paramsFor = (params: Record<string, string>) => ({
    ...params,
    ...(params.time ? { time: formatTime(params.time) } : {}),
    ...(params.from ? { from: formatTime(params.from) } : {}),
    ...(params.until ? { until: formatTime(params.until) } : {}),
    ...(params.date ? { date: formatDate(params.date) } : {}),
  })

  return (
    <div className="page">
      <PageHeader title={t('notifications.title')} subtitle={t('notifications.subtitle')} />
      <div className="page-toolbar is-end">
        <button className="btn btn-ghost" type="button" onClick={markAllNotificationsRead} disabled={unreadCount === 0}>
          <CheckCheck size={18} />
          {t('notifications.markAll')}
        </button>
      </div>

      <section className="panel scroll-panel" aria-label={t('notifications.title')}>
        {notifications.length === 0 ? <p className="empty-note">{t('notifications.empty')}</p> : null}
        <ul className="feed">
          {notifications.map((item) => {
            const Icon = icons[item.kind]
            return (
              <li key={item.id} className={`feed-item is-clickable ${item.read ? '' : 'is-unread'}`}>
                <span className="feed-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <button
                  type="button"
                  className="feed-text"
                  onClick={() => {
                    markNotificationRead(item.id)
                    navigate(item.to)
                  }}
                >
                  <strong>{t(`notifications.kinds.${item.kind}.title`)}</strong>
                  <span>{t(`notifications.kinds.${item.kind}.body`, paramsFor(item.params))}</span>
                  <time dateTime={item.at}>{formatRelative(item.at)}</time>
                </button>
                {!item.read ? (
                  <button className="icon-link" type="button" onClick={() => markNotificationRead(item.id)} aria-label={t('notifications.markRead')}>
                    <span className="unread-mark" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
