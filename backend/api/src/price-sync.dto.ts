import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,MaxLength,Min} from 'class-validator';
import {Type} from 'class-transformer';

export const SHOPS=['TECHNOLAB','PIC_INDUSTRIAL'] as const;
export class ShopFeedDto{
 @ApiProperty({enum:SHOPS}) @IsIn(SHOPS) shop!:typeof SHOPS[number];
 @ApiProperty() @IsUUID() sellerId!:string;
 @ApiProperty({description:'Existing APPROVED SHOP_PAGE source. Approval authorizes derived observations from this same shop feed.'}) @IsUUID() sourceId!:string;
}
export class MappingReviewDto{
 @ApiProperty({enum:['APPROVED','REJECTED']}) @IsIn(['APPROVED','REJECTED']) decision!:'APPROVED'|'REJECTED';
 @ApiPropertyOptional() @IsOptional() @Matches(/^[a-z0-9_-]{1,100}$/) catalogKey?:string;
 @ApiPropertyOptional() @IsOptional() @IsUUID() variantId?:string;
 @ApiPropertyOptional({default:1}) @IsOptional() @IsInt() @Min(1) @Max(100000) saleQuantity?:number;
 @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100000) packageQuantity?:number;
}
export class ShopComparisonQuery{
 @ApiProperty() @IsUUID() variantId!:string;
 @ApiProperty({minimum:1,maximum:100000}) @Type(()=>Number) @IsInt() @Min(1) @Max(100000) quantity!:number;
}
export class GlobalReferenceDto{
 @ApiProperty() @IsUUID() variantId!:string;
 @ApiProperty() @IsString() @Length(1,160) supplier!:string;
 @ApiProperty() @IsString() @MaxLength(1000) @Matches(/^https?:\/\/\S+$/) url!:string;
 @ApiProperty() @Matches(/^[A-Z]{3}$/) currency!:string;
 @ApiProperty() @IsString() @Matches(/^\d{1,12}(\.\d{1,2})?$/) price!:string;
 @ApiProperty() @IsInt() @Min(1) @Max(100000) quantity!:number;
 @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}T/) observedAt!:string;
 @ApiPropertyOptional({enum:['UNKNOWN','INCLUDED','EXCLUDED'],default:'UNKNOWN'}) @IsOptional() @IsIn(['UNKNOWN','INCLUDED','EXCLUDED']) shippingInclusion?:string;
 @ApiPropertyOptional({enum:['UNKNOWN','INCLUDED','EXCLUDED'],default:'UNKNOWN'}) @IsOptional() @IsIn(['UNKNOWN','INCLUDED','EXCLUDED']) taxInclusion?:string;
}
