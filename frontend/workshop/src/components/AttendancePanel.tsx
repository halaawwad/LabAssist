import { ArrowRight, Check, Send, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'
import { Panel } from './Panel'

export function AttendancePanel() {
  const { t } = useI18n()
  const { attendance } = useWorkshop()
  const { openDialog } = useDialogs()
  const statuses = Object.values(attendance)
  const present = statuses.filter((status) => status === 'present').length

  return (
    <Panel
      icon={Users}
      title={t('attendance.title')}
      titleId="dash-attendance"
      action={
        <Link className="text-link" to="/attendance">
          {t('common.viewAll')}
          <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
        </Link>
      }
    >
      <div className="inset attendance-box">
        <div className="attendance-head">
          <p className="inset-label">{t('attendance.today')}</p>
          <p className="attendance-count">
            <strong className="is-present">{present}</strong> {t('attendance.present')}
            <span className="count-divider" aria-hidden="true" />
            <strong className="is-absent">{statuses.length - present}</strong> {t('attendance.absent')}
          </p>
        </div>
        <div className="action-grid">
          <button className="btn btn-soft" type="button" onClick={() => openDialog({ type: 'markAttendance', mode: 'present' })}>
            <Check size={19} />
            {t('attendance.markPresent')}
          </button>
          <button
            className="btn btn-danger-soft"
            type="button"
            onClick={() => openDialog({ type: 'markAttendance', mode: 'absent' })}
          >
            <UserRound size={19} />
            {t('attendance.markAbsent')}
          </button>
          <button className="btn btn-ghost btn-quiet" type="button" onClick={() => openDialog({ type: 'repeatedAbsence' })}>
            <Users size={18} />
            {t('attendance.repeated')}
          </button>
          <button className="btn btn-ghost btn-quiet" type="button" onClick={() => openDialog({ type: 'notice' })}>
            <Send size={17} className="flip-rtl" />
            {t('attendance.sendNotice')}
          </button>
        </div>
      </div>
    </Panel>
  )
}
