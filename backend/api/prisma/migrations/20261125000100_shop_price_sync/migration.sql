SET search_path=labassist_student,public;

CREATE TABLE shop_price_feeds (
 shop TEXT PRIMARY KEY CHECK(shop IN ('TECHNOLAB','PIC_INDUSTRIAL')),
 seller_id UUID NOT NULL REFERENCES market_sellers(id),source_id UUID NOT NULL,
 configured_by UUID NOT NULL REFERENCES accounts(id),configured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(source_id,seller_id) REFERENCES resale_sources(id,seller_id)
);

CREATE TABLE shop_price_mappings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),shop TEXT NOT NULL CHECK(shop IN ('TECHNOLAB','PIC_INDUSTRIAL')),
 external_product_id TEXT NOT NULL,sku TEXT,product_name TEXT NOT NULL,part_key TEXT REFERENCES catalog_parts(key),variant_id UUID,
 package_quantity INT CHECK(package_quantity>0),sale_quantity INT NOT NULL DEFAULT 1 CHECK(sale_quantity>0),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 reviewed_by UUID REFERENCES accounts(id),reviewed_at TIMESTAMPTZ,offer_id UUID UNIQUE REFERENCES market_offers(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(shop,external_product_id),FOREIGN KEY(variant_id,part_key) REFERENCES catalog_part_variants(id,part_key),
 CHECK((status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
       (status='REJECTED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
       (status='APPROVED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND part_key IS NOT NULL AND variant_id IS NOT NULL))
);

CREATE TABLE shop_price_checks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),shop TEXT NOT NULL CHECK(shop IN ('TECHNOLAB','PIC_INDUSTRIAL')),
 observed_at TIMESTAMPTZ NOT NULL,status TEXT NOT NULL CHECK(status IN ('SUCCESS','PARTIAL','FETCH_FAILED')),
 complete BOOLEAN NOT NULL,pages_attempted INT NOT NULL CHECK(pages_attempted>=0),failure_count INT NOT NULL CHECK(failure_count>=0),
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(),completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(shop,observed_at)
);

CREATE TABLE shop_price_outcomes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),check_id UUID NOT NULL REFERENCES shop_price_checks(id),
 shop TEXT NOT NULL CHECK(shop IN ('TECHNOLAB','PIC_INDUSTRIAL')),external_product_id TEXT,mapping_id UUID REFERENCES shop_price_mappings(id),
 part_key TEXT REFERENCES catalog_parts(key),variant_id UUID,offer_id UUID REFERENCES market_offers(id),source_id UUID REFERENCES resale_sources(id),
 outcome TEXT NOT NULL CHECK(outcome IN ('PRICE_FOUND','PRICE_NOT_LISTED','NO_MATCH','FETCH_FAILED','MATCH_UNRESOLVED')),
 availability TEXT CHECK(availability IN ('IN_STOCK','OUT_OF_STOCK','ON_DEMAND','COMING_SOON','UNKNOWN')),
 price NUMERIC(14,2),currency CHAR(3),source_url TEXT,observed_at TIMESTAMPTZ NOT NULL,last_successful_check TIMESTAMPTZ,
 package_quantity INT CHECK(package_quantity>0),sale_quantity INT CHECK(sale_quantity>0),details JSONB NOT NULL DEFAULT '{}',
 FOREIGN KEY(variant_id,part_key) REFERENCES catalog_part_variants(id,part_key),
 UNIQUE(check_id,shop,external_product_id),CHECK((price IS NULL)=(currency IS NULL))
);
CREATE INDEX shop_price_outcome_variant ON shop_price_outcomes(variant_id,shop,observed_at DESC);

CREATE TABLE global_price_references (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),variant_id UUID NOT NULL REFERENCES catalog_part_variants(id),supplier TEXT NOT NULL,
 url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$'),currency CHAR(3) NOT NULL,price NUMERIC(14,2) NOT NULL CHECK(price>=0),
 quantity INT NOT NULL CHECK(quantity>0),observed_at TIMESTAMPTZ NOT NULL,
 shipping_inclusion TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(shipping_inclusion IN ('UNKNOWN','INCLUDED','EXCLUDED')),
 tax_inclusion TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(tax_inclusion IN ('UNKNOWN','INCLUDED','EXCLUDED')),
 created_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(variant_id,supplier,url,currency,quantity,observed_at)
);
CREATE INDEX global_price_reference_latest ON global_price_references(variant_id,quantity,observed_at DESC);

-- Review is explicit and immutable. Exactness is checked using the existing catalog identity rules.
CREATE FUNCTION review_shop_price_mapping(actor UUID,mapping UUID,decision TEXT,part TEXT DEFAULT NULL,variant UUID DEFAULT NULL,sale_qty INT DEFAULT 1,package_qty INT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 IF decision NOT IN ('APPROVED','REJECTED') THEN RAISE EXCEPTION 'Mapping decision invalid';END IF;
 IF decision='APPROVED' THEN
  IF part IS NULL OR variant IS NULL OR NOT EXISTS(SELECT 1 FROM catalog_part_variants v WHERE v.id=variant AND v.part_key=part AND part_variant_exact(v.id)) THEN
   RAISE EXCEPTION 'Exact reviewed variant required';
  END IF;
  IF sale_qty<1 OR package_qty IS NOT NULL AND package_qty<1 THEN RAISE EXCEPTION 'Mapping quantity invalid';END IF;
 END IF;
 UPDATE shop_price_mappings SET status=decision,part_key=CASE WHEN decision='APPROVED' THEN part ELSE part_key END,
  variant_id=CASE WHEN decision='APPROVED' THEN variant ELSE variant_id END,sale_quantity=CASE WHEN decision='APPROVED' THEN sale_qty ELSE sale_quantity END,
  package_quantity=CASE WHEN decision='APPROVED' THEN package_qty ELSE package_quantity END,reviewed_by=actor,reviewed_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE id=mapping AND status='PENDING';
 IF NOT FOUND THEN IF EXISTS(SELECT 1 FROM shop_price_mappings WHERE id=mapping) THEN RAISE EXCEPTION 'Mapping already reviewed';END IF;RAISE EXCEPTION 'Mapping not found';END IF;
END $$;

REVOKE ALL ON shop_price_feeds,shop_price_mappings,shop_price_checks,shop_price_outcomes,global_price_references FROM PUBLIC;
REVOKE ALL ON FUNCTION review_shop_price_mapping(UUID,UUID,TEXT,TEXT,UUID,INT,INT) FROM PUBLIC;
