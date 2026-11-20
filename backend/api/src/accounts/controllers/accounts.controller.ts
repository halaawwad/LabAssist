import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOkResponse, ApiCreatedResponse } from "@nestjs/swagger";
import { AccountResponseDto } from "../../common/dto/account-response.dto";
import { SessionGuard } from "../../auth/guards/session.guard";
import { DepartmentGuard } from "../../common/guards/department.guard";
import { AccountsService } from "../services/accounts.service";
import { AccountDto, StatusDto } from "../dto/account.dto";
@ApiTags("Accounts")
@ApiBearerAuth()
@UseGuards(SessionGuard, DepartmentGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private accounts: AccountsService) {}
  @ApiOkResponse({ type: AccountResponseDto, isArray: true }) @Get() list() {
    return this.accounts.list();
  }
  @ApiCreatedResponse({ type: AccountResponseDto }) @Post() create(
    @Body() body: AccountDto,
    @Req() req: any,
  ) {
    return this.accounts.provision(body, req.actor);
  }
  @Post(":id/invitation") invite(@Param("id", new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.accounts.resend(id, req.actor);
  }
  @Patch(":id/status") status(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: StatusDto,
    @Req() req: any,
  ) {
    return this.accounts.status(id, body.status, req.actor);
  }
}
