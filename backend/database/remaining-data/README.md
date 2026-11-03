# Database stages 6–11

PostgreSQL 17 / PL/pgSQL, with Node.js tests using independent psql connections.

| Stage | Module |
|---|---|
| 6 | [Workshop operations](../workshop-operations-stage6) |
| 7 | [Component catalog](../catalog-stage7) |
| 8 | [Marketplace](../marketplace-stage8) |
| 9 | [Circuit lab](../circuits-stage9) |
| 10 | [Learning Hub](../learning-stage10) |
| 11 | [AI storage](../ai-stage11) |

Local setup: `./Initialize-Local.ps1`, then `docker compose up -d --wait`. Default port: 5440. Use a separate empty database; this setup includes stages 1–11 and demonstration fixtures.

Acceptance: `docker compose exec -T db psql -U labassist_owner -d labassist_data -v ON_ERROR_STOP=1 -f /database/remaining-data/tests/acceptance.sql`.

Seed replay and concurrency tests must run on disposable databases. They intentionally retain test changes. Concurrency uses standard PG* variables or `--container NAME --database DATABASE` for a disposable container.

Absence thresholds default to unset. Workshop tools are team handovers, not component inventory. Catalog references come from the existing frontend; render units are not millimetres. Market prices and sellers are fictional fixtures, excluded from normal comparison. AI fixtures contain student context and queued work; no generated answers, images or dimensions. Pinned AI conversations are immutable personal snapshots.

Actor IDs belong to the authenticated service boundary, never trusted client input. AI worker claim/completion functions must be granted only to service workers. SQL tests do not establish live API permissions, Facebook access, external delivery, model accuracy or physical simulation.
