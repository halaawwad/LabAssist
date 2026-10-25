import {
  CalendarDays,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import type { SupervisedProject } from '../../../data/supervisor/projectsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { statusLabelKeys } from '../../../i18n/labels'
import { statusTone } from './projectHelpers'

type FeaturedProjectProps = {
  project: SupervisedProject
  onOpen: () => void
}

export function FeaturedProject({ project, onOpen }: FeaturedProjectProps) {
  const { t, tp, formatDate } = useI18n()
  const ChangeIcon = project.weeklyChange >= 0 ? TrendingUp : TrendingDown

  return (
    <section className="mp-featured glass-panel" aria-labelledby="mp-featured-title">
      <img
        className="mp-featured-photo"
        src={project.image}
        alt={t('projects.featured.photoAlt', { name: project.name })}
      />
      <button
        className="mp-featured-open"
        type="button"
        aria-label={t('projects.featured.open', { name: project.name })}
        onClick={onOpen}
      >
        <ChevronRight size={20} />
      </button>

      <div className="mp-featured-copy">
        <p className={`mp-status-text tone-${statusTone(project.status)}`}>
          <i aria-hidden="true" />
          {t(statusLabelKeys[project.status])}
        </p>
        <h2 id="mp-featured-title">{project.name}</h2>
        <p className="mp-featured-code">
          {project.code}
          {project.team ? <span> · {project.team}</span> : null}
        </p>

        <ul className="mp-featured-stats" aria-label={t('projects.featured.summaryAria')}>
          <li className="mp-stat-progress">
            <span className="mp-ring" aria-hidden="true">
              <svg viewBox="0 0 44 44">
                <circle className="mp-ring-track" cx="22" cy="22" r="18" />
                <circle
                  className="mp-ring-value"
                  cx="22"
                  cy="22"
                  r="18"
                  pathLength="100"
                  style={{ strokeDasharray: `${project.progress} 100` }}
                />
              </svg>
              <b>{project.progress}%</b>
            </span>
            <span>
              <em>{t('projects.featured.overallProgress')}</em>
              <b className="mp-change">
                <ChangeIcon size={14} aria-hidden="true" />
                {project.weeklyChange >= 0 ? '+' : '−'}
                {Math.abs(project.weeklyChange)}%
              </b>
            </span>
            <span className="visually-hidden">
              {t('projects.featured.complete', { value: project.progress })}
            </span>
          </li>

          <li>
            <Users className="mp-stat-icon" size={22} aria-hidden="true" />
            <span>
              <b>{project.students}</b>
              <em>{tp('projects.featured.students', project.students)}</em>
            </span>
          </li>

          <li>
            <CalendarDays className="mp-stat-icon tone-at-risk" size={22} aria-hidden="true" />
            <span>
              <b>
                {formatDate(project.milestoneDate, {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })}
              </b>
              <em>{t('projects.featured.nextMilestone')}</em>
              <small>{project.nextMilestone}</small>
            </span>
          </li>

          <li>
            <TriangleAlert
              className={`mp-stat-icon ${project.openIssues > 0 ? 'tone-delayed' : ''}`}
              size={22}
              aria-hidden="true"
            />
            <span>
              <b>{project.openIssues}</b>
              <em>{tp('projects.featured.openIssues', project.openIssues)}</em>
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}
