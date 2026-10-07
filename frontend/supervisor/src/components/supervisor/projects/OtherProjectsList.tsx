import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react'
import type { SupervisedProject } from '../../../data/supervisor/projectsMockData'
import { statusTone } from './projectHelpers'

type SortKey = 'progress' | 'milestone' | 'name'

type OtherProjectsListProps = {
  projects: SupervisedProject[]
  onSelect: (name: string) => void
}

const sortLabels: Record<SortKey, string> = { progress: 'Progress', milestone: 'Next Milestone', name: 'Name' }

function sortProjects(projects: SupervisedProject[], key: SortKey) {
  const sorted = [...projects]
  if (key === 'progress') return sorted.sort((a, b) => b.progress - a.progress)
  if (key === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name))
  return sorted.sort((a, b) => Date.parse(a.milestoneDate) - Date.parse(b.milestoneDate))
}

export function OtherProjectsList({ projects, onSelect }: OtherProjectsListProps) {
  const [sort, setSort] = useState<SortKey>('progress')
  const [view, setView] = useState<'list' | 'grid'>('list')

  return (
    <section className="mp-others" aria-labelledby="mp-others-title">
      <div className="mp-others-heading">
        <h2 id="mp-others-title">Other Projects</h2>
        <label className="mp-sort">
          <span>Sort by:</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option value={key} key={key}>
                {sortLabels[key]}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>
        <div className="mp-view-toggle" role="group" aria-label="Layout">
          <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={18} />
          </button>
          <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
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
              aria-label={`Show ${project.name}: ${project.status}, ${project.progress}% progress`}
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
                {project.status}
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
                  <strong>{project.milestoneDate}</strong>
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
