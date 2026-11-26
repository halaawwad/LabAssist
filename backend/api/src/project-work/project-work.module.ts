import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ProjectWorkspace } from "../../../../shared/contracts/project-work";
import {
  DepartmentProjectController,
  DepartmentProjectService,
} from "./department-project.controller";
import { DepartmentGuard } from "../common/guards/department.guard";
import { AuthModule } from "../auth/auth.module";
import { SessionGuard } from "../auth/guards/session.guard";
import { Actor, Role } from "../common/security/identity";
import { Database } from "../database/database.service";
import type { Prisma } from "@prisma/client";
import {
  CreateProjectIssueDto,
  CreateProjectTaskDto,
  ProjectDetailsDto,
  UpdateProjectIssueDto,
  UpdateProjectTaskDto,
} from "./project-work.dto";

@Injectable()
class ProjectWorkService {
  constructor(private readonly db: Database) {}

  async read(actor: Actor, projectId: string | null) {
    const [project] = await this.readVisible(actor, projectId);
    if (!project) throw new NotFoundException("Project workspace not found.");
    return project;
  }

  supervised(actor: Actor) {
    if (actor.role !== Role.SUPERVISOR) {
      throw new ForbiddenException("A supervisor session is required.");
    }
    return this.readVisible(actor, null, true);
  }

  private async readVisible(actor: Actor, projectId: string | null, allAssigned = false) {
    if (actor.role !== Role.STUDENT && actor.role !== Role.SUPERVISOR) {
      throw new ForbiddenException("A project member session is required.");
    }

    const rows = await this.db.$queryRaw<{ workspace: ProjectWorkspace }[]>`
      WITH visible_project AS (
        SELECT p.*, term.name AS term_name
        FROM labassist_student.projects p
        JOIN labassist_student.academic_terms term ON term.id = p.term_id
        WHERE (
          (${actor.role} = 'STUDENT' AND labassist_student.team_member(${actor.id}::uuid, p.id))
          OR (${actor.role} = 'SUPERVISOR' AND labassist_student.project_supervisor(${actor.id}::uuid, p.id))
        ) AND (
          p.id = ${projectId}::uuid
          OR (
            ${projectId}::uuid IS NULL AND (${actor.role} = 'STUDENT' OR ${allAssigned})
            AND p.status <> 'ARCHIVED'
            AND term.starts_on <= (now() AT TIME ZONE 'Asia/Hebron')::date
            AND (term.ends_on IS NULL OR term.ends_on >= (now() AT TIME ZONE 'Asia/Hebron')::date)
          )
        )
        ORDER BY term.starts_on DESC, term.created_at DESC, p.id
        LIMIT CASE WHEN ${allAssigned} THEN NULL ELSE 1 END
      )
      SELECT jsonb_build_object(
        'id', p.id, 'name', p.name, 'subtitle', p.subtitle, 'abstract', p.abstract,
        'status', p.status, 'updatedAt', p.updated_at,
        'term', jsonb_build_object('id', p.term_id, 'name', p.term_name),
        'students', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.full_name) ORDER BY a.full_name, a.id)
          FROM labassist_student.project_students m
          JOIN labassist_student.accounts a ON a.id = m.student_id
          WHERE m.project_id = p.id AND m.left_at IS NULL
        ), '[]'::jsonb),
        'supervisors', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.full_name) ORDER BY a.full_name, a.id)
          FROM labassist_student.project_supervisors m
          JOIN labassist_student.accounts a ON a.id = m.supervisor_id
          WHERE m.project_id = p.id
        ), '[]'::jsonb),
        'tasks', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', t.id, 'assignedTo', t.assigned_to, 'title', t.title, 'description', t.description,
            'dueOn', t.due_on, 'status', t.status, 'needsHelp', t.needs_help, 'revision', t.revision
          ) ORDER BY t.created_at, t.id)
          FROM labassist_student.project_tasks t WHERE t.project_id = p.id
        ), '[]'::jsonb),
        'issues', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', i.id, 'title', i.title, 'description', i.description, 'priority', i.priority,
            'status', i.status, 'resolution', i.resolution, 'revision', i.revision
          ) ORDER BY i.created_at, i.id)
          FROM labassist_student.project_issues i WHERE i.project_id = p.id
        ), '[]'::jsonb)
      ) AS workspace FROM visible_project p
    `;
    return rows.map(({ workspace }) => workspace);
  }

