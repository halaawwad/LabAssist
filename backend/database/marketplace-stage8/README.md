# Marketplace

PostgreSQL 17 / PL/pgSQL. Apply stages in numeric order.

Tables: market_sellers, resale_sources, market_offers, market_offer_history, market_bookmarks.

Schema: `sql/19-marketplace-schema.sql`. Demonstration fixtures: `sql/20-demo-seed.sql`. Acceptance: `tests/acceptance.sql`.

Shared Docker setup, seed-preservation checks and independent-connection tests: [remaining-data](../remaining-data). Backend/API authentication, Mobile integration and external delivery are separate implementation work.
