import { ApiProperty } from "@nestjs/swagger";
import type { AccountResponse, ApiRole } from "../../../../../shared/contracts/auth";

export class AccountResponseDto implements AccountResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ enum: ["STUDENT", "SUPERVISOR", "WORKSHOP_MANAGER", "DEPARTMENT_HEAD"] })
  role!: ApiRole;
  @ApiProperty({ type: String }) fullName!: string;
  @ApiProperty({ type: String, format: "email" }) email!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: String, nullable: true }) universityNumber!: string | null;
  @ApiProperty({ type: String, nullable: true }) employeeNumber!: string | null;

  static from(row: Record<string, unknown>): AccountResponseDto {
    return Object.assign(new AccountResponseDto(), {
      id: row.id as string,
      role: row.role as ApiRole,
      fullName: row.full_name as string,
      email: row.email as string,
      universityNumber: (row.university_number ?? null) as string | null,
      employeeNumber: (row.employee_number ?? null) as string | null,
      status: row.status as string,
    });
  }
}
