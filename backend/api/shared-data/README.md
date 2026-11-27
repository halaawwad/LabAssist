# Shared database updates

Versioned CJS updates are applied transactionally with recorded checksums. Published update files remain immutable. Replaying an applied version validates its checksum and does not duplicate records.

20261127100000_automatic_shop_prices.cjs supersedes the unexecuted reviewer-gated Sprint 6 import. It runs without a manager account or private reviewer key. Automated sources and mappings retain source evidence and have no human reviewer. Existing human audit records are preserved.

Docker Compose runs migrations before shared-data updates. These updates do not send email or reset accounts. Conflicting catalog identities fail rather than overwrite records.
