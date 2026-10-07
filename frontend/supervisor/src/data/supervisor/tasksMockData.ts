// Mock data for the Supervisor Tasks page: things the supervisor has to do,
// not student implementation work. Shaped so it can be replaced by API data later.
import professorImage from '../../assets/supervisor-tasks-professor.webp'

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Pending' | 'Completed'

export type SupervisorTask = {
  id: string
  title: string
  projectCode: string
  projectName: string
  priority: TaskPriority
  /** ISO date (YYYY-MM-DD). */
  dueDate: string
  status: TaskStatus
}

/** Decorative supervisor shown beside the task list (transparent cutout). */
export const supervisorTasksImage = professorImage

/** The mock data is written relative to this date, so "Today"/"Tomorrow" stay stable. */
export const tasksMockToday = '2026-10-08'

export const supervisorTasks: SupervisorTask[] = [
  {
    id: 'task-1',
    title: 'Review final project report',
    projectCode: 'HW17',
    projectName: 'Autonomous Delivery Robot',
    priority: 'Urgent',
    dueDate: '2026-10-08',
    status: 'Pending',
  },
  {
    id: 'task-2',
    title: 'Follow up on milestone progress',
    projectCode: 'HW03',
    projectName: 'Smart Irrigation System',
    priority: 'High',
    dueDate: '2026-10-08',
    status: 'Pending',
  },
  {
    id: 'task-3',
    title: 'Prepare for supervision meeting',
    projectCode: 'HW25',
    projectName: 'Solar Tracking System',
    priority: 'High',
    dueDate: '2026-10-09',
    status: 'Pending',
  },
  {
    id: 'task-4',
    title: 'Approve 3D circuit version',
    projectCode: 'HW07',
    projectName: 'Wearable Health Monitor',
    priority: 'Medium',
    dueDate: '2026-10-06',
    status: 'Completed',
  },
  {
    id: 'task-5',
    title: 'Send feedback on draft report',
    projectCode: 'HW12',
    projectName: 'Robotic Arm',
    priority: 'Medium',
    dueDate: '2026-10-12',
    status: 'Pending',
  },
  {
    id: 'task-6',
    title: 'Attendance follow up',
    projectCode: 'HW28',
    projectName: 'Air Quality Monitoring',
    priority: 'Low',
    dueDate: '2026-10-20',
    status: 'Completed',
  },
]

export type ReportStatus = 'Awaiting Review' | 'Reviewed' | 'Late'

export type WeeklyReport = {
  id: string
  projectCode: string
  projectName: string
  week: number
  /** ISO date (YYYY-MM-DD). */
  submittedOn: string
  status: ReportStatus
}

export const weeklyReports: WeeklyReport[] = [
  {
    id: 'report-1',
    projectCode: 'HW17',
    projectName: 'Autonomous Delivery Robot',
    week: 8,
    submittedOn: '2026-10-07',
    status: 'Awaiting Review',
  },
  {
    id: 'report-2',
    projectCode: 'HW03',
    projectName: 'Smart Irrigation System',
    week: 8,
    submittedOn: '2026-10-08',
    status: 'Awaiting Review',
  },
  {
    id: 'report-3',
    projectCode: 'HW28',
    projectName: 'Air Quality Monitoring',
    week: 7,
    submittedOn: '2026-10-03',
    status: 'Late',
  },
  {
    id: 'report-4',
    projectCode: 'HW25',
    projectName: 'Solar Tracking System',
    week: 8,
    submittedOn: '2026-10-06',
    status: 'Reviewed',
  },
  {
    id: 'report-5',
    projectCode: 'HW07',
    projectName: 'Wearable Health Monitor',
    week: 8,
    submittedOn: '2026-10-06',
    status: 'Reviewed',
  },
  {
    id: 'report-6',
    projectCode: 'HW12',
    projectName: 'Robotic Arm',
    week: 8,
    submittedOn: '2026-10-05',
    status: 'Reviewed',
  },
]
