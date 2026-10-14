import { useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { Notice } from '../../components/supervisor/account/Notice'
import { useNotice } from '../../components/supervisor/account/useNotice'
import { MeetingDetails } from '../../components/supervisor/meetings/MeetingDetails'
import { MeetingDialog, type MeetingDraft } from '../../components/supervisor/meetings/MeetingDialog'
import { MeetingList } from '../../components/supervisor/meetings/MeetingList'
import { compareMeetings, matchesTab, type MeetingTab } from '../../components/supervisor/meetings/meetingHelpers'
import {
  createMockMeetingUrl,
  meetingTones,
  supervisorMeetings,
  type SupervisorMeeting,
} from '../../data/supervisor/meetingsMockData'
import { useI18n } from '../../i18n/i18nContext'

type OpenDialog = 'schedule' | 'edit' | null

/** Online meetings keep (or get) a join link; in-person meetings drop any link. Mirrors what the backend will do. */
function withMeetingLink(draft: MeetingDraft, previous?: SupervisorMeeting): Pick<SupervisorMeeting, 'googleEventId' | 'meetingUrl'> {
  if (draft.location !== 'Online Meeting') return { googleEventId: null, meetingUrl: null }
  return {
    googleEventId: previous?.googleEventId ?? null,
    meetingUrl: previous?.meetingUrl ?? createMockMeetingUrl(),
  }
}

const firstUpcomingId = () =>
  supervisorMeetings.filter((meeting) => matchesTab(meeting, 'upcoming')).sort((a, b) => compareMeetings(a, b, 'upcoming'))[0]
    ?.id ?? null

export function Meetings() {
  const { t, formatDate, formatTime } = useI18n()
  const [meetings, setMeetings] = useState(supervisorMeetings)
  const [tab, setTab] = useState<MeetingTab>('upcoming')
  const [project, setProject] = useState('all')
  // A calendar day narrows the list to that date (tabs are ignored until it is cleared).
  const [date, setDate] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(firstUpcomingId)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const [notice, setNotice] = useNotice()

  const selected = meetings.find((meeting) => meeting.id === selectedId) ?? null
  const sortTab: MeetingTab = date ? 'all' : tab
  const visible = meetings
    .filter((meeting) => (project === 'all' || meeting.projectCode === project) && (date ? meeting.date === date : matchesTab(meeting, tab)))
    .sort((a, b) => compareMeetings(a, b, sortTab))

  const select = (id: string) => {
    setSelectedId(id)
    setDetailsOpen(true)
  }

  const schedule = (draft: MeetingDraft) => {
    const id = `mt-${Date.now()}`
    setMeetings((current) => [
      ...current,
      { ...draft, ...withMeetingLink(draft), id, tone: meetingTones[current.length % meetingTones.length] },
    ])
    select(id)
    // Show the new meeting where it lands: on its own day in the list.
    setDate(draft.date)
    setProject('all')
    setNotice(t('meetings.notices.scheduled', { date: formatDate(draft.date), time: formatTime(draft.start) }))
  }

  const edit = (draft: MeetingDraft) => {
    if (!selected) return
    setMeetings((current) => current.map((meeting) => (meeting.id === selected.id ? { ...meeting, ...draft, ...withMeetingLink(draft, meeting) } : meeting)))
    setNotice(t('meetings.notices.updated', { title: draft.title }))
  }

  return (
    <>
      <SupervisorTopBar />

      <section className="meetings-page" aria-labelledby="meetings-title">
        <header className="meetings-heading">
          <span className="meetings-heading-icon" aria-hidden="true">
            <CalendarDays size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 id="meetings-title">{t('meetings.title')}</h1>
            <p>{t('meetings.subtitle')}</p>
          </div>
          <button className="meetings-primary-button meetings-schedule-button" type="button" onClick={() => setOpenDialog('schedule')}>
            <Plus size={19} aria-hidden="true" />
            {t('meetings.schedule')}
          </button>
        </header>

        <div className={`meetings-layout ${detailsOpen && selected ? 'is-details-open' : ''}`}>
          <MeetingList
            meetings={visible}
            allMeetings={meetings}
            selectedId={detailsOpen ? selectedId : null}
            tab={tab}
            project={project}
            date={date}
            onTabChange={setTab}
            onProjectChange={setProject}
            onDateChange={setDate}
            onSelect={select}
          />

          {/* Stays mounted while closed so its column can slide shut; `inert` takes it out of focus and the a11y tree. */}
          {selected ? (
            <div className="meetings-details-slot" inert={!detailsOpen}>
              <MeetingDetails
                meeting={selected}
                onClose={() => setDetailsOpen(false)}
                onEdit={() => setOpenDialog('edit')}
              />
            </div>
          ) : null}
        </div>
      </section>

      {openDialog === 'schedule' ? <MeetingDialog onClose={() => setOpenDialog(null)} onSave={schedule} /> : null}
      {openDialog === 'edit' && selected ? (
        <MeetingDialog meeting={selected} onClose={() => setOpenDialog(null)} onSave={edit} />
      ) : null}

      <Notice message={notice} />
    </>
  )
}
