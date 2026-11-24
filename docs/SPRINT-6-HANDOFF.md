# Sprint 6 handoff: Catalog, Shops, Prices and Student Offers

Checkpoint date: 2026-11-24. Nothing has been staged or committed.

## Status by task

- **Task 1 (audit).** It also produced candidate API code, which is kept unchanged: [market.dto.ts](../backend/api/src/market.dto.ts), [market.service.ts](../backend/api/src/market.service.ts), [market.controllers.ts](../backend/api/src/market.controllers.ts), [market.spec.ts](../backend/api/test/market.spec.ts), plus one import line in [app.ts](../backend/api/src/app.ts).
- **Task 2 (contracts).** Done. The approved decisions are listed below.
- **Task 3 (database).** Complete: migration, `schema.prisma` sync, and CI coverage, validated on disposable databases. Details below.
- **Task 4 (API).** Implemented and tested. Details below.
- **Task 5 (student offers).** Complete for the approved behavior. No database or API logic change was needed: only tests and a Swagger description were added. Details below.
- **Task 6 (web integration).**
  - **Preparation is complete:** the client, the session interface, and the student screens wired to them.
  - **Blocked:** the real session integration, and end-to-end UI verification. Both depend on Noor's web session.
- **Frontend and mobile.** Student web and mobile integrations are prepared; real-session verification remains outstanding. The requirements are **not complete end to end**.

## Approved decisions (Task 2 → Task 3)

1. Workshop managers maintain SHOP offers. A STUDENT seller's offers are editable only by its active student owner. Any manager moderation needs a separately approved policy.
2. Every price observation has its own source, currency and observation date. A changed price never inherits an earlier date.
3. Offer status transitions are as proposed, with one change: zero quantity never implies SOLD. An explicit closing status is required.
4. Pagination defaults to 50 items, maximum 100. Out-of-range sizes are rejected, and continuation is explicit.
5. Exact identity (manufacturer, model, package or board revision) belongs to catalog variants, and offers reference it. Unknown stays unknown, and there is no exact match without enough identity.
6. Withdrawing a source approval records the actor, time and reason. It removes affected offers from public comparison and keeps evidence, history and bookmarks.
7. Unknown or unverified pin metadata stays marked as such, and wiring safety is never inferred from it.

## Task 3: database changes

Migration: [20261124000100_market_price_integrity/migration.sql](../backend/api/prisma/migrations/20261124000100_market_price_integrity/migration.sql). It adds to the schema and replaces three existing functions with the same signatures; no existing IDs or rows are removed.

**Ownership**
- New helper `market_curator(actor, seller)`: managers for SHOP sellers, active owners for STUDENT sellers.
- `market_offer_guard` uses it for every offer write, and the new observation guard uses it for every price observation.

**Status rules** (in `market_offer_guard`, replaced)
- New offers start as DRAFT or ACTIVE.
- Allowed changes: DRAFT→ACTIVE, DRAFT→WITHDRAWN, ACTIVE→SOLD, ACTIVE→WITHDRAWN, ACTIVE→EXPIRED, EXPIRED→ACTIVE.
- SOLD and WITHDRAWN offers cannot change.
- An ACTIVE offer with quantity 0 is rejected, with a message asking for an explicit closing status.
- Becoming ACTIVE requires that the current observation's source is APPROVED, and that the expiry is empty or in the future.
- EXPIRED→ACTIVE requires an observation recorded after the offer expired.

**Price observations** (`market_price_observations`)
- Each row has an immutable source, currency, `observed_at`, recorder and offer revision.
- `record_market_price(actor, offer, expected, source, price, shipping, currency, observed, expires?)` rejects: a missing date, a future date, a date not newer than the previous observation, a currency mismatch, and a rejected or revoked source.
- Any price or shipping change without a matching new observation is rejected. `update_market_offer` therefore only changes quantity and status now.
- A new offer's first observation uses its source evidence date.
- **Existing offers:** each gets one `is_legacy` observation with `observed_at` and `recorded_by` set to NULL. No dates are invented.

**Visibility** (`market_public_offers` view)
- The newest observation whose source was ever approved decides visibility.
- A pending newer observation keeps the previous approved price public, with its own date.
- If that newest observation's source is revoked, the offer leaves public results. There is no fallback to an older price.
- `compare_part_offers` (replaced, same signature) reads this view. It adds `price_observed_at`, `price_observation_legacy`, `price_source_id`, the variant identity fields and `identity_exact`.

**Revocation** (reuses `resale_sources`)
- New `REVOKED` status, plus `revoked_by`, `revoked_at` and `revocation_reason` columns. A constraint makes them all required together.
- `revoke_resale_source(actor, source, reason)` requires a manager and a reason.
- `resale_source_guard` (replaced) allows only PENDING→APPROVED/REJECTED (once) and APPROVED→REVOKED. The original approval and the revocation record cannot be changed afterwards. APPROVED→REJECTED and re-approval are rejected.

