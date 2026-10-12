import {
  workshopFrontDoorClosesAt,
  workshopManagerAbsences,
  type SupervisorNotification,
} from '../../data/supervisor/notificationsMockData'
import { upcomingReviews } from '../../data/supervisor/projectsMockData'

const target = '/supervisor/projects#mp-reviews-title'

/** Whole days from today to an ISO date (negative for past dates). */
function daysFromToday(isoDate: string, today: Date) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((new Date(year, month - 1, day).getTime() - start.getTime()) / 86_400_000)
}

/**
 * Workshop notifications derived from the Supervisor's upcoming Workshop meetings:
 * - a back-door reminder for each meeting at or after the front door closes;
 * - a Workshop Manager absence alert only when the Supervisor has a Workshop meeting that day.
 */
export function buildWorkshopNotifications(today: Date): SupervisorNotification[] {
  const workshopMeetings = upcomingReviews
    .filter((review) => review.location === 'Workshop' && daysFromToday(review.date, today) >= 0)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))

  const accessReminders = workshopMeetings
    .filter((meeting) => meeting.time >= workshopFrontDoorClosesAt)
    .map<SupervisorNotification>((meeting) => ({
      id: `workshop-access-${meeting.id}`,
      type: 'workshop',
      template: 'workshopBackDoor',
      params: { team: meeting.team, date: meeting.date, time: meeting.time, closesAt: workshopFrontDoorClosesAt },
      minutesAgo: 60,
      read: false,
      target,
    }))

  const absenceAlerts = workshopManagerAbsences.flatMap<SupervisorNotification>((absence) => {
    const meeting = workshopMeetings.find((item) => item.date === absence.date)
    if (!meeting) return []
    const days = daysFromToday(absence.date, today)
    return [
      {
        id: `workshop-manager-absent-${absence.id}`,
        type: 'workshop',
        template: days === 0 ? 'managerAbsentToday' : days === 1 ? 'managerAbsentTomorrow' : 'managerAbsentOnDate',
        params: { team: meeting.team, date: meeting.date, time: meeting.time },
        minutesAgo: absence.minutesAgo,
        read: false,
        target,
      },
    ]
  })

  return [...accessReminders, ...absenceAlerts]
}
