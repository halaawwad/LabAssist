import { Send, UserRound, UsersRound } from 'lucide-react'
import { repeatedAbsenceThreshold, teamById } from '../../data/teams'
import { useI18n } from '../../i18n/i18nContext'
import { useDialogs } from '../../state/dialogContext'
import { useWorkshop } from '../../state/workshopContext'
import { useRepeatedAbsence } from '../../state/useRepeatedAbsence'
import { Avatar } from '../Avatar'
import { Modal } from '../Modal'

export function RepeatedAbsenceDialog({ onClose }: { onClose: () => void }) {
  const { t, tp, formatDate } = useI18n()
  const { attendance } = useWorkshop()
  const { openDialog } = useDialogs()
  const { rows, patternTeams } = useRepeatedAbsence()

  return (
    <Modal
      title={t('attendance.repeatedTitle')}
      subtitle={t('attendance.repeatedHint', { count: repeatedAbsenceThreshold })}
      icon={<UsersRound size={20} />}
      size="lg"
      onClose={onClose}
      footer={
        <button className="btn btn-ghost" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      {rows.length === 0 ? <p className="empty-note">{t('attendance.noneRepeated')}</p> : null}
      <ul className="person-list">
        {rows.map(({ student, total }) => (
          <li className="person-row" key={student.id}>
            <Avatar name={student.name} />
            <div className="person-text">
              <strong>
                {student.name}
                {patternTeams.has(student.teamId) ? <em className="tag tag-warm">{t('attendance.teamPattern')}</em> : null}
              </strong>
              <span>
                {student.teamId} · {teamById.get(student.teamId)?.project}
              </span>
              <span className="person-meta">
                {attendance[student.id] === 'absent'
                  ? t('attendance.absentNow')
                  : student.lastAbsence
                    ? t('attendance.lastAbsent', { date: formatDate(student.lastAbsence) })
                    : null}
              </span>
            </div>
            <span className="count-pill">{tp('attendance.absences', total)}</span>
            <div className="row-actions">
              <button
                className="btn btn-sm btn-ghost"
                type="button"
                onClick={() => openDialog({ type: 'notice', audience: student.teamId, kind: 'general' })}
              >
                <Send size={15} />
                {t('attendance.notifyTeam')}
              </button>
              <button
                className="btn btn-sm btn-soft"
                type="button"
                onClick={() => openDialog({ type: 'report', teamId: student.teamId, observationType: 'repeatedAbsence' })}
              >
                <UserRound size={15} />
                {t('attendance.report')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
