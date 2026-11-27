import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import type {
  ProjectIssuePriority,
  ProjectIssueStatus,
  ProjectTaskStatus,
} from "../../../../shared/contracts/project-work";

export class ProjectDetailsDto {
  @ApiProperty()
  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string;

  @ApiProperty()
  @Matches(/\S/u)
  @MaxLength(220)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(220)
  subtitle!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20000)
  abstract!: string;
}

class WorkDetailsDto {
  @ApiProperty()
  @Matches(/\S/u)
  @MaxLength(240)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  description!: string;
}

export class CreateProjectTaskDto extends WorkDetailsDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  assignedTo!: string;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  dueOn?: string | null;
}

const taskStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
const issueStatuses = ["OPEN", "MONITORING", "RESOLVED"] as const;
const issuePriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export class UpdateProjectTaskDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  expectedRevision!: number;

  @ApiProperty({ enum: taskStatuses })
  @IsIn(taskStatuses)
  status!: ProjectTaskStatus;

  @ApiProperty()
  @IsBoolean()
  needsHelp!: boolean;
}

export class CreateProjectIssueDto extends WorkDetailsDto {
  @ApiProperty({ enum: issuePriorities })
  @IsIn(issuePriorities)
  priority!: ProjectIssuePriority;
}

export class UpdateProjectIssueDto extends CreateProjectIssueDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  expectedRevision!: number;

  @ApiProperty({ enum: issueStatuses })
  @IsIn(issueStatuses)
  status!: ProjectIssueStatus;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  resolution!: string;
}
