import { describe, expect, it } from 'vitest'
import { buildWorkshopNotifications } from '../src/state/supervisor/workshopNotifications'
import { upcomingReviews } from '../src/data/supervisor/projectsMockData'
import { workshopFrontDoorClosesAt, workshopManagerAbsences } from '../src/data/supervisor/notificationsMockData'

describe('workshop reminders for supervisors', () => {
  it('does not notify for past meetings', () => {
    expect(buildWorkshopNotifications(new Date(2100, 0, 1))).toEqual([])
  })
  it('only sends back-door reminders for workshop meetings after closing', () => {
    const items = buildWorkshopNotifications(new Date(2020, 0, 1))
    const expected = upcomingReviews.filter(x => x.location === 'Workshop' && x.time >= workshopFrontDoorClosesAt)
    expect(items.filter(x => x.template === 'workshopBackDoor').map(x => x.params.date).sort())
      .toEqual(expected.map(x => x.date).sort())
    expect(new Set(items.map(x => x.id)).size).toBe(items.length)
  })
  it('only emits manager absence alerts when a workshop visit is scheduled', () => {
    const items = buildWorkshopNotifications(new Date(2020, 0, 1))
    for (const item of items.filter(x => x.template.startsWith('managerAbsent'))) {
      expect(workshopManagerAbsences.some(x => x.date === item.params.date)).toBe(true)
      expect(upcomingReviews.some(x => x.location === 'Workshop' && x.date === item.params.date)).toBe(true)
    }
  })
})
