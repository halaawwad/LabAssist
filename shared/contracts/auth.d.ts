export type ApiRole = "STUDENT" | "SUPERVISOR" | "WORKSHOP_MANAGER" | "DEPARTMENT_HEAD";
export interface AccountResponse {
  id: string;
  role: ApiRole;
  fullName: string;
  email: string;
  status: string;
  universityNumber: string | null;
  employeeNumber: string | null;
}
export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  account: AccountResponse;
}
export interface LoginRequest {
  role: ApiRole;
  identifier: string;
  password: string;
}
export interface RefreshRequest {
  refreshToken: string;
}
export interface PasswordRequest {
  token: string;
  password: string;
}
export interface ActivateRequest extends PasswordRequest {
  email: string;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  requestId?: string;
}
