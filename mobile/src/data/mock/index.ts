import type { Student, Supervisor, Team, User } from "@/types";

export const mockUsers: User[] = [
  { id: "u1", name: "Lina Saleh", email: "student@labassist.test", role: "student" },
  { id: "u2", name: "Dr. Samer Khalil", email: "supervisor@labassist.test", role: "supervisor" },
  { id: "u3", name: "Workshop Manager", email: "workshop@labassist.test", role: "workshop" },
];

export const mockSupervisors: Supervisor[] = [
  { id: "sv1", name: "Dr. Samer Khalil" },
  { id: "sv2", name: "Dr. Rana Yousef" },
];

export const mockTeams: Team[] = [
  { id: "G01", project: "Smart Irrigation Controller", supervisorId: "sv1" },
  { id: "G02", project: "Weather Station", supervisorId: "sv2" },
];

export const mockStudents: Student[] = [
  { id: "s1", name: "Lina Saleh", teamId: "G01" },
  { id: "s2", name: "Ahmad Odeh", teamId: "G01" },
  { id: "s3", name: "Maya Darwish", teamId: "G02" },
];