**Exact identity**
- `catalog_part_variants`: manufacturer, model number, package or revision (NULL means unknown) and an optional source URL. Manager-created, immutable, unique regardless of letter case.
- `catalog_parts.exact_identity_fields`: which fields are relevant for an exact match. Existing parts default to all three, which is the conservative choice.
- `part_variant_exact` checks a variant. `set_part_identity_fields` and `create_part_variant` are manager-only.
- `market_offers.variant_id` must belong to the same catalog part. The owner sets it once with `set_offer_variant`.
- `compare_variant_offers` refuses variants with insufficient identity.
- **Existing data:** no variants, no offer links.

**Pagination**
- `page_size_limit` enforces the 50/100 rule.
- Paged functions return `{items, next}`, where `next` is the cursor (or null) passed back as `page_after`: `read_catalog_page`, `compare_part_offers_page`, `compare_variant_offers`, `catalog_pin_page`.
- The unbounded `read_catalog` and `compare_part_offers` are kept only for the current API.

**Pins** (`catalog_pin_page`, `pin_field`)
- Each field is returned as `{value, status, source}`. Missing values (and `unknown`) are `UNKNOWN`; present values are `UNVERIFIED`. No `VERIFIED` status is produced, because there is no per-pin verification source.
- Fields that exist only in the model's `definition` JSON are used only when the pin name at the same index matches.
- Each page carries `wiring_safety: NOT_EVALUATED`.

**Tests**
- [market-integrity-migration/tests/acceptance.sql](../backend/database/market-integrity-migration/tests/acceptance.sql): 60 assertions, inside a transaction that is rolled back.
- [market-integrity-migration/tests/seed-replay.sql](../backend/database/market-integrity-migration/tests/seed-replay.sql): 4 assertions, disposable database only.
- The stage 7 and stage 8 SQL files and their tests are unchanged. They are frozen into the baseline, and CI runs them on stage SQL without migrations.

**Prisma schema**
- [schema.prisma](../backend/api/prisma/schema.prisma) was regenerated with the repository's established workflow, `prisma db pull`. This was confirmed first: pulling a database at the pre-Task-3 migration level reproduces the committed file exactly, apart from trailing blank lines.
- It was pulled from a demo database built with `npm run db:demo:create`. The file keeps its CRLF line endings.
- What changed:
  - New models `catalog_part_variants` and `market_price_observations`.
  - New fields and relations on `catalog_parts`, `market_offers` and `resale_sources`.
  - New back-relations on `accounts`.
  - No original line in any model was lost; the other 39 removed lines are column realignment.
- The `market_public_offers` view is not modelled, because the generator has no `views` preview feature (unchanged). Prisma also reports the case-insensitive identity index as an expression index it doesn't support; the index still exists in the database.

**CI**
- New workflow: [market-integrity-checks.yml](../.github/workflows/market-integrity-checks.yml). It runs a separate job on a fresh postgres:17 service:
  1. `npm ci`, then `prisma validate`, `prisma:generate` and `db:verify-baseline`.
  2. `db:demo:create`: stages and seeds, then `prisma migrate deploy`.
  3. A `schema.prisma` drift check (`db pull --print` compared with the committed file).
  4. `psql` runs of the new `acceptance.sql` and `seed-replay.sql`.
- The historical stage tests stay in `remaining-data-checks.yml`, before any migration, unchanged.

## Validation (2026-11-24, disposable postgres:17 containers, removed afterwards)

| Check | Result |
| --- | --- |
| Demo database (all `stages.json` demo files), stage 7 and 8 acceptance before migration | Passed |
| Prisma migrations applied in order over the demo data (`20261113000100`, `20261113000200`, `20261124000100`) | Applied |
| New migration acceptance | 60/60 passed |
| Stage 7 acceptance after migration | 14/14 passed |
| New post-migration seed replay | 4/4 passed |
| Empty database via `npm test` (`prisma migrate deploy` applies all 4 migrations) | Migration applied. API suite: 26 passed, **2 failed** in `market.spec.ts`, described under "Expected after this migration" |
| Synced `schema.prisma`: `prisma validate` (needs `DATABASE_URL` set, as before), `prisma generate`, `npm run build`, `db:verify-baseline` | Passed |
| Steps of the new CI workflow, run locally on a database built by `db:demo:create` (the workflow has not run in GitHub yet) | Drift check in sync; acceptance 60/60; seed replay 4/4; YAML parses. The drift check fails, as it should, against the pre-migration schema. |
| API suite rerun after regenerating the Prisma client | Unchanged: 26 passed, the same 2 known failures |

