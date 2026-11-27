const data = require('./20261127100000_automatic_shop_prices.json');

const one = async (db, sql, args = []) => (await db.query(sql, args)).rows[0];
const ensureSource = async (db, actor, seller, url, observedAt, hash, reviewedAt) => {
  const matches = (await db.query(`SELECT id,status,reviewed_by,reviewed_at=$5::timestamptz AS review_matches FROM labassist_student.resale_sources
    WHERE seller_id=$1 AND kind='SHOP_PAGE' AND url=$2 AND observed_at=$3 AND content_hash IS NOT DISTINCT FROM $4`,[seller,url,observedAt,hash,reviewedAt])).rows;
  if (matches.length>1) throw new Error(`Ambiguous source evidence: ${url}`);
  if (matches.length) {
    const source=matches[0];
    if (source.status!=='APPROVED') throw new Error(`Existing source review conflicts: ${url}`);
    return source;
  }
  return one(db,`INSERT INTO labassist_student.resale_sources(seller_id,kind,url,observed_at,content_hash,status,verification_method) VALUES($1,'SHOP_PAGE',$2,$3,$4,'APPROVED','AUTOMATED') RETURNING id`,[seller,url,observedAt,hash]);
};

async function apply(db) {
  await db.query("SELECT set_config('labassist.price_pipeline','on',true)");
  const actor = null;

  for (const category of data.categories) {
    await db.query('INSERT INTO labassist_student.catalog_categories(id,name_en,name_ar,sort_order) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [category.id,category.name_en,category.name_ar,category.sort_order]);
    if (!await one(db,'SELECT id FROM labassist_student.catalog_categories WHERE id=$1',[category.id])) throw new Error(`Catalog category conflict: ${category.id}`);
  }
  for (const model of data.models) {
    const existing = await one(db,`SELECT name=$3 AND definition=$4::jsonb AND render_units=$5 AND physical_dimensions_mm IS NOT DISTINCT FROM $6::jsonb AND sealed=$7 AS matches
      FROM labassist_student.catalog_models WHERE id=$1 AND version=$2`,[model.id,model.version,model.name,JSON.stringify(model.definition),model.render_units,model.physical_dimensions_mm == null ? null : JSON.stringify(model.physical_dimensions_mm),model.sealed]);
    if (existing) {
      if (!existing.matches) throw new Error(`Catalog model conflict: ${model.id}/${model.version}`);
      continue;
    }
    await db.query('INSERT INTO labassist_student.catalog_models(id,version,name,definition,render_units,physical_dimensions_mm,sealed) VALUES($1,$2,$3,$4::jsonb,$5,$6::jsonb,false)',[model.id,model.version,model.name,JSON.stringify(model.definition),model.render_units,model.physical_dimensions_mm == null ? null : JSON.stringify(model.physical_dimensions_mm)]);
    for (const pin of data.pins.filter(p => p.model_id===model.id && p.model_version===model.version)) {
      await db.query('INSERT INTO labassist_student.catalog_pins(model_id,model_version,pin_index,name,kind,direction,connector,voltage,physical_number,functions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[pin.model_id,pin.model_version,pin.pin_index,pin.name,pin.kind,pin.direction,pin.connector,pin.voltage,pin.physical_number,pin.functions]);
    }
    if (model.sealed) await db.query('UPDATE labassist_student.catalog_models SET sealed=true WHERE id=$1 AND version=$2',[model.id,model.version]);
  }
  for (const part of data.parts) {
    await db.query(`INSERT INTO labassist_student.catalog_parts(key,model_id,model_version,category_id,name_en,name_ar,typical_supply_voltage,description,active,revision,exact_identity_fields)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(key) DO NOTHING`,[part.key,part.model_id,part.model_version,part.category_id,part.name_en,part.name_ar,part.typical_supply_voltage,part.description,part.active,part.revision,part.exact_identity_fields]);
    const present = await one(db,'SELECT model_id,model_version FROM labassist_student.catalog_parts WHERE key=$1',[part.key]);
    if (!present || present.model_id!==part.model_id || present.model_version!==part.model_version) throw new Error(`Catalog part identity conflict: ${part.key}`);
  }
  const sellers = new Map();
  for (const feed of data.feeds) {
    const matches = (await db.query("SELECT id,website FROM labassist_student.market_sellers WHERE kind='SHOP' AND (website=$1 OR lower(name)=lower($2))",[feed.website,feed.name])).rows;
    if (matches.length>1) throw new Error(`Ambiguous shop: ${feed.shop}`);
    if (matches[0] && matches[0].website!==feed.website) throw new Error(`Shop website conflict: ${feed.shop}`);
    const seller = matches[0] || await one(db,"INSERT INTO labassist_student.market_sellers(kind,name,city,website) VALUES('SHOP',$1,$2,$3) RETURNING id",[feed.name,feed.city,feed.website]);
    sellers.set(feed.shop,seller.id);
    const existing = await one(db,`SELECT f.seller_id,r.kind,r.status,r.url FROM labassist_student.shop_price_feeds f
      JOIN labassist_student.resale_sources r ON r.id=f.source_id AND r.seller_id=f.seller_id WHERE f.shop=$1`,[feed.shop]);
    if (existing) {
      if (existing.seller_id!==seller.id || existing.kind!=='SHOP_PAGE' || existing.status!=='APPROVED' || existing.url!==feed.url) throw new Error(`Existing feed conflicts with approved evidence: ${feed.shop}`);
      continue;
    }
    const source = await ensureSource(db,actor,seller.id,feed.url,feed.observed_at,feed.content_hash,feed.reviewed_at);
    await db.query('INSERT INTO labassist_student.shop_price_feeds(shop,seller_id,source_id,configured_by,configured_at) VALUES($1,$2,$3,$4,$5)',[feed.shop,seller.id,source.id,actor,feed.configured_at]);
  }
  for (const row of data.rows) {
    const seller = sellers.get(row.shop);
    const existing = await one(db,`SELECT m.status,m.offer_id,o.seller_id,
      (m.part_key=$3 AND lower(v.manufacturer) IS NOT DISTINCT FROM lower($4::text)
       AND lower(v.model_number) IS NOT DISTINCT FROM lower($5::text)
       AND lower(v.package_or_revision) IS NOT DISTINCT FROM lower($6::text)) AS same_identity
      FROM labassist_student.shop_price_mappings m LEFT JOIN labassist_student.catalog_part_variants v ON v.id=m.variant_id
      LEFT JOIN labassist_student.market_offers o ON o.id=m.offer_id WHERE m.shop=$1 AND m.external_product_id=$2`,[row.shop,row.external_product_id,row.part_key,row.manufacturer,row.model_number,row.package_or_revision]);
    if (existing) {
      if (existing.status==='APPROVED' && existing.offer_id && existing.same_identity && existing.seller_id===seller) continue;
      throw new Error(`Existing mapping requires review: ${row.shop}/${row.external_product_id}`);
    }
    let variant = await one(db,`SELECT id FROM labassist_student.catalog_part_variants WHERE part_key=$1 AND lower(manufacturer) IS NOT DISTINCT FROM lower($2::text) AND lower(model_number) IS NOT DISTINCT FROM lower($3::text) AND lower(package_or_revision) IS NOT DISTINCT FROM lower($4::text)`,[row.part_key,row.manufacturer,row.model_number,row.package_or_revision]);
    if (!variant) variant = await one(db,'INSERT INTO labassist_student.catalog_part_variants(part_key,manufacturer,model_number,package_or_revision,source_url,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[row.part_key,row.manufacturer,row.model_number,row.package_or_revision,row.variant_source_url,actor]);
    if (!(await one(db,'SELECT labassist_student.part_variant_exact($1) AS exact',[variant.id])).exact) throw new Error(`Variant is not exact: ${row.part_key}`);
    const mapping = await one(db,`INSERT INTO labassist_student.shop_price_mappings(shop,external_product_id,sku,product_name,part_key,variant_id,package_quantity,sale_quantity,status,matching_method,matched_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'APPROVED','AUTOMATED',now()) RETURNING id`,[row.shop,row.external_product_id,row.sku,row.product_name,row.part_key,variant.id,row.package_quantity,row.sale_quantity]);
    const source = await ensureSource(db,actor,seller,row.source_url,row.observed_at,row.content_hash,row.source_reviewed_at);
    const offer = await one(db,`INSERT INTO labassist_student.market_offers(seller_id,source_id,catalog_key,variant_id,part_name,variant,condition,unit_price,currency,quantity,shipping_cost,valid_until,status,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,'ACTIVE',$12) RETURNING id`,[seller,source.id,row.part_key,variant.id,row.part_name,row.variant,row.condition,row.price,row.currency,row.shipping_cost,row.valid_until,actor]);
    await db.query('UPDATE labassist_student.shop_price_mappings SET offer_id=$1 WHERE id=$2',[offer.id,mapping.id]);
    await db.query(`INSERT INTO labassist_student.shop_price_checks(shop,observed_at,status,complete,pages_attempted,failure_count,started_at,completed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(shop,observed_at) DO NOTHING`,[row.shop,row.check.observed_at,row.check.status,row.check.complete,row.check.pages_attempted,row.check.failure_count,row.check.started_at,row.check.completed_at]);
    const check = await one(db,'SELECT id,status,complete,pages_attempted,failure_count FROM labassist_student.shop_price_checks WHERE shop=$1 AND observed_at=$2',[row.shop,row.check.observed_at]);
    if (check.status!==row.check.status || check.complete!==row.check.complete || check.pages_attempted!==row.check.pages_attempted || check.failure_count!==row.check.failure_count) throw new Error(`Collection check conflict: ${row.shop}`);
    const details = {originalRecordedAt:row.recorded_at,originalVariantCreatedAt:row.variant_created_at,originalOfferUpdatedAt:row.original_offer_updated_at,originalHistoryCreatedAt:row.original_history_created_at,stockEvidence:'unverified'};
    await db.query(`INSERT INTO labassist_student.shop_price_outcomes(check_id,shop,external_product_id,mapping_id,part_key,variant_id,offer_id,source_id,outcome,availability,price,currency,source_url,observed_at,last_successful_check,package_quantity,sale_quantity,details,stock_evidence_verified)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PRICE_FOUND','UNKNOWN',$9,$10,$11,$12,$13,$14,$15,$16::jsonb,false)`,[check.id,row.shop,row.external_product_id,mapping.id,row.part_key,variant.id,offer.id,source.id,row.price,row.currency,row.source_url,row.outcome_observed_at,row.last_successful_check,row.package_quantity,row.sale_quantity,JSON.stringify(details)]);
  }
}
module.exports = {apply,ensureSource};
