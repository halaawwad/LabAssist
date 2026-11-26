# Sprint 6 shop-price collection handoff

Checkpoint: 2026-11-25. Public collectors and the backend persistence integration are implemented. No scheduler is included and no non-disposable database was changed.

## Public sources

- **Technolab:** the storefront's public paged JSON endpoint, `https://api.technolab.ps/item/getMyProducts`. Product evidence links to `https://technolab.ps/detail/{id}`. The adapter applies `discountPrice` only when `onSale` is true and the optional sale end date has not passed. A stored inactive discount remains sale metadata and does not replace `price0`.
- **PIC Industrial:** the storefront's published `supabase-config.js`, followed by its public read-only `products` REST listing. The current table exposes retail price and stock but no sale or package fields. The adapter leaves those values null; it also supports the explicit `sale_*`, `min_quantity`, and `package_quantity` fields if the public feed later supplies them. The site uses a homepage product modal, so the truthful source URL is the shop homepage rather than an invented product route.

Both sources are public retail feeds used by the shops' own pages. No account, access-control bypass, browser token, or private endpoint is used.

## Normalized contract

`NormalizedShopPrice` contains `shop`, `externalProductId`, nullable `sku`, `productName`, `sourceUrl`, nullable decimal `price`, `currency`, `availability`, nullable `availableQuantity`, `observedAt`, nullable `packageQuantity`, nullable `minimumOrderQuantity`, `sale { active, price, startsAt, endsAt }`, and `variantDetails`. Missing prices are `null`, never zero. Availability is one of `IN_STOCK`, `OUT_OF_STOCK`, `ON_DEMAND`, `COMING_SOON`, or `UNKNOWN`.

Each adapter returns `CollectionResult { shop, items, failures, complete, pagesAttempted }`. Malformed products are skipped with a product-scoped failure while valid products remain available. Page/configuration failures are reported explicitly. `complete: false` can also mean the requested dry-run limit stopped before the source ended; it does not by itself mean a failure.

Requests default to an 8-second timeout and two retries for transport, 429, and 5xx failures. Pages are capped at 100 products, runs at 500 products and 20 pages, and responses at 2 MiB (PIC configuration at 32 KiB). The CLI narrows this further to at most 100 products and two pages.

## Changed files

- `backend/api/src/price-collectors/{types,http,normalize,technolab.adapter,pic-industrial.adapter,index}.ts`
- `backend/api/tools/collect-shop-prices.ts`
- `backend/api/test/price-collectors.spec.ts`
- `backend/api/package.json`
- `backend/api/src/price-sync.{dto,responses,service}.ts`
- `backend/api/prisma/migrations/20261125000100_shop_price_sync/migration.sql`
- `backend/api/prisma/schema.prisma`
- `backend/api/tools/sync-shop-prices.ts`
- `backend/api/test/price-sync.spec.ts`
- `backend/api/src/price-collectors/pending-mappings.json`
- `backend/api/src/market.controllers.ts`
- `docs/SPRINT-6-PRICE-SYNC.md`

## Commands and results

```text
cd backend/api
npx jest --runInBand test/price-collectors.spec.ts
# PASS: 12 tests (normal price, active/inactive sale, missing price,
# out of stock, malformed data, and source failure across both adapters)

npm run build
# PASS

npm run prices:dry-run -- --shop=technolab --limit=10
# 10 collected, 10 priced, 0 failures, complete=false (bounded limit)

npm run prices:dry-run -- --shop=pic-industrial --limit=10
# 10 collected, 10 priced, 0 failures, complete=false (bounded limit)
```

The collector-only fixture suite has no database dependency. Persistence checks use the disposable `TEST_DATABASE_URL` described below.

## Persistence and approval

The sync reuses `market_sellers`, `resale_sources`, `market_offers`, `market_price_observations` and their existing ownership/history triggers. It does not write student sellers or student offers. New tables contain only sync coordination:

