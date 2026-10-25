import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react'
import {
  reportSectionOrder,
  type FinalReportProject,
  type ReportSubmission,
} from '../../../data/supervisor/finalReportsMockData'
import { fill, type FinalReportsLabels } from './finalReportsLabels'
import { pageText, useFullscreen } from './finalReportsHelpers'
import { ReportSheet } from './ReportSheet'
import { useViewerZoom, ZoomControls } from './ViewerZoom'

/**
 * Page size at 100%: A4 at 96 dpi. The sheet is sized in em and the zoom sets the em size, so every
 * zoom level lays the paper out at a real, larger or smaller size (no transform scaling).
 */
const reportPage = { width: 794, height: 1123 }

type ReportViewerProps = {
  project: FinalReportProject
  submission: ReportSubmission
  supervisor: string
  labels: FinalReportsLabels
  pageIndex: number
  onPageChange: (index: number) => void
  onDownload: () => void
}

/** View-only viewer of the submitted report PDF: supervisors review it and never change its content. */
export function ReportViewer({ project, submission, supervisor, labels: l, pageIndex, onPageChange, onDownload }: ReportViewerProps) {
  const total = project.pages.length
  const page = project.pages[pageIndex] ?? project.pages[0]
  const [structureOpen, setStructureOpen] = useState(true)
  const [pageInput, setPageInput] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const fullscreen = useFullscreen<HTMLDivElement>()
  const zoom = useViewerZoom(stageRef, reportPage, fullscreen.active)

  const go = (index: number) => onPageChange(Math.min(total - 1, Math.max(0, index)))

  // The structure panel can only be hidden in full screen; it comes back when leaving.
  useEffect(() => {
    if (!fullscreen.active) setStructureOpen(true)
  }, [fullscreen.active])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return project.pages.flatMap((item, index) => (pageText(item).toLowerCase().includes(needle) ? [index] : []))
  }, [project.pages, query])

  const nextMatch = () => {
    if (matches.length === 0) return
    go(matches.find((index) => index > pageIndex) ?? matches[0])
  }

  const onStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') go(pageIndex + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(pageIndex - 1)
    else return
    event.preventDefault()
  }

  const commitPageInput = () => {
    if (pageInput === null) return
    const value = Number(pageInput)
    if (Number.isFinite(value)) go(Math.round(value) - 1)
    setPageInput(null)
  }

  return (
    <div
      className={`fr-viewer ${fullscreen.active ? 'is-fullscreen' : ''} ${structureOpen ? '' : 'is-structure-hidden'}`}
      ref={fullscreen.ref}
    >
      <nav className="fr-structure" aria-label={l.structure} hidden={!structureOpen}>
        <h3>{l.structure}</h3>
        <ol>
          {reportSectionOrder.map((section) => {
            const first = project.pages.findIndex((item) => item.section === section)
            if (first < 0) return null
            return (
              <li key={section}>
                <button
                  type="button"
                  className={page.section === section ? 'is-active' : undefined}
                  aria-current={page.section === section ? 'true' : undefined}
                  onClick={() => go(first)}
                >
                  <FileText size={15} strokeWidth={1.7} aria-hidden="true" />
                  <span>{l.sections[section]}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="fr-document">
        <div className="fr-toolbar" role="toolbar" aria-label={l.toolbar}>
          {fullscreen.active ? (
            <button
              type="button"
              className="fr-tool"
              aria-pressed={!structureOpen}
              aria-label={structureOpen ? l.hideStructure : l.showStructure}
              title={structureOpen ? l.hideStructure : l.showStructure}
              onClick={() => setStructureOpen((open) => !open)}
            >
              {structureOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          ) : null}
          <div className="fr-tool-group">
            <button type="button" className="fr-tool" aria-label={l.prevPage} title={l.prevPage} disabled={pageIndex === 0} onClick={() => go(pageIndex - 1)}>
              <ChevronLeft size={17} />
            </button>
            <input
              className="fr-page-input"
              inputMode="numeric"
              aria-label={l.pageNumber}
              value={pageInput ?? String(pageIndex + 1)}
              onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ''))}
              onBlur={commitPageInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitPageInput()
                if (event.key === 'Escape') setPageInput(null)
              }}
            />
            <span className="fr-page-total">{fill(l.pageOf, { total })}</span>
            <button type="button" className="fr-tool" aria-label={l.nextPage} title={l.nextPage} disabled={pageIndex === total - 1} onClick={() => go(pageIndex + 1)}>
              <ChevronRight size={17} />
            </button>
          </div>

          <ZoomControls zoom={zoom} labels={l} />
          <button
            type="button"
            className={`fr-tool ${searchOpen ? 'is-on' : ''}`}
            aria-label={l.search}
            title={l.search}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open)
              if (searchOpen) setQuery('')
            }}
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            className="fr-tool"
            aria-label={fullscreen.active ? l.exitFullscreen : l.fullscreen}
            title={fullscreen.active ? l.exitFullscreen : l.fullscreen}
            onClick={() => void fullscreen.toggle()}
          >
            {fullscreen.active ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button type="button" className="fr-tool" aria-label={l.download} title={l.download} onClick={onDownload}>
            <Download size={16} />
          </button>

          <span className="fr-view-only fr-file-badge" title={l.reportViewOnlyHint}>
            <Eye size={15} aria-hidden="true" />
            <span>{l.viewOnlyBadge}</span>
          </span>
        </div>

        {searchOpen ? (
          <div className="fr-search-row">
            <Search size={15} aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={query}
              placeholder={l.searchPlaceholder}
              aria-label={l.search}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') nextMatch()
                if (event.key === 'Escape') {
                  setQuery('')
                  setSearchOpen(false)
                }
              }}
            />
            <span aria-live="polite">
              {query.trim() ? (matches.length ? fill(l.matches, { count: matches.length }) : l.noMatches) : ''}
            </span>
            <button type="button" className="fr-tool" aria-label={l.nextMatch} title={l.nextMatch} disabled={matches.length === 0} onClick={nextMatch}>
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}

        {submission.status === 'draft' ? <p className="fr-viewer-banner">{l.draftBanner}</p> : null}

        <div
          className="fr-stage"
          ref={stageRef}
          tabIndex={0}
          role="region"
          aria-label={fill(l.reportPage, { page: pageIndex + 1 })}
          onKeyDown={onStageKey}
        >
          <div className="fr-stage-inner" style={{ '--fr-zoom': zoom.zoom } as CSSProperties}>
            <ReportSheet project={project} page={page} supervisor={supervisor} query={query} />
          </div>
        </div>
      </div>
    </div>
  )
}
