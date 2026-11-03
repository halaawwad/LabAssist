# AI storage

PostgreSQL 17 / PL/pgSQL. Apply stages in numeric order.

Tables: ai_conversations, ai_jobs, ai_messages, ai_project_designs, ai_part_suggestions, ai_sources, learning_ai_snapshots.

Schema: `sql/25-ai-schema.sql`. Demonstration fixtures: `sql/26-demo-seed.sql`. Acceptance: `tests/acceptance.sql`.

Shared Docker setup, seed-preservation checks and independent-connection tests: [remaining-data](../remaining-data). Backend/API authentication, Mobile integration and external delivery are separate implementation work.