- `shop_price_feeds`: one explicitly configured SHOP seller and already `APPROVED` `SHOP_PAGE` source per shop.
- `shop_price_mappings`: immutable manager review from external product ID/SKU to an exact catalog variant, including reviewed sale/package quantity.
- `shop_price_checks` and `shop_price_outcomes`: check status and the distinct outcomes `PRICE_FOUND`, `PRICE_NOT_LISTED`, `NO_MATCH`, `FETCH_FAILED`, `MATCH_UNRESOLVED`.
- `global_price_references`: separately attributed supplier evidence. It never becomes a Technolab/PIC offer or observation.

Approval order is explicit:

1. A manager creates the local SHOP seller and a `SHOP_PAGE` source through the existing API, then approves that source through the existing review endpoint.
2. `PUT /v1/market/prices/feeds` binds that approved seller/source to `TECHNOLAB` or `PIC_INDUSTRIAL`. This approval authorizes derived observations from that shop's public product URLs; each derived source retains its own URL, content hash and observation date.
3. Collection discovers products as `PENDING` mappings. A manager creates or selects a sufficiently identified catalog variant and calls `POST /v1/market/prices/mappings/{id}/review`. Approval fails unless the variant belongs to the selected part and satisfies `part_variant_exact`; rejection produces `NO_MATCH`.
4. `PRICE_SYNC_ACTOR_ID=<active manager uuid> npm run prices:sync -- --shop=technolab` (or `pic-industrial`) imports at most 500 rows. No scheduler exists.

The check timestamp and a shop advisory lock make repeated and concurrent imports idempotent. A later successful check creates a new immutable observation even when its price is unchanged. The offer retains all earlier observations and source URLs. A changed minimum/package quantity becomes `MATCH_UNRESOLVED` until reviewed again. A partial or failed fetch records `FETCH_FAILED`; it never becomes `PRICE_NOT_LISTED`.

## Existing-catalog mappings

The technical review is recorded in `src/price-collectors/reviewed-mappings.json`. On 2026-11-26 the exhaustive bounded review completed against 5,656 Technolab and 460 PIC public-feed records with no fetch failures. It records 50 evidence-backed shop/SKU candidates with listing name, evidence URL, precise variant, sale quantity and bundle flag. PIC presents products in an in-page modal and exposes no stable per-product URL; its public listing URL plus external product ID and SKU is the evidence locator.

Coverage across all 43 keys is: **16 matched at both shops, 18 at one shop only, 3 with no exact sale item, and 6 unresolved**. Reasons are recorded per key. `stepper_28byj48`, `uln2003`, and `water_pump_5v` have no exact sale item. Broad family names, accessories, different RAM sizes, and bundles were not accepted as exact.

This is a completed technical evidence review, not application approval. Every candidate still requires a workshop manager to create/select the manifest's exact variant and approve the discovered mapping through `POST /v1/market/prices/mappings/{id}/review`. No manager identity or approval was fabricated.

Validation on 2026-11-26 used a disposable PostgreSQL 16 database named `labassist_mapping_test`. The manifest validator confirmed 43 unique coverage keys, 50 mappings, and zero missing live ID/SKU evidence. `npm test -- --runInBand test/price-sync.spec.ts` applied all migrations and passed 5/5 persistence/comparison tests. `npx tsx tools/validate-live-price-import.ts` then collected current product `TL000198` and PIC SKU `00301`, used test-only approvals in that disposable database, imported their real observed prices, and returned `PRICE_FOUND`/`ILS` for both shops from the shared comparison service. The container was removed afterward; no real database was written.

## Shared comparison API

`GET /v1/market/prices/compare?variantId={uuid}&quantity={integer}` requires the existing session/registered-reader guard and returns:

```text
{
  variantId, quantity,
  localShops: [{ shop, priceStatus, availability, price, currency, sourceUrl,
                 observedAt, lastSuccessfulCheck, stale, offerId }],
  globalFallbackEligible,
  globalReference: { supplier, url, currency, price, quantity, observedAt,
                     shippingInclusion, taxInclusion } | null
}
```