**Expected after this migration, not defects in it**
- Two `market.spec.ts` tests fail. The first reprices through `PATCH /v1/market/offers/:id` (which calls `update_market_offer`) and is now rejected. The second depends on that price.
- Stage 8 acceptance and `remaining-data/tests/seed-replay.sql` fail when run *after* this migration, by design. They reprice with `update_market_offer` and flip APPROVED→REJECTED. The new acceptance file replaces those cases.
- `seed-replay.sql` has no transaction. Run partially, it left committed edits in the disposable database (for example `arduino_uno` deactivated), so the database was rebuilt before the final runs.

## Migration ordering for Noor

1. Prisma applies `backend/api/prisma/migrations` in name order. The current order:
   - `00000000000000_baseline` (frozen; never edit it or the stage SQL it mirrors)
   - `20261113000100_auth_sessions`
   - `20261113000200_composite_relation_metadata`
   - `20261124000100_market_price_integrity`
2. Unpublished migrations should be timestamped after `20261124000100`. Any of them that touch the following must be rebased onto this migration's definitions and not restore the old function bodies:
   - tables `market_offers`, `resale_sources`, `catalog_parts`
   - functions `market_offer_guard`, `resale_source_guard`, `compare_part_offers`
   - constraint `resale_sources_status_check`
3. Demo databases load stages and seeds first, then the migrations (`tools/demo.cjs`). Loading the stage 8 seed *after* this migration on a fresh database fails: its student-seller offers are written by a manager. Replaying the seed over existing rows is safe (tested).

## Task 4: API changes

The existing module was extended in place. These files changed: [market.dto.ts](../backend/api/src/market.dto.ts), [market.service.ts](../backend/api/src/market.service.ts), [market.controllers.ts](../backend/api/src/market.controllers.ts), plus the new [market.responses.ts](../backend/api/src/market.responses.ts) (Swagger schemas). Auth (`SessionGuard`, `communication_actor` reader check), module wiring and the global error filter are unchanged.

**Pagination**
- Every list accepts `limit` (default 50, 1–100; anything else returns 400) and `cursor`, and returns `{items, nextCursor}`.
- The cursor is opaque (base64url keyset). A malformed or foreign cursor returns 400.
- Timestamp cursors use microsecond UTC text, so rows are neither skipped nor repeated.
- Comparison pages use `compare_part_offers_page` and `compare_variant_offers`; pins use `catalog_pin_page`.
- Parts, sellers, sources, offers, managed offers, bookmarks, history, observations, documents and variants use keyset queries in the API. `GET /catalog/parts` keeps the `read_catalog` search semantics and applies the category filter before paging.

**Prices**
- `POST /v1/market/offers/:id/prices` (offer curator only) takes `{expectedRevision, sourceId, unitPrice, shippingCost?, currency, observedAt, validUntil?}` and calls `record_market_price`.
- `PATCH /v1/market/offers/:id` now accepts only `{expectedRevision, quantity, status}`. Sending `unitPrice` returns 400. This is the one narrowly changed shared price path: it passes the current price through unchanged.
- `GET /offers/:id/observations` (paged) returns each observation's source and its status, currency, `observedAt` (null with `isLegacy: true` for legacy prices) and `recordedAt`. `GET /offers/:id/history` is unchanged apart from paging.

**Ownership**
- The API `curated()` check now matches `market_curator`: managers curate SHOP sellers only, and student sellers are curated by their owner only.
- This applies to editing a seller, creating sources, creating, repricing and status-changing offers, linking a variant, and reading history and observations.

**Public views**
- `GET /market/offers`, comparisons and bookmark availability read the `market_public_offers` view.
- Items carry `priceObservedAt`, `priceObservationLegacy`, `seller{…}`, `source{…}` (the source of the public price) and `identity{manufacturer, modelNumber, packageOrRevision, exact}`.
- Bookmarks return `{id, partName, status, available, publicOffer|null}`, so saved offers stay listed when they become unavailable.

**Exact identity**
- `GET/POST /v1/catalog/parts/:key/variants`; creating one is manager-only, and a duplicate (any letter case) returns 409.
- `PUT /catalog/parts/:key/identity-fields` (manager, revision-checked).
- `PUT /market/offers/:id/variant` (curator, set once).
- `POST /market/offers` accepts an optional `variantId`.
- `GET /market/compare/exact?variantId&currency…` returns 400 when the identity is insufficient and 404 for an unknown variant.
- Part details include `exactIdentityFields`.

**Revocation**
- `POST /v1/market/sources/:id/revoke {reason}` is manager-only.
- Errors: a blank reason returns 400; a pending or already-revoked source returns 409.
- Sources now carry `reviewedBy`, `reviewedAt`, `revokedBy`, `revokedAt` and `revocationReason`, and `GET /market/sources` accepts `status=REVOKED`.

