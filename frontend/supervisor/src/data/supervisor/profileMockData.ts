// Mock supervisor account used until the backend exists. Edits are kept in localStorage.
export type SupervisorProfile = {
  name: string
  email: string
  specialization: string
  /** Data URL of the uploaded photo, or null to show the initial. */
  photo: string | null
}

export const defaultSupervisorProfile: SupervisorProfile = {
  name: 'Ahmad Saleh',
  email: 'ahmad.saleh@najah.edu',
  specialization: 'Embedded Systems & Robotics',
  photo: null,
}
