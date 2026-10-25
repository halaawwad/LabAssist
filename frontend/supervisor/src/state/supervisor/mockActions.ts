import { conversations, type Conversation } from '../../data/supervisor/messagesMockData'
import {
  createMockMeetingUrl,
  supervisorMeetings,
  type SupervisorMeeting,
} from '../../data/supervisor/meetingsMockData'
import { progressProjects } from '../../data/supervisor/progressMockData'
import { readStored, writeStored } from '../storage'

export const localDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hebron',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

export function saveMockMeeting(
  draft: Pick<
    SupervisorMeeting,
    'title' | 'projectCode' | 'date' | 'start' | 'end' | 'location' | 'agenda' | 'locationDetails'
  >,
) {
  const meeting: SupervisorMeeting = {
    ...draft,
    id: crypto.randomUUID(),
    tone: 'purple',
    googleEventId: 'mock-event-' + crypto.randomUUID(),
    meetingUrl: draft.location === 'Online Meeting' ? createMockMeetingUrl() : null,
  }
  writeStored('meetings.v1', [...readStored('meetings.v1', supervisorMeetings), meeting])
  return meeting
}

export function saveTeamFeedback(projectCode: string, text: string) {
  const project = progressProjects.find((project) => project.code === projectCode)
  if (!project) return
  const records = readStored('messages.v1', conversations)
  const current = records.find(
    (conversation) => conversation.kind === 'team' && conversation.projectCode === projectCode,
  )
  const target: Conversation = current ?? {
    id: `team-${projectCode}`,
    kind: 'team',
    name: project.name,
    initials: project.code.slice(-2),
    tone: 'green',
    projectCode,
    projectName: project.name,
    online: false,
    unread: 0,
    starred: false,
    muted: false,
    members: project.students.map((student, index) => ({
      name: student.name,
      initials: student.initials,
      tone: 'green',
      role: index === 0 ? 'leader' : 'member',
    })),
    messages: [],
  }
  const updated: Conversation = {
    ...target,
    messages: [
      ...target.messages,
      {
        id: crypto.randomUUID(),
        from: 'me',
        text,
        date: localDate(),
        time: new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Hebron',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
      },
    ],
  }
  writeStored(
    'messages.v1',
    current
      ? records.map((item) => (item.id === target.id ? updated : item))
      : [updated, ...records],
  )
}