**Pins**
- `GET /v1/catalog/parts/:key/pins` (paged) returns each pin with a stable `id` (`modelId:modelVersion:pinIndex`) plus `modelId`, `modelVersion`, `pinIndex` and `name`.
- Every metadata field is `{value, status: UNKNOWN|UNVERIFIED, source: null}`, and each page carries `wiringSafety: NOT_EVALUATED`.
- `GET /catalog/parts/:key` no longer embeds pins or documents. It returns `pinCount` and `documentCount`; documents have their own paged route.

**Swagger**
- Every route declares its success schema (`*Page`, `Offer`, `Source`, `PinPage`, …).
- Every route declares its error codes with `ErrorResponse {statusCode, message: string|string[], error?}`, which matches the global filter's output. All routes also list 401, 429 and 500.

**Errors**
- New database messages are translated in `RULES`, in `market.service.ts`:
  - stale revision → 409
  - closed offer → 409
  - revocation conflict → 409
  - duplicate identity → 409
  - observation date, currency or source problems → 400
  - unknown status transition → 400
  - offer must be explicitly closed → 400
  - insufficient identity → 400

**Tests** ([market.spec.ts](../backend/api/test/market.spec.ts), 11 tests)
- The two Task 3 failures are fixed by adapting the flow: prices now go through `POST /prices` with dated observations. The original assertions are kept: concurrent conflicts, history revisions, price ordering, and bookmark persistence after SOLD.
- Pagination:
  - parts, sellers, history, comparison and variant pages are walked page by page, with duplicate detection;
  - `limit` 0, 101 and 2.5 are rejected, as are malformed or foreign cursors.
- Authorization: a manager cannot edit or reprice student offers, edit a student profile or create a source for a student; a student cannot reprice a shop offer; an outsider cannot read pins.
- Prices:
  - two concurrent price recordings produce 201 and 409;
  - older or future dates and currency mismatches are rejected;
  - observations keep their dates, and history keeps its revisions;
  - zero quantity needs an explicit close, and a sold offer then returns 409.
- Exact identity:
  - insufficient identity returns 400 and an unknown variant 404;
  - a variant from another part, and replacing a linked variant, are rejected;
  - exact comparison returns only the matching offer, and changing the relevant fields makes a partial variant exact.
- Revocation: actor, time and reason are recorded; the offer leaves comparison; bookmark, observation and history are kept; a revoked source cannot be used for a new price.
- Swagger: the documented schema references are checked, and 14 real response bodies (including three error kinds) are compared key by key with their schemas.

**Results** (disposable postgres:17, 2026-11-24, removed afterwards)
- `market.spec.ts`: 11/11 passed.
- `npm run build`: passed.
- Full backend suite (`npm test`), run once: 3 suites, 32/32 passed.

## Task 5: student-offer lifecycle

**Already enforced, reused without changes**
- Ownership:
  - API `curated()` and the database `market_curator`: owner-only student offers; managers only for shop offers.
  - Identity is immutable (database guard), and the request whitelist rejects unknown fields.
- Lifecycle:
  - the approved transition table, zero-quantity closing, final SOLD and WITHDRAWN states, and EXPIRED→ACTIVE only after a newer approved observation (all in `market_offer_guard`);
  - revision conflicts return 409;
  - source approval is required to become ACTIVE;
  - immutable history.
- Price changes: only through `POST /offers/:id/prices` (Task 4).

**Changed**
- [market.dto.ts](../backend/api/src/market.dto.ts): the `OfferUpdateDto.status` Swagger description now lists the allowed transitions, the 409 for closed offers and the zero-quantity rule.
- [market.spec.ts](../backend/api/test/market.spec.ts): the fixture gains a third team member, `lina`, so one account can be disabled without dropping below the minimum team size.
- Four new tests, which avoid repeating existing coverage:
  1. **Ownership and identity:**
     - a student cannot create an offer on a shop seller or another student's seller;
     - another seller's source is rejected (400), and a new offer cannot start as SOLD;
     - `PATCH` rejects `sellerId`, `sourceId`, `currency`, `condition`, `partName` and `catalogKey` (400), with history unchanged.
  2. **Transitions:**
     - DRAFT→SOLD and DRAFT→EXPIRED return 400, ACTIVE→DRAFT returns 400;
     - a WITHDRAWN offer is final: every status change and new price returns 409;
     - concurrent SOLD and WITHDRAWN on the same revision give 200 and 409, with exactly one history entry.
  3. **Expired reactivation:**
     - an expired offer is hidden publicly, and EXPIRED→ACTIVE/SOLD/WITHDRAWN/DRAFT all return 400;
     - recording a price while expired keeps the status EXPIRED and sets `validUntil`;
     - reactivation still returns 400 while the new source is pending, and 409 with a stale revision;
     - concurrent reactivation gives 200 and 409;
     - afterwards the public price shows the new observation date and source, and history reads 0 ACTIVE → 1 EXPIRED → 2 EXPIRED (new price) → 3 ACTIVE.
  4. **Inactive account:** with a pre-existing disabled owner record (set directly in SQL; LabAssist has no disable action, see [ACCOUNT-DISABLE-REMOVAL.md](ACCOUNT-DISABLE-REMOVAL.md)), the owner gets 401, while the manager and other students get 403 for status and price changes. The database row is unchanged.

