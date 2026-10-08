import type { ProjectStudent } from '../../../data/supervisor/progressMockData'

type ProjectStudentsPanelProps = {
  students: ProjectStudent[]
}

const avatarTones = ['blue', 'violet', 'gold'] as const

export function ProjectStudentsPanel({ students }: ProjectStudentsPanelProps) {
  return (
    <section className="progress-side-panel glass-panel" aria-labelledby="project-team-title">
      <h2 id="project-team-title">Team</h2>
      <ul className="progress-team-list">
        {students.map((student, index) => (
          <li key={student.universityId} title={student.universityId}>
            <span className={`student-initials tone-${avatarTones[index % avatarTones.length]}`} aria-hidden="true">
              {student.initials}
            </span>
            {student.name}
          </li>
        ))}
      </ul>
    </section>
  )
}
