// Mock data for the Supervisor Meetings page. Each entry mirrors what a meetings endpoint
// could return, so it can be swapped for API data later. Attendees come from the project's
// student group in `progressMockData`, so they are not duplicated here.
import type { ReviewLocation } from './projectsMockData'

/** Soft accent used to tell meetings apart at a glance (never replaces the olive theme). */
export type MeetingTone = 'orange' | 'purple' | 'blue' | 'coral'

export type SupervisorMeeting = {
  id: string
  title: string
  projectCode: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** 24-hour times (HH:mm). */
  start: string
  end: string
  location: ReviewLocation
  tone: MeetingTone
  /** Calendar event backing an online meeting (filled by the backend's Google Calendar integration later). */
  googleEventId: string | null
  /** Join link for online meetings; null for in-person meetings or when no link exists yet. */
  meetingUrl: string | null
  agenda?: string
  locationDetails?: string
}

export const meetingLocations: ReviewLocation[] = [
  'Workshop',
  'Supervisor Office',
  'Online Meeting',
]

export const meetingTones: MeetingTone[] = ['orange', 'purple', 'blue', 'coral']

/** Mock stand-in for the link the backend will return from Google Calendar (`conferenceData`). */
export function createMockMeetingUrl() {
  const letters = 'abcdefghijkmnopqrstuvwxyz'
  const pick = (length: number) =>
    Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
  return `https://meet.google.com/${pick(3)}-${pick(4)}-${pick(3)}`
}

export const supervisorMeetings: SupervisorMeeting[] = [
  {
    id: 'mt-1',
    title: 'Project Alpha – Progress Review',
    projectCode: 'HW17',
    date: '2026-10-12',
    start: '10:00',
    end: '11:00',
    location: 'Workshop',
    tone: 'orange',
    googleEventId: null,
    meetingUrl: null,
  },
  {
    id: 'mt-2',
    title: 'Hardware Design Discussion',
    projectCode: 'HW12',
    date: '2026-10-14',
    start: '14:00',
    end: '15:00',
    location: 'Supervisor Office',
    tone: 'purple',
    googleEventId: null,
    meetingUrl: null,
  },
  {
    id: 'mt-3',
    title: 'Prototype Review',
    projectCode: 'HW07',
    date: '2026-10-16',
    start: '11:00',
    end: '12:00',
    location: 'Online Meeting',
    tone: 'blue',
    googleEventId: 'mock-event-mt-3',
    meetingUrl: 'https://meet.google.com/abc-mhqz-prototype',
  },
  {
    id: 'mt-4',
    title: 'Final Prototype Plan',
    projectCode: 'HW25',
    date: '2026-10-20',
    start: '13:00',
    end: '14:00',
    location: 'Workshop',
    tone: 'coral',
    googleEventId: null,
    meetingUrl: null,
  },
  {
    id: 'mt-5',
    title: 'Sensor Calibration Check',
    projectCode: 'HW28',
    date: '2026-10-08',
    start: '12:30',
    end: '13:15',
    location: 'Workshop',
    tone: 'blue',
    googleEventId: null,
    meetingUrl: null,
  },
  {
    id: 'mt-6',
    title: 'Irrigation Pump Control Review',
    projectCode: 'HW03',
    date: '2026-10-27',
    start: '09:30',
    end: '10:30',
    location: 'Online Meeting',
    tone: 'purple',
    googleEventId: 'mock-event-mt-6',
    meetingUrl: 'https://meet.google.com/irr-pkdw-hwz',
  },
  {
    id: 'mt-7',
    title: 'Proposal Feedback Session',
    projectCode: 'HW41',
    date: '2026-10-05',
    start: '10:00',
    end: '10:45',
    location: 'Supervisor Office',
    tone: 'coral',
    googleEventId: null,
    meetingUrl: null,
  },
  {
    id: 'mt-8',
    title: 'Circuit Design Walkthrough',
    projectCode: 'HW17',
    date: '2026-10-01',
    start: '13:00',
    end: '14:00',
    location: 'Online Meeting',
    tone: 'orange',
    googleEventId: 'mock-event-mt-8',
    meetingUrl: 'https://meet.google.com/cir-twqx-hwq',
  },
  {
    id: 'mt-9',
    title: 'Air Quality Recovery Plan',
    projectCode: 'HW28',
    date: '2026-09-28',
    start: '11:00',
    end: '12:00',
    location: 'Supervisor Office',
    tone: 'blue',
    googleEventId: null,
    meetingUrl: null,
  },
]
