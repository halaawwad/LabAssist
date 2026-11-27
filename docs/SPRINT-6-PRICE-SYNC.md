# Shop price synchronization

Shop collection, exact catalog matching and price storage run in the backend service. They do not require a Workshop Manager account, approval, reviewer key or actor ID.

Flow: allowlisted shop collector → normalized evidence → exact identity matching → transactional source, observation and stock persistence → read API → web and mobile.

The internal transaction records automated provenance with no human reviewer. Existing human audit records are retained. The legacy database value APPROVED means usable evidence; verification_method and matching_method distinguish automated validation from historical reviews.

Only a unique known tuple (shop, external ID, SKU, product name and source URL) is matched using source-backed variant fields. Unknown or changed identities remain MATCH_UNRESOLVED; prices are not attached to guessed components. Currency, package quantities, exact variant identity, source URLs, dates, idempotency, stock evidence and history remain enforced.

There are no public source-review, source-revocation, feed-approval or mapping-approval endpoints. Student offer ownership and ordinary account permissions are unchanged. Optional administrative catalog editing is separate from the automatic ingestion path.

Run from backend/api: npm run prices:sync -- --shop=technolab (or --shop=pic-industrial). Database configuration is required; no manager credentials are used.

Apply schema changes with Prisma migrations. The new automatic shared-data successor replaces the pending reviewer-gated update without changing published update files or their checksums. Existing applied updates and source evidence are not overwritten.
