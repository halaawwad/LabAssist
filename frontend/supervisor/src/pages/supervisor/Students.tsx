import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  MoreVertical,
  Search,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import studentsHero from '../../assets/supervisor-students-hero.png'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { useI18n, type TranslationKey } from '../../i18n/i18nContext'
import { statusLabelKeys } from '../../i18n/labels'

type Attendance = 'present' | 'absence'
type StudentStatus = 'On Track' | 'At Risk' | 'Delayed'
/** Translation key under `students.issues.`. */
type StudentIssue = 'testingDelay' | 'none' | 'missingComponents' | 'reportPending' | 'slowProgress'

type SupervisedStudent = {
  name: string
  initials: string
  universityId: string
  project: string
  progress: number
  issue: StudentIssue
  issueTone: 'neutral' | 'orange' | 'red'
  attendance: Attendance
  repeatedAbsence?: boolean
  status: StudentStatus
  avatarTone: 'green' | 'blue' | 'gold' | 'violet' | 'coral'
}

const students: SupervisedStudent[] = [
  {
    name: 'Ahmad Ali',
    initials: 'AA',
    universityId: '12217669',
    project: 'Smart Greenhouse Monitor',
    progress: 62,
    issue: 'testingDelay',
    issueTone: 'red',
    attendance: 'absence',
    repeatedAbsence: true,
    status: 'At Risk',
    avatarTone: 'green',
  },
  {
    name: 'Lina Hasan',
    initials: 'LH',
    universityId: '12199821',
    project: 'Autonomous Delivery Robot',
    progress: 80,
    issue: 'none',
    issueTone: 'neutral',
    attendance: 'present',
    status: 'On Track',
    avatarTone: 'blue',
  },
  {
    name: 'Omar Samer',
    initials: 'OS',
    universityId: '12214500',
    project: 'Solar Weather Station',
    progress: 45,
    issue: 'missingComponents',
    issueTone: 'red',
    attendance: 'absence',
    status: 'Delayed',
    avatarTone: 'gold',
  },
  {
    name: 'Sara Nasser',
    initials: 'SN',
    universityId: '12218840',
    project: 'Irrigation Control System',
    progress: 71,
    issue: 'reportPending',
    issueTone: 'orange',
    attendance: 'present',
    status: 'At Risk',
    avatarTone: 'violet',
  },
  {
    name: 'Yazan Khalil',
    initials: 'YK',
    universityId: '12213220',
    project: 'Delivery Robot',
    progress: 38,
    issue: 'slowProgress',
    issueTone: 'red',
    attendance: 'absence',
    repeatedAbsence: true,
    status: 'Delayed',
    avatarTone: 'coral',
  },
]

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
  const { t } = useI18n()
  // `?attendance=absence` (used by notifications) preselects the attendance filter.
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
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

    return students.filter((student) => {
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
  }, [attendance, project, query, status])

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
                >
                  <MoreVertical size={20} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
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