Both local shops are always present. Staleness is 24 hours. A quantity mismatch is `MATCH_UNRESOLVED`; currencies are returned unchanged and never converted. Global fallback is eligible only when both shops have a latest successful check, resolved exact mappings and no usable local price. Any latest partial/fetch failure blocks it. `POST /v1/market/prices/global-references` is manager-only and fetches the public supplier page; it accepts only matching JSON-LD price/currency evidence (and explicit quantity evidence above one), rejects snippets/unreachable/private hosts, and records shipping/tax as `UNKNOWN` unless stated. If no verified exact-quantity reference exists, `globalReference` is null.

Swagger documents the comparison, feed configuration, mapping review and global-reference success/error responses.

## Integration verification

Disposable `postgres:17-alpine`, removed after checks:

```text
npx prisma migrate deploy
# PASS: all 5 migrations on an empty database
npx jest --runInBand test/price-sync.spec.ts test/price-collectors.spec.ts
# PASS: 2 suites, 17 tests
npx jest --runInBand test/market.spec.ts
# PASS: 15 tests, including Swagger response/error checks
npm run build
# PASS
npx prisma validate
# PASS
```

The integration fixtures cover exact/cross-part mappings, source approval, bundle mismatch, null/missing prices, all five outcomes, partial outage fallback blocking, source provenance/history, unchanged-price rechecks, repeat/concurrent imports, JSON-LD verification and original-currency global fallback.

## Web and mobile price presentation (Task 3)

The Student web catalog details and comparison flow, and the Expo catalog details and comparison flow, now consume `GET /v1/market/prices/compare` only after an explicit exact variant is selected. Both clients use the existing market session interface and configured API origin (`VITE_LABASSIST_API_URL` on web, `EXPO_PUBLIC_LABASSIST_API_URL` on mobile). They do not create tokens or fall back to fixture/sample prices.

Both surfaces render coordinated Technolab and PIC Industrial cards with original currency, availability, observation/check dates, source links, separate missing/unresolved/fetch-failed states, retained stale prices, and an optional separately labelled global reference. Lower-price emphasis is limited to two current, available, same-currency local prices. The responsive web grid collapses to one column below the existing `sm` breakpoint; mobile uses wrapping cards with `minWidth: 0`, so the 320 px and 390 px structures do not require horizontal scrolling. English/Arabic copy, RTL direction, locale dates, and bidi isolation for Latin prices/names are included.

Changed presentation files:

- `frontend/student/src/components/market/ShopPrices.tsx`
- `frontend/student/src/components/market/CatalogPartDialog.tsx`
- `frontend/student/src/components/market/MarketPriceComparison.tsx`
- `frontend/student/src/lib/market/shopPrices.ts`
- `frontend/student/src/lib/market/client.ts`
- `frontend/student/src/test/shop-prices.test.tsx`
- `frontend/student/src/test/market-integration.test.tsx`
- `mobile/src/features/student/ShopPrices.tsx`
- `mobile/src/features/student/ApiPartDetails.tsx`
- `mobile/src/features/student/LiveMarket.tsx`
- `mobile/src/lib/market/shopPrices.ts`
- `mobile/src/lib/market/client.ts`
- `mobile/tests/shop-prices.test.cjs`
- `mobile/tests/market-client.test.cjs`

Fixture verification (fixtures are explicitly test-only and do not approve mappings): two prices, one missing price, eligible global reference present/absent, unresolved mapping, listed out-of-stock price, retained stale price after partial failure, variant race, logout/account change, retry, exact-only selection, and Arabic RTL all pass. Commands/results on 2026-11-26:

- `frontend/student: npm test -- --run src/test/shop-prices.test.tsx src/test/market-integration.test.tsx` — PASS, 28 tests.
- `frontend/student: npm run typecheck` — PASS.
- `frontend/student: npx eslint <seven affected market/test files>` — PASS.
- `frontend/student: npm run build` — PASS (existing `fontkit` export warnings remain).
- `frontend/student: npm run lint` — BLOCKED by the repository-wide CRLF/Prettier baseline in many unchanged files; affected files pass the targeted lint command.
- `mobile: npm test` — PASS, 65 tests (including 10 shop-price/client fixture checks).
- `mobile: npm run typecheck` and `npm run lint` — PASS.
- `mobile: npm run build:ios:preview` — PASS iOS JavaScript export. This is a bundling check, not native-device verification.

