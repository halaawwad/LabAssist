# Compose database updates

Run docker compose up -d --build. PostgreSQL starts with a persistent volume and health check. The one-shot db-update service applies pending Prisma migrations, then transactional shared-data updates. Inspect docker compose logs db-update to confirm completion.

Automatic shop ingestion requires no Workshop Manager account, reviewer key or approval. The 20261127100000 successor imports the source-backed catalog and price snapshot and records automated provenance. The old published update stays immutable; an unexecuted reviewer-gated version is superseded, while an already-applied version retains its original checksum and audit data.

Updates preserve account passwords, IDs, source evidence, existing newer prices and conflicting records. They do not reset volumes or send email. Unknown stock remains unknown. Conflicts roll back the transaction instead of overwriting identity.

public.labassist_shared_updates stores version, checksum and application time. Each version and same-named evidence JSON are checksummed. Add a new version for later changes.

Use disposable PostgreSQL for tests. The migration and ingestion regressions cover no-manager startup, exact matching, ambiguous identities, price/stock history, idempotency, source ownership and transactional rollback.
