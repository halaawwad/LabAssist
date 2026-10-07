import { MoreVertical } from 'lucide-react'
import type { Project } from '../../../data/supervisor/supervisorMockData'

type ProjectCardProps = {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className={`project-card ${project.featured ? 'is-featured' : ''}`}>
      <div className="project-card-top">
        <img src={project.image} alt="" className="project-thumb" />
        <span className={`project-status status-${project.status.toLowerCase().replaceAll(' ', '-')}`}>
          <i aria-hidden="true" />
          {project.status}
        </span>
        <button className="project-menu" type="button" aria-label={`${project.name} options`}>
          <MoreVertical size={19} />
        </button>
      </div>

      <div className="project-title-block">
        <h2>{project.name}</h2>
        <p>
          {project.code}
          {project.team ? <span>{project.team}</span> : null}
        </p>
      </div>

      <div className="project-students" aria-label={`${project.name} students`}>
        <div>
          {project.students.map((student) => (
            <span className="student-avatar" key={student}>
              {student}
            </span>
          ))}
        </div>
        <small>{project.students.length} students</small>
      </div>

      <div className="project-progress">
        <div>
          <span>Overall Progress</span>
          <strong>{project.progress}%</strong>
        </div>
        <div className="bar-track">
          <span style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <dl className="project-meta">
        <div>
          <dt>Current milestone</dt>
          <dd>{project.milestone}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{project.deadline}</dd>
        </div>
        <div>
          <dt>Open issues</dt>
          <dd>{project.issues}</dd>
        </div>
      </dl>
    </article>
  )
}
