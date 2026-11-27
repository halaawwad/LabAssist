import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import type {
  ProjectGroupList,
  ProjectGroupRecord,
} from "../../../../shared/contracts/project-work";
import { SessionGuard } from "../auth/guards/session.guard";
import { DepartmentGuard } from "../common/guards/department.guard";
import type { Actor } from "../common/security/identity";
import { Database } from "../database/database.service";

class GroupDto {
  @IsString()
  @MaxLength(220)
  title!: string;

  @Matches(/\S/u)
  @MaxLength(80)
  projectNumber!: string;

  @IsUUID()
  termId!: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @IsUUID(undefined, { each: true })
  studentIds!: string[];

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  supervisorIds!: string[];

  @IsBoolean()
  confirmedTransfer!: boolean;
}

class UpdateGroupDto extends GroupDto {
  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string;
}

const currentWindow = Prisma.sql`
  (now() AT TIME ZONE term.timezone)::date >= term.starts_on
  AND (now() AT TIME ZONE term.timezone)::date < term.starts_on + 14
  AND (term.ends_on IS NULL OR (now() AT TIME ZONE term.timezone)::date <= term.ends_on)
`;

@Injectable()
export class DepartmentProjectService {
  constructor(private readonly db: Database) {}

  async list(): Promise<ProjectGroupList> {
    const [groups, openTerms] = await Promise.all([
      this.db.$queryRaw<ProjectGroupRecord[]>`
        SELECT p.id, p.name AS title, COALESCE(p.project_number, p.id::text) AS "projectNumber",
          p.term_id AS "termId", term.name AS "termName", p.status,
          to_jsonb(p.updated_at) #>> '{}' AS "updatedAt",
          ARRAY(SELECT m.student_id FROM labassist_student.project_students m
            WHERE m.project_id = p.id AND m.left_at IS NULL ORDER BY m.student_id) AS "studentIds",
          ARRAY(SELECT m.supervisor_id FROM labassist_student.project_supervisors m
            WHERE m.project_id = p.id ORDER BY m.supervisor_id) AS "supervisorIds"
        FROM labassist_student.projects p
        JOIN labassist_student.academic_terms term ON term.id = p.term_id
        WHERE NOT term.is_demo
        ORDER BY term.starts_on DESC, p.created_at DESC, p.id
      `,
      this.db.$queryRaw<ProjectGroupList["openTerms"]>`
        SELECT term.id, term.name FROM labassist_student.academic_terms term
        JOIN labassist_student.term_workshop_capacity capacity ON capacity.term_id = term.id
        WHERE NOT term.is_demo AND ${currentWindow}
        ORDER BY term.starts_on DESC, term.id
      `,
    ]);
    return { groups, openTerms };
  }

