import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  MoreVertical,
  Search,
} from 'lucide-react'
import studentsHero from '../../assets/supervisor-students-hero.png'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'

type Attendance = 'Present' | 'Absence'
type StudentStatus = 'On Track' | 'At Risk' | 'Delayed'

type SupervisedStudent = {
  name: string
  initials: string
  universityId: string
  project: string
  progress: number
  issue: string
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
    issue: 'Delay in testing',
    issueTone: 'red',
    attendance: 'Absence',
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
    issue: 'No issues',
    issueTone: 'neutral',
    attendance: 'Present',
    status: 'On Track',
    avatarTone: 'blue',
  },
  {
    name: 'Omar Samer',
    initials: 'OS',
    universityId: '12214500',
    project: 'Solar Weather Station',
    progress: 45,
    issue: 'Missing components',
    issueTone: 'red',
    attendance: 'Absence',
    status: 'Delayed',
    avatarTone: 'gold',
  },
  {
    name: 'Sara Nasser',
    initials: 'SN',
    universityId: '12218840',
    project: 'Irrigation Control System',
    progress: 71,
    issue: 'Weekly report pending',
    issueTone: 'orange',
    attendance: 'Present',
    status: 'At Risk',
    avatarTone: 'violet',
  },
  {
    name: 'Yazan Khalil',
    initials: 'YK',
    universityId: '12213220',
    project: 'Delivery Robot',
    progress: 38,
    issue: 'Slow progress',
    issueTone: 'red',
    attendance: 'Absence',
    repeatedAbsence: true,
    status: 'Delayed',
    avatarTone: 'coral',
  },
]

const projectOptions = ['All Projects', ...Array.from(new Set(students.map((student) => student.project)))]
const attendanceOptions = ['All Attendance', 'Present', 'Absence']
const statusOptions = ['All Status', 'On Track', 'At Risk', 'Delayed']

export function Students() {
  const [query, setQuery] = useState('')
  const [project, setProject] = useState('All Projects')
  const [attendance, setAttendance] = useState('All Attendance')
  const [status, setStatus] = useState('All Status')

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
        (project === 'All Projects' || student.project === project) &&
        (attendance === 'All Attendance' || student.attendance === attendance) &&
        (status === 'All Status' || student.status === status)
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
            <h1 id="students-title">Students</h1>
            <p>Monitor supervised students, attendance, and project progress.</p>
          </div>
        </header>
      </div>

      <section className="students-filter-panel glass-panel" aria-label="Student filters">
        <label className="students-search-field">
          <Search size={22} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search students, projects, or ID..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <FilterSelect
          label="Project"
          value={project}
          options={projectOptions}
          onChange={setProject}
        />
        <FilterSelect
          label="Attendance"
          value={attendance}
          options={attendanceOptions}
          onChange={setAttendance}
        />
        <FilterSelect
          label="Status"
          value={status}
          options={statusOptions}
          onChange={setStatus}
        />
      </section>

      <section className="students-table-panel glass-panel" aria-label="Supervised students">
        <div className="students-table">
          <div className="students-table-header" role="row">
            <span>Student</span>
            <span>University ID</span>
            <span>Project</span>
            <span>Progress</span>
            <span>Issues / Delay</span>
            <span>Attendance</span>
            <span>Alert</span>
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
                <span className={`student-issue tone-${student.issueTone}`}>{student.issue}</span>
                <span className={`attendance-pill tone-${student.attendance.toLowerCase()}`}>
                  <i aria-hidden="true" />
                  {student.attendance}
                </span>
                <span className={student.repeatedAbsence ? 'absence-alert' : 'student-no-alert'}>
                  {student.repeatedAbsence ? (
                    <>
                      <AlertTriangle size={20} aria-hidden="true" />
                      Repeated absence
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <button className="student-menu-button" type="button" aria-label={`Open ${student.name} actions`}>
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
  options: string[]
  onChange: (value: string) => void
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="students-select-field">
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden="true" />
      </div>
    </label>
  )
}
