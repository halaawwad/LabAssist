# Circuit lab

PostgreSQL 17 / PL/pgSQL. Apply stages in numeric order.

Tables: circuit_documents, circuit_versions, circuit_version_parts/wires, circuit_publications, circuit_copy_requests, circuit_forks.

Schema: `sql/21-circuits-schema.sql`. Demonstration fixtures: `sql/22-demo-seed.sql`. Acceptance: `tests/acceptance.sql`.

Shared Docker setup, seed-preservation checks and independent-connection tests: [remaining-data](../remaining-data). Backend/API authentication, Mobile integration and external delivery are separate implementation work.
