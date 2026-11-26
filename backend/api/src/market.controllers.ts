import {Body,Controller,Delete,Get,Module,Param,ParseUUIDPipe,Patch,PipeTransform,Post,Put,Query,Req,UseGuards,BadRequestException} from '@nestjs/common';
import {ApiBearerAuth,ApiCreatedResponse,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {AuthModule} from './auth/auth.module';
import {SessionGuard} from './auth/guards/session.guard';
import {MarketService} from './market.service';
import {CatalogPartUpdateDto,CatalogQuery,CompareQuery,ExactCompareQuery,IdentityFieldsDto,ManagedOfferQuery,OfferDto,OfferQuery,OfferUpdateDto,OfferVariantDto,PageQuery,PART_KEY,PriceObservationDto,ReviewDto,RevokeDto,SellerDto,SellerQuery,SourceDto,SourceQuery,VariantDto} from './market.dto';
import {ApiErrors,BookmarkPage,BookmarkResult,CategoryPage,DocumentPage,HistoryPage,ObservationPage,Offer,OfferPage,PartDetail,PartPage,PartRevision,PinPage,PublicOfferPage,Seller,SellerPage,Source,SourcePage,Variant,VariantPage} from './market.responses';
import {GlobalReferenceDto,MappingReviewDto,ShopComparisonQuery,ShopFeedDto} from './price-sync.dto';
import {GlobalPriceReference,MappingReviewResult,ShopFeedConfiguration,ShopPriceComparison} from './price-sync.responses';
import {PriceSyncService} from './price-sync.service';
class PartKeyPipe implements PipeTransform{transform(value:string){if(!PART_KEY.test(value))throw new BadRequestException('Invalid catalog part key.');return value;}}
const uuid=new ParseUUIDPipe();
@ApiTags('Catalog') @ApiBearerAuth() @ApiErrors(401,429,500) @UseGuards(SessionGuard) @Controller('catalog') export class CatalogController{
 constructor(private market:MarketService){}
 @Get('categories') @ApiOkResponse({type:CategoryPage}) @ApiErrors(400,403) categories(@Query() q:PageQuery,@Req() req:any){return this.market.categories(req.actor,q);}
 @Get('parts') @ApiOkResponse({type:PartPage}) @ApiErrors(400,403) parts(@Query() q:CatalogQuery,@Req() req:any){return this.market.parts(req.actor,q);}
 @Get('parts/:key') @ApiOkResponse({type:PartDetail}) @ApiErrors(400,403,404) part(@Param('key',new PartKeyPipe()) key:string,@Req() req:any){return this.market.partDetail(req.actor,key);}
 @Patch('parts/:key') @ApiOkResponse({type:PartRevision}) @ApiErrors(400,403,404,409) update(@Param('key',new PartKeyPipe()) key:string,@Body() body:CatalogPartUpdateDto,@Req() req:any){return this.market.updatePart(req.actor,key,body);}
 @Get('parts/:key/pins') @ApiOkResponse({type:PinPage}) @ApiErrors(400,403,404) pins(@Param('key',new PartKeyPipe()) key:string,@Query() q:PageQuery,@Req() req:any){return this.market.pins(req.actor,key,q);}
 @Get('parts/:key/documents') @ApiOkResponse({type:DocumentPage}) @ApiErrors(400,403,404) documents(@Param('key',new PartKeyPipe()) key:string,@Query() q:PageQuery,@Req() req:any){return this.market.documents(req.actor,key,q);}
 @Get('parts/:key/variants') @ApiOkResponse({type:VariantPage}) @ApiErrors(400,403,404) variants(@Param('key',new PartKeyPipe()) key:string,@Query() q:PageQuery,@Req() req:any){return this.market.variants(req.actor,key,q);}
 @Post('parts/:key/variants') @ApiCreatedResponse({type:Variant}) @ApiErrors(400,403,404,409) createVariant(@Param('key',new PartKeyPipe()) key:string,@Body() body:VariantDto,@Req() req:any){return this.market.createVariant(req.actor,key,body);}
 @Put('parts/:key/identity-fields') @ApiOkResponse({type:PartRevision}) @ApiErrors(400,403,404,409) identityFields(@Param('key',new PartKeyPipe()) key:string,@Body() body:IdentityFieldsDto,@Req() req:any){return this.market.identityFields(req.actor,key,body);}
}
@ApiTags('Market') @ApiBearerAuth() @ApiErrors(401,429,500) @UseGuards(SessionGuard) @Controller('market') export class MarketController{
 constructor(private market:MarketService,private priceSync:PriceSyncService){}
 @Get('sellers') @ApiOkResponse({type:SellerPage}) @ApiErrors(400,403) sellers(@Query() q:SellerQuery,@Req() req:any){return this.market.sellers(req.actor,q);}
 @Post('sellers') @ApiCreatedResponse({type:Seller}) @ApiErrors(400,403,409) createSeller(@Body() body:SellerDto,@Req() req:any){return this.market.createSeller(req.actor,body);}
 @Patch('sellers/:id') @ApiOkResponse({type:Seller}) @ApiErrors(400,403,404) updateSeller(@Param('id',uuid) id:string,@Body() body:SellerDto,@Req() req:any){return this.market.updateSeller(req.actor,id,body);}
 @Post('sellers/:id/sources') @ApiCreatedResponse({type:Source}) @ApiErrors(400,403,404) createSource(@Param('id',uuid) id:string,@Body() body:SourceDto,@Req() req:any){return this.market.createSource(req.actor,id,body);}
 @Get('sources') @ApiOkResponse({type:SourcePage}) @ApiErrors(400,403) sources(@Query() q:SourceQuery,@Req() req:any){return this.market.sources(req.actor,q);}
 @Post('sources/:id/review') @ApiCreatedResponse({type:Source}) @ApiErrors(400,403,404,409) review(@Param('id',uuid) id:string,@Body() body:ReviewDto,@Req() req:any){return this.market.review(req.actor,id,body);}
 @Post('sources/:id/revoke') @ApiCreatedResponse({type:Source}) @ApiErrors(400,403,404,409) revoke(@Param('id',uuid) id:string,@Body() body:RevokeDto,@Req() req:any){return this.market.revoke(req.actor,id,body);}
 @Get('compare') @ApiOkResponse({type:PublicOfferPage}) @ApiErrors(400,403) compare(@Query() q:CompareQuery,@Req() req:any){return this.market.compare(req.actor,q);}
 @Get('compare/exact') @ApiOkResponse({type:PublicOfferPage}) @ApiErrors(400,403,404) compareExact(@Query() q:ExactCompareQuery,@Req() req:any){return this.market.compareExact(req.actor,q);}
 @Get('prices/compare') @ApiOkResponse({type:ShopPriceComparison}) @ApiErrors(400,403,404) compareShopPrices(@Query() q:ShopComparisonQuery,@Req() req:any){return this.priceSync.compare(req.actor,q);}
 @Put('prices/feeds') @ApiOkResponse({type:ShopFeedConfiguration}) @ApiErrors(400,403) configurePriceFeed(@Body() b:ShopFeedDto,@Req() req:any){return this.priceSync.configureFeed(req.actor,b);}
 @Post('prices/mappings/:id/review') @ApiCreatedResponse({type:MappingReviewResult}) @ApiErrors(400,403,404,409) reviewPriceMapping(@Param('id',uuid) id:string,@Body() b:MappingReviewDto,@Req() req:any){return this.priceSync.reviewMapping(req.actor,id,b);}
 @Post('prices/global-references') @ApiCreatedResponse({type:GlobalPriceReference}) @ApiErrors(400,403,404,409) addGlobalReference(@Body() b:GlobalReferenceDto,@Req() req:any){return this.priceSync.addGlobalReference(req.actor,b);}
 @Get('offers') @ApiOkResponse({type:PublicOfferPage}) @ApiErrors(400,403) offers(@Query() q:OfferQuery,@Req() req:any){return this.market.offers(req.actor,q);}
 @Get('offers/managed') @ApiOkResponse({type:OfferPage}) @ApiErrors(400,403) managed(@Query() q:ManagedOfferQuery,@Req() req:any){return this.market.managed(req.actor,q);}
 @Post('offers') @ApiCreatedResponse({type:Offer}) @ApiErrors(400,403,404) createOffer(@Body() body:OfferDto,@Req() req:any){return this.market.createOffer(req.actor,body);}
 @Patch('offers/:id') @ApiOkResponse({type:Offer}) @ApiErrors(400,403,404,409) updateOffer(@Param('id',uuid) id:string,@Body() body:OfferUpdateDto,@Req() req:any){return this.market.updateOffer(req.actor,id,body);}
 @Post('offers/:id/prices') @ApiCreatedResponse({type:Offer}) @ApiErrors(400,403,404,409) recordPrice(@Param('id',uuid) id:string,@Body() body:PriceObservationDto,@Req() req:any){return this.market.recordPrice(req.actor,id,body);}
 @Get('offers/:id/observations') @ApiOkResponse({type:ObservationPage}) @ApiErrors(400,403,404) observations(@Param('id',uuid) id:string,@Query() q:PageQuery,@Req() req:any){return this.market.observations(req.actor,id,q);}
 @Put('offers/:id/variant') @ApiOkResponse({type:Offer}) @ApiErrors(400,403,404,409) linkVariant(@Param('id',uuid) id:string,@Body() body:OfferVariantDto,@Req() req:any){return this.market.linkVariant(req.actor,id,body);}
 @Get('offers/:id/history') @ApiOkResponse({type:HistoryPage}) @ApiErrors(400,403,404) history(@Param('id',uuid) id:string,@Query() q:PageQuery,@Req() req:any){return this.market.history(req.actor,id,q);}
 @Put('offers/:id/bookmark') @ApiOkResponse({type:BookmarkResult}) @ApiErrors(400,403,404) save(@Param('id',uuid) id:string,@Req() req:any){return this.market.bookmark(req.actor,id,true);}
 @Delete('offers/:id/bookmark') @ApiOkResponse({type:BookmarkResult}) @ApiErrors(400,403) unsave(@Param('id',uuid) id:string,@Req() req:any){return this.market.bookmark(req.actor,id,false);}
 @Get('bookmarks') @ApiOkResponse({type:BookmarkPage}) @ApiErrors(400,403) bookmarks(@Query() q:PageQuery,@Req() req:any){return this.market.bookmarks(req.actor,q);}
}
@Module({imports:[AuthModule],controllers:[CatalogController,MarketController],providers:[MarketService,PriceSyncService]}) export class MarketModule{}
