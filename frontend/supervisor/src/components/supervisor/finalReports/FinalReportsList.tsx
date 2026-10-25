import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileText, MonitorPlay, MoreHorizontal, Search } from 'lucide-react'
import type {
  FinalReportProject,
  FinalReportReview,
  FinalReportStatus,
} from '../../../data/supervisor/finalReportsMockData'
import { fill, type FinalReportsLabels } from './finalReportsLabels'
import { currentSubmission } from './finalReportsHelpers'
import { StatusPill } from './StatusPill'

export type FinalReportTab = 'report' | 'presentation'

type FinalReportsListProps = {
  items: { project: FinalReportProject; review: FinalReportReview }[]
  selectedId: string
  labels: FinalReportsLabels
  query: string
  onQueryChange: (value: string) => void
  status: FinalReportStatus | 'all'
  onStatusChange: (value: FinalReportStatus | 'all') => void
  onOpen: (id: string, tab?: FinalReportTab) => void
  onDownload: (id: string) => void
}

const statuses: FinalReportStatus[] = ['draft', 'submitted', 'revision', 'approved']

export function FinalReportsList({
  items,
  selectedId,
  labels: l,
  query,
  onQueryChange,
  status,
  onStatusChange,
  onOpen,
  onDownload,
}: FinalReportsListProps) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuId) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuId(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuId])

  const menuAction = (action: () => void) => {
    setMenuId(null)
    action()
  }

  return (
    <section className="fr-card fr-projects" aria-labelledby="fr-projects-title">
      <h2 id="fr-projects-title">{l.projects}</h2>
      <div className="fr-project-filters">
        <label className="fr-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder={l.searchProjects}
            aria-label={l.searchProjects}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <label className="fr-select">
          <select
            value={status}
            aria-label={l.statusFilter}
            onChange={(event) => onStatusChange(event.target.value as FinalReportStatus | 'all')}
          >
            <option value="all">{l.allStatus}</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {l.status[item]}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="fr-empty">{l.noProjects}</p>
      ) : (
        <ul className="fr-project-list">
          {items.map(({ project, review }) => (
            <li key={project.id} className={project.id === selectedId ? 'is-selected' : undefined}>
              <button
                type="button"
                className="fr-project"
                aria-current={project.id === selectedId ? 'true' : undefined}
                onClick={() => onOpen(project.id)}
              >
                <img src={project.image} alt="" />
                <span className="fr-project-copy">
                  <strong>{project.name}</strong>
                  <small>{project.students.map((student) => student.name).join(', ')}</small>
                  <StatusPill status={currentSubmission(review).status} labels={l} />
                </span>
              </button>
              <div className="fr-project-menu" ref={menuId === project.id ? menuRef : undefined}>
                <button
                  type="button"
                  className="fr-tool"
                  aria-haspopup="menu"
                  aria-expanded={menuId === project.id}
                  aria-label={fill(l.moreActions, { name: project.name })}
                  title={fill(l.moreActions, { name: project.name })}
                  onClick={() => setMenuId((current) => (current === project.id ? null : project.id))}
                >
                  <MoreHorizontal size={17} />
                </button>
                {menuId === project.id ? (
                  <div className="fr-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => menuAction(() => onOpen(project.id, 'report'))}>
                      <FileText size={15} aria-hidden="true" />
                      {l.openReport}
                    </button>
                    <button type="button" role="menuitem" onClick={() => menuAction(() => onOpen(project.id, 'presentation'))}>
                      <MonitorPlay size={15} aria-hidden="true" />
                      {l.openPresentation}
                    </button>
                    <button type="button" role="menuitem" onClick={() => menuAction(() => onDownload(project.id))}>
                      <Download size={15} aria-hidden="true" />
                      {l.downloadReport}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
