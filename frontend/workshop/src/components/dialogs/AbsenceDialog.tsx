import { useState, type FormEvent } from 'react'
import { BellRing, CalendarX, Clock } from 'lucide-react'
import { useI18n } from '../../i18n/i18nContext'
import { useWorkshop } from '../../state/workshopContext'
import { Modal } from '../Modal'
import { noticeText } from '../noticeText'

/** Temporary (time window) or full-day absence notice for all workshop students. */
export function AbsenceDialog({ fullDay, onClose }: { fullDay: boolean; onClose: () => void }) {
  const i18n = useI18n()
  const { t, formatTime } = i18n
  const { notifyTemporaryAbsence, notifyFullDayAbsence, showToast } = useWorkshop()
  const [from, setFrom] = useState('11:00')
  const [until, setUntil] = useState('12:00')
  const [reason, setReason] = useState('')

  const rangeValid = fullDay || (from !== '' && until !== '' && until > from)
  const trimmedReason = reason.trim()
  const preview = noticeText(
    {
      id: '',
      audience: 'all',
      sentAt: '',
      kind: fullDay ? 'fullDay' : 'unavailable',
      params: { from, until, ...(trimmedReason ? { reason: trimmedReason } : {}) },
    },
    i18n,
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!rangeValid) return
    if (fullDay) {
      notifyFullDayAbsence(trimmedReason)
      showToast(t('availability.sentFullDay'))
    } else {
      notifyTemporaryAbsence(from, until, trimmedReason)
      showToast(t('availability.sentTemporary', { from: formatTime(from), until: formatTime(until) }))
    }
    onClose()
  }

  return (
    <Modal
      title={t(fullDay ? 'availability.fullDayTitle' : 'availability.temporaryTitle')}
      subtitle={t(fullDay ? 'availability.fullDayHint' : 'availability.temporaryHint')}
      icon={fullDay ? <CalendarX size={20} /> : <Clock size={20} />}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" form="absence-form" disabled={!rangeValid}>
            <BellRing size={16} />
            {t('availability.send')}
          </button>
        </>
      }
    >
      <form id="absence-form" className="form-stack" onSubmit={submit}>
        {!fullDay ? (
          <div className="field-row">
            <label className="field">
              <span className="field-label">{t('availability.start')}</span>
              <input className="input" type="time" value={from} onChange={(event) => setFrom(event.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">{t('availability.until')}</span>
              <input
                className="input"
                type="time"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
                aria-invalid={!rangeValid}
                required
              />
            </label>
          </div>
        ) : null}
        {!rangeValid ? (
          <p className="field-error" role="alert">
            {t('availability.invalidRange')}
          </p>
        ) : null}
        <label className="field">
          <span className="field-label">{t('availability.reason')}</span>
          <input
            className="input"
            value={reason}
            maxLength={80}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('availability.reasonPlaceholder')}
          />
        </label>
        <div className="notice-preview">
          <span>{t('availability.preview')}</span>
          <p>{preview}</p>
        </div>
      </form>
    </Modal>
  )
}
