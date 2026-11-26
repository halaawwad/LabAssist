import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {SHOPS} from './price-sync.dto';
const NS={nullable:true,required:false} as const;
export class LocalShopPrice{
 @ApiProperty({enum:SHOPS}) shop!:string;@ApiProperty({enum:['PRICE_FOUND','PRICE_NOT_LISTED','NO_MATCH','FETCH_FAILED','MATCH_UNRESOLVED']}) priceStatus!:string;
 @ApiProperty(NS) availability!:string|null;@ApiProperty(NS) price!:string|null;@ApiProperty(NS) currency!:string|null;@ApiProperty(NS) sourceUrl!:string|null;
 @ApiProperty(NS) observedAt!:string|null;@ApiProperty(NS) stockCheckedAt!:string|null;@ApiProperty(NS) lastSuccessfulCheck!:string|null;@ApiProperty() stale!:boolean;@ApiProperty(NS) offerId!:string|null;
}
export class GlobalPriceReference{
 @ApiProperty() supplier!:string;@ApiProperty() url!:string;@ApiProperty() currency!:string;@ApiProperty() price!:string;@ApiProperty() quantity!:number;
 @ApiProperty() observedAt!:string;@ApiProperty({enum:['UNKNOWN','INCLUDED','EXCLUDED']}) shippingInclusion!:string;@ApiProperty({enum:['UNKNOWN','INCLUDED','EXCLUDED']}) taxInclusion!:string;
}
export class ShopPriceComparison{
 @ApiProperty() variantId!:string;@ApiProperty() quantity!:number;@ApiProperty({type:[LocalShopPrice]}) localShops!:LocalShopPrice[];
 @ApiProperty() globalFallbackEligible!:boolean;@ApiPropertyOptional({type:GlobalPriceReference,nullable:true}) globalReference!:GlobalPriceReference|null;
}
export class ShopFeedConfiguration{@ApiProperty({enum:SHOPS}) shop!:string;@ApiProperty() sellerId!:string;@ApiProperty() sourceId!:string;@ApiProperty() configuredAt!:string;}
export class MappingReviewResult{@ApiProperty() id!:string;@ApiProperty({enum:['APPROVED','REJECTED']}) status!:string;}
