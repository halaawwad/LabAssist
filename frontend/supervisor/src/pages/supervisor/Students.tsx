import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, MoreVertical, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import studentsHero from '../../assets/supervisor-students-hero.png'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { useI18n, type TranslationKey } from '../../i18n/i18nContext'
import { statusLabelKeys } from '../../i18n/labels'
import { ActionDialog } from '../../components/supervisor/tasks/ActionDialog'
import { interactionLabels } from '../../components/supervisor/interactionLabels'
import { useLocalState } from '../../state/useLocalState'

import {
  supervisedStudents as students,
  type Attendance,
  type StudentStatus,
} from '../../data/supervisor/studentsMockData'

/** Filter value meaning "no filter". */
const ALL = 'all'

const projectNames = Array.from(new Set(students.map((student) => student.project)))
const attendanceValues: Attendance[] = ['present', 'absence']
const statusValues: StudentStatus[] = ['On Track', 'At Risk', 'Delayed']

const attendanceLabelKeys: Record<Attendance, TranslationKey> = {
  present: 'students.attendance.present',
  absence: 'students.attendance.absence',
}

export function Students() {
  const { t, language } = useI18n()
  const l = interactionLabels[language]
  const [records, setRecords] = useLocalState('students.v1', students)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [request, setRequest] = useState('')
  const selected = records.find((student) => student.universityId === selectedId)
  // `?attendance=absence` (used by notifications) preselects the attendance filter.
  const [searchParams, setSearchParams] = useSearchParams()
  const [localQuery, setLocalQuery] = useState('')
  const query = searchParams.get('student') ?? localQuery
  const setQuery = (value: string) => {
    setLocalQuery(value)
    if (searchParams.has('student'))
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('student')
          return next
        },
        { replace: true },
      )
  }
  const [project, setProject] = useState(ALL)
  const [attendance, setAttendance] = useState(() => {
    const requested = searchParams.get('attendance')
    return attendanceValues.some((value) => value === requested) ? (requested as Attendance) : ALL
  })
  const [status, setStatus] = useState(ALL)

  const projectOptions = [
    { value: ALL, label: t('students.allProjects') },
    ...projectNames.map((name) => ({ value: name, label: name })),
  ]
  const attendanceOptions = [
    { value: ALL, label: t('students.allAttendance') },
    ...attendanceValues.map((value) => ({ value, label: t(attendanceLabelKeys[value]) })),
  ]
  const statusOptions = [
    { value: ALL, label: t('students.allStatus') },
    ...statusValues.map((value) => ({ value, label: t(statusLabelKeys[value]) })),
  ]

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return records.filter((student) => {
      const matchesQuery =
        !normalizedQuery ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.universityId.includes(normalizedQuery) ||
        student.project.toLowerCase().includes(normalizedQuery)

      return (
        matchesQuery &&
        (project === ALL || student.project === project) &&
        (attendance === ALL || student.attendance === attendance) &&
        (status === ALL || student.status === status)
      )
    })
  }, [attendance, project, query, status, records])

  return (
    <section className="students-page" aria-labelledby="students-title">
      <div className="students-visual-top">
        <img className="students-hero-image" src={studentsHero} alt="" aria-hidden="true" />
        <SupervisorTopBar />

        <header className="students-hero">
          <div>
            <h1 id="students-title">{t('students.title')}</h1>
            <p>{t('students.subtitle')}</p>
          </div>
        </header>
      </div>

      <section className="students-filter-panel glass-panel" aria-label={t('students.filtersAria')}>
        <label className="students-search-field">
          <Search size={22} aria-hidden="true" />
          <input
            type="search"
            placeholder={t('students.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <FilterSelect
          label={t('students.filterProject')}
          value={project}
          options={projectOptions}
          onChange={setProject}
        />
        <FilterSelect
          label={t('students.filterAttendance')}
          value={attendance}
          options={attendanceOptions}
          onChange={setAttendance}
        />
        <FilterSelect
          label={t('students.filterStatus')}
          value={status}
          options={statusOptions}
          onChange={setStatus}
        />
      </section>

      <section className="students-table-panel glass-panel" aria-label={t('students.tableAria')}>
        <div className="students-table">
          <div className="students-table-header" role="row">
            <span>{t('students.columns.student')}</span>
            <span>{t('students.columns.universityId')}</span>
            <span>{t('students.columns.project')}</span>
            <span>{t('students.columns.progress')}</span>
            <span>{t('students.columns.issues')}</span>
            <span>{t('students.columns.attendance')}</span>
            <span>{t('students.columns.alert')}</span>
            <span aria-hidden="true" />
          </div>

          <div className="students-table-body">
            {filteredStudents.map((student) => (
              <article className="student-row" key={student.universityId}>
                <div className="student-cell student-identity">
                  <span className={`student-initials tone-${student.avatarTone}`}>
                    {student.initials}
                  </span>
                  <strong>{student.name}</strong>
                </div>
                <span className="student-id">{student.universityId}</span>
                <span className="student-project">{student.project}</span>
                <div className="student-progress">
                  <strong>{student.progress}%</strong>
                  <span className="student-progress-track">
                    <span style={{ width: `${student.progress}%` }} />
                  </span>
                </div>
                <span className={`student-issue tone-${student.issueTone}`}>
                  {t(`students.issues.${student.issue}`)}
                </span>
                <span className={`attendance-pill tone-${student.attendance}`}>
                  <i aria-hidden="true" />
                  {t(attendanceLabelKeys[student.attendance])}
                </span>
                <span className={student.repeatedAbsence ? 'absence-alert' : 'student-no-alert'}>
                  {student.repeatedAbsence ? (
                    <>
                      <AlertTriangle size={20} aria-hidden="true" />
                      {t('students.repeatedAbsence')}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <button
                  className="student-menu-button"
                  type="button"
                  aria-label={t('students.actions', { name: student.name })}
                  onClick={() => {
                    setSelectedId(student.universityId)
                    setRequest('')
                  }}
                >
                  <MoreVertical size={20} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
      {selected && (
        <ActionDialog
          title={selected.name}
          description={`${selected.universityId} · ${selected.project}`}
          icon={AlertTriangle}
          onClose={() => setSelectedId(null)}
          submitLabel={t('common.save')}
          onSubmit={(data) => {
            setRecords((items) =>
              items.map((student) =>
                student.universityId === selected.universityId
                  ? {
                      ...student,
                      attendance: data.get('attendance') as Attendance,
                      status: data.get('status') as StudentStatus,
                    }
                  : student,
              ),
            )
            setSelectedId(null)
          }}
        >
          <p>
            {l.student} · {selected.progress}%
          </p>
          <label className="dialog-field">
            <span>{l.attendance}</span>
            <select name="attendance" defaultValue={selected.attendance}>
              {attendanceValues.map((value) => (
                <option key={value} value={value}>
                  {t(attendanceLabelKeys[value])}
                </option>
              ))}
            </select>
          </label>
          <label className="dialog-field">
            <span>{l.status}</span>
            <select name="status" defaultValue={selected.status}>
              {statusValues.map((value) => (
                <option key={value} value={value}>
                  {t(statusLabelKeys[value])}
                </option>
              ))}
            </select>
          </label>
          <h3>{l.requests}</h3>
          {selected.updateRequests?.length ? (
            selected.updateRequests.map((text, index) => <p key={index}>{text}</p>)
          ) : (
            <p>{l.noRequests}</p>
          )}
          <label className="dialog-field">
            <span>{l.message}</span>
            <textarea
              value={request}
              maxLength={1000}
              onChange={(event) => setRequest(event.target.value)}
            />
          </label>
          <p>{l.requestHint}</p>
          <button
            className="dialog-secondary-button"
            type="button"
            disabled={!request.trim()}
            title={!request.trim() ? l.required : undefined}
            onClick={() => {
              setRecords((items) =>
                items.map((student) =>
                  student.universityId === selected.universityId
                    ? {
                        ...student,
                        updateRequests: [...(student.updateRequests ?? []), request.trim()],
                      }
                    : student,
                ),
              )
              setRequest('')
            }}
          >
            {l.request}
          </button>
        </ActionDialog>
      )}
    </section>
  )
}

type FilterSelectProps = {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="students-select-field">
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden="true" />
      </div>
    </label>
  )
}