  async save(actor: Actor, input: GroupDto, id?: string, expectedUpdatedAt?: string) {
    const studentIds = input.studentIds.map((value) => value.toLowerCase());
    const supervisorIds = input.supervisorIds.map((value) => value.toLowerCase());
    const students = Prisma.sql`ARRAY[${Prisma.join(studentIds)}]::uuid[]`;
    const supervisors = Prisma.sql`ARRAY[${Prisma.join(supervisorIds)}]::uuid[]`;
    try {
      return await this.db.$transaction(async (tx) => {
        // Use the same ordering and lock as the existing allocation triggers.
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(25102701)`;
        const [term] = await tx.$queryRaw<{ id: string }[]>`
          SELECT term.id FROM labassist_student.academic_terms term
          JOIN labassist_student.term_workshop_capacity capacity ON capacity.term_id = term.id
          WHERE NOT term.is_demo AND term.id = ${input.termId}::uuid AND ${currentWindow}
        `;
        if (!term) throw new BadRequestException("Select a term open for team assignments.");

        const accounts = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM labassist_student.accounts
          WHERE status IN ('ACTIVE', 'PENDING_ACTIVATION', 'REFERENCE_ONLY')
            AND ((role = 'STUDENT' AND id = ANY(${students}))
              OR (role = 'SUPERVISOR' AND id = ANY(${supervisors})))
          ORDER BY id FOR SHARE
        `;
        if (accounts.length !== studentIds.length + supervisorIds.length) {
          throw new BadRequestException("Select eligible student and supervisor accounts.");
        }
        const [project] = id
          ? await tx.$queryRaw<{ id: string }[]>`
              UPDATE labassist_student.projects
              SET name = ${input.title.trim()}, project_number = ${input.projectNumber.trim()},
                  updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
              WHERE id = ${id}::uuid AND term_id = ${term.id}::uuid
                AND status NOT IN ('ARCHIVED', 'COMPLETED')
                AND updated_at = ${expectedUpdatedAt}::timestamptz
              RETURNING id
            `
          : await tx.$queryRaw<{ id: string }[]>`
              INSERT INTO labassist_student.projects(term_id, name, project_number, formed_by)
              VALUES (${term.id}::uuid, ${input.title.trim()}, ${input.projectNumber.trim()},
                ${actor.id}::uuid)
              RETURNING id
            `;
        if (!project) throw new ConflictException("Group changed or is closed. Refresh and retry.");

        const sources = await tx.$queryRaw<{ id: string; status: string }[]>`
          SELECT DISTINCT p.id, p.status
          FROM labassist_student.projects p
          JOIN labassist_student.project_students m ON p.id = m.project_id
          WHERE m.term_id = ${term.id}::uuid AND m.project_id <> ${project.id}::uuid
            AND m.student_id = ANY(${students}) AND m.left_at IS NULL
        `;
        if (sources.some(({ status }) => status === "COMPLETED")) {
          throw new BadRequestException("A student still belongs to a completed group.");
        }
        if (sources.length && !input.confirmedTransfer) {
          throw new ConflictException("Confirm the student transfer to save this group.");
        }

        if (sources.length) {
          const sourceIds = Prisma.sql`ARRAY[${Prisma.join(sources.map((source) => source.id))}]::uuid[]`;
          await tx.$executeRaw`
            UPDATE labassist_student.projects
            SET updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
            WHERE id = ANY(${sourceIds})
          `;
        }
        await tx.$executeRaw`
          UPDATE labassist_student.project_students SET left_at = clock_timestamp()
          WHERE term_id = ${term.id}::uuid AND left_at IS NULL AND (
            (project_id = ${project.id}::uuid AND student_id <> ALL(${students}))
            OR (project_id <> ${project.id}::uuid AND student_id = ANY(${students}))
          )
        `;
        await tx.$executeRaw`
          INSERT INTO labassist_student.student_enrollments(student_id, term_id)
          SELECT student_id, ${term.id}::uuid FROM unnest(${students}) AS student_id
          ON CONFLICT DO NOTHING
        `;
        await tx.$executeRaw`
          INSERT INTO labassist_student.project_students(project_id, term_id, student_id)
          SELECT ${project.id}::uuid, ${term.id}::uuid, student_id FROM unnest(${students}) AS student_id
          ON CONFLICT (student_id, term_id) WHERE left_at IS NULL DO NOTHING
        `;
        await tx.$executeRaw`
          DELETE FROM labassist_student.project_supervisors
          WHERE project_id = ${project.id}::uuid AND supervisor_id <> ALL(${supervisors})
        `;
        await tx.$executeRaw`
          INSERT INTO labassist_student.project_supervisors(project_id, supervisor_id)
          SELECT ${project.id}::uuid, supervisor_id FROM unnest(${supervisors}) AS supervisor_id
          ON CONFLICT DO NOTHING
        `;
        return project;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002" || error.meta?.code === "23505") {
          throw new ConflictException("Project number or team membership already exists.");
        }
        if (error.meta?.code === "P0001" || error.meta?.code === "23514") {
          throw new BadRequestException("Check team size, supervisor capacity and term rules.");
        }
      }
      throw error;
    }
  }
}

@ApiTags("Department project groups")
@ApiBearerAuth()
@UseGuards(SessionGuard, DepartmentGuard)
@Controller("department/project-groups")
export class DepartmentProjectController {
  constructor(private readonly groups: DepartmentProjectService) {}

  @Get()
  list() {
    return this.groups.list();
  }

  @Post()
  create(@Req() req: { actor: Actor }, @Body() input: GroupDto) {
    return this.groups.save(req.actor, input);
  }

  @Patch(":id")
  update(
    @Req() req: { actor: Actor },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateGroupDto,
  ) {
    return this.groups.save(req.actor, input, id, input.expectedUpdatedAt);
  }
}
