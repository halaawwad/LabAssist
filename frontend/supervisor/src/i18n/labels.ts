// Translation keys for the enum values stored in the mock data. The data keeps stable English
// identifiers (also used for CSS tones); only the displayed label is translated.
import type { ProgressStatus } from '../data/supervisor/progressMockData'
import type { ProjectStatus, ReviewLocation } from '../data/supervisor/projectsMockData'
import type { ReportStatus, TaskPriority, TaskStatus } from '../data/supervisor/tasksMockData'
import type { TranslationKey } from './i18nContext'

export const statusLabelKeys: Record<ProjectStatus | ProgressStatus, TranslationKey> = {
  'On Track': 'status.onTrack',
  'At Risk': 'status.atRisk',
  Delayed: 'status.delayed',
  Attention: 'status.attention',
}

export const priorityLabelKeys: Record<TaskPriority, TranslationKey> = {
  Urgent: 'tasks.priority.urgent',
  High: 'tasks.priority.high',
  Medium: 'tasks.priority.medium',
  Low: 'tasks.priority.low',
}

export const taskStatusLabelKeys: Record<TaskStatus, TranslationKey> = {
  Pending: 'tasks.status.pending',
  Completed: 'tasks.status.completed',
}

export const reportStatusLabelKeys: Record<ReportStatus, TranslationKey> = {
  'Awaiting Review': 'tasks.reportStatus.awaitingReview',
  Reviewed: 'tasks.reportStatus.reviewed',
  Late: 'tasks.reportStatus.late',
}

export const reviewLocationLabelKeys: Record<ReviewLocation, TranslationKey> = {
  Workshop: 'projects.reviews.locations.workshop',
  'Supervisor Office': 'projects.reviews.locations.office',
  'Online Meeting': 'projects.reviews.locations.online',
}