The 320 px/390 px responsive rules and Arabic RTL DOM were checked with test-only fixtures; no genuine-session browser capture or physical-device check was possible. Technical candidates exist for 34 of 43 keys, but the displayable count remains **0** until manager approval. Noor's remaining hookup is to mount `MarketSessionProvider` around each app with the existing authenticated session's `getAccessToken()` and `getCurrentUser()` methods, preserving that session's refresh/logout behavior. The configured API origin must be reachable by the browser/device and backend CORS must allow the Student web origin. After that, verify with a genuine registered-reader session at desktop, 390x844, and 320x640, then on physical iOS/Android hardware.

## Remaining work

- Import each shop once to discover mapping rows, create/select the manifest's exact variants, and have a workshop manager approve only the 50 supported candidates. Recollect afterward to create price observations; unresolved/no-match entries remain unavailable.
- Connect each app's existing authenticated session to `MarketSessionProvider`, then perform genuine-session browser/device verification.
- Decide operational cadence, monitoring, and scheduler behavior after ingestion is approved. A scheduler is not included.
- Recheck the public feed contracts before enabling writes; shop schema or access-policy changes must surface as collection failures rather than guessed values.

## End-to-end development hookup checkpoint (2026-11-26)

The current checkout does not contain Noor's real web or mobile auth client. Student web still validates the shared demo credentials and mounts `StudentDemoSession`; mobile's `NativeSessionProvider` explicitly stores only `labassist.mobile.demo-session.v1`. Neither supplies an access token, refresh callback, authenticated account identity, or backend logout to `MarketSessionProvider`. Genuine-session browser verification therefore remains blocked. Required hookup: expose the existing auth client's `getAccessToken()` (including its existing refresh behavior) and `getCurrentUser()` through `MarketSessionProvider`, mount it inside each authenticated app shell, and change the provider identity on logout/account switch so in-flight market resources are discarded. No refresh token belongs in either market client.

No local development database was configured or running during this checkpoint: the repository has no `.env`, no PostgreSQL listener was present, and Docker Desktop's engine was unavailable. Consequently no development records were changed and no manager approval was simulated. The intended target category is the Compose **local development** database (`POSTGRES_DB=labassist_auth_dev` on loopback port 5442), never the test or production database. Before writes, copy `.env.example` to `.env` with local secrets, start Compose, confirm `DATABASE_URL` resolves to loopback and database `labassist_auth_dev`, and run `npm run db:migrate` from `backend/api`.

The exact manager-authorized import sequence is:

1. Sign in normally as an active workshop manager and obtain that account's UUID through the authenticated application; do not copy or expose its refresh token.
2. Through the existing API, create/reuse the two `SHOP` sellers, create `SHOP_PAGE` sources for `https://technolab.ps/` and `https://picindustrial.com.ps/`, approve those sources, and call `PUT /v1/market/prices/feeds` for each shop.
3. Set `PRICE_SYNC_ACTOR_ID` to that active manager UUID and run `npm run prices:sync -- --shop=technolab`, then `npm run prices:sync -- --shop=pic-industrial`. The command now collects the complete bounded feeds (up to 6,000 rows/60 pages), preserving all discovered pending mappings and checks.
4. Run `npm run prices:prepare-approval -- > mapping-approval-batch.local.json`. This read-only command refuses non-loopback or non-`labassist_auth_dev` targets and resolves the 50 manifest tuples to their discovered mapping UUIDs. For each row, the manager creates/selects the stated exact variant through `POST /v1/catalog/parts/{key}/variants`, then approves it through `POST /v1/market/prices/mappings/{id}/review`. The 6 unresolved and 3 no-match keys stay unapproved. The local batch file can be deleted after review and must not be committed.
5. Run both sync commands again. The later check creates offers/observations through the normal history path; repeating the same collection timestamp is idempotent. Record the resulting approved mapping, `PRICE_FOUND`, and displayable-offer counts per shop.

