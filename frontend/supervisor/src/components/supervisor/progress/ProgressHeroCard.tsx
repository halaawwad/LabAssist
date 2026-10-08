import { Camera } from 'lucide-react'
import type { ProjectProgress } from '../../../data/supervisor/progressMockData'
import { progressStatusTone } from './progressHelpers'

type ProgressHeroCardProps = {
  project: ProjectProgress
}

export function ProgressHeroCard({ project }: ProgressHeroCardProps) {
  const studentCount = project.students.length
  const issueCount = project.issues.length

  return (
    <section className="progress-hero-card glass-panel" aria-labelledby="progress-hero-title">
      {project.photo ? (
        <img
          className="progress-hero-photo"
          src={project.photo}
          alt={`Latest prototype photo uploaded by the ${project.code} team`}
        />
      ) : (
        <div className="progress-hero-placeholder">
          <Camera size={24} aria-hidden="true" />
          <span>No prototype photo yet</span>
        </div>
      )}

      <div className="progress-hero-copy">
        <p className={`progress-hero-status ${progressStatusTone(project.status)}`}>
          <i aria-hidden="true" />
          {project.code} · {project.status}
        </p>
        <h2 id="progress-hero-title">{project.name}</h2>
        <ul className="progress-hero-chips" aria-label="Project summary">
          <li>Due {project.finalDeadline}</li>
          <li>
            {studentCount} {studentCount === 1 ? 'student' : 'students'}
          </li>
          {issueCount > 0 ? (
            <li className="is-issue">
              {issueCount} open {issueCount === 1 ? 'issue' : 'issues'}
            </li>
          ) : (
            <li>No open issues</li>
          )}
        </ul>
      </div>
    </section>
  )
}
