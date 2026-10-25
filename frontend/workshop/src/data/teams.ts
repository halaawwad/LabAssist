export type Supervisor = {
  id: string
  name: string
}

export type Team = {
  id: string
  project: string
  supervisorId: string
}

export type Student = {
  id: string
  name: string
  teamId: string
  /** Workshop absences recorded this semester, today excluded. */
  absences: number
  lastAbsence?: string
}

export const supervisors: Supervisor[] = [
  { id: 'sv1', name: 'Dr. Samer Khalil' },
  { id: 'sv2', name: 'Dr. Rana Yousef' },
  { id: 'sv3', name: 'Dr. Omar Nasser' },
  { id: 'sv4', name: 'Dr. Maha Haddad' },
  { id: 'sv5', name: 'Dr. Fadi Jaber' },
]

export const teams: Team[] = [
  { id: 'G01', project: 'Smart Irrigation Controller', supervisorId: 'sv1' },
  { id: 'G02', project: 'Line-Following Robot', supervisorId: 'sv2' },
  { id: 'G03', project: 'Home Weather Station', supervisorId: 'sv3' },
  { id: 'G04', project: 'Wearable Heart-Rate Monitor', supervisorId: 'sv4' },
  { id: 'G05', project: 'Greenhouse Climate Monitor', supervisorId: 'sv1' },
  { id: 'G06', project: 'Smart Parking Sensor', supervisorId: 'sv5' },
  { id: 'G07', project: 'Automatic Pet Feeder', supervisorId: 'sv2' },
  { id: 'G08', project: 'Solar Panel Tracker', supervisorId: 'sv3' },
  { id: 'G09', project: 'Gesture-Controlled Robotic Arm', supervisorId: 'sv4' },
  { id: 'G10', project: 'Air Quality Monitor', supervisorId: 'sv5' },
  { id: 'G11', project: 'RFID Access Gate', supervisorId: 'sv1' },
  { id: 'G12', project: 'Smart Door Lock', supervisorId: 'sv2' },
  { id: 'G13', project: 'Water Tank Level Monitor', supervisorId: 'sv3' },
  { id: 'G14', project: 'Obstacle-Avoiding Car', supervisorId: 'sv4' },
  { id: 'G15', project: 'Fall-Detection Wristband', supervisorId: 'sv5' },
  { id: 'G16', project: 'Smart Energy Meter', supervisorId: 'sv1' },
  { id: 'G17', project: 'Hydroponics Controller', supervisorId: 'sv2' },
  { id: 'G18', project: 'Bluetooth Plant Care Kit', supervisorId: 'sv3' },
  { id: 'G19', project: 'Traffic Light Model', supervisorId: 'sv4' },
  { id: 'G20', project: 'Digital Stethoscope', supervisorId: 'sv5' },
  { id: 'G21', project: 'Fire Detection System', supervisorId: 'sv1' },
  { id: 'G22', project: 'Smart Trash Bin', supervisorId: 'sv2' },
  { id: 'G23', project: 'Voice-Controlled Lights', supervisorId: 'sv3' },
  { id: 'G24', project: 'Mini CNC Plotter', supervisorId: 'sv4' },
  { id: 'G25', project: 'Baby Room Monitor', supervisorId: 'sv5' },
]

// [name, team, absences this semester, last absence]
const roster: [string, string, number, string?][] = [
  ['Ahmad Saleh', 'G01', 0],
  ['Lina Odeh', 'G01', 1, '2026-10-06'],
  ['Yazan Hamdan', 'G02', 0],
  ['Sara Khatib', 'G02', 0],
  ['Omar Daraghmeh', 'G03', 4, '2026-10-22'],
  ['Rawan Shaheen', 'G03', 1, '2026-09-29'],
  ['Mohammad Qasem', 'G04', 0],
  ['Dana Abu Eid', 'G05', 2, '2026-10-13'],
  ['Khaled Sawalha', 'G05', 3, '2026-10-20'],
  ['Noor Jaradat', 'G06', 0],
  ['Tamer Masri', 'G06', 1, '2026-10-01'],
  ['Aya Barghouti', 'G06', 0],
  ['Hasan Zeid', 'G07', 0],
  ['Raghad Hijjawi', 'G07', 3, '2026-10-21'],
  ['Ali Shtayyeh', 'G08', 0],
  ['Malak Nabulsi', 'G09', 1, '2026-10-08'],
  ['Basel Taha', 'G09', 0],
  ['Leen Awartani', 'G10', 0],
  ['Fares Kanaan', 'G10', 0],
  ['Hiba Tamimi', 'G11', 1, '2026-10-15'],
  ['Majd Rabee', 'G11', 0],
  ['Shahd Yaish', 'G12', 5, '2026-10-22'],
  ['Anas Dweikat', 'G12', 4, '2026-10-22'],
  ['Jana Asfour', 'G13', 0],
  ['Kareem Hindi', 'G14', 0],
  ['Tala Sabbah', 'G14', 2, '2026-10-12'],
  ['Mahmoud Arafat', 'G15', 0],
  ['Yara Hanbali', 'G15', 0],
  ['Saleh Bitar', 'G16', 1, '2026-09-30'],
  ['Razan Abdelhadi', 'G16', 0],
  ['Ibrahim Jabr', 'G17', 3, '2026-10-19'],
  ['Nour Salameh', 'G18', 0],
  ['Adam Ghanem', 'G18', 0],
  ['Bayan Issa', 'G19', 0],
  ['Zaid Mousa', 'G19', 1, '2026-10-05'],
  ['Rand Qadi', 'G20', 0],
  ['Qusai Najjar', 'G20', 0],
  ['Mais Alawneh', 'G20', 0],
  ['Wael Khader', 'G21', 0],
  ['Farah Zoubi', 'G22', 3, '2026-10-21'],
  ['Laith Hamad', 'G22', 0],
  ['Sama Kayed', 'G23', 0],
  ['Nasser Ashqar', 'G24', 1, '2026-10-14'],
  ['Deema Faris', 'G25', 0],
]

export const students: Student[] = roster.map(([name, teamId, absences, lastAbsence], index) => ({
  id: `st${String(index + 1).padStart(2, '0')}`,
  name,
  teamId,
  absences,
  lastAbsence,
}))

/** Students not in the workshop today; everyone else starts the day marked present. */
export const absentTodaySeed = ['st05', 'st14', 'st22', 'st23', 'st31', 'st40']

/** A student with this many absences (today included) shows up under Repeated Absence. */
export const repeatedAbsenceThreshold = 3

export const teamById = new Map(teams.map((team) => [team.id, team]))
export const supervisorById = new Map(supervisors.map((supervisor) => [supervisor.id, supervisor]))

export function supervisorFor(teamId: string) {
  const team = teamById.get(teamId)
  return team ? supervisorById.get(team.supervisorId) : undefined
}

export function studentsOf(teamId: string) {
  return students.filter((student) => student.teamId === teamId)
}
