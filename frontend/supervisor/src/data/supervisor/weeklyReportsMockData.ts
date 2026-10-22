// Mock data for the Supervisor Weekly Reports page. Weekly reports are submitted by a project TEAM
// (one report per team per week), mirroring what a weekly-report endpoint could return so it can be
// swapped for API data later. Teams, members and projects come from `progressMockData`.
// Report text (summaries, feedback, file names) is user content and stays in the language it was written in.
import { progressProjects, type ProjectStudent } from './progressMockData'
import type { IssueType, Priority } from './issuesMockData'

/** Extraction candidates belong to a team report; confirmation creates a separate tracked issue. */
export type DetectedReportIssue = {
  id: string
  title: string
  type: IssueType
  suggestedPriority: Priority
  reason: string
}

export type ReportStatus = 'reviewed' | 'pending' | 'revision'

export type ReportWeek = {
  id: string
  number: number
  /** ISO dates (YYYY-MM-DD), inclusive. */
  start: string
  end: string
}

export type ReportFeedback = {
  id: string
  /** `me` is the supervisor; otherwise the submitting team member's name. */
  from: 'me' | string
  text: string
  /** ISO date (YYYY-MM-DD). */
  date: string
}

export type ReportFile = {
  name: string
  size: string
}

export type ReportTeam = {
  id: string
  name: string
  initials: string
  projectCode: string
  projectName: string
  members: ProjectStudent[]
}

export type WeeklyTeamReport = {
  id: string
  weekId: string
  team: ReportTeam
  /** ISO date (YYYY-MM-DD) the report was submitted. */
  submittedOn: string
  /** Overall project progress (%) reported this week. */
  progress: number
  status: ReportStatus
  tasksDone: number
  tasksTotal: number
  issuesOpen: number
  summary: string
  nextSteps: string[]
  files: ReportFile[]
  feedback: ReportFeedback[]
  detectedIssues: DetectedReportIssue[]
}

export const reportWeeks: ReportWeek[] = [
  { id: 'w6', number: 6, start: '2026-09-22', end: '2026-09-28' },
  { id: 'w7', number: 7, start: '2026-09-29', end: '2026-10-05' },
  { id: 'w8', number: 8, start: '2026-10-06', end: '2026-10-12' },
]

/** Team names per project group. */
const teamNames: Record<string, string> = {
  HW17: 'Team Alpha',
  HW12: 'Team Delta',
  HW25: 'Team Sol',
  HW41: 'Team Nova',
  HW07: 'Team Pulse',
  HW03: 'Team Flow',
  HW28: 'Team Air',
}

export const reportTeams: ReportTeam[] = progressProjects.map((project) => {
  const name = teamNames[project.code] ?? `Team ${project.code}`
  return {
    id: `team-${project.code.toLowerCase()}`,
    name,
    initials: name
      .replace(/^Team\s+/, '')
      .slice(0, 2)
      .toUpperCase(),
    projectCode: project.code,
    projectName: project.name,
    members: project.students,
  }
})

const summaries = [
  'This week we finished integrating the sensor module and started testing the data collection. The system works as expected; next we will improve the UI and add alerts.',
  'We wired the motor drivers and calibrated the speed control. Two motors still respond slowly, so we will tune the PWM settings and re-test.',
  'We completed the BOM review and ordered the missing parts. While waiting, we prepared the enclosure design and updated the circuit schematic.',
  'We wrote the firmware for reading the sensors over I2C and logged a full day of data. Next we will clean the readings with a moving-average filter.',
  'We tested the power supply under load and fixed a voltage drop on the 5V rail. The prototype now runs stable for more than two hours.',
  'This week was mostly documentation: we updated the report draft, added wiring diagrams, and recorded a short demo video of the prototype.',
]

