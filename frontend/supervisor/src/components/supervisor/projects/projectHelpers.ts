import type { ProjectStatus } from '../../../data/supervisor/projectsMockData'

export const projectStatuses: ProjectStatus[] = ['On Track', 'At Risk', 'Delayed']

/** CSS tone suffix for a status, e.g. "At Risk" -> "at-risk". */
export function statusTone(status: ProjectStatus) {
  return status.toLowerCase().replaceAll(' ', '-')
}
