# Supervisor database ? Stage 1

PostgreSQL 17 ? SQL ? Docker Compose. Additive extension of student-stage1; shared schema: `labassist_student`.

| Table / view | Data |
|---|---|
| supervisor_profiles | Specialization, owned photo, optional office hours |
| supervisor_settings | AR/EN and notification preferences |
| supervisor_notification_reads | Private read timestamps |
| supervisor_project_students (view) | Project-scoped student relationships |

Uses existing accounts, projects, project_students, project_supervisors, files and audit_events. Seven synthetic supervisor profiles/settings; 23 teams and 54 students remain unchanged. No passwords or activation tokens seeded. Supervisor references remain REFERENCE_ONLY; real authentication is a later backend feature.

Run the four SQL files in order: student-stage1/sql/01-schema.sql, student-stage1/sql/02-demo-seed.sql, then this directory's sql/03-supervisor-schema.sql and sql/04-demo-seed.sql. Existing student databases need only 03 and 04; 03 runs once.

For a separate disposable Docker database:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Initialize-Local.ps1
docker compose up -d --wait
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U labassist_owner -d labassist_supervisor -f /supervisor-tests/acceptance.sql
```

Local port: 5434. Password file: secrets/postgres_password.txt (ignored).

Backend must scope all reads/writes to the authenticated supervisor. The view is not RLS or an API permission guard. Reports, meetings, messaging and review workflows stay in their later feature stages; this is the same foundation scope as student-stage1.
