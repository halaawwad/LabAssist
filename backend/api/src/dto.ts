import {IsEmail,IsEnum,IsIn,IsOptional,IsString,IsUUID,Length,Matches,MaxLength,MinLength} from 'class-validator';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Role} from './identity';
export class LoginDto{
 @ApiProperty({enum:Role}) @IsEnum(Role) role!:Role;
 @ApiProperty() @IsString() @Length(1,254) identifier!:string;
 @ApiProperty({format:'password'}) @IsString() @Length(1,128) password!:string;
}
export class PasswordDto{
 @ApiProperty({minLength:12,maxLength:128,format:'password'}) @IsString() @Length(12,128) password!:string;
 @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!:string;
}
export class ActivateDto extends PasswordDto{@ApiProperty() @IsEmail() @MaxLength(254) email!:string;}
export class RefreshDto{@ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) refreshToken!:string;}
export class ForgotDto{@ApiProperty() @IsEmail() @MaxLength(254) email!:string;}
export class AccountDto{
 @ApiProperty({enum:[Role.STUDENT,Role.SUPERVISOR,Role.WORKSHOP_MANAGER]}) @IsIn([Role.STUDENT,Role.SUPERVISOR,Role.WORKSHOP_MANAGER]) role!:Role;
 @ApiProperty() @IsString() @Length(1,160) fullName!:string;
 @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(254) email?:string;
 @ApiPropertyOptional() @IsOptional() @Matches(/^\d{8}$/) universityNumber?:string;
 @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4,5}$/) employeeNumber?:string;
}
export class StatusDto{@ApiProperty({enum:['ACTIVE','DISABLED']}) @IsIn(['ACTIVE','DISABLED']) status!:'ACTIVE'|'DISABLED';}