**Deferred: needs Sprint 2A membership, not available in this checkout**
- No route lets a student leave a team.
- Behavior after leaving: the owner stops being a reader, so their edits get 403 from `communication_actor`. This is enforced, but not tested at the API level, because doing so would need membership changes outside the authorized flows.
- No authorization is bypassed.

**Open policy decisions**
- Should a disabled owner's, or a former member's, ACTIVE offers stay publicly visible? Today they do. No one can edit them, because manager moderation requires a separately approved policy.

**Results** (disposable postgres:17, 2026-11-24, removed afterwards)
- `market.spec.ts`: 15/15 passed.
- `npm run build`: passed.
- Full backend suite, run once: 3 suites, 36/36 passed.

## Task 6: web integration (real session blocked)

**Verified on 2026-11-24 with targeted searches**
- No web app (`frontend/*`, `shared/`) has an API client or a real session. There is no `accessToken`, `Authorization` header, `/v1/` call or API base URL anywhere.
- Web sign-in is Noor's shared **demo** login, documented in [SHARED-WEB-LOGIN.md](SHARED-WEB-LOGIN.md): demo credentials (`noor@demo.com` / `Noor123!`) and browser-only demo sessions in `shared/web/demoSession.ts`, which carry no token or account record.
- The screens in scope are all in `frontend/student`:
  - `routes/catalog.tsx`, using `lib/componentCatalog.ts` and `ComponentConnectionSheet`, `ComponentDocuments` and `ComponentPreview`;
  - `routes/inventory.tsx`, using `InventoryPriceComparison`, `InventoryStorePrices` and the read-only "Student Resale" list, all fed by `lib/workshopInventory.ts` mocks.
- The workshop and supervisor web apps have no catalog, shop or price screens.

