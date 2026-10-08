import { progressProjects } from '../../../data/supervisor/progressMockData'
import type { SupervisorTask, TaskPriority } from '../../../data/supervisor/tasksMockData'

export type TaskFilter = 'All' | 'Today' | 'Pending' | 'Completed'
export type TaskSort = 'dueDate' | 'priority'
export type QuickActionId = 'meeting' | 'feedback' | 'task' | 'reports'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const priorityRank: Record<TaskPriority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 }

export function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function formatDueDate(isoDate: string, today: string) {
  if (isoDate === today) return 'Today'
  if (isoDate === addDays(today, 1)) return 'Tomorrow'
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${months[month - 1]} ${day}, ${year}`
}

export function matchesFilter(task: SupervisorTask, filter: TaskFilter, today: string) {
  if (filter === 'Today') return task.dueDate === today
  if (filter === 'Pending') return task.status === 'Pending'
  if (filter === 'Completed') return task.status === 'Completed'
  return true
}

/** Open tasks come first; within each group tasks are ordered by the chosen sort. */
export function compareTasks(a: SupervisorTask, b: SupervisorTask, sort: TaskSort) {
  if (a.status !== b.status) return a.status === 'Pending' ? -1 : 1
  if (sort === 'priority' && a.priority !== b.priority) return priorityRank[a.priority] - priorityRank[b.priority]
  return a.dueDate.localeCompare(b.dueDate)
}

export function findProject(code: string) {
  return progressProjects.find((project) => project.code === code)
}
