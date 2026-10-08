import type { ProjectProgress } from '../../../data/supervisor/progressMockData'
import { progressMetrics, progressStatusTone } from './progressHelpers'

type ProgressProjectListProps = {
  projects: ProjectProgress[]
  selectedCode: string
  onSelect: (code: string) => void
}

export function ProgressProjectList({ projects, selectedCode, onSelect }: ProgressProjectListProps) {
  return (
    <section className="progress-project-list" aria-labelledby="progress-projects-title">
      <h2 id="progress-projects-title">
        My Projects
        <span>{projects.length}</span>
      </h2>

      <div className="progress-project-rows">
        {projects.map((project) => {
          const { overall } = progressMetrics(project)
          const isSelected = project.code === selectedCode

          return (
            <button
              className={`progress-project-row ${progressStatusTone(project.status)} ${isSelected ? 'is-selected' : ''}`}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${project.code} ${project.name}, ${overall}% progress, ${project.status}`}
              onClick={() => onSelect(project.code)}
              key={project.code}
            >
              <small>{project.code}</small>
              <strong>{project.name}</strong>
              <em>{overall}%</em>
              <span className="progress-row-track" aria-hidden="true">
                <span style={{ width: `${overall}%` }} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