**Blocking auth dependency** (owned by Noor's login work; not invented or bypassed here)

A real web session provider is needed, shared by the student app, that:
1. Signs in with `POST /v1/auth/login {role, identifier, password}`. Students use `s########@stu.najah.edu`. The demo identifiers and the 8-character demo password don't satisfy the API rules (12+ characters for real passwords).
2. Holds `accessToken`, `refreshToken` and `accessExpiresAt`, and rotates them with `POST /v1/auth/refresh`.
3. Retries once after a 401 by refreshing, then shows a re-sign-in state. Logout uses `POST /v1/auth/logout`.
4. Exposes the actor (`id`, `role`) from the login response or `GET /v1/auth/me`.
5. Is configured with an API base URL. There is no `VITE_*` API variable yet.
6. Is served from an origin listed in the API's `CORS_ORIGINS`. The default allows only `http://localhost:8081` and `http://localhost:8080`, so the student dev origin must be added.

There is also a data dependency: students read the catalog and market only while they are in a current team (`communication_actor`). Real student testing therefore needs Sprint 2A team membership, or disposable seeded teams.

**Contract gaps found between the current UI and the API** (to resolve before or during integration)

*Stores*
- `LocalStore.address` and `note` have no `Seller` field. The `initials` and `tone` fields are UI-only and can be derived on the client.

*Store offers*
- `price: null` ("Ask store") is impossible: every API offer has a price.
- The three-way `availability` state has no equivalent. Public offers always have quantity > 0, and closed offers aren't public.
- The per-offer product `url` has no equivalent. The API's `source.url` is price **evidence**, which means something different.
- `checked` maps to `priceObservedAt`, with legacy prices showing an unknown date.

*Student Resale and catalog*
- Student Resale items come from `workshopStock` with a `resaleNote`. They map to `GET /market/offers?sellerKind=STUDENT`, but there is no note field.
- Catalog visuals and 3D data stay local, joined by catalog key. The local data mixes key styles (`arduino_uno` and the `arduino-uno` model id), so a mapping is required.

*Offer actions*
- The web app has no student offer, price or status actions, and no bookmark UI. Adding any would be a new UI feature that needs a product decision.

**Ready once the session exists (no further API changes needed for reading)**
- Paged `{items, nextCursor}` lists, the separate pin and document routes, observations with source, currency and date, `UNKNOWN`/`UNVERIFIED` pin fields, and exact comparison (`/market/compare/exact`, which rejects insufficient identity).

### Task 6 preparation (done; independent of the real session)

**Files** (all in `frontend/student`; no backend, mobile or migration changes)

*New*
- `src/lib/market/client.ts`: typed client for the `/v1/catalog/*` and `/v1/market/*` routes.
  - The API address comes from `VITE_LABASSIST_API_URL` (documented in `.env.example`).
  - It sends no request without a token from the session: it raises "session unavailable" or "not configured" instead.
  - It passes on the API's error messages and calls `onUnauthorized` after a 401.
- `src/lib/market/session.tsx`: the `MarketSession` interface (`getAccessToken`, `getCurrentUser`, optional `onUnauthorized`) and `MarketSessionProvider`. The default is `unavailableSession`, which has no token. Login, token storage and refresh are deliberately absent; they belong to Noor.
- `src/lib/market/useMarketData.ts`: paged and single-resource loaders.
  - Stale responses are discarded and their requests aborted.
  - "Load more" is guarded against duplicate requests.
  - Failures are sorted into session, not-configured and error states, all with retry.
  - Searches are debounced.
- `src/lib/market/partKeys.ts`: explicit mapping from API key to local 3D model, by **identical key only**. It never guesses, and never treats a model id such as `arduino-uno` as a key.
- `src/lib/market/format.ts`: money is shown with its currency; unknown dates and pin values are shown as "unknown" or "(unverified)".
- `src/components/market/*`:
  - `CatalogLibrary` and `CatalogPartDialog`: the catalog, with pins and documents loaded separately.
  - `MarketLists`: the offer list and store directory.
  - `MarketOfferCard`.
  - `MarketPriceComparison`: per-part comparison, and exact comparison by variant.
  - `MarketStatus`: the shared state panels.

*Changed*
- `src/routes/catalog.tsx`: the library and the details dialog now use the components above. The workbench showcase keeps its local 3D bench; its "details" action now opens the API details by exact key. BOM and 3D Lab actions appear only for parts with an exact local match.
- `src/routes/inventory.tsx`:
  - Store prices, the store directory, the Find Parts store offers, Student Resale and the comparison dialog now use the API.
  - Workshop stock stays the existing sample data (workshop inventory is out of scope), now labeled "Sample workshop stock · live prices".
  - The mock city filter and the mock store and resale entries were removed from those views.
  - `src/components/InventoryStorePrices.tsx` and `InventoryPriceComparison.tsx` remain in place but are no longer used.

**Rules applied**
- Without a real session or an API address, every live view shows a sign-in or not-configured state. No sample data or fake tokens are used.
- Unknown values stay unknown: address ("Address not published"), notes, shipping, phone, a legacy price's observation date, and pin values.
- `source.url` is labeled "Price evidence", never a product link.
- "Exact identity" appears only when the API reports `identity.exact`. A variant that isn't specific enough is labeled as such, and the API's 400 for it is shown as returned.
- No offer-action UI and no account-disable features were added, and nothing hides offers.

**Checks** (2026-11-24)

*Student app*
- New `src/test/market-integration.test.tsx`: 10/10 passed. It uses a test-only session and a mocked HTTP layer, and covers:
  - no request without an address or token;
  - the bearer token and `/v1` URLs;
  - 401 and 400 handling;
  - the exact key mapping;
  - a stale search being discarded;
  - the sign-in state with zero network calls;
  - prices, legacy dates and the evidence link;
  - pagination without duplicate requests;
  - error then retry;
  - pins and documents from their own routes, with unknown and unverified labels;
  - exact labeling only through an exact variant.
- Full `npm test`: 19 files, 83 tests passed, run from PowerShell.
  - From the Git Bash shell, every file failed to load, including untouched ones.
  - The cause was the lowercase `d:` drive letter in that shell (Vitest loads twice), not the code.
- `npm run typecheck`: passed. `npm run build`: passed.
- ESLint on the changed files: no errors beyond the checkout-wide CRLF Prettier noise. An untouched route has the same noise because `core.autocrlf=true`.
- Two accepted warnings: `react-refresh/only-export-components` in `session.tsx`, where the provider file exports its hook.

*Contract smoke against the real API* (disposable demo database built with `db:demo:create`; removed afterwards)
- Setup: one TEAM01 demo student was given a password in the throwaway database only, then signed in through the real `/v1/auth/login`. The new client used that genuine token.
- Results:
  - 8 categories; parts paged 20 + 20 with continuation; search returned `arduino_nano` and `arduino_uno`.
  - `arduino_uno` details: 27 pins and 1 document.
  - Pins paged (10 + continuation), with stable ids (`arduino-uno:1:0`), only `UNKNOWN`/`UNVERIFIED` values and `wiringSafety: NOT_EVALUATED`. The document is shown as unverified.
  - `limit=101` returned 400.
  - Sellers, offers and comparison returned empty, because the seeded market data is demo-only and excluded by default. That makes them correct empty states.
- All 43 real catalog keys also appear in the local catalog sources (a rough text check; the exact mapping itself is unit-tested).

### Task 6 local wiring sheet correction (2026-11-24)

- Restored the existing `ComponentConnectionSheet` in catalog cards and expanded part details through `LocalWiringSheet`, using only the identical local catalog key. Unknown keys and model IDs receive no guessed sheet. It is labeled local reference content, not live catalog data; its original functional-grouping and original pinout/datasheet caveats remain. API loading, errors and session handling remain in place.
- Focused PowerShell tests: `npm test -- src/test/local-wiring-sheet.test.tsx src/test/market-integration.test.tsx` passed (2 files, 12 tests). The new tests cover both placements, known and unknown keys, sheet tabs, caveats and Arabic direction; only the Three.js preview is mocked. API responses and session are test-only doubles.
- `npm run typecheck` and `npm run build` passed. Build emitted existing dependency compatibility warnings.
- A temporary test-only browser harness with mocked API responses was checked in Chrome at 390px and 1280px: the library sheet opened, Arabic text had RTL direction, and the details sheet was expanded. Page width matched viewport; dialog width was 368/802px with scroll width 368/802px (2px border difference). This is a layout check, not real-session integration. The temporary harness was removed.

**Still blocked or unverified**
- The real session provider: items 1–6 above, owned by Noor.
- End-to-end UI flows in a browser against the real API. They can't get a token until the provider is mounted with `<MarketSessionProvider session={…}>`.
- Live non-demo shop, offer and comparison data.
- CORS for the student origin.
- Arabic rendering and complete flows with a real session and live API data remain unverified.

**Next step**
- Noor mounts the real `MarketSessionProvider` and the web origin is added to `CORS_ORIGINS`.
- Then verify the flows in an isolated browser profile against a disposable API, and decide the remaining store and offer field gaps.

## Task 7: mobile integration (prepared; real session unverified, 2026-11-24)

- Catalog now loads paged API categories and parts with search and category filtering; the voltage filter applies to loaded items. Details, pins and documents load separately with unknown/unverified and wiring-safety caveats. Existing local preview, guide and project actions attach only for identical local keys and are labeled local reference content. Unknown keys still show API details without a guessed local model.
- Inventory uses paged live shop and student offers, sellers and part/currency comparison. Its exact-identity selector pages variants for the selected part, excludes incomplete identities, resets when the part changes, and calls exact comparison only after an explicit exact selection. Prices show currency, observation date or unknown legacy date, shipping, identity and price evidence. Search applies to offers; store name/city filtering applies to loaded sellers. Existing workshop requests and their storage remain local. Workshop inventory and its resale examples remain explicitly labeled samples, separate from live offers; no sample fallback is used for API errors. Existing screens had no API offer-edit actions to migrate.
- Loading, empty, retry, configuration and session states are displayed; page requests are guarded, aborted and invalidated when superseded or when the session changes. The native demo navigation session and its storage key are unchanged. `MarketSessionProvider` defaults to unavailable; a real session owner must provide tokens and handle unauthorized responses. Set `EXPO_PUBLIC_LABASSIST_API_URL` to the API origin.
- `npm run typecheck`, `npm run lint`, and `npm test` passed (56 tests). Mocked client tests cover missing configuration/session, bearer headers, paging, exact-variant routes and 401 handling. A test-only Expo Web fixture and mocked HTTP/session screen test (`tests/market-screen-smoke.cjs`) passed at 320px and 390px in English and Arabic: catalog pagination, stale search, known/unknown details, pins/documents, retry, sellers, paged exact identities, incomplete-identity exclusion, explicit exact comparison, selection reset, session loss and RTL/page width. Copy `tests/market-screen.fixture.tsx` temporarily to `src/app/market-check.tsx`, start Expo Web on port 8096, run the test, then remove the temporary route.
- An iOS Expo JavaScript export passed; this is bundling only, not a native runtime or device test. No physical-device or genuine-session verification was performed. A real provider, configured origin, API access and current-team data remain necessary; verify live flows and CORS with those in place. No login, token storage, refresh or authentication bypass was added.

### Mobile exact-variant completion (2026-11-25)

- Matched the established web flow: selecting a part loads its paged variants; only API variants with `exact: true` are selectable, and incomplete identities are called out rather than inferred. Selecting one switches to `/market/compare/exact`; changing the part clears it and returns to ordinary part comparison.
- Focused mocked Expo Web checks passed at 320px and 390px in English and Arabic, including variant error/retry, continuation, incomplete-identity exclusion, explicit exact selection and part-change reset. Mobile typecheck and lint passed; the full mobile suite passed 56/56. These are mocked/Expo Web results, not real-session or native-device verification.

## Task 8: consolidation matrix (2026-11-24)

Sprint 6 is **not complete end to end**: neither client has a genuine mounted session, and native-device flows remain unverified.

| Status | Scope and evidence |
| --- | --- |
| Implemented | Database/API pagination, part details and separate pins/documents, dated price observations and history, exact variant comparison, ownership and status rules; web/mobile read screens, exact-variant selectors and exact-key local references. |
| Verified | Reused Task 3–5 disposable PostgreSQL/backend results (36/36 API tests), the real-token catalog contract smoke, Task 6 web checks, and Task 7 mobile typecheck/lint/55 tests and mocked Expo Web checks. Task 8 reproduced and fixed web stale data on session replacement and inaccessible next pages for catalog categories and comparison parts/variants. Focused web tests: 14/14; web typecheck and build passed. API tests cover concurrent price/status writes, ownership and history; these are not UI save tests. |
| Blocked | Genuine session-provider hookup and real-session browser/mobile flows; non-demo offers/comparison data, configured web CORS, and physical iOS/Android device verification. Mocked Expo Web checks and the iOS JavaScript export do not establish native runtime success. |
| Deferred | There is no existing student offer-edit UI, so failed-save input retention and duplicate-submit UI behavior cannot be verified; no new actions were added. Price history is exposed and tested by the API but has no market history screen. Per-pin verification, membership-leaving tests, inactive-owner visibility policy, revocation/price races and view performance remain open. Existing workshop requests and explicitly labeled samples are local. |

**Hookup for Noor.** Mount each application's own `MarketSessionProvider` around the consuming screens and provide `getAccessToken(): Promise<string|null>`, `getCurrentUser(): Promise<{id, role}|null>`, and optional `onUnauthorized()` to initiate refresh or re-sign-in. Supply a new session object (or remount/retry) when the actor/session changes so loaded data is invalidated. The auth owner handles real login, token storage, refresh/one retry after 401, and logout; the demo navigation sessions contain no token. Configure `VITE_LABASSIST_API_URL` for student web and `EXPO_PUBLIC_LABASSIST_API_URL` for Expo, both as the reachable API origin without `/v1`. Add each browser/Expo Web origin to API `CORS_ORIGINS`; native devices also need a reachable origin and appropriate network configuration. Real student catalog/market reads require current-team membership or disposable seeded teams.

**Migration and contracts.** Apply Prisma migrations in order: `00000000000000_baseline`, `20261113000100_auth_sessions`, `20261113000200_composite_relation_metadata`, `20261124000100_market_price_integrity`; rebase later migrations that touch the affected market tables/functions. Demo databases load stages/seeds before migrations. Lists return `{items, nextCursor}`; part details no longer embed pins/documents; price changes use `POST /market/offers/:id/prices` with a source, currency, observation date and expected revision, while `PATCH /offers/:id` accepts quantity/status and revision only. Comparisons return nested offer/source/identity objects, and managers cannot curate student sellers or offers.

**Draft message for Noor (not sent)**

> نور، جهّزنا أعمال Sprint 6 للكتالوج والمتاجر والأسعار وعروض الطلاب، مع ترحيل قاعدة البيانات واختبارات الـAPI وربط شاشات الويب والموبايل. لا يزال الاختبار المتكامل بانتظار جلسة حقيقية: اربطي `MarketSessionProvider` بالتسجيل والتحديث الحاليين، واضبطي عنوان الـAPI و`CORS_ORIGINS`، ثم اختبري بحساب ضمن فريق وعلى أجهزة فعلية. نتائج المحاكاة وExpo Web وتصدير iOS لا تثبت نجاح الجهاز. الرجاء تطبيق الترحيلات بالترتيب الموضح أعلاه؛ كذلك أُزيلت إجراءات تعطيل الحساب وإعادة تفعيله، مع الحفاظ على السجلات القديمة. المقارنة بهوية نسخة دقيقة متاحة الآن في الـAPI والويب والموبايل، ولا تُستخدم إلا بعد اختيار الهوية الدقيقة صراحةً.

## Remaining gaps (not done)

**API contract changes compared with Task 1**
- Lists became `{items, nextCursor}`.
- The part detail no longer embeds pins or documents.
- `PATCH /offers` no longer accepts a price.
- Comparison items are nested objects.
- Managers no longer curate student sellers, sources or offers.

**Not covered**
- Real-session student web and mobile integration verification.
- Leaving a team (Sprint 2A membership), and the visibility policy for inactive owners' offers.
- No automatic expiry job exists. Expiry is applied by the owner or manager, and visibility already hides offers past `valid_until`.
- Races between revoking and recording a price, and the view's performance, are untested.

**Known limits**
- Demo offers owned by the disabled demo student can no longer be edited by anyone.
- The new CI workflow has only been run locally, step by step; it hasn't run on GitHub yet.

**Later decisions**
- Per-pin verification records, before any pin value can become `VERIFIED`.
- Whether to keep the unbounded legacy functions `read_catalog` and `compare_part_offers`. The API no longer calls them.
- Whether the global throttle (60 requests per minute) suits clients that page through results.
