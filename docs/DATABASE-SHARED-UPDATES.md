# Local Compose database updates

`docker compose up -d --build` starts the loopback-only PostgreSQL service and a one-shot
`db-update` service. Once PostgreSQL is healthy, the updater verifies the existing baseline,
applies pending Prisma migrations, then runs the versioned updates in
`backend/api/shared-data`. It does not reset volumes, run collectors, or create accounts.
Check `docker compose ps -a` and `docker compose logs db-update`: detached Compose startup
does not itself report whether the one-shot service later succeeded.

The Sprint 6 update contains a historical, manager-reviewed snapshot of 50 published shop
prices. It verifies the original manager's normalized email and employee number using a
keyed HMAC, and requires exactly one matching active manager account in the target database.
The update never creates that account or approves as a different person. On a fresh database,
migrations complete and the updater reports the data update as **pending** when the reviewer
or verification key is absent; no price data or applied-version marker is written. Startup
succeeds, and later updates wait behind the pending one. Provision the same manager through
the normal account workflow, set `SHARED_DATA_REVIEWER_KEY` privately, then rerun
`docker compose up -d --build` and inspect the updater logs. Obtain the key and the matching
identity through an appropriate private channel. The key is stored locally outside the
repository and must not be committed; account credentials are never included in the snapshot.
Retain a secure copy of the verification key: it is required to verify the original reviewer
on another database. The local key file is `D:/LabAssist/local-secrets/sprint6-reviewer-verification.key`.

The snapshot carries stable shop/product IDs, catalog model and variant identities, prices,
source URLs, hashes, and original observation and approval dates. It reuses the catalog,
seller, source, mapping, offer, observation, check and outcome tables. Existing compatible
records are reused; conflicting identities, pending/rejected mappings, or conflicting feeds
stop the transaction rather than being overwritten. Existing approved offers are left
unchanged, including any newer prices. The original stock type was not retained, so imported
quantity and stock-check time remain null and availability is unknown.

The database's audit triggers record the time of the new insertion in each target database.
Original price-observation recording time, variant creation time, offer update time and
initial offer-history time are retained as provenance in the corresponding existing
`shop_price_outcomes.details`; source observation and manager review timestamps remain in
their normal columns. No triggers, constraints, or permissions are disabled.

`public.labassist_shared_updates` stores only update version, checksum and application time;
it is a ledger, not a second copy of application data. Each update and its same-named JSON
evidence file are checksummed and applied in a transaction under a database advisory lock.
The updater refuses to silently rerun changed versions. Add a new version for later data,
use stable identifiers and conflict checks, and retain each historical update and evidence
file unchanged. See `backend/api/shared-data/README.md` for the update-file contract.

Use a separate disposable Compose project and database for tests; never point tests at a
development volume. The focused `test/shared-data-updates.spec.ts` requires a database name
containing `_test` and verifies once-only execution, checksums and rollback on failure.

Disposable Compose verification covered fresh initialization with the key missing and with
the manager missing (both remain pending without blocking startup), conflicting source review
rollback, reuse of matching sources, preservation of an existing project and accounts,
repeated execution, and authenticated API retrieval of 50 offers. A read-only source comparison
matched all 50 transferred prices, source evidence and original timestamps at PostgreSQL
precision. The actual development database was not changed.
