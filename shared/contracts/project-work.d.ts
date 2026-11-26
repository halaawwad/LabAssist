export type ProjectMember = {
  id: string;
  name: string;
};

export type ProjectTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type ProjectIssueStatus = "OPEN" | "MONITORING" | "RESOLVED";
export type ProjectIssuePriority = "LOW" | "MEDIUM" | "HIGH";

export type ProjectTask = {
  id: string;
  assignedTo: string;
  title: string;
  description: string;
  dueOn: string | null;
  status: ProjectTaskStatus;
  needsHelp: boolean;
  revision: number;
};

export type ProjectIssue = {
  id: string;
  title: string;
  description: string;
  priority: ProjectIssuePriority;
  status: ProjectIssueStatus;
  resolution: string;
  revision: number;
};

export type ProjectWorkspace = {
  id: string;
  name: string;
  subtitle: string;
  abstract: string;
  status: "DRAFT" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  updatedAt: string;
  term: { id: string; name: string };
  students: ProjectMember[];
  supervisors: ProjectMember[];
  tasks: ProjectTask[];
  issues: ProjectIssue[];
};
export type ProjectGroupRecord = {
  id: string;
  title: string;
  projectNumber: string;
  termId: string;
  termName: string;
  status: ProjectWorkspace["status"];
  updatedAt: string;
  studentIds: string[];
  supervisorIds: string[];
};

export type ProjectGroupList = {
  groups: ProjectGroupRecord[];
  openTerms: { id: string; name: string }[];
};

export type ProjectGroupInput = {
  title: string;
  projectNumber: string;
  termId: string;
  studentIds: string[];
  supervisorIds: string[];
  confirmedTransfer: boolean;
  expectedUpdatedAt?: string;
};
