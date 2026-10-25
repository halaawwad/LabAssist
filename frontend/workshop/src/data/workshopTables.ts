export type TableShape = 'rect' | 'round'
export type TableStatus = 'assigned' | 'free' | 'shared'

export type WorkshopTable = {
  code: string
  shape: TableShape
  /** Center and size in pixels of the floor-plan image, so hotspots sit exactly on the drawn tables. */
  cx: number
  cy: number
  w: number
  h: number
  teamIds: string[]
}

/** Pixel size of the floor-plan image the table geometry was measured on. */
export const floorSize = { width: 1496, height: 954 }

/** Rectangular tables seat one project group; round tables seat two. */
export const capacityOf = (shape: TableShape) => (shape === 'rect' ? 1 : 2)

// Every rectangular table is the same 140 × 70 piece (70 × 140 when turned); every round table is 122 across.
const RECT_LONG = 140
const RECT_SHORT = 70
const ROUND = 122

const landscape = (cx: number, cy: number) => ({ cx, cy, w: RECT_LONG, h: RECT_SHORT })
const portrait = (cx: number, cy: number) => ({ cx, cy, w: RECT_SHORT, h: RECT_LONG })

/** Center block: [vertical][3 tables][vertical] over [3 tables], all touching. */
function centerBlock(top: number) {
  const rowA = top + RECT_SHORT / 2
  const rowB = rowA + RECT_SHORT
  const middle = top + RECT_SHORT
  return [
    portrait(486, middle),
    landscape(591, rowA),
    landscape(731, rowA),
    landscape(871, rowA),
    landscape(591, rowB),
    landscape(731, rowB),
    landscape(871, rowB),
    portrait(976, middle),
  ]
}

// Physical layout, in floor order: top wall, left wall, upper block, lower block (R1–R25), then round tables C1–C3.
// The right side stays open in front of the entrance.
const rectPlaces = [
  ...[325, 527, 728, 929, 1131].map((cx) => landscape(cx, 117)),
  ...[169, 315, 461, 607].map((cy) => portrait(114, cy)),
  ...centerBlock(233),
  ...centerBlock(485),
]

const roundPlaces = [305, 731, 1120].map((cx) => ({ cx, cy: 781, w: ROUND, h: ROUND }))

/** Team per rectangular table, R1 first; an empty entry is a free table. */
const rectTeams: (string | null)[] = [
  'G01', 'G02', null, 'G03', null,
  'G04', 'G05', null, 'G06',
  null, 'G07', 'G08', 'G09', 'G10', 'G11', 'G12', 'G13',
  'G14', 'G15', 'G16', 'G17', null, 'G18', 'G19', 'G20',
]

const roundTeams: string[][] = [['G21', 'G22'], ['G23', 'G24'], ['G25']]

export const workshopTables: WorkshopTable[] = [
  ...rectPlaces.map((place, index) => {
    const teamId = rectTeams[index]
    return { code: `R${index + 1}`, shape: 'rect' as const, ...place, teamIds: teamId ? [teamId] : [] }
  }),
  ...roundPlaces.map((place, index) => ({ code: `C${index + 1}`, shape: 'round' as const, ...place, teamIds: roundTeams[index] })),
]

export function tableStatus(table: WorkshopTable): TableStatus {
  if (table.teamIds.length === 0) return 'free'
  return table.teamIds.length > 1 ? 'shared' : 'assigned'
}

export function tableOfTeam(teamId: string) {
  return workshopTables.find((table) => table.teamIds.includes(teamId))
}
