// Mock data for the Supervisor Messages page. Each conversation mirrors what a chat endpoint
// could return (thread + metadata), so it can be swapped for API data later.
// Message bodies are user content and stay in the language they were written in.
import { tasksMockToday } from './tasksMockData'

export type AvatarTone = 'green' | 'blue' | 'violet' | 'gold' | 'coral'

export type ChatAttachment = {
  name: string
  /** Human-readable size, e.g. "1.2 MB". */
  size: string
}

export type ChatMessage = {
  id: string
  /** `me` is the supervisor; otherwise the sender's name. */
  from: 'me' | string
  text: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** 24-hour time (HH:mm). */
  time: string
  attachment?: ChatAttachment
}

export type ChatMember = {
  name: string
  initials: string
  tone: AvatarTone
  /** Translation key under `messages.roles.`. */
  role: 'leader' | 'member' | 'student'
}

export type Conversation = {
  id: string
  /** Project team group chat or a direct chat with one student. */
  kind: 'team' | 'direct'
  name: string
  initials: string
  tone: AvatarTone
  projectCode: string
  projectName: string
  members: ChatMember[]
  online: boolean
  unread: number
  starred: boolean
  muted: boolean
  messages: ChatMessage[]
}

/** The mock "today", shared with the Tasks page so dates line up across pages. */
export const messagesMockToday = tasksMockToday

const yesterday = '2026-10-07'

