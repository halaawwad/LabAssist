import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AbetCriterionId,
  FinalReportProject,
  FinalReportReview,
  ReportPage,
  ReportSubmission,
} from '../../../data/supervisor/finalReportsMockData'

/** The version under review: the latest uploaded PDF. */
export const currentSubmission = (review: FinalReportReview) => review.submissions[review.submissions.length - 1]

/** All searchable text on a report page, used by the in-viewer search. */
export function pageText(page: ReportPage) {
  return [
    page.title ?? '',
    ...page.blocks.map((block) => {
      switch (block.kind) {
        case 'heading':
        case 'paragraph':
          return block.text
        case 'list':
          return block.items.join(' ')
        case 'table':
          return [block.caption, ...block.head, ...block.rows.flat()].join(' ')
        case 'figure':
          return block.caption
        case 'entries':
          return block.entries.map((entry) => entry.label).join(' ')
        case 'definitions':
          return block.entries.flat().join(' ')
      }
    }),
  ].join(' ')
}

export function isCovered(review: FinalReportReview, criterion: AbetCriterionId) {
  return review.criteria[criterion] ?? !review.missing.includes(criterion)
}

/* ---------- Mock PDF downloads ---------- */

type PdfLine = { text: string; style?: 'title' | 'heading' | 'body' | 'small' }
type PdfPage = PdfLine[]

const pdfFonts = {
  title: { font: 'F2', size: 18 },
  heading: { font: 'F2', size: 12 },
  body: { font: 'F1', size: 10.5 },
  small: { font: 'F1', size: 8.5 },
}

/** Helvetica with WinAnsi encoding covers Latin-1; other characters are mapped or replaced. */
function pdfText(value: string) {
  return value
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
    .replace(/→/g, '->')
    .replace(/[^\x20-\xff]/g, '?')
    .replace(/[\\()]/g, (char) => `\\${char}`)
}

