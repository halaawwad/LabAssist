export type UserRole = "student" | "supervisor" | "workshop";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type Supervisor = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  project: string;
  supervisorId: string;
};

export type Student = {
  id: string;
  name: string;
  teamId: string;
};
