import { teams } from './teams'

export type ItemCondition = 'good' | 'damaged' | 'missing'

/** What a team received at the start of the semester and whether its return was checked. Not inventory. */
export type HandoverRecord = {
  teamId: string
  items: string[]
  dateGiven: string
  checked: boolean
  checkedOn?: string
  condition?: ItemCondition
  note?: string
}

const kits = [
  ['Soldering station', 'Digital multimeter', 'Breadboard kit'],
  ['Bench power supply', 'Jumper wire set', 'Hand tool kit'],
  ['Digital multimeter', 'Hot glue gun', 'Safety glasses'],
  ['Soldering station', 'Hand tool kit', 'Oscilloscope probe set'],
  ['Breadboard kit', 'Jumper wire set', 'Wire stripper'],
]

const pendingTeams = new Set(['G07', 'G14', 'G21'])

const checkNotes: Record<string, Pick<HandoverRecord, 'condition' | 'note'>> = {
  G03: { condition: 'damaged', note: 'Soldering iron tip bent; team informed.' },
  G12: { condition: 'missing', note: 'Wire stripper not returned yet.' },
  G18: { condition: 'damaged', note: 'Multimeter probe cable cracked.' },
}

export const handoverSeed: HandoverRecord[] = teams.map((team, index) => {
  const pending = pendingTeams.has(team.id)
  return {
    teamId: team.id,
    items: kits[index % kits.length],
    dateGiven: index < 13 ? '2026-09-14' : '2026-09-15',
    checked: !pending,
    checkedOn: pending ? undefined : `2026-10-${String(13 + (index % 9)).padStart(2, '0')}`,
    condition: pending ? undefined : (checkNotes[team.id]?.condition ?? 'good'),
    note: checkNotes[team.id]?.note,
  }
})
