# Versioned shared development data

Place reviewed updates here as JavaScript files named `YYYYMMDDHHMMSS_description.cjs`.
Each exports `async function apply(client)` and must use the supplied PostgreSQL transaction.
Resolve existing records by stable identifiers, preserve provenance, and fail on conflicts.
Never put credentials or private account data in an update. Applied files are immutable;
add a new version for subsequent changes.

An optional same-named `.json` file is included in the version checksum. A deferred update may
raise `SHARED_DATA_PENDING`; it is rolled back and later updates wait for the next run. The
Sprint 6 update requires the original active reviewer and its private verification key; see
`docs/DATABASE-SHARED-UPDATES.md`.
