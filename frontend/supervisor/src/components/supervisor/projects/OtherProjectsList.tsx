import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react'
import type { SupervisedProject } from '../../../data/supervisor/projectsMockData'
import { useI18n, type TranslationKey } from '../../../i18n/i18nContext'
import { statusLabelKeys } from '../../../i18n/labels'
import { statusTone } from './projectHelpers'

type SortKey = 'progress' | 'milestone' | 'name'

type OtherProjectsListProps = {
  projects: SupervisedProject[]
  onSelect: (name: string) => void
}

const sortLabels: Record<SortKey, TranslationKey> = {
  progress: 'projects.others.sortProgress',
  milestone: 'projects.others.sortMilestone',
  name: 'projects.others.sortName',
}

function sortProjects(projects: SupervisedProject[], key: SortKey) {
  const sorted = [...projects]
  if (key === 'progress') return sorted.sort((a, b) => b.progress - a.progress)
  if (key === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name))
  return sorted.sort((a, b) => a.milestoneDate.localeCompare(b.milestoneDate))
}

export function OtherProjectsList({ projects, onSelect }: OtherProjectsListProps) {
  const { t, formatDate } = useI18n()
  const [sort, setSort] = useState<SortKey>('progress')
  const [view, setView] = useState<'list' | 'grid'>('list')

  return (
    <section className="mp-others" aria-labelledby="mp-others-title">
      <div className="mp-others-heading">
        <h2 id="mp-others-title">{t('projects.others.title')}</h2>
        <label className="mp-sort">
          <span>{t('projects.others.sortBy')}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option value={key} key={key}>
                {t(sortLabels[key])}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>
        <div className="mp-view-toggle" role="group" aria-label={t('projects.others.layout')}>
          <button type="button" aria-label={t('projects.others.listView')} aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={18} />
          </button>
          <button type="button" aria-label={t('projects.others.gridView')} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      <ul className={`mp-rows ${view === 'grid' ? 'is-grid' : ''}`}>
        {sortProjects(projects, sort).map((project) => (
          <li key={project.name}>
            <button
              className="mp-row"
              type="button"
              aria-label={t('projects.others.show', {
                name: project.name,
                status: t(statusLabelKeys[project.status]),
                progress: project.progress,
              })}
              onClick={() => onSelect(project.name)}
            >
              <img src={project.image} alt="" />
              <span className="mp-row-name">
                <strong>{project.name}</strong>
                <small>
                  {project.code}
                  {project.team ? ` · ${project.team}` : ''}
                </small>
              </span>
              <span className={`mp-status-pill tone-${statusTone(project.status)}`}>
                <i aria-hidden="true" />
                {t(statusLabelKeys[project.status])}
              </span>
              <span className="mp-row-progress">
                <strong>{project.progress}%</strong>
                <span className="mp-bar" aria-hidden="true">
                  <span style={{ width: `${project.progress}%` }} />
                </span>
              </span>
              <span className="mp-row-milestone">
                <CalendarDays size={20} aria-hidden="true" />
                <span>
                  <strong>{formatDate(project.milestoneDate, { month: 'short', day: '2-digit', year: 'numeric' })}</strong>
                  <small>{project.nextMilestone}</small>
                </span>
              </span>
              <ChevronRight className="mp-row-chevron" size={20} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
