# Component catalog

PostgreSQL 17 / PL/pgSQL. Apply stages in numeric order.

Tables: catalog_categories, catalog_models, catalog_pins, catalog_parts, catalog_documents, catalog_guides.

Schema: `sql/17-catalog-schema.sql`. Demonstration fixtures: `sql/18-demo-seed.sql`. Acceptance: `tests/acceptance.sql`.

Shared Docker setup, seed-preservation checks and independent-connection tests: [remaining-data](../remaining-data). Backend/API authentication, Mobile integration and external delivery are separate implementation work.