For local browser and phone review, set `VITE_LABASSIST_API_URL=http://localhost:3100` and set `EXPO_PUBLIC_LABASSIST_API_URL` to `http://<development-machine-LAN-IP>:3100`. Add the exact Student web and Expo Web origins plus the phone-reachable Expo origin to `CORS_ORIGINS`; do not use `*`. The backend must listen on an interface reachable from the phone. Physical-device behavior remains unverified until a device and genuine session are available.

Review servers left running from this checkpoint: Student web at `http://localhost:4173/` (LAN `http://192.168.1.14:4173/`) and Expo Web at `http://localhost:8081/` (LAN `http://192.168.1.14:8081/`). Both returned HTTP 200. They show the documented session-unavailable price state because real auth and the local API are absent. The API was not started because starting it without a confirmed development database would fail the target-safety requirement.

## Auth merge and local-development continuation (2026-11-26)

Local `main` was fast-forwarded to Noor's merged PR #59 commit `f1ae7da96f67f19e974cf6b0995654219a7894d7` after all tracked and untracked price-sync work was saved in `stash@{0}`. The stash was restored and retained as a recovery copy; the only conflict, `backend/api/package.json`, was resolved by keeping both Noor's auth checks and the price-sync commands. Nothing was staged, committed, pushed, or merged remotely.

Web and mobile now mount `MarketSessionProvider` from the real merged sessions. The shared `SessionClient` exposes only the current access token/account and its existing forced refresh operation; refresh tokens remain in the existing web session storage or native secure store. Student web mounts the adapter inside `WebSessionBoundary`; native Expo mounts it inside `NativeSessionProvider`. Logout/account changes unmount or replace the market provider, invalidating stale resources. Market API origins prefer `VITE_LABASSIST_API_URL` / `EXPO_PUBLIC_LABASSIST_API_URL` and fall back to Noor's existing `VITE_API_URL` / `EXPO_PUBLIC_API_URL` after safely removing a terminal `/v1`.

The ignored root `.env` was prepared with generated local-only secrets and the target was verified as **local development** `127.0.0.1:5442/labassist_auth_dev`. Docker Desktop and only the `postgres` Compose service were started. No manager identity was configured and no source, mapping, offer, observation, or price was imported.

Database setup is blocked before manager approval: Windows CRLF checkout made the fresh Compose `10-baseline.sh` fail to execute, so its required `public.labassist_bootstrap` checksum marker was never created. Restarting preserved the volume and produced a healthy server, but Prisma correctly refuses the failed `00000000000000_baseline` record (`P3009`). Resolving this now would require recreating or manually repairing the newly created volume, which was not done because this task forbids reset/delete operations. After an authorized baseline repair, run `npm run db:prepare`, bootstrap/sign in through normal auth, configure and approve both shop sources, set the genuine active manager UUID as `PRICE_SYNC_ACTOR_ID`, and follow the previously documented discovery/approval/resync sequence.

Post-merge verification: backend build and 12 collector fixture tests pass; Student typecheck, focused lint, 28 market tests and production build pass; mobile typecheck, lint and all 87 tests pass. The database-dependent suites were not rerun against this incomplete development database; their prior disposable-database result remains 17/17. Real-session browser/device checks and displayable real-data counts remain blocked by the database baseline and absence of a genuine active manager/test student account.

## Recovered local-development import and genuine-session browser verification (2026-11-26)

The earlier blockers above are resolved for the local development environment. The existing database was backed up, the failed baseline was verified as fully rolled back, the repository baseline/checksum was applied through its supported bootstrap process, and all later Prisma migrations were deployed without resetting or deleting data. Genuine local manager, supervisor and two student accounts were activated through the normal auth flow; the two students belong to a valid test team. Credentials and tokens remain outside the repository.

An authenticated manager configured and approved the Technolab and PIC shop sources, then approved all 50 evidence-backed mappings through the application API. Complete previously collected feeds were imported through the observation/history path. Current local-development results are Technolab **31 observations / 30 active displayable offers** and PIC Industrial **19 observations / 19 active displayable offers**. Three exact variants have active prices at both shops. The six unresolved and three no-exact-match catalog keys remain unavailable; their identities were not weakened or forced. Re-running the import was idempotent for identical collection timestamps.

