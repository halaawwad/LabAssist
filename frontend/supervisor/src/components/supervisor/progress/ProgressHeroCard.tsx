import { Camera } from 'lucide-react'
import type { ProjectProgress } from '../../../data/supervisor/progressMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { statusLabelKeys } from '../../../i18n/labels'
import { progressStatusTone } from './progressHelpers'

type ProgressHeroCardProps = {
  project: ProjectProgress
}

export function ProgressHeroCard({ project }: ProgressHeroCardProps) {
  const { t, tp, formatDate } = useI18n()
  const studentCount = project.students.length
  const issueCount = project.issues.length

  return (
    <section className="progress-hero-card glass-panel" aria-labelledby="progress-hero-title">
      {project.photo ? (
        <img
          className="progress-hero-photo"
          src={project.photo}
          alt={t('progress.hero.photoAlt', { code: project.code })}
        />
      ) : (
        <div className="progress-hero-placeholder">
          <Camera size={24} aria-hidden="true" />
          <span>{t('progress.hero.noPhoto')}</span>
        </div>
      )}

      <div className="progress-hero-copy">
        <p className={`progress-hero-status ${progressStatusTone(project.status)}`}>
          <i aria-hidden="true" />
          {project.code} · {t(statusLabelKeys[project.status])}
        </p>
        <h2 id="progress-hero-title">{project.name}</h2>
        <ul className="progress-hero-chips" aria-label={t('progress.hero.summaryAria')}>
          <li>{t('progress.hero.due', { date: formatDate(project.finalDeadline) })}</li>
          <li>{tp('progress.hero.students', studentCount)}</li>
          {issueCount > 0 ? (
            <li className="is-issue">{tp('progress.hero.issues', issueCount)}</li>
          ) : (
            <li>{t('progress.hero.noIssues')}</li>
          )}
        </ul>
      </div>
    </section>
  )
}
