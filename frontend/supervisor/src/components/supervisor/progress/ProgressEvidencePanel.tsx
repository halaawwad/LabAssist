import { Camera } from 'lucide-react'
import type { ProjectProgress } from '../../../data/supervisor/progressMockData'
import { useI18n } from '../../../i18n/i18nContext'

type ProgressEvidencePanelProps = {
  project: ProjectProgress
}

export function ProgressEvidencePanel({ project }: ProgressEvidencePanelProps) {
  const { t, formatDate } = useI18n()

  return (
    <section className="progress-side-panel glass-panel" aria-labelledby="progress-evidence-title">
      <h2 id="progress-evidence-title">{t('progress.evidence')}</h2>

      {project.evidence.length > 0 ? (
        <ul className="progress-evidence-grid">
          {project.evidence.slice(0, 4).map((item) => (
            <li key={item.title}>
              <img src={item.photo} alt={t('progress.evidenceAlt', { title: item.title, code: project.code })} />
              <span>{formatDate(item.date)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="progress-evidence-empty">
          <Camera size={20} aria-hidden="true" />
          {t('progress.noEvidence')}
        </p>
      )}
    </section>
  )
}
