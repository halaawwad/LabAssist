import {ArrayMaxSize,ArrayUnique,IsArray,IsBoolean,IsDateString,IsIn,IsInt,IsLatitude,IsLongitude,IsOptional,IsString,IsUUID,Length,Matches,Max,MaxLength,Min} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
// Money is exchanged as decimal strings (two places at most) so prices never pass through floating point.
const MONEY=/^\d{1,12}(\.\d{1,2})?$/;
const URL=/^https?:\/\/\S+$/;
export const PART_KEY=/^[a-z0-9_-]{1,100}$/;
export const OFFER_STATUSES=['DRAFT','ACTIVE','SOLD','EXPIRED','WITHDRAWN'] as const;
export const SOURCE_KINDS=['FACEBOOK','SPREADSHEET','SHOP_PAGE','MANUAL'] as const;
export const IDENTITY_FIELDS=['MANUFACTURER','MODEL','PACKAGE_OR_REVISION'] as const;
const FLAG=['true','false'];
// Every list is bounded: default 50, maximum 100, continued only with the returned nextCursor.
export class PageQuery{
 @ApiPropertyOptional({minimum:1,maximum:100,default:50}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit?:number;
 @ApiPropertyOptional({description:'Opaque nextCursor returned by the previous page.'}) @IsOptional() @IsString() @MaxLength(1000) cursor?:string;
}
export class CatalogQuery extends PageQuery{
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?:string;
 @ApiPropertyOptional({enum:FLAG,description:'Workshop managers only.'}) @IsOptional() @IsIn(FLAG) includeInactive?:string;
}
export class CatalogPartUpdateDto{
 @ApiProperty() @IsInt() @Min(0) expectedRevision!:number;
 @ApiProperty() @IsString() @Length(1,160) nameEn!:string;
 @ApiProperty() @IsString() @Length(1,160) nameAr!:string;
 @ApiProperty() @IsString() @MaxLength(4000) description!:string;
 @ApiProperty() @IsBoolean() active!:boolean;
}
export class VariantDto{
 @ApiPropertyOptional({description:'Omit when unknown.'}) @IsOptional() @IsString() @Length(1,160) manufacturer?:string;
 @ApiPropertyOptional({description:'Omit when unknown.'}) @IsOptional() @IsString() @Length(1,160) modelNumber?:string;
 @ApiPropertyOptional({description:'Package or board revision; omit when unknown.'}) @IsOptional() @IsString() @Length(1,160) packageOrRevision?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) @Matches(URL) sourceUrl?:string;
}
export class IdentityFieldsDto{
 @ApiProperty() @IsInt() @Min(0) expectedRevision!:number;
 @ApiProperty({enum:IDENTITY_FIELDS,isArray:true,description:'Fields that must be known for an exact match; empty means the catalog part alone is exact.'}) @IsArray() @ArrayMaxSize(3) @ArrayUnique() @IsIn(IDENTITY_FIELDS,{each:true}) fields!:typeof IDENTITY_FIELDS[number][];
}
export class SellerQuery extends PageQuery{
 @ApiPropertyOptional({enum:['SHOP','STUDENT']}) @IsOptional() @IsIn(['SHOP','STUDENT']) kind?:'SHOP'|'STUDENT';
 @ApiPropertyOptional({enum:FLAG}) @IsOptional() @IsIn(FLAG) includeDemo?:string;
}
export class SellerDto{
 @ApiProperty() @IsString() @Length(1,160) name!:string;
 @ApiProperty() @IsString() @Length(1,120) city!:string;
 @ApiPropertyOptional() @IsOptional() @IsLatitude() latitude?:number;
 @ApiPropertyOptional() @IsOptional() @IsLongitude() longitude?:number;
 @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\+?[0-9 ()-]{6,24}$/) phone?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) @Matches(URL) website?:string;
}
export class SourceDto{
 @ApiProperty({enum:SOURCE_KINDS}) @IsIn(SOURCE_KINDS) kind!:typeof SOURCE_KINDS[number];
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) @Matches(URL) url?:string;
 @ApiProperty({description:'When the price evidence was observed.'}) @IsDateString() observedAt!:string;
 @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9a-f]{64}$/) contentHash?:string;
}
export class SourceQuery extends PageQuery{@ApiPropertyOptional({enum:['PENDING','APPROVED','REJECTED','REVOKED']}) @IsOptional() @IsIn(['PENDING','APPROVED','REJECTED','REVOKED']) status?:string;}
export class ReviewDto{@ApiProperty({enum:['APPROVED','REJECTED']}) @IsIn(['APPROVED','REJECTED']) decision!:'APPROVED'|'REJECTED';}
export class RevokeDto{@ApiProperty({minLength:1,maxLength:1000}) @IsString() @Length(1,1000) @Matches(/\S/) reason!:string;}
export class OfferDto{
 @ApiProperty() @IsUUID() sellerId!:string;
 @ApiProperty({description:'Source evidence for the first price; its observation date becomes the first observation date.'}) @IsUUID() sourceId!:string;
 @ApiPropertyOptional() @IsOptional() @Matches(PART_KEY) catalogKey?:string;
 @ApiPropertyOptional({description:'Catalog identity of the same part.'}) @IsOptional() @IsUUID() variantId?:string;
 @ApiProperty() @IsString() @Length(1,200) partName!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) variant?:string;
 @ApiProperty({enum:['NEW','USED']}) @IsIn(['NEW','USED']) condition!:'NEW'|'USED';
 @ApiProperty({example:'25.50'}) @IsString() @Matches(MONEY) unitPrice!:string;
 @ApiProperty({example:'ILS'}) @Matches(/^[A-Z]{3}$/) currency!:string;
 @ApiProperty() @IsInt() @Min(0) @Max(100000) quantity!:number;
 @ApiPropertyOptional({example:'5.00'}) @IsOptional() @IsString() @Matches(MONEY) shippingCost?:string;
 @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?:string;
 @ApiProperty({enum:['DRAFT','ACTIVE']}) @IsIn(['DRAFT','ACTIVE']) status!:'DRAFT'|'ACTIVE';
}
// Status and quantity only; prices change through a new observation (PriceObservationDto).
export class OfferUpdateDto{
 @ApiProperty() @IsInt() @Min(0) expectedRevision!:number;
 @ApiProperty() @IsInt() @Min(0) @Max(100000) quantity!:number;
 @ApiProperty({enum:OFFER_STATUSES,description:'Allowed: DRAFT->ACTIVE|WITHDRAWN, ACTIVE->SOLD|WITHDRAWN|EXPIRED, EXPIRED->ACTIVE (only after a newer approved price observation). SOLD and WITHDRAWN are final (409). An ACTIVE offer needs quantity > 0; zero quantity requires an explicit closing status.'}) @IsIn(OFFER_STATUSES) status!:typeof OFFER_STATUSES[number];
}
export class PriceObservationDto{
 @ApiProperty() @IsInt() @Min(0) expectedRevision!:number;
 @ApiProperty({description:'Source of this observation; it must belong to the offer seller and not be rejected or revoked.'}) @IsUUID() sourceId!:string;
 @ApiProperty({example:'25.50'}) @IsString() @Matches(MONEY) unitPrice!:string;
 @ApiPropertyOptional({example:'5.00'}) @IsOptional() @IsString() @Matches(MONEY) shippingCost?:string;
 @ApiProperty({example:'ILS',description:'Must equal the offer currency.'}) @Matches(/^[A-Z]{3}$/) currency!:string;
 @ApiProperty({description:'When this price was observed; later than the previous observation and not in the future.'}) @IsDateString() observedAt!:string;
 @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?:string;
}
export class OfferVariantDto{
 @ApiProperty() @IsInt() @Min(0) expectedRevision!:number;
 @ApiProperty() @IsUUID() variantId!:string;
}
export class OfferQuery extends PageQuery{
 @ApiPropertyOptional() @IsOptional() @Matches(PART_KEY) catalogKey?:string;
 @ApiPropertyOptional({enum:['SHOP','STUDENT']}) @IsOptional() @IsIn(['SHOP','STUDENT']) sellerKind?:'SHOP'|'STUDENT';
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?:string;
 @ApiPropertyOptional({enum:FLAG}) @IsOptional() @IsIn(FLAG) includeDemo?:string;
}
export class ManagedOfferQuery extends PageQuery{
 @ApiPropertyOptional() @IsOptional() @IsUUID() sellerId?:string;
 @ApiPropertyOptional({enum:OFFER_STATUSES}) @IsOptional() @IsIn(OFFER_STATUSES) status?:string;
}
export class CompareQuery extends PageQuery{
 @ApiProperty() @Matches(PART_KEY) catalogKey!:string;
 @ApiProperty({example:'ILS'}) @Matches(/^[A-Z]{3}$/) currency!:string;
 @ApiPropertyOptional({enum:['NEW','USED']}) @IsOptional() @IsIn(['NEW','USED']) condition?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) variant?:string;
 @ApiPropertyOptional({enum:FLAG}) @IsOptional() @IsIn(FLAG) includeDemo?:string;
}
export class ExactCompareQuery extends PageQuery{
 @ApiProperty() @IsUUID() variantId!:string;
 @ApiProperty({example:'ILS'}) @Matches(/^[A-Z]{3}$/) currency!:string;
 @ApiPropertyOptional({enum:['NEW','USED']}) @IsOptional() @IsIn(['NEW','USED']) condition?:string;
 @ApiPropertyOptional({enum:FLAG}) @IsOptional() @IsIn(FLAG) includeDemo?:string;
}