export const conversations: Conversation[] = [
  {
    id: 'team-hw17',
    kind: 'team',
    name: 'Team Alpha',
    initials: 'TA',
    tone: 'green',
    projectCode: 'HW17',
    projectName: 'Autonomous Delivery Robot',
    members: [
      { name: 'Ahmad Khaled', initials: 'AK', tone: 'blue', role: 'leader' },
      { name: 'Sara Ali', initials: 'SA', tone: 'violet', role: 'member' },
      { name: 'Omar Hasan', initials: 'OH', tone: 'gold', role: 'member' },
    ],
    online: true,
    unread: 2,
    starred: true,
    muted: false,
    messages: [
      { id: 'm1', from: 'Ahmad Khaled', text: 'Good morning Dr., we finished assembling the chassis yesterday.', date: yesterday, time: '09:12' },
      { id: 'm2', from: 'me', text: 'Great work. Did you test the motor drivers under load?', date: yesterday, time: '09:40' },
      { id: 'm3', from: 'Sara Ali', text: 'Not yet, the second L298N overheats after a few minutes. We are adding a heatsink.', date: yesterday, time: '10:05' },
      { id: 'm4', from: 'me', text: 'Good. Also limit the PWM duty cycle while testing, and log the current draw.', date: yesterday, time: '10:18' },
      {
        id: 'm5',
        from: 'Omar Hasan',
        text: 'Here are the navigation test results from this morning.',
        date: messagesMockToday,
        time: '08:47',
        attachment: { name: 'navigation-test-results.pdf', size: '1.4 MB' },
      },
      { id: 'm6', from: 'Ahmad Khaled', text: 'Can we book a review meeting before Thursday to go over the results?', date: messagesMockToday, time: '09:30' },
    ],
  },
  {
    id: 'direct-dana',
    kind: 'direct',
    name: 'Dana Yousef',
    initials: 'DY',
    tone: 'coral',
    projectCode: 'HW07',
    projectName: 'Wearable Health Monitor',
    members: [{ name: 'Dana Yousef', initials: 'DY', tone: 'coral', role: 'student' }],
    online: true,
    unread: 1,
    starred: false,
    muted: false,
    messages: [
      { id: 'm1', from: 'Dana Yousef', text: 'Hello Dr., I uploaded the updated BOM with the new pulse sensor.', date: yesterday, time: '14:20' },
      { id: 'm2', from: 'me', text: 'Thanks Dana, I will review it today.', date: yesterday, time: '15:02' },
      {
        id: 'm3',
        from: 'Dana Yousef',
        text: 'I also attached the sensor datasheet in case you need it.',
        date: messagesMockToday,
        time: '08:15',
        attachment: { name: 'MAX30102-datasheet.pdf', size: '820 KB' },
      },
    ],
  },
  {
    id: 'team-hw12',
    kind: 'team',
    name: 'Team Delta',
    initials: 'TD',
    tone: 'blue',
    projectCode: 'HW12',
    projectName: 'Robotic Arm',
    members: [
      { name: 'Tareq Mansour', initials: 'TM', tone: 'blue', role: 'leader' },
      { name: 'Aya Barakat', initials: 'AB', tone: 'violet', role: 'member' },
      { name: 'Hamza Qasem', initials: 'HQ', tone: 'gold', role: 'member' },
    ],
    online: false,
    unread: 0,
    starred: true,
    muted: false,
    messages: [
      { id: 'm1', from: 'Tareq Mansour', text: 'The servo calibration is done for joints 1–3.', date: '2026-10-06', time: '11:00' },
      { id: 'm2', from: 'me', text: 'Nice. Please share a short video of the full range of motion.', date: '2026-10-06', time: '11:25' },
      { id: 'm3', from: 'Aya Barakat', text: 'Sure, we will record it in the workshop tomorrow.', date: yesterday, time: '16:40' },
    ],
  },
  {
    id: 'team-hw25',
    kind: 'team',
    name: 'Team Sol',
    initials: 'TS',
    tone: 'gold',
    projectCode: 'HW25',
    projectName: 'Solar Tracking System',
    members: [
      { name: 'Mohammad Odeh', initials: 'MO', tone: 'blue', role: 'leader' },
      { name: 'Rana Saleh', initials: 'RS', tone: 'coral', role: 'member' },
      { name: 'Khaled Amer', initials: 'KA', tone: 'violet', role: 'member' },
    ],
    online: true,
    unread: 3,
    starred: false,
    muted: false,
    messages: [
      { id: 'm1', from: 'Rana Saleh', text: 'The LDR readings are noisy at noon.', date: messagesMockToday, time: '07:55' },
      { id: 'm2', from: 'Mohammad Odeh', text: 'We are trying a moving-average filter.', date: messagesMockToday, time: '08:02' },
      { id: 'm3', from: 'Khaled Amer', text: 'Should we switch to a dedicated light sensor instead?', date: messagesMockToday, time: '08:10' },
    ],
  },
  {
    id: 'direct-rami',
    kind: 'direct',
    name: 'Rami Jaber',
    initials: 'RJ',
    tone: 'violet',
    projectCode: 'HW41',
    projectName: 'Smart Home Automation',
    members: [{ name: 'Rami Jaber', initials: 'RJ', tone: 'violet', role: 'student' }],
    online: false,
    unread: 0,
    starred: false,
    muted: true,
    messages: [
      { id: 'm1', from: 'me', text: 'Rami, your weekly report for week 6 is missing.', date: '2026-10-05', time: '10:00' },
      { id: 'm2', from: 'Rami Jaber', text: 'Sorry Dr., I will submit it tonight.', date: '2026-10-05', time: '12:31' },
    ],
  },
  {
    id: 'team-hw28',
    kind: 'team',
    name: 'Team Air',
    initials: 'AQ',
    tone: 'coral',
    projectCode: 'HW28',
    projectName: 'Air Quality Monitoring',
    members: [
      { name: 'Sami Darwish', initials: 'SD', tone: 'gold', role: 'leader' },
      { name: 'Leen Abu Ali', initials: 'LA', tone: 'coral', role: 'member' },
    ],
    online: false,
    unread: 0,
    starred: false,
    muted: false,
    messages: [
      { id: 'm1', from: 'Sami Darwish', text: 'The CO2 sensor is still not responding on I2C.', date: '2026-10-04', time: '13:10' },
      { id: 'm2', from: 'me', text: 'Run an I2C scanner sketch and check the pull-up resistors.', date: '2026-10-04', time: '13:45' },
    ],
  },
]
