import { useEffect, useRef, useState, type RefObject } from 'react'
import { Minus, MoveHorizontal, Plus, RectangleVertical } from 'lucide-react'
import type { FinalReportsLabels } from './finalReportsLabels'

/** Must match the .fr-stage padding; fit-width also leaves room for the vertical scrollbar. */
const stagePadding = 16
const scrollbarAllowance = 14
const zoomSteps = [0.5, 0.75, 1, 1.25, 1.5, 2]
const minFit = 0.25
const maxFit = 3

export type ZoomMode = 'fit-page' | 'fit-width' | 'custom'

/**
 * Zoom for a PDF-style page of `pageWidth` × `pageHeight` px at 100%. The page is laid out at its real
 * zoomed size (no transform scaling). Fit modes follow the stage size (window resizes, full screen,
 * collapsing panels); full screen switches to Fit Page and leaving it restores the previous mode.
 */
export function useViewerZoom(
  stageRef: RefObject<HTMLElement | null>,
  page: { width: number; height: number },
  fullscreenActive: boolean,
) {
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<ZoomMode>('fit-width')

  useEffect(() => {
    const stage = stageRef.current
    if (mode === 'custom' || !stage) return
    const fit = () => {
      // A hidden tab panel has no size yet; it is measured again once it is shown.
      if (stage.clientWidth === 0 || stage.clientHeight === 0) return
      const width = stage.clientWidth - 2 * stagePadding
      const height = stage.clientHeight - 2 * stagePadding
      const value =
        mode === 'fit-page' ? Math.min(width / page.width, height / page.height) : (width - scrollbarAllowance) / page.width
      setZoom(Math.min(maxFit, Math.max(minFit, Math.floor(value * 100) / 100)))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [mode, page.height, page.width, stageRef])

  const modeBeforeFullscreen = useRef<ZoomMode>('fit-width')
  useEffect(() => {
    if (fullscreenActive) {
      modeBeforeFullscreen.current = mode
      setMode('fit-page')
    } else setMode(modeBeforeFullscreen.current)
    // Only reacts to entering or leaving full screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenActive])

  const step = (direction: 1 | -1) => {
    const next =
      direction > 0
        ? zoomSteps.find((value) => value > zoom + 0.001)
        : [...zoomSteps].reverse().find((value) => value < zoom - 0.001)
    if (next) {
      setMode('custom')
      setZoom(next)
    }
  }

  return {
    zoom,
    mode,
    setMode,
    zoomIn: () => step(1),
    zoomOut: () => step(-1),
    canZoomIn: zoom < zoomSteps[zoomSteps.length - 1],
    canZoomOut: zoom > zoomSteps[0],
  }
}

export function ZoomControls({ zoom, labels: l }: { zoom: ReturnType<typeof useViewerZoom>; labels: FinalReportsLabels }) {
  return (
    <>
      <div className="fr-tool-group fr-zoom">
        <button type="button" className="fr-tool" aria-label={l.zoomOut} title={l.zoomOut} disabled={!zoom.canZoomOut} onClick={zoom.zoomOut}>
          <Minus size={15} />
        </button>
        <output aria-live="polite">{Math.round(zoom.zoom * 100)}%</output>
        <button type="button" className="fr-tool" aria-label={l.zoomIn} title={l.zoomIn} disabled={!zoom.canZoomIn} onClick={zoom.zoomIn}>
          <Plus size={15} />
        </button>
      </div>
      <button
        type="button"
        className={`fr-tool ${zoom.mode === 'fit-page' ? 'is-on' : ''}`}
        aria-label={l.fitPage}
        title={l.fitPage}
        aria-pressed={zoom.mode === 'fit-page'}
        onClick={() => zoom.setMode('fit-page')}
      >
        <RectangleVertical size={16} />
      </button>
      <button
        type="button"
        className={`fr-tool ${zoom.mode === 'fit-width' ? 'is-on' : ''}`}
        aria-label={l.fitWidth}
        title={l.fitWidth}
        aria-pressed={zoom.mode === 'fit-width'}
        onClick={() => zoom.setMode('fit-width')}
      >
        <MoveHorizontal size={16} />
      </button>
    </>
  )
}
