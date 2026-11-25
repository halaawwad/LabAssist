import {applyDecorators,Type} from '@nestjs/common';
import {ApiProperty,ApiResponse} from '@nestjs/swagger';
// Response schemas mirror the mappers in market.service.ts: every listed key is always present (null when unknown).
const NS={type:String,nullable:true},NN={type:Number,nullable:true};
// Body produced by the global ApiErrors filter: validation errors carry a message array; Nest exceptions add `error`.
export class ErrorResponse{
 @ApiProperty() statusCode!:number;
 @ApiProperty({oneOf:[{type:'string'},{type:'array',items:{type:'string'}}]}) message!:string|string[];
 @ApiProperty({required:false,description:'Present on framework exceptions such as validation failures.'}) error?:string;
}
const ERRORS:Record<number,string>={400:'Invalid input, rule violation or cursor.',401:'Sign in required.',403:'Permission denied or not a registered reader.',404:'Record not found.',409:'Stale revision or conflicting state.',429:'Too many requests.',500:'Unexpected failure.'};
export const ApiErrors=(...codes:number[])=>applyDecorators(...codes.map(status=>ApiResponse({status,description:ERRORS[status],type:ErrorResponse})));
export function Page<T>(item:Type<T>,name:string){
 class PageOf{
  @ApiProperty({type:[item]}) items!:T[];
  @ApiProperty({type:String,nullable:true,description:'Opaque cursor for the next page; null on the last page.'}) nextCursor!:string|null;
 }
 Object.defineProperty(PageOf,'name',{value:name});return PageOf;
}
export class Category{@ApiProperty() id!:string;@ApiProperty() nameEn!:string;@ApiProperty() nameAr!:string;@ApiProperty() sortOrder!:number;}
export class Part{
 @ApiProperty() key!:string;@ApiProperty() categoryId!:string;@ApiProperty() nameEn!:string;@ApiProperty() nameAr!:string;@ApiProperty() description!:string;
 @ApiProperty(NN) typicalSupplyVoltage!:number|null;@ApiProperty() modelId!:string;@ApiProperty() modelVersion!:number;@ApiProperty() active!:boolean;@ApiProperty() revision!:number;
 @ApiProperty({type:[String],description:'Identity fields that must be known for an exact match.'}) exactIdentityFields!:string[];
}
export class Guide{@ApiProperty() language!:string;@ApiProperty() version!:number;@ApiProperty({type:'object',additionalProperties:true}) content!:object;}
export class PartDetail extends Part{
 @ApiProperty({type:[Guide],description:'Latest guide per language (at most one per ar/en/mixed).'}) guides!:Guide[];
 @ApiProperty({description:'Use the pins endpoint to page through them.'}) pinCount!:number;
 @ApiProperty({description:'Use the documents endpoint to page through them.'}) documentCount!:number;
}
export class CatalogDocument{@ApiProperty() url!:string;@ApiProperty() title!:string;@ApiProperty() publisher!:string;@ApiProperty() format!:string;@ApiProperty() referenceScope!:string;@ApiProperty() note!:string;@ApiProperty(NS) sourceVerifiedAt!:string|null;}
export class PinField{
 @ApiProperty({nullable:true,description:'Catalog value; null when unknown.',oneOf:[{type:'string'},{type:'number'},{type:'boolean'}]}) value!:unknown;
 @ApiProperty({enum:['UNKNOWN','UNVERIFIED'],description:'No pin value is verified; VERIFIED is never returned.'}) status!:'UNKNOWN'|'UNVERIFIED';
 @ApiProperty({type:String,nullable:true,description:'Always null until per-pin sources exist.'}) source!:null;
}
export class Pin{
 @ApiProperty({description:'Stable identifier modelId:modelVersion:pinIndex.'}) id!:string;@ApiProperty() modelId!:string;@ApiProperty() modelVersion!:number;@ApiProperty() pinIndex!:number;@ApiProperty() name!:string;
 @ApiProperty() kind!:PinField;@ApiProperty() direction!:PinField;@ApiProperty() connector!:PinField;@ApiProperty() voltage!:PinField;@ApiProperty() physicalNumber!:PinField;@ApiProperty() functions!:PinField;
 @ApiProperty() label!:PinField;@ApiProperty() maxCurrent!:PinField;@ApiProperty() internalNet!:PinField;@ApiProperty() headerSide!:PinField;@ApiProperty() headerRow!:PinField;
}
export class PinPage{
 @ApiProperty() part!:string;@ApiProperty() modelId!:string;@ApiProperty() modelVersion!:number;
 @ApiProperty({enum:['NOT_EVALUATED'],description:'Wiring safety is never inferred from catalog pin data.'}) wiringSafety!:'NOT_EVALUATED';
 @ApiProperty({type:[Pin]}) items!:Pin[];@ApiProperty(NS) nextCursor!:string|null;
}
export class Variant{
 @ApiProperty() id!:string;@ApiProperty() partKey!:string;@ApiProperty(NS) manufacturer!:string|null;@ApiProperty(NS) modelNumber!:string|null;@ApiProperty(NS) packageOrRevision!:string|null;
 @ApiProperty(NS) sourceUrl!:string|null;@ApiProperty({description:'All identity fields relevant to the part are known.'}) exact!:boolean;@ApiProperty() createdAt!:string;
}
export class PartRevision{@ApiProperty() key!:string;@ApiProperty() revision!:number;}
export class Seller{
 @ApiProperty() id!:string;@ApiProperty({enum:['SHOP','STUDENT']}) kind!:string;@ApiProperty() name!:string;@ApiProperty() city!:string;@ApiProperty(NN) latitude!:number|null;@ApiProperty(NN) longitude!:number|null;
 @ApiProperty(NS) phone!:string|null;@ApiProperty(NS) website!:string|null;@ApiProperty() isDemo!:boolean;@ApiProperty() own!:boolean;
}
export class Source{
 @ApiProperty() id!:string;@ApiProperty() sellerId!:string;@ApiProperty() kind!:string;@ApiProperty(NS) url!:string|null;@ApiProperty() observedAt!:string;@ApiProperty(NS) contentHash!:string|null;
 @ApiProperty({enum:['PENDING','APPROVED','REJECTED','REVOKED']}) status!:string;@ApiProperty(NS) reviewedBy!:string|null;@ApiProperty(NS) reviewedAt!:string|null;
 @ApiProperty(NS) revokedBy!:string|null;@ApiProperty(NS) revokedAt!:string|null;@ApiProperty(NS) revocationReason!:string|null;
}
export class Offer{
 @ApiProperty() id!:string;@ApiProperty() sellerId!:string;@ApiProperty({description:'Original source evidence; later prices are observations.'}) sourceId!:string;@ApiProperty(NS) catalogKey!:string|null;@ApiProperty(NS) variantId!:string|null;
 @ApiProperty() partName!:string;@ApiProperty() variant!:string;@ApiProperty() condition!:string;@ApiProperty({description:'Latest recorded price, which may still await source approval.'}) unitPrice!:string;@ApiProperty() currency!:string;
 @ApiProperty() quantity!:number;@ApiProperty(NS) shippingCost!:string|null;@ApiProperty(NS) validUntil!:string|null;@ApiProperty() status!:string;@ApiProperty() revision!:number;@ApiProperty() updatedAt!:string;
}
export class Observation{
 @ApiProperty() id!:string;@ApiProperty() offerRevision!:number;@ApiProperty() sourceId!:string;@ApiProperty() sourceStatus!:string;@ApiProperty() unitPrice!:string;@ApiProperty(NS) shippingCost!:string|null;
 @ApiProperty() currency!:string;@ApiProperty({type:String,nullable:true,description:'Null only for legacy prices whose observation date is unknown.'}) observedAt!:string|null;@ApiProperty() isLegacy!:boolean;@ApiProperty() recordedAt!:string;
}
export class HistoryEntry{@ApiProperty() revision!:number;@ApiProperty() changedAt!:string;@ApiProperty() unitPrice!:string;@ApiProperty() quantity!:number;@ApiProperty() status!:string;}
export class PublicSeller{@ApiProperty() id!:string;@ApiProperty() name!:string;@ApiProperty() kind!:string;@ApiProperty() city!:string;@ApiProperty(NN) latitude!:number|null;@ApiProperty(NN) longitude!:number|null;@ApiProperty(NS) phone!:string|null;@ApiProperty(NS) website!:string|null;@ApiProperty() isDemo!:boolean;}
export class PublicSource{@ApiProperty({description:'Source of the public price observation.'}) id!:string;@ApiProperty(NS) url!:string|null;@ApiProperty() observedAt!:string;@ApiProperty() reviewedAt!:string;}
export class Identity{@ApiProperty(NS) manufacturer!:string|null;@ApiProperty(NS) modelNumber!:string|null;@ApiProperty(NS) packageOrRevision!:string|null;@ApiProperty({description:'True only when the linked variant has every relevant identity field.'}) exact!:boolean;}
export class PublicOffer{
 @ApiProperty() id!:string;@ApiProperty() sellerId!:string;@ApiProperty(NS) catalogKey!:string|null;@ApiProperty(NS) variantId!:string|null;@ApiProperty() partName!:string;@ApiProperty() variant!:string;@ApiProperty() condition!:string;
 @ApiProperty({description:'Price of the newest approved observation.'}) unitPrice!:string;@ApiProperty() currency!:string;@ApiProperty() quantity!:number;@ApiProperty(NS) shippingCost!:string|null;@ApiProperty(NS) validUntil!:string|null;
 @ApiProperty({type:String,nullable:true,description:'Null for legacy prices with an unknown observation date.'}) priceObservedAt!:string|null;@ApiProperty() priceObservationLegacy!:boolean;
 @ApiProperty() seller!:PublicSeller;@ApiProperty() source!:PublicSource;@ApiProperty() identity!:Identity;@ApiProperty() bookmarked!:boolean;
}
export class BookmarkedOffer{
 @ApiProperty() id!:string;@ApiProperty() partName!:string;@ApiProperty() status!:string;@ApiProperty({description:'Publicly comparable now.'}) available!:boolean;
 @ApiProperty({type:PublicOffer,nullable:true,description:'Current public offer; null when unavailable.'}) publicOffer!:PublicOffer|null;
}
export class BookmarkResult{@ApiProperty() offerId!:string;@ApiProperty() bookmarked!:boolean;}
export const CategoryPage=Page(Category,'CategoryPage'),PartPage=Page(Part,'PartPage'),DocumentPage=Page(CatalogDocument,'DocumentPage'),VariantPage=Page(Variant,'VariantPage');
export const SellerPage=Page(Seller,'SellerPage'),SourcePage=Page(Source,'SourcePage'),OfferPage=Page(Offer,'OfferPage'),ObservationPage=Page(Observation,'ObservationPage');
export const HistoryPage=Page(HistoryEntry,'HistoryPage'),PublicOfferPage=Page(PublicOffer,'PublicOfferPage'),BookmarkPage=Page(BookmarkedOffer,'BookmarkPage');
