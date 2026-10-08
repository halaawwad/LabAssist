import type { ProgressStatus, ProjectProgress } from '../../../data/supervisor/progressMockData'

export function progressStatusTone(status: ProgressStatus) {
  return `tone-${status.toLowerCase().replaceAll(' ', '-')}`
}

/** Overall progress is the latest recorded week; the weekly change compares it with the week before. */
export function progressMetrics(project: ProjectProgress) {
  const values = project.weeklyProgress
  const thisWeek = values[values.length - 1] ?? 0
  const lastWeek = values[values.length - 2] ?? 0

  return { overall: thisWeek, thisWeek, lastWeek, weeklyChange: thisWeek - lastWeek }
}

/** Projects the next weeks at the team's average weekly pace so far, capped at 100%. */
export function projectProgress(values: number[], weeksAhead: number) {
  if (values.length < 2) return []
  const pace = (values[values.length - 1] - values[0]) / (values.length - 1)
  const last = values[values.length - 1]
  return Array.from({ length: weeksAhead }, (_, i) => Math.min(100, Math.round(last + pace * (i + 1))))
}
