import { studentsOf, supervisorFor, teamById } from '../data/teams'
import type { WorkshopTable } from '../data/workshopTables'

/** A table matches by its code, or by a team, project, student or supervisor seated at it. */
export function tableMatches(table: WorkshopTable, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  if (table.code.toLowerCase() === needle) return true
  return table.teamIds.some((teamId) =>
    [
      teamId,
      teamById.get(teamId)?.project ?? '',
      supervisorFor(teamId)?.name ?? '',
      ...studentsOf(teamId).map((student) => student.name),
    ].some((value) => value.toLowerCase().includes(needle)),
  )
}

/** A student matches by name, team code or project. */
export function matchesStudent(query: string, name: string, teamId: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const project = teamById.get(teamId)?.project ?? ''
  return [name, teamId, project].some((value) => value.toLowerCase().includes(needle))
}
