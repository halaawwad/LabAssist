# Reports — Stage 4

PostgreSQL 17 / PL/pgSQL. Requires database stages 1–3 and `semester-demo/seed.sql`.

| Table | Data |
|---|---|
| reporting_periods | Weekly reporting windows and late deadlines |
| presentation_templates | 20 versioned layouts; colors stored separately |
| report_submission_windows | Project supervisor gates for final reports and presentations |
| report_documents | Shared weekly, final and presentation workspaces |
| report_versions | Immutable content and layout snapshots |
| report_version_files | Snapshot attachments and imported/exported file references |
| report_submissions | Submitted versions, retry keys and viewing state |
| report_feedback | Supervisor reviews and section/page/slide comments |
| report_check_runs | Structure, ABET and future AI check results |

Apply `sql/11-reports-schema.sql`, then `sql/12-demo-seed.sql` for demo data only.
Current semester: 23 first-week reports. Previous semester: 15 teams with weekly history, approved finals and presentations. No generated uploads or passwords.

Local Docker: run `./Initialize-Local.ps1`, then `docker compose up -d --wait`.
Tests: `docker compose exec -T db psql -U labassist_owner -d labassist_reports -v ON_ERROR_STOP=1 -f /reports-stage4/tests/acceptance.sql`.
Run `tests/seed-replay.sql` on a disposable database; it intentionally retains a changed draft.

The backend must derive actor IDs from authenticated sessions and scope reads by membership. These SQL operations do not connect the UI, send notifications, render exports or call AI services.