function wrap(text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/** Builds a small, valid multi-page PDF (Helvetica text only) for the mock download. */
function buildPdf(pages: PdfPage[], size: { width: number; height: number }, footer: string) {
  const margin = 54
  const chars = Math.floor((size.width - 2 * margin) / 5.4)
  // Lay lines out, continuing on a new physical page when a report page overflows.
  const physical: { text: string; font: string; size: number; y: number }[][] = []
  for (const page of pages) {
    let current: (typeof physical)[number] = []
    let y = size.height - margin
    for (const line of page) {
      const style = pdfFonts[line.style ?? 'body']
      const width = Math.floor(chars * (10.5 / style.size))
      for (const part of wrap(line.text, width)) {
        if (y < margin + 30) {
          physical.push(current)
          current = []
          y = size.height - margin
        }
        current.push({ text: part, font: style.font, size: style.size, y })
        y -= style.size * 1.45
      }
      if (line.style === 'title' || line.style === 'heading') y -= 6
    }
    physical.push(current)
  }

  const objects: string[] = []
  const add = (body: string) => objects.push(body) // object number = index + 1
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('') // page tree, filled in once the page objects exist
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const kids: number[] = []
  physical.forEach((lines, index) => {
    const stream = [
      ...lines.map((line) => `BT /${line.font} ${line.size} Tf ${margin} ${line.y.toFixed(1)} Td (${pdfText(line.text)}) Tj ET`),
      `BT /F1 8 Tf ${margin} 28 Td (${pdfText(`${footer} - page ${index + 1} of ${physical.length}`)}) Tj ET`,
    ].join('\n')
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    const contentRef = objects.length
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size.width} ${size.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`,
    )
    kids.push(objects.length)
  })
  objects[1] = `<< /Type /Pages /Kids [${kids.map((kid) => `${kid} 0 R`).join(' ')}] /Count ${kids.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  // Every character is in the 0-255 range, so string length equals byte length.
  return new Blob([Uint8Array.from(pdf, (char) => char.charCodeAt(0))], { type: 'application/pdf' })
}

/** PDF of the submitted report version (mock content; the portal has no uploaded file yet). */
export function reportPdf(project: FinalReportProject, submission: ReportSubmission, supervisor: string) {
  const pages: PdfPage[] = project.pages.map((page) => {
    if (page.section === 'cover')
      return [
        { text: 'An-Najah National University - Faculty of Engineering and Information Technology', style: 'small' },
        { text: '' },
        { text: project.name, style: 'title' },
        { text: 'Graduation Project Report', style: 'heading' },
        { text: '' },
        { text: 'Prepared by:', style: 'heading' },
        ...project.students.map((student) => ({ text: `${student.name} ${student.id}` })),
        { text: '' },
        { text: 'Supervisor:', style: 'heading' },
        { text: supervisor },
        { text: '' },
        { text: project.year, style: 'heading' },
      ]
    const lines: PdfLine[] = page.title ? [{ text: page.title.replace(/\s+/g, ' '), style: 'title' }] : []
    for (const block of page.blocks) {
      if (block.kind === 'heading') lines.push({ text: block.text.replace(/\s+/g, ' '), style: 'heading' })
      else if (block.kind === 'paragraph') lines.push({ text: block.text })
      else if (block.kind === 'list')
        block.items.forEach((item, index) => lines.push({ text: `${block.ordered ? `${index + 1}.` : '-'} ${item}` }))
      else if (block.kind === 'table')
        lines.push(
          { text: block.head.join('  |  '), style: 'heading' },
          ...block.rows.map((row) => ({ text: row.join('  |  ') })),
          { text: block.caption, style: 'small' },
        )
      else if (block.kind === 'figure') lines.push({ text: `[${block.caption}]`, style: 'small' })
      else if (block.kind === 'entries')
        block.entries.forEach((entry) =>
          lines.push({ text: `${entry.level === 2 ? '    ' : ''}${entry.label.replace(/\s+/g, ' ')} ..... ${entry.page}` }),
        )
      else block.entries.forEach(([term, meaning]) => lines.push({ text: `${term}    ${meaning}` }))
    }
    if (page.number) lines.push({ text: '' }, { text: page.number, style: 'small' })
    return lines
  })
  return buildPdf(pages, { width: 595, height: 842 }, `${submission.fileName} (LabAssist mock PDF)`)
}

/** PDF of the presentation: one landscape page per slide. */
export function presentationPdf(project: FinalReportProject) {
  const pages: PdfPage[] = project.slides.map((slide) => [
    { text: `${project.name} - ${project.code}`, style: 'small' },
    { text: slide.title, style: 'title' },
    ...(slide.subtitle ? [{ text: slide.subtitle }] : []),
    ...(slide.items ?? []).map((item) => ({ text: `- ${item}` })),
    ...(slide.table
      ? [{ text: slide.table.head.join('  |  '), style: 'heading' as const }, ...slide.table.rows.map((row) => ({ text: row.join('  |  ') }))]
      : []),
  ])
  return buildPdf(pages, { width: 842, height: 474 }, `${project.presentationFile.fileName} (LabAssist mock PDF)`)
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Viewer helpers ---------- */

/**
 * Fullscreen for one element. Falls back to a fixed, viewport-filling overlay when the Fullscreen API
 * is unavailable or refused (for example inside an embedded preview); Escape leaves either mode.
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => setActive(document.fullscreenElement === ref.current && ref.current !== null)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  useEffect(() => {
    if (!active || document.fullscreenElement) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined)
      return
    }
    if (active) {
      setActive(false)
      return
    }
    try {
      if (!ref.current?.requestFullscreen) throw new Error('unsupported')
      await ref.current.requestFullscreen()
    } catch {
      setActive(true)
    }
  }, [active])

  return { ref, active, toggle }
}

/** "2026-10-15T14:20" → ["2026-10-15", "14:20"]. */
export function splitDateTime(value: string) {
  const [date, time = '00:00'] = value.split('T')
  return [date, time] as const
}

const hebronParts = (options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hebron', hourCycle: 'h23', ...options })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  )

export const todayIso = () => {
  const parts = hebronParts({ year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Current local date and time as YYYY-MM-DDTHH:mm. */
export const nowLocal = () => {
  const parts = hebronParts({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
