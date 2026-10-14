import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SupervisorMeeting } from '../../../data/supervisor/meetingsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { isoDate, todayIso } from './meetingHelpers'

type MeetingCalendarProps = {
  meetings: SupervisorMeeting[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

/** Compact month calendar in a popover; days with meetings carry dots in the meeting's accent. */
export function MeetingCalendar({ meetings, selectedDate, onSelectDate }: MeetingCalendarProps) {
  const { t, tp, formatDate } = useI18n()
  const [open, setOpen] = useState(false)
  const today = todayIso()
  const initial = (selectedDate ?? today).split('-').map(Number)
  const [view, setView] = useState({ year: initial[0], month: initial[1] - 1 })
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on a click outside or Esc.
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const byDate = new Map<string, SupervisorMeeting[]>()
  for (const meeting of meetings) byDate.set(meeting.date, [...(byDate.get(meeting.date) ?? []), meeting])

  const shiftMonth = (delta: number) =>
    setView(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + delta, 1))
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    })

  return (
    <div className="meetings-calendar" ref={rootRef}>
      <button
        className={`meetings-icon-button ${open || selectedDate ? 'is-active' : ''}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('meetings.calendar.open')}
        title={t('meetings.calendar.open')}
        onClick={() => setOpen((value) => !value)}
      >
        <CalendarDays size={19} />
      </button>

      {open ? (
        <div className="meetings-calendar-popover" role="dialog" aria-label={t('meetings.calendar.title')}>
          <header>
            <button type="button" aria-label={t('meetings.calendar.previous')} onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <strong>{formatDate(isoDate(view.year, view.month, 1), { month: 'long', year: 'numeric' })}</strong>
            <button type="button" aria-label={t('meetings.calendar.next')} onClick={() => shiftMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </header>

          <div className="meetings-calendar-grid">
            {Array.from({ length: 7 }, (_, index) => {
              // Oct 4, 2026 is a Sunday: label the columns from that week in the current language.
              const day = isoDate(2026, 9, 4 + index)
              return (
                <abbr className="meetings-calendar-weekday" title={formatDate(day, { weekday: 'long' })} key={day}>
                  {formatDate(day, { weekday: 'narrow' })}
                </abbr>
              )
            })}
            {cells.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />
              const date = isoDate(view.year, view.month, day)
              const dayMeetings = byDate.get(date) ?? []
              const classes = [
                'meetings-calendar-day',
                date === selectedDate ? 'is-selected' : '',
                date === today ? 'is-today' : '',
              ].join(' ')
              return (
                <button
                  className={classes}
                  type="button"
                  aria-pressed={date === selectedDate}
                  aria-label={`${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}${
                    dayMeetings.length ? ` · ${tp('meetings.calendar.hasMeetings', dayMeetings.length)}` : ''
                  }`}
                  onClick={() => {
                    onSelectDate(date)
                    setOpen(false)
                  }}
                  key={date}
                >
                  {day}
                  {dayMeetings.length ? (
                    <span className="meetings-calendar-dots" aria-hidden="true">
                      {dayMeetings.slice(0, 3).map((meeting) => (
                        <i className={`tone-${meeting.tone}`} key={meeting.id} />
                      ))}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <footer>
            <button
              type="button"
              onClick={() => {
                const [year, month] = today.split('-').map(Number)
                setView({ year, month: month - 1 })
              }}
            >
              {t('meetings.calendar.thisMonth')}
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  )
}
