import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiCreatedResponse, ApiOkResponse } from "@nestjs/swagger";
import { AccountResponseDto } from "../../common/dto/account-response.dto";
import { SessionResponseDto } from "../dto/session-response.dto";
import { SessionGuard } from "../../auth/guards/session.guard";

import { AuthService } from "../services/auth.service";
import { ActivateDto, ForgotDto, LoginDto, PasswordDto, RefreshDto } from "../dto/auth.dto";
@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}
  @ApiCreatedResponse({ type: SessionResponseDto }) @Post("login") login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }
  @Post("activate") activate(@Body() body: ActivateDto) {
    return this.auth.activate(body);
  }
  @ApiCreatedResponse({ type: SessionResponseDto }) @Post("refresh") refresh(
    @Body() body: RefreshDto,
  ) {
    return this.auth.refresh(body.refreshToken);
  }
  @Post("forgot-password") @HttpCode(202) forgot(@Body() body: ForgotDto) {
    return this.auth.forgot(body.email);
  }
  @Post("reset-password") reset(@Body() body: PasswordDto) {
    return this.auth.reset(body);
  }
  @ApiBearerAuth() @UseGuards(SessionGuard) @Post("logout") logout(@Req() req: any) {
    return this.auth.logout(req.sessionId);
  }
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  @Get("me")
  me(@Req() req: any) {
    return req.actor;
  }
}
