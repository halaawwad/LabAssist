import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "../../common/security/identity";
export class AccountDto {
  @ApiProperty({ enum: [Role.STUDENT, Role.SUPERVISOR, Role.WORKSHOP_MANAGER] })
  @IsIn([Role.STUDENT, Role.SUPERVISOR, Role.WORKSHOP_MANAGER])
  role!: Role;
  @ApiProperty() @IsString() @Length(1, 160) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{8}$/) universityNumber?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4,5}$/) employeeNumber?: string;
}
export class StatusDto {
  @ApiProperty({ enum: ["ACTIVE", "DISABLED"] }) @IsIn(["ACTIVE", "DISABLED"]) status!:
    "ACTIVE" | "DISABLED";
}
export class AccountNameDto {
  @ApiProperty() @IsString() @Length(1, 160) fullName!: string;
}