const nextStepSets = [
  ['Add threshold alerts to the dashboard', 'Run a 24-hour logging test'],
  ['Tune the PWM settings for the slow motors', 'Re-test the full drive cycle'],
  ['Assemble the enclosure once parts arrive', 'Update the BOM with final prices'],
  ['Filter noisy readings with a moving average', 'Compare results against the datasheet'],
  ['Add a fuse to the power input', 'Measure battery life under normal load'],
  ['Finish the methodology chapter', 'Prepare slides for the progress review'],
]

const fileSets: ReportFile[][] = [
  [{ name: 'sensor-test-results.pdf', size: '1.2 MB' }, { name: 'wiring-photo.jpg', size: '840 KB' }],
  [{ name: 'motor-calibration.xlsx', size: '96 KB' }],
  [{ name: 'bom-update.xlsx', size: '64 KB' }, { name: 'enclosure-sketch.png', size: '410 KB' }],
  [{ name: 'firmware-log.txt', size: '22 KB' }],
  [],
  [{ name: 'report-draft.pdf', size: '2.4 MB' }, { name: 'demo-video.mp4', size: '18.6 MB' }],
]

const feedbackLines = [
  'Good progress. Please add the test conditions to the next report.',
  'Clear summary. Attach a photo of the current wiring next time.',
  'The results look reasonable — compare them against the datasheet values.',
]

/** Day offset (0–6) inside the week each team submits on; spread so the chart has a natural shape. */
const dayOffsets = [3, 0, 5, 2, 1, 6, 4]

// Explicit mock extraction metadata for the existing project blockers, never inferred by AI.
const blockerSuggestions: Record<string, { type: IssueType; priority: Priority }[]> = {
  HW17: [{ type: 'hardware', priority: 'medium' }],
  HW07: [{ type: 'hardware', priority: 'medium' }],
  HW03: [{ type: 'hardware', priority: 'high' }],
  HW28: [{ type: 'hardware', priority: 'high' }, { type: 'delay', priority: 'medium' }],
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// One report per team per week, built deterministically from the project's real progress history.
export const weeklyTeamReports: WeeklyTeamReport[] = reportWeeks.flatMap((week, weekIndex) =>
  reportTeams.map((team, index) => {
    const seed = index + weekIndex * 3
    const project = progressProjects.find((item) => item.code === team.projectCode)
    const history = project?.weeklyProgress ?? [0]
    const progress = history[Math.min(week.number - 1, history.length - 1)] ?? 0
    const latest = weekIndex === reportWeeks.length - 1
    const status: ReportStatus = !latest
      ? seed % 5 === 4 ? 'revision' : 'reviewed'
      : progress < 30 ? 'revision' : index % 2 === 0 ? 'pending' : 'reviewed'
    const tasksTotal = 6 + (seed % 4)

    return {
      id: `${week.id}-${team.id}`,
      weekId: week.id,
      team,
      submittedOn: addDays(week.start, dayOffsets[(index + weekIndex) % dayOffsets.length]),
      progress,
      status,
      tasksDone: Math.min(tasksTotal, Math.round((progress / 100) * tasksTotal)),
      tasksTotal,
      issuesOpen: project?.issues.length ?? 0,
      detectedIssues: (project?.issues ?? []).map((issue, issueIndex) => ({
        id: `project-blocker-${issueIndex + 1}`,
        title: issue.title,
        type: blockerSuggestions[team.projectCode]?.[issueIndex]?.type ?? 'hardware',
        suggestedPriority: blockerSuggestions[team.projectCode]?.[issueIndex]?.priority ?? 'medium',
        reason: issue.detail,
      })),
      summary: summaries[seed % summaries.length],
      nextSteps: nextStepSets[seed % nextStepSets.length],
      files: fileSets[seed % fileSets.length],
      feedback:
        status === 'reviewed'
          ? [{ id: `fb-${week.id}-${index}`, from: 'me', text: feedbackLines[seed % feedbackLines.length], date: addDays(week.end, 1) }]
          : [],
    }
  }),
)
