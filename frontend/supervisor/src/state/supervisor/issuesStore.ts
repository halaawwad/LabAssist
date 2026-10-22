import { useSyncExternalStore } from 'react'
import {
  initialIssues,
  migrateLegacyIssue,
  type Issue,
  type LegacyIssue,
} from '../../data/supervisor/issuesMockData'
import { reportWeeks, type WeeklyTeamReport } from '../../data/supervisor/weeklyReportsMockData'
import { readStored, writeStored } from '../storage'

let snapshot: Issue[] | undefined
const listeners = new Set<() => void>()

function getSnapshot(): Issue[] {
  if (!snapshot) {
    snapshot =
      readStored<Issue[] | null>('issues.v2', null) ??
      readStored<LegacyIssue[] | null>('issues.v1', null)?.map(migrateLegacyIssue) ??
      initialIssues
  }
  return snapshot
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Shared synchronous mock repository: stays live across routes even if storage is blocked. */
export function setIssues(change: (issues: Issue[]) => Issue[]) {
  snapshot = change(getSnapshot())
  writeStored('issues.v2', snapshot)
  listeners.forEach((listener) => listener())
}

export function useIssues() {
  return [useSyncExternalStore(subscribe, getSnapshot), setIssues] as const
}

export const issueToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hebron',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

export function reportIssueKey(reportId: string, detectedIssueId: string) {
  return `weekly-report:${reportId}:${detectedIssueId}`
}

/** Only a Supervisor confirmation calls this. IDs and provenance are ready for a future API. */
export function confirmReportIssue(report: WeeklyTeamReport, detectedIssueId: string) {
  const detected = report.detectedIssues.find((issue) => issue.id === detectedIssueId)
  const week = reportWeeks.find((week) => week.id === report.weekId)
  if (!detected || !week) return
  const existing = getSnapshot().find(
    (issue) =>
      issue.source.kind === 'weekly-report' &&
      issue.source.reportId === report.id &&
      issue.source.detectedIssueId === detected.id,
  )
  if (existing) return existing
  const issue: Issue = {
    id: reportIssueKey(report.id, detected.id),
    title: detected.title,
    description: detected.reason,
    projectId: report.team.projectCode,
    teamId: report.team.id,
    priority: detected.suggestedPriority,
    type: detected.type,
    status: 'open',
    date: issueToday(),
    comments: [],
    source: {
      kind: 'weekly-report',
      reportId: report.id,
      detectedIssueId: detected.id,
      weekId: week.id,
      weekNumber: week.number,
    },
  }
  setIssues((issues) => [issue, ...issues])
  return issue
}
