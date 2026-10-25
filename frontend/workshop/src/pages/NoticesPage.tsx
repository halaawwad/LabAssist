import { CalendarClock, CalendarX, Megaphone, Plus, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { noticeText } from '../components/noticeText'
import { composableNoticeKinds } from '../data/activity'
import { teamById } from '../data/teams'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'

export function NoticesPage() {
  const i18n = useI18n()
  const { t, formatRelative } = i18n
  const { notices } = useWorkshop()
  const { openDialog } = useDialogs()

  return (
    <div className="page">
      <PageHeader title={t('notices.title')} subtitle={t('notices.subtitle')} />
      <div className="page-toolbar is-end">
        <button className="btn btn-primary" type="button" onClick={() => openDialog({ type: 'notice' })}>
          <Plus size={18} />
          {t('notices.newNotice')}
        </button>
      </div>

      <div className="split-layout split-narrow-side">
        <section className="panel scroll-panel" aria-labelledby="notices-sent">
          <h2 className="section-title" id="notices-sent">
            {t('notices.recent')}
          </h2>
          {notices.length === 0 ? <p className="empty-note">{t('notices.empty')}</p> : null}
          <ul className="feed">
            {notices.map((notice) => (
              <li className="feed-item" key={notice.id}>
                <span className="feed-icon" aria-hidden="true">
                  {notice.audience === 'all' ? <Megaphone size={19} /> : <Users size={19} />}
                </span>
                <div className="feed-text">
                  <p className="feed-meta">
                    <span className="tag">{t(`notices.kinds.${notice.kind}`)}</span>
                    <span>
                      {notice.audience === 'all'
                        ? t('notices.toAll')
                        : `${notice.audience} · ${teamById.get(notice.audience)?.project ?? ''}`}
                    </span>
                    <time dateTime={notice.sentAt}>{formatRelative(notice.sentAt)}</time>
                  </p>
                  <p>{noticeText(notice, i18n)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="side-stack">
          <section className="panel" aria-labelledby="notices-quick">
            <h2 className="section-title" id="notices-quick">
              {t('notices.quick')}
            </h2>
            <div className="quick-list">
              <button className="btn btn-soft btn-wide" type="button" onClick={() => openDialog({ type: 'temporaryAbsence' })}>
                <CalendarClock size={18} />
                {t('availability.notifyTemporary')}
              </button>
              <button className="btn btn-ghost btn-wide" type="button" onClick={() => openDialog({ type: 'fullDayAbsence' })}>
                <CalendarX size={18} />
                {t('availability.notifyFullDay')}
              </button>
              {composableNoticeKinds
                .filter((kind) => kind !== 'unavailable')
                .map((kind) => (
                  <button className="btn btn-ghost btn-wide" key={kind} type="button" onClick={() => openDialog({ type: 'notice', kind })}>
                    <Megaphone size={17} />
                    {t(`notices.kinds.${kind}`)}
                  </button>
                ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
