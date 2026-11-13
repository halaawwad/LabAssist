import { useState } from 'react'
import { Send, Users } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { matchesStudent } from '../components/tableSearch'
import { repeatedAbsenceThreshold, students, teamById } from '../data/teams'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop, type AttendanceStatus } from '../state/workshopContext'

type Filter = AttendanceStatus | 'all'

export function AttendancePage() {
  const { tables } = useWorkshop();
  const tableOfTeam = (id: string) => tables.find(table => table.teamIds.includes(id));
  const { t, tp, language } = useI18n()
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const earliest = new Date(today + 'T12:00:00Z')
  earliest.setUTCDate(earliest.getUTCDate() - 7)
  const [day, setDay] = useState(today)
  const { attendanceForDay, setAttendance } = useWorkshop()
  const attendance = attendanceForDay(day)
  const { openDialog } = useDialogs()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [saveError, setSaveError] = useState('')
  const markAttendance = (studentId: string, status: AttendanceStatus) => {
    try { setAttendance([studentId], status, day); setSaveError('') }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Attendance was not saved. Please retry.') }
  }

  const count = (status: AttendanceStatus) => students.filter((student) => attendance[student.id] === status).length
  const rows = students.filter(
    (student) => (filter === 'all' || attendance[student.id] === filter) && matchesStudent(query, student.name, student.teamId),
  )

  return (
    <div className="page">
      <PageHeader
        title={t('attendancePage.title')}
        subtitle={t('attendancePage.subtitle')}
        search={{ value: query, onChange: setQuery }}
      />
      {saveError && <p role="alert">{saveError}</p>}
      <div className="page-toolbar">
        <label>{language === 'ar' ? 'تاريخ الحضور' : 'Attendance date'}<input className="input" type="date" value={day} min={earliest.toISOString().slice(0, 10)} max={today} onChange={event => { if (event.target.value) setDay(event.target.value) }} /></label>
        <FilterChips
          label={t('attendancePage.title')}
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('attendancePage.filters.all'), count: students.length },
            { id: 'present', label: t('attendancePage.filters.present'), count: count('present') },
            { id: 'absent', label: t('attendancePage.filters.absent'), count: count('absent') },
          ]}
        />
        <div className="toolbar-actions">
          <button className="btn btn-ghost" type="button" onClick={() => openDialog({ type: 'repeatedAbsence' })}>
            <Users size={18} />
            {t('attendance.repeated')}
          </button>
          <button className="btn btn-soft" type="button" onClick={() => openDialog({ type: 'notice' })}>
            <Send size={17} className="flip-rtl" />
            {t('attendance.sendNotice')}
          </button>
        </div>
      </div>

      <section className="panel scroll-panel" aria-label={t('attendance.today')}>
        <ul className="attendance-grid">
          {rows.map((student) => {
            const status = attendance[student.id]
            const total = student.absences + (status === 'absent' ? 1 : 0)
            return (
              <li className="person-row" key={student.id}>
                <Avatar name={student.name} />
                <div className="person-text">
                  <strong>{student.name}</strong>
                  <span>
                    {student.teamId} · {teamById.get(student.teamId)?.project} ·{' '}
                    {t('attendancePage.table', { code: tableOfTeam(student.teamId)?.code ?? '' })}
                  </span>
                </div>
                {total > 0 ? (
                  <span className={`count-pill ${total >= repeatedAbsenceThreshold ? 'is-warm' : ''}`}>
                    {tp('attendance.absences', total)}
                  </span>
                ) : null}
                <div className="presence-toggle" role="radiogroup" aria-label={student.name}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={status === 'present'}
                    className={status === 'present' ? 'is-present' : ''}
                    onClick={() => markAttendance(student.id, 'present')}
                  >
                    {t('table.present')}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={status === 'absent'}
                    className={status === 'absent' ? 'is-absent' : ''}
                    onClick={() => markAttendance(student.id, 'absent')}
                  >
                    {t('table.absent')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {rows.length === 0 ? <p className="empty-note">{t('common.noResults')}</p> : null}
      </section>
    </div>
  )
}
