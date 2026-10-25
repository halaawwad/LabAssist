import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import type { FinalReportProject, Slide } from '../../../data/supervisor/finalReportsMockData'
import { fill, type FinalReportsLabels } from './finalReportsLabels'
import { useFullscreen } from './finalReportsHelpers'
import { useViewerZoom, ZoomControls } from './ViewerZoom'

/** Presentation PDF page size at 100% (16:9 landscape). */
const presentationPage = { width: 1123, height: 632 }

type PresentationViewerProps = {
  project: FinalReportProject
  labels: FinalReportsLabels
  pageIndex: number
  onPageChange: (index: number) => void
  onDownload: () => void
}

/** View-only viewer of the uploaded presentation PDF: browse, zoom, full screen and download, never edit. */
export function PresentationViewer({ project, labels: l, pageIndex, onPageChange, onDownload }: PresentationViewerProps) {
  const total = project.slides.length
  const slide = project.slides[pageIndex] ?? project.slides[0]
  const [railOpen, setRailOpen] = useState(true)
  const fullscreen = useFullscreen<HTMLDivElement>()
  const stageRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLOListElement>(null)
  const zoom = useViewerZoom(stageRef, presentationPage, fullscreen.active)
  const go = (index: number) => onPageChange(Math.min(total - 1, Math.max(0, index)))

  useEffect(() => {
    if (!fullscreen.active) setRailOpen(true)
  }, [fullscreen.active])

  // Keep the current thumbnail visible by scrolling the rail only (never the page).
  useEffect(() => {
    const rail = railRef.current
    const item = rail?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!rail || !item) return
    const top = item.offsetTop - rail.offsetTop
    if (top < rail.scrollTop || top + item.offsetHeight > rail.scrollTop + rail.clientHeight)
      rail.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' })
  }, [pageIndex])

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') go(pageIndex + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(pageIndex - 1)
    else return
    event.preventDefault()
  }

  return (
    <div
      className={`fr-viewer is-presentation ${fullscreen.active ? 'is-fullscreen' : ''} ${railOpen ? '' : 'is-structure-hidden'}`}
      ref={fullscreen.ref}
    >
      <nav className="fr-structure fr-slide-rail" aria-label={l.slides} hidden={!railOpen}>
        <h3>{l.slides}</h3>
        <ol ref={railRef}>
          {project.slides.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={index === pageIndex ? 'is-active' : undefined}
                aria-current={index === pageIndex ? 'true' : undefined}
                aria-label={fill(l.slideLabel, { index: index + 1, title: item.title })}
                onClick={() => go(index)}
              >
                <span className="fr-thumb-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="fr-thumb" aria-hidden="true">
                  <SlideView project={project} slide={item} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="fr-document">
        <div className="fr-toolbar" role="toolbar" aria-label={l.slides}>
          {fullscreen.active ? (
            <button
              type="button"
              className="fr-tool"
              aria-pressed={!railOpen}
              aria-label={railOpen ? l.hidePages : l.showPages}
              title={railOpen ? l.hidePages : l.showPages}
              onClick={() => setRailOpen((open) => !open)}
            >
              {railOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          ) : null}
          <div className="fr-tool-group">
            <button type="button" className="fr-tool" aria-label={l.prevPage} title={l.prevPage} disabled={pageIndex === 0} onClick={() => go(pageIndex - 1)}>
              <ChevronLeft size={17} />
            </button>
            <output className="fr-slide-count" aria-live="polite">
              {fill(l.slideOf, { index: pageIndex + 1, total })}
            </output>
            <button type="button" className="fr-tool" aria-label={l.nextPage} title={l.nextPage} disabled={pageIndex === total - 1} onClick={() => go(pageIndex + 1)}>
              <ChevronRight size={17} />
            </button>
          </div>
          <ZoomControls zoom={zoom} labels={l} />
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
          <span className="fr-view-only fr-file-badge" title={l.viewOnlyHint}>
            <Eye size={15} aria-hidden="true" />
            <span>{l.viewOnlyBadge}</span>
          </span>
        </div>

        <div
          className="fr-stage fr-slide-stage"
          ref={stageRef}
          tabIndex={0}
          role="region"
          aria-label={fill(l.slideLabel, { index: pageIndex + 1, title: slide.title })}
          onKeyDown={onKey}
        >
          <div className="fr-slide-frame" style={{ '--fr-zoom': zoom.zoom } as CSSProperties}>
            <SlideView project={project} slide={slide} />
          </div>
        </div>
        <p className="fr-viewer-hint">
          {project.presentationFile.fileName} · {l.viewOnlyHint}
        </p>
      </div>
    </div>
  )
}

function SlideView({ project, slide }: { project: FinalReportProject; slide: Slide }) {
  const index = project.slides.indexOf(slide) + 1
  return (
    <section className={`fr-slide is-${slide.layout}`} dir="ltr" lang="en">
      {slide.layout === 'title' || slide.layout === 'closing' ? (
        <>
          {slide.layout === 'title' ? <img className="fr-slide-photo" src={project.image} alt="" /> : null}
          <div className="fr-slide-hero">
            <small>An-Najah National University · {project.code}</small>
            <h4>{slide.title}</h4>
            {slide.subtitle ? <p>{slide.subtitle}</p> : null}
          </div>
        </>
      ) : (
        <>
          <h4>{slide.title}</h4>
          {slide.layout === 'bullets' ? (
            <ul>
              {slide.items?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {slide.layout === 'blocks' ? (
            <ol className="fr-slide-blocks">
              {slide.items?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : null}
          {slide.layout === 'table' && slide.table ? (
            <table>
              <thead>
                <tr>
                  {slide.table.head.map((cell) => (
                    <th key={cell}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.table.rows.map((row) => (
                  <tr key={row.join('|')}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
      <footer>
        <span>{project.name}</span>
        <span>{index}</span>
      </footer>
    </section>
  )
}
