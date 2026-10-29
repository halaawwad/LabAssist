# Project work - Stage 2

PostgreSQL 17. Shared schema: labassist_student. Requires the student, supervisor and workshop Stage 1 modules.

| Table / view | Data |
|---|---|
| project_tasks | Creator, assignee, title, description, due date, TODO/IN_PROGRESS/DONE, help request, revision and completion time |
| project_issues | Creator, title, description, priority, OPEN/MONITORING/RESOLVED, resolution and resolver |
| project_work_events | Append-only before/after activity history |
| project_member_work_summary | Derived task counts, overdue counts and individual progress |
| project_team_work_summary | Mean member progress, open tasks and issues |

Any current teammate can create a task for any current teammate. New tasks start TODO. Only the assignee can update their own task. Reassignment and deletion are not implemented. Any current teammate can add/update/resolve issues. Supervisors read via backend-authorized project scope; they do not mutate student work here.

Status functions lock the row and reject stale expected revisions. Actor arguments come from the trusted authenticated backend, not client-provided identities. These SQL checks are not API authentication or RLS. Backend must use expected revisions for all edit endpoints and define other lifecycle permissions. No new runtime database role is provisioned.

## Seed

54 planned tasks (one per existing demo student), three synthetic open issues, no fake completed work. Existing 23 projects and credentials unchanged. Seed replay preserves edits and creates no duplicate history.

## Install

Run Stage 1 SQL files 01-06, then sql/07-project-work-schema.sql and sql/08-demo-seed.sql. Existing installations only need missing stages. Schema 07 runs once. Combined SQL is a fresh-install file.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Initialize-Local.ps1
docker compose up -d --wait
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U labassist_owner -d labassist_project_work -f /project-work-tests/acceptance.sql
```

Local disposable port: 5436. Random database password remains in ignored secrets/.

## Tests

Acceptance covers membership, assignee-only updates, status metadata, computed summaries, immutable history, rejected stale revisions, rollback and seed replay. These are ordinary single-connection SQL checks; independent-connection race/API tests remain pending. UI remains local/mock. BOM/expenses and report integration are not included.
