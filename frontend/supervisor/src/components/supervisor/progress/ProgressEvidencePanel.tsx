import { Camera } from 'lucide-react'
import type { ProjectProgress } from '../../../data/supervisor/progressMockData'

type ProgressEvidencePanelProps = {
  project: ProjectProgress
}

export function ProgressEvidencePanel({ project }: ProgressEvidencePanelProps) {
  return (
    <section className="progress-side-panel glass-panel" aria-labelledby="progress-evidence-title">
      <h2 id="progress-evidence-title">Latest evidence</h2>

      {project.evidence.length > 0 ? (
        <ul className="progress-evidence-grid">
          {project.evidence.slice(0, 4).map((item) => (
            <li key={item.title}>
              <img src={item.photo} alt={`${item.title}, uploaded by the ${project.code} team`} />
              <span>{item.date}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="progress-evidence-empty">
          <Camera size={20} aria-hidden="true" />
          No photos uploaded yet.
        </p>
      )}
    </section>
  )
}
