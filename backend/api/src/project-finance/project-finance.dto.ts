import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
const money = /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/;
export class BudgetDto {
  @ApiProperty({ example: "250.00" }) @Matches(money) amount!: string;
  @ApiProperty({ example: "ILS" }) @Matches(/^[A-Z]{3}$/) currency!: string;
  @ApiProperty({
    nullable: true,
    description: "null for initial budget; current revision for an update",
  })
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  expectedRevision!: number | null;
}
export class BomDto {
  @ApiProperty() @Matches(/\S/u) @MaxLength(240) name!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(1000000) quantityRequired!: number;
  @ApiProperty({ nullable: true })
  @ValidateIf((_, v) => v !== null)
  @Matches(money)
  estimatedUnitPrice!: string | null;
  @ApiProperty() @IsString() @MaxLength(10000) notes!: string;
}
export class UpdateBomDto extends BomDto {
  @ApiProperty() @IsInt() @Min(0) expectedRevision!: number;
  @ApiProperty() @IsBoolean() isNeeded!: boolean;
  @ApiProperty() @IsString() @MaxLength(2000) notNeededReason!: string;
}
export class ExpenseLineDto {
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsUUID() bomItemId?: string;
  @ApiProperty() @Matches(/\S/u) @MaxLength(240) label!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(1000000) quantity!: number;
  @ApiProperty() @Matches(money) unitPrice!: string;
}
export class ExpenseDto {
  @ApiProperty({ description: "Stable UUID reused when retrying the same purchase" })
  @IsUUID()
  requestKey!: string;
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) purchasedOn!: string;
  @ApiProperty() @IsString() @MaxLength(240) sellerName!: string;
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsUUID() receiptFileId?: string;
  @ApiProperty({ type: [ExpenseLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines!: ExpenseLineDto[];
}
export class VoidExpenseDto {
  @ApiProperty() @IsInt() @Min(0) expectedRevision!: number;
  @ApiProperty() @Matches(/\S/u) @MaxLength(2000) reason!: string;
}
