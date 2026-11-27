import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DepartmentGuard } from "../common/guards/department.guard";
import { DepartmentProjectController, DepartmentProjectService } from "./department-project.controller";
import { ProjectWorkController } from "./project-work.controller";
import { ProjectWorkService } from "./project-work.service";

@Module({
  imports: [AuthModule],
  controllers: [ProjectWorkController, DepartmentProjectController],
  providers: [ProjectWorkService, DepartmentProjectService, DepartmentGuard],
})
export class ProjectWorkModule {}
