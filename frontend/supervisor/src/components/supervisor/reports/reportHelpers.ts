import { useEffect, useRef, useState } from 'react'
import type { ReportWeek, WeeklyTeamReport } from '../../../data/supervisor/weeklyReportsMockData'

export function weekDays(week: ReportWeek) {
  const start = new Date(`${week.start}T00:00:00Z`)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setUTCDate(start.getUTCDate() + index)
    return day.toISOString().slice(0, 10)
  })
}

export function matchesSearch(report: WeeklyTeamReport, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [report.team.name, report.team.projectName, report.team.projectCode].some((value) => value.toLowerCase().includes(needle))
}

/** Highest progress first. */
export function compareReports(a: WeeklyTeamReport, b: WeeklyTeamReport) {
  return b.progress - a.progress
}

const avatarTones = ['green', 'gold', 'blue', 'violet', 'coral'] as const

/** Stable avatar tint per team or student id (identity only). */
export function avatarTone(id: string) {
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatarTones[hash % avatarTones.length]
}

/** Bar/ring tone follows the reported progress, like the rest of the portal. */
export function progressTone(progress: number) {
  if (progress >= 75) return 'good'
  if (progress >= 60) return 'warn'
  return 'risk'
}

/** Smooth curve through the points (Catmull-Rom as cubic Béziers), kept inside [minY, maxY] so it never dips below the axis. */
export function smoothPath(points: [number, number][], minY: number, maxY: number) {
  if (points.length === 0) return ''
  const clamp = (value: number) => Math.min(maxY, Math.max(minY, value))
  let path = `M${points[0][0]},${points[0][1]}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index - 1] ?? points[index]
    const [x1, y1] = points[index]
    const [x2, y2] = points[index + 1]
    const [x3, y3] = points[index + 2] ?? points[index + 1]
    const c1x = x1 + (x2 - x0) / 6
    const c1y = clamp(y1 + (y2 - y0) / 6)
    const c2x = x2 - (x3 - x1) / 6
    const c2y = clamp(y2 - (y3 - y1) / 6)
    path += ` C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`
  }
  return path
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Eases a displayed number toward `value` (count-up on load, glide on change). */
export function useAnimatedNumber(value: number, duration = 900) {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0))
  const displayRef = useRef(display)

  useEffect(() => {
    const show = (next: number) => {
      displayRef.current = next
      setDisplay(next)
    }
    if (prefersReducedMotion()) {
      show(value)
      return
    }
    const from = displayRef.current
    const startAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startAt) / duration)
      show(from + (value - from) * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return display
}
