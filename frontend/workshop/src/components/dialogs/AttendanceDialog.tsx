import { useMemo, useState } from 'react'
import { Check, UserX } from 'lucide-react'
import { students, teamById } from '../../data/teams'
import { tableOfTeam } from '../../data/workshopTables'
import { useI18n } from '../../i18n/i18nContext'
import { useWorkshop } from '../../state/workshopContext'
import { Avatar } from '../Avatar'
import { Modal } from '../Modal'
import { matchesStudent } from '../tableSearch'

/** Lists students in the opposite state so one click moves each of them. */
export function AttendanceDialog({ mode, onClose }: { mode: 'present' | 'absent'; onClose: () => void }) {
  const { t } = useI18n()
  const { attendance, setAttendance } = useWorkshop()
  const [query, setQuery] = useState('')
  const marking = mode === 'present'
  const source = marking ? 'absent' : 'present'

  const rows = useMemo(
    () => students.filter((student) => attendance[student.id] === source && matchesStudent(query, student.name, student.teamId)),
    [attendance, source, query],
  )
  const anyInSource = students.some((student) => attendance[student.id] === source)

  return (
    <Modal
      title={t(marking ? 'attendance.presentTitle' : 'attendance.absentTitle')}
      subtitle={t(marking ? 'attendance.presentHint' : 'attendance.absentHint')}
      icon={marking ? <Check size={20} /> : <UserX size={20} />}
      onClose={onClose}
      footer={
        <button className="btn btn-ghost" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <input
        className="input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('common.searchStudents')}
        aria-label={t('common.searchStudents')}
      />
      <ul className="person-list" aria-live="polite">
        {rows.map((student) => {
          const team = teamById.get(student.teamId)
          return (
            <li className="person-row" key={student.id}>
              <Avatar name={student.name} />
              <div className="person-text">
                <strong>{student.name}</strong>
                <span>
                  {student.teamId} · {team?.project} · {tableOfTeam(student.teamId)?.code}
                </span>
              </div>
              <button
                className={`btn btn-sm ${marking ? 'btn-soft' : 'btn-danger-soft'}`}
                type="button"
                onClick={() => setAttendance([student.id], mode)}
              >
                {marking ? <Check size={16} /> : <UserX size={16} />}
                {t(marking ? 'attendance.markOnePresent' : 'attendance.markOneAbsent')}
              </button>
            </li>
          )
        })}
      </ul>
      {rows.length === 0 ? (
        <p className="empty-note">
          {!anyInSource ? t(marking ? 'attendance.allPresent' : 'attendance.noonePresent') : t('common.noResults')}
        </p>
      ) : null}
    </Modal>
  )
}
