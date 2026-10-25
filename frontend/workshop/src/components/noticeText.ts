import type { Notice } from '../data/activity'
import type { I18nContextValue } from '../i18n/i18nContext'

/** Text of a notice: what was typed when sending, or the kind's template for system notices. */
export function noticeText(notice: Notice, { t, formatTime }: Pick<I18nContextValue, 't' | 'formatTime'>) {
  if (notice.message) return notice.message
  const params = notice.params ?? {}
  switch (notice.kind) {
    case 'unavailable':
      return t(params.reason ? 'notices.templates.unavailableReason' : 'notices.templates.unavailable', {
        from: formatTime(params.from ?? '11:00'),
        until: formatTime(params.until ?? '12:00'),
        reason: params.reason ?? '',
      })
    case 'fullDay':
      return t(params.reason ? 'notices.templates.fullDayReason' : 'notices.templates.fullDay', { reason: params.reason ?? '' })
    case 'general':
      return params.team ? t('notices.templates.generalTeam', { team: params.team }) : t('notices.templates.general')
    default:
      return t(`notices.templates.${notice.kind}`)
  }
}
