import { describe, expect, it } from 'vitest'
import { capacityOf, floorSize, tableOfTeam, tableStatus, workshopTables } from '../src/data/workshopTables'
import { matchesStudent, tableMatches } from '../src/components/tableSearch'
import { studentsOf, supervisorFor, teamById } from '../src/data/teams'

describe('workshop floor plan', () => {
  it('has unique table codes and at most one location per demo team', () => {
    expect(new Set(workshopTables.map(x => x.code)).size).toBe(workshopTables.length)
    const teams = workshopTables.flatMap(x => x.teamIds)
    expect(new Set(teams).size).toBe(teams.length)
  })
  it('keeps all table hotspots within the drawing', () => {
    for (const table of workshopTables) {
      expect(table.cx - table.w / 2).toBeGreaterThanOrEqual(0)
      expect(table.cy - table.h / 2).toBeGreaterThanOrEqual(0)
      expect(table.cx + table.w / 2).toBeLessThanOrEqual(floorSize.width)
      expect(table.cy + table.h / 2).toBeLessThanOrEqual(floorSize.height)
    }
  })
  it('respects physical table capacity for every fixture', () => {
    for (const table of workshopTables) expect(table.teamIds.length).toBeLessThanOrEqual(capacityOf(table.shape))
  })
  it.each([
    [[], 'free'], [['G01'], 'assigned'], [['G01', 'G02'], 'shared'],
  ] as const)('classifies occupancy %j as %s', (teamIds, status) => {
    expect(tableStatus({ ...workshopTables[0], teamIds: [...teamIds] })).toBe(status)
  })
  it('finds an assigned team and safely handles an unknown team', () => {
    const table = workshopTables.find(x => x.teamIds.length)!
    expect(tableOfTeam(table.teamIds[0])).toBe(table)
    expect(tableOfTeam('unknown-team')).toBeUndefined()
  })
})

describe('workshop search', () => {
  const table = workshopTables.find(x => x.teamIds.length)!
  const teamId = table.teamIds[0]
  it('normalizes whitespace and case for table codes', () => {
    expect(tableMatches(table, `  ${table.code.toLowerCase()} `)).toBe(true)
    expect(tableMatches(table, '  ')).toBe(true)
    expect(tableMatches(table, 'nonexistent xyz')).toBe(false)
  })
  it('finds a table by project, student or supervisor', () => {
    expect(tableMatches(table, teamById.get(teamId)!.project)).toBe(true)
    expect(tableMatches(table, studentsOf(teamId)[0].name)).toBe(true)
    expect(tableMatches(table, supervisorFor(teamId)!.name)).toBe(true)
  })
  it('finds students by team and project without matching unrelated text', () => {
    const student = studentsOf(teamId)[0]
    expect(matchesStudent(teamId, student.name, teamId)).toBe(true)
    expect(matchesStudent(teamById.get(teamId)!.project, student.name, teamId)).toBe(true)
    expect(matchesStudent('nonexistent xyz', student.name, teamId)).toBe(false)
  })
})
