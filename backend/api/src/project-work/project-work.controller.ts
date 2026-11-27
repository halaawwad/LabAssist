import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SessionGuard } from "../auth/guards/session.guard";
import { Actor } from "../common/security/identity";
import { ProjectWorkService } from "./project-work.service";
import { CreateProjectIssueDto, CreateProjectTaskDto, ProjectDetailsDto, UpdateProjectIssueDto, UpdateProjectTaskDto } from "./project-work.dto";
@ApiTags("Project work")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("projects")
export class ProjectWorkController {
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

