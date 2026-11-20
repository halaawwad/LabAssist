import { IsEmail, IsEnum, IsString, Length, Matches, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../../common/security/identity";
import type {
  LoginRequest,
  PasswordRequest,
  ActivateRequest,
  RefreshRequest,
  ForgotPasswordRequest,
} from "../../../../../shared/contracts/auth";
export class LoginDto implements LoginRequest {
  @ApiProperty({ enum: Role }) @IsEnum(Role) role!: Role;
  @ApiProperty() @IsString() @Length(1, 254) identifier!: string;
  @ApiProperty({ format: "password" }) @IsString() @Length(1, 128) password!: string;
}
export class PasswordDto implements PasswordRequest {
  @ApiProperty({ minLength: 12, maxLength: 128, format: "password" })
  @IsString()
  @Length(12, 128)
  password!: string;
  @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class ActivateDto extends PasswordDto implements ActivateRequest {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
}
export class RefreshDto implements RefreshRequest {
  @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) refreshToken!: string;
}
export class ForgotDto implements ForgotPasswordRequest {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
}
