import { ApiProperty } from "@nestjs/swagger";
import type { SessionResponse } from "../../../../../shared/contracts/auth";
import { AccountResponseDto } from "../../common/dto/account-response.dto";

export class SessionResponseDto implements SessionResponse {
  @ApiProperty({ type: String }) accessToken!: string;
  @ApiProperty({ type: String }) refreshToken!: string;
  @ApiProperty({ type: String, format: "date-time" }) accessExpiresAt!: string;
  @ApiProperty({ type: AccountResponseDto }) account!: AccountResponseDto;

  static create(input: Omit<SessionResponse, "accessExpiresAt"> & { accessExpiresAt: Date }) {
    return Object.assign(new SessionResponseDto(), {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      accessExpiresAt: input.accessExpiresAt.toISOString(),
      account: input.account,
    });
  }
}
