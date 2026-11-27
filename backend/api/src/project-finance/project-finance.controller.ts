import { Res } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { ReceiptDto } from "./project-finance.dto";
import {
  ProjectFinanceResponse,
  FinanceMutationResponse,
  BudgetRevisionResponse,
  BomCreatedResponse,
} from "./project-finance.responses";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { SessionGuard } from "../auth/guards/session.guard";
import { Actor } from "../common/security/identity";
import { ProjectFinanceService } from "./project-finance.service";
import { BomDto, BudgetDto, ExpenseDto, UpdateBomDto, VoidExpenseDto } from "./project-finance.dto";
@ApiTags("Project finance")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("projects/:projectId")
export class ProjectFinanceController {
  constructor(private finance: ProjectFinanceService) {}
  @Get("finance")
  @ApiOkResponse({ type: ProjectFinanceResponse })
  @ApiOperation({
    summary: "Read the shared project budget, BOM and expense history (students only)",
  })
  read(@Req() r: { actor: Actor }, @Param("projectId", ParseUUIDPipe) id: string) {
    return this.finance.read(r.actor, id);
  }
  @Put("budget") @ApiOkResponse({ type: BudgetRevisionResponse }) budget(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) id: string,
    @Body() b: BudgetDto,
  ) {
    return this.finance.budget(r.actor, id, b);
  }
  @Post("bom") @ApiCreatedResponse({ type: BomCreatedResponse }) createBom(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) id: string,
    @Body() b: BomDto,
  ) {
    return this.finance.createBom(r.actor, id, b);
  }
  @Patch("bom/:id") @ApiOkResponse({ type: FinanceMutationResponse }) updateBom(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: UpdateBomDto,
  ) {
    return this.finance.updateBom(r.actor, p, id, b);
  }
  @Post("expenses") @ApiCreatedResponse({ type: FinanceMutationResponse }) expense(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) id: string,
    @Body() b: ExpenseDto,
  ) {
    return this.finance.expense(r.actor, id, b);
  }
  @Post("expenses/:id/void") @HttpCode(200) @ApiOkResponse({ type: FinanceMutationResponse }) void(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: VoidExpenseDto,
  ) {
    return this.finance.voidExpense(r.actor, p, id, b);
  }
  @Post("receipts")
  @ApiCreatedResponse({ description: "Validated receipt stored; returns its file ID" })
  upload(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) id: string,
    @Body() body: ReceiptDto,
  ) {
    return this.finance.uploadReceipt(r.actor, id, body);
  }
  @Get("receipts/:fileId")
  @ApiOkResponse({ description: "Private receipt bytes for current project members" })
  async receipt(
    @Req() r: { actor: Actor },
    @Param("projectId", ParseUUIDPipe) id: string,
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @Res() res: ServerResponse,
  ) {
    const file = await this.finance.receipt(r.actor, id, fileId);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", 'attachment; filename="receipt"');
    res.end(file.bytes);
  }
}
