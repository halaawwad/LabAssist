export type ConversationKind = 'student' | 'group' | 'supervisor'

export type Message = {
  id: string
  fromMe: boolean
  text: string
  at: string
}

export type Conversation = {
  id: string
  kind: ConversationKind
  name: string
  /** Team code, project or role shown under the name. */
  detail: string
  unread: number
  messages: Message[]
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export const conversationsSeed: Conversation[] = [
  {
    id: 'cv1',
    kind: 'supervisor',
    name: 'Dr. Rana Yousef',
    detail: 'Supervisor · G02, G07, G12',
    unread: 1,
    messages: [
      { id: 'm1', fromMe: true, text: 'Team G12 has missed several workshop sessions. I sent you an observation.', at: minutesAgo(190) },
      { id: 'm2', fromMe: false, text: 'Thank you, I will meet them on Sunday and follow up.', at: minutesAgo(95) },
    ],
  },
  {
    id: 'cv2',
    kind: 'group',
    name: 'G07 · Automatic Pet Feeder',
    detail: 'Project group · Table R11',
    unread: 0,
    messages: [
      { id: 'm3', fromMe: true, text: 'Please bring back the hand tool kit before Thursday.', at: minutesAgo(600) },
      { id: 'm4', fromMe: false, text: 'Sure, we will return it tomorrow morning.', at: minutesAgo(540) },
    ],
  },
  {
    id: 'cv3',
    kind: 'student',
    name: 'Omar Daraghmeh',
    detail: 'Student · G03',
    unread: 1,
    messages: [{ id: 'm5', fromMe: false, text: 'I will be late today, I have an exam until 10:00.', at: minutesAgo(70) }],
  },
  {
    id: 'cv4',
    kind: 'group',
    name: 'All workshop students',
    detail: 'Workshop notice board',
    unread: 0,
    messages: [{ id: 'm6', fromMe: true, text: 'The workshop closes at 3:30 PM on Thursday for cleaning.', at: minutesAgo(1500) }],
  },
]