Genuine-session Chrome checks used the real API, local database and normal login/refresh/logout flow, with comparison responses observed as HTTP 200:

- Student web at 390 px: login -> catalog -> explicit MPU-6050 exact variant displayed both shop prices; explicit Arduino Uno variant displayed one shop price and an unresolved `—` for the other. Refresh preserved the session, logout returned to login, and a same-context login as the second student showed no stale dialog or price. The 390 px layout had no document overflow.
- Student web at 320 px: an unreviewed/no-exact-identity part displayed no invented price and the layout had no document overflow. This web catalog is English with bilingual Arabic catalog content; it has no application-level Arabic/RTL mode, so a full web RTL claim is not applicable.
- Expo Web at 390 px English: the same both-shop and one-shop exact-variant flows displayed real prices and the unresolved `—`; refresh and logout behaved correctly with no document overflow.
- Expo Web at 320 px Arabic: real prices displayed after explicit selection, the document direction was `rtl`, and the layout had no document overflow. Expo Web is a browser result and does not establish native-device behavior.

No integration regression was reproduced, so no product code changed during this browser pass. Physical iOS/Android device verification remains unverified because no device was available. Services left running for review: API `http://127.0.0.1:3100/` (health at `/v1/health`), Student web `http://localhost:8080/` (LAN `http://192.168.1.14:8080/`), and Expo Web `http://localhost:8081/` (LAN `http://192.168.1.14:8081/`). Phone access requires using the LAN API origin and retaining the exact client origin in `CORS_ORIGINS`; no wildcard CORS is used.

## Shop stock normalization (2026-11-26)

The stock-evidence migration `20261126000100_shop_stock_evidence` separates nullable shop quantity from availability and its check timestamp. Collectors accept explicit non-negative integer counts; boolean stock is availability only and null, blank and invalid stock remain unknown. Imports fail closed before collection/persistence until the migration is present. Deploy the migration, API, web and mobile changes together before enabling imports. Student offer quantity and status rules remain in force.

The public API masks pre-migration shop counts and availability as unverified; old values and history remain stored, and the migration does not fabricate or overwrite source evidence. Existing shop outcomes contain no raw stock type, so no historic quantities can be repaired from those records alone. Legacy mapped prices remain visible with unknown stock. New imports record normalized stock and check dates; shop cards and comparisons show count or availability with the stock-check date. Last checked is not live inventory.

Verification uses a separate disposable PostgreSQL container, never the development database: collector and import/API fixtures cover counts, true/false, null, blank and invalid stock, updates and history; the existing market suite covers student-offer validation. Focused web and mobile tests and application type checks cover presentation. No feeds were recollected and no real database was changed.

## Local development stock migration (2026-11-26)

Verified `127.0.0.1:5442/labassist_auth_dev` and schema `labassist_student`, then backed up the database to `D:/LabAssist/local-secrets/labassist-auth-dev-before-stock-2026-11-26T18-15-04-639Z.dump`; `pg_restore --list` accepted the archive. Applied only `20261126000100_shop_stock_evidence` without resetting data. Before and after: 50 shop offers, 50 price observations and 50 offer-history rows. The public view now exposes all 31 Technolab and 19 PIC prices with unknown, unverified legacy stock. No feeds were collected and no imports ran.

Rebuilt and restarted the local API on `127.0.0.1:3100`, student web on `127.0.0.1:8080`, and Expo Web on `localhost:8081`; clients are bound to loopback for local development. A local, untracked `frontend/student/.env.local` points the web session and market client at the local API. Genuine local student sessions in both browsers showed a shop price with unknown availability and unknown stock-check date, with no numeric stock claim. The deployed database guard still rejects null student quantities and zero-quantity active student offers; no student offers exist in this database, so the previously completed disposable-database student-offer suite supplies behavioral coverage. Physical mobile devices were not tested.
