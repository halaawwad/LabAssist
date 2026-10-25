import { useMemo } from 'react'
import { repeatedAbsenceThreshold, students } from '../data/teams'
import { useWorkshop } from './workshopContext'

/** Students at or above the repeated-absence threshold (today's absence counted), most absent first. */
export function useRepeatedAbsence() {
  const { attendance } = useWorkshop()
  return useMemo(() => {
    const rows = students
      .map((student) => ({ student, total: student.absences + (attendance[student.id] === 'absent' ? 1 : 0) }))
      .filter((row) => row.total >= repeatedAbsenceThreshold)
      .sort((a, b) => b.total - a.total)
    const perTeam = new Map<string, number>()
    rows.forEach(({ student }) => perTeam.set(student.teamId, (perTeam.get(student.teamId) ?? 0) + 1))
    // A team where more than one member is often absent is worth flagging as a team pattern.
    const patternTeams = new Set([...perTeam].filter(([, count]) => count > 1).map(([teamId]) => teamId))
    return { rows, patternTeams }
  }, [attendance])
}
