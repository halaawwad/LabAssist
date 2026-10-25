import { CalendarClock, CalendarX, Clock, Undo2 } from 'lucide-react'
import { workingHours } from '../data/activity'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'
import { Panel } from './Panel'

export function AvailabilityPanel() {
  const { t, formatTime } = useI18n()
  const { availability, backOnDuty, showToast } = useWorkshop()
  const { openDialog } = useDialogs()
  const { status } = availability

  return (
    <Panel
      icon={Clock}
      title={t('availability.title')}
      titleId="dash-availability"
      className="availability-panel"
      action={
        <span className={`duty-pill duty-${status}`}>
          <i aria-hidden="true" />
          {t(`availability.${status}`)}
        </span>
      }
    >
      <div className="hours-row">
        <div>
          <span className="inset-label">{t('availability.workingHours')}</span>
          <strong className="hours-value">
            {formatTime(workingHours.start)} - {formatTime(workingHours.end)}
          </strong>
          {status === 'away' && availability.from && availability.until ? (
            <span className="away-window">
              {t('availability.awayWindow', { from: formatTime(availability.from), until: formatTime(availability.until) })}
            </span>
          ) : null}
        </div>
        {status === 'onDuty' ? (
          <button className="btn btn-sm btn-ghost btn-quiet" type="button" onClick={() => openDialog({ type: 'fullDayAbsence' })}>
            <CalendarX size={16} />
            {t('availability.notifyFullDay')}
          </button>
        ) : null}
      </div>
      {status === 'onDuty' ? (
        <button className="btn btn-soft btn-wide" type="button" onClick={() => openDialog({ type: 'temporaryAbsence' })}>
          <CalendarClock size={19} />
          {t('availability.notifyTemporary')}
        </button>
      ) : (
        <button
          className="btn btn-soft btn-wide"
          type="button"
          onClick={() => {
            backOnDuty()
            showToast(t('availability.backToast'))
          }}
        >
          <Undo2 size={19} />
          {t('availability.backOnDuty')}
        </button>
      )}
    </Panel>
  )
}