  private write<T>(
    actor: Actor,
    id: string,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
    locksAllocation = false,
  ) {
    if (actor.role !== Role.STUDENT) throw new ForbiddenException("A student session is required.");
    return this.db.$transaction(async (tx) => {
      if (locksAllocation) await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(25102701)`;
      if (!(await this.lockMember(tx, id, actor.id))) {
        throw new NotFoundException("Project workspace not found.");
      }
      return action(tx);
    });
  }

  private async lockMember(tx: Prisma.TransactionClient, projectId: string, studentId: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM labassist_student.project_students
      WHERE project_id = ${projectId}::uuid AND student_id = ${studentId}::uuid AND left_at IS NULL
      FOR SHARE
    `;
    return rows.length > 0;
  }

  updateDetails(actor: Actor, id: string, input: ProjectDetailsDto) {
    return this.write(
      actor,
      id,
      async (tx) => {
        const [updated] = await tx.$queryRaw<{ updatedAt: string }[]>`
        UPDATE labassist_student.projects
        SET name = ${input.name.trim()}, subtitle = ${input.subtitle.trim()},
            abstract = ${input.abstract.trim()},
            updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
        WHERE id = ${id}::uuid AND updated_at = ${input.expectedUpdatedAt}::timestamptz
        RETURNING to_jsonb(updated_at) #>> '{}' AS "updatedAt"
      `;
        if (!updated) throw new ConflictException("Project changed. Reload and try again.");
        return updated;
      },
      true,
    );
  }

  createTask(actor: Actor, id: string, input: CreateProjectTaskDto) {
    return this.write(actor, id, async (tx) => {
      if (!(await this.lockMember(tx, id, input.assignedTo))) {
        throw new BadRequestException("Choose a student on your team.");
      }
      const [result] = await tx.$queryRaw<{ id: string; revision: number }[]>`
        INSERT INTO labassist_student.project_tasks
          (project_id, created_by, updated_by, assigned_to, title, description, due_on)
        VALUES (${id}::uuid, ${actor.id}::uuid, ${actor.id}::uuid, ${input.assignedTo}::uuid,
          ${input.title.trim()}, ${input.description.trim()}, ${input.dueOn ?? null}::date)
        RETURNING id, revision
      `;
      return result;
    });
  }

  updateTask(actor: Actor, id: string, taskId: string, input: UpdateProjectTaskDto) {
    return this.write(actor, id, async (tx) => {
      const [task] = await tx.$queryRaw<{ assigned_to: string; revision: number }[]>`
        SELECT assigned_to, revision FROM labassist_student.project_tasks
        WHERE project_id = ${id}::uuid AND id = ${taskId}::uuid FOR UPDATE
      `;
      if (!task) throw new NotFoundException("Task not found.");
      if (task.assigned_to !== actor.id) {
        throw new ForbiddenException("Only the assignee may update this task.");
      }
      if (task.revision !== input.expectedRevision) {
        throw new ConflictException("Task changed. Reload and try again.");
      }
      const [result] = await tx.$queryRaw<{ id: string; revision: number }[]>`
        SELECT id, revision FROM labassist_student.set_project_task_status(
          ${actor.id}::uuid, ${taskId}::uuid, ${input.expectedRevision}::int,
          ${input.status}, ${input.needsHelp}
        )
      `;
      return result;
    });
  }

  createIssue(actor: Actor, id: string, input: CreateProjectIssueDto) {
    return this.write(actor, id, async (tx) => {
      const [result] = await tx.$queryRaw<{ id: string; revision: number }[]>`
        INSERT INTO labassist_student.project_issues
          (project_id, created_by, updated_by, title, description, priority)
        VALUES (${id}::uuid, ${actor.id}::uuid, ${actor.id}::uuid, ${input.title.trim()},
          ${input.description.trim()}, ${input.priority})
        RETURNING id, revision
      `;
      return result;
    });
  }

  updateIssue(actor: Actor, id: string, issueId: string, input: UpdateProjectIssueDto) {
    const resolution = input.resolution.trim();
    if (input.status === "RESOLVED" && !resolution) {
      throw new BadRequestException("Enter a resolution before resolving the issue.");
    }
    return this.write(actor, id, async (tx) => {
      const [issue] = await tx.$queryRaw<{ revision: number }[]>`
        SELECT revision FROM labassist_student.project_issues
        WHERE project_id = ${id}::uuid AND id = ${issueId}::uuid FOR UPDATE
      `;
      if (!issue) throw new NotFoundException("Issue not found.");
      if (issue.revision !== input.expectedRevision) {
        throw new ConflictException("Issue changed. Reload and try again.");
      }
      const [result] = await tx.$queryRaw<{ id: string; revision: number }[]>`
        UPDATE labassist_student.project_issues
        SET title = ${input.title.trim()}, description = ${input.description.trim()},
            priority = ${input.priority}, status = ${input.status},
            resolution = ${resolution}, updated_by = ${actor.id}::uuid
        WHERE project_id = ${id}::uuid AND id = ${issueId}::uuid
        RETURNING id, revision
      `;
      return result;
    });
  }
}

@ApiTags("Project work")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("projects")
class ProjectWorkController {
  constructor(private readonly work: ProjectWorkService) {}

  @Get("mine")
  @ApiOperation({ summary: "Read the signed-in student's workspace for their current term" })
  mine(@Req() req: { actor: Actor }) {
    return this.work.read(req.actor, null);
  }

  @Get("supervised")
  @ApiOperation({ summary: "Read the current projects assigned to the signed-in supervisor" })
  supervised(@Req() req: { actor: Actor }) {
    return this.work.supervised(req.actor);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a project workspace as an assigned student or supervisor" })
  read(@Req() req: { actor: Actor }, @Param("id", ParseUUIDPipe) id: string) {
    return this.work.read(req.actor, id);
  }

  @Patch(":id")
  updateDetails(
    @Req() req: { actor: Actor },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: ProjectDetailsDto,
  ) {
    return this.work.updateDetails(req.actor, id, input);
  }

  @Post(":id/tasks")
  createTask(
    @Req() req: { actor: Actor },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: CreateProjectTaskDto,
  ) {
    return this.work.createTask(req.actor, id, input);
  }

  @Patch(":id/tasks/:taskId")
  updateTask(
    @Req() req: { actor: Actor },
    @Param("id", ParseUUIDPipe) id: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() input: UpdateProjectTaskDto,
  ) {
    return this.work.updateTask(req.actor, id, taskId, input);
  }

  @Post(":id/issues")
  createIssue(
    @Req() req: { actor: Actor },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: CreateProjectIssueDto,
  ) {
    return this.work.createIssue(req.actor, id, input);
  }

  @Patch(":id/issues/:issueId")
  updateIssue(
    @Req() req: { actor: Actor },
    @Param("id", ParseUUIDPipe) id: string,
    @Param("issueId", ParseUUIDPipe) issueId: string,
    @Body() input: UpdateProjectIssueDto,
  ) {
    return this.work.updateIssue(req.actor, id, issueId, input);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ProjectWorkController, DepartmentProjectController],
  providers: [ProjectWorkService, DepartmentProjectService, DepartmentGuard],
})
export class ProjectWorkModule {}
