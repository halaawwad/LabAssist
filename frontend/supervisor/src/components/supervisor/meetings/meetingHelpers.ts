import type { SupervisorMeeting } from '../../../data/supervisor/meetingsMockData'
import { progressProjects } from '../../../data/supervisor/progressMockData'

export type MeetingTab = 'upcoming' | 'past' | 'all'
export type MeetingStatus = 'past' | 'today' | 'upcoming'

export const meetingTabs: MeetingTab[] = ['upcoming', 'past', 'all']

/** The user's current local date as an ISO date (YYYY-MM-DD). */
export function todayIso(now = new Date()) {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Status is never stored: it is worked out from the meeting's start date against today. */
export function meetingStatus(meeting: SupervisorMeeting, today = todayIso()): MeetingStatus {
  if (meeting.date < today) return 'past'
  return meeting.date === today ? 'today' : 'upcoming'
}

/** Upcoming includes today's meetings; Past is everything before today. */
export function matchesTab(meeting: SupervisorMeeting, tab: MeetingTab, today = todayIso()) {
  const status = meetingStatus(meeting, today)
  if (tab === 'upcoming') return status !== 'past'
  if (tab === 'past') return status === 'past'
  return true
}

const stamp = (meeting: SupervisorMeeting) => `${meeting.date}T${meeting.start}`

/** Past meetings read newest first; everything else in calendar order. */
export function compareMeetings(a: SupervisorMeeting, b: SupervisorMeeting, tab: MeetingTab) {
  return tab === 'past' ? stamp(b).localeCompare(stamp(a)) : stamp(a).localeCompare(stamp(b))
}

export function meetingProject(code: string) {
  return progressProjects.find((project) => project.code === code)
}

/** ISO date (YYYY-MM-DD) for a calendar cell, built without time-zone shifts. */
export function isoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
