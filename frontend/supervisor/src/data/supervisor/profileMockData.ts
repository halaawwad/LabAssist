import { demoSupervisor } from "../../../../../shared/web/domain";
// Mock supervisor account used until the backend exists. Edits are kept in localStorage.
export type SupervisorProfile = {
  accountId?: string;
  name: string
  email: string
  specialization: string
  /** Data URL of the uploaded photo, or null to show the initial. */
  photo: string | null
}

export const defaultSupervisorProfile: SupervisorProfile = {
  accountId: demoSupervisor.id,
  name: demoSupervisor.name,
  email: demoSupervisor.email,
  specialization: 'Embedded Systems & Robotics',
  photo: null,
}
