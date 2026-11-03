# Workshop operations

PostgreSQL 17 / PL/pgSQL. Apply stages in numeric order.

Tables: workshop_days, workshop_absence_policies, workshop_attendance, workshop_tables, workshop_table_assignments/history, workshop_handovers/items, workshop_return_updates, workshop_records/recipients.

Schema: `sql/15-workshop-operations.sql`. Demonstration fixtures: `sql/16-demo-seed.sql`. Acceptance: `tests/acceptance.sql`.

Shared Docker setup, seed-preservation checks and independent-connection tests: [remaining-data](../remaining-data). Backend/API authentication, Mobile integration and external delivery are separate implementation work.
