# Workshop database ? Stage 1

PostgreSQL 17 ? SQL ? Docker Compose. Shared schema: `labassist_student`.

| Table / view | Data |
|---|---|
| workshop_manager_profiles | Manager account and owned photo |
| workshop_manager_settings | AR/EN preference |
| workshop_notification_reads | Private read timestamps |
| workshop_availability | Daily on-duty, full-day absence or temporary absence window |
| workshop_project_students (view) | Current student/project roster |

Reuses accounts, files, projects, project_students and project_supervisors. One current manager role; seven supervisor references and 54 students across 23 teams preserved. Workshop capacity stays 25. No passwords, activation tokens, inventory, attendance history or fixed absence threshold seeded.

Install student-stage1 SQL 01/02, supervisor-stage1 SQL 03/04, then workshop SQL 05/06. Existing installations only need missing stages. Schema migrations run once; demo seeds can replay without resetting edits. The combined SQL is for a fresh installation only.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Initialize-Local.ps1
docker compose up -d --wait
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U labassist_owner -d labassist_workshop -f /workshop-tests/acceptance.sql
```

Local port 5435. Credentials generated in ignored secrets/postgres_password.txt. Reference manager is not a usable login. Backend must authorize access to roster and enforce update windows; this view is not RLS. Attendance, handover, notices, message delivery and absence alerts remain later backend feature stages. Current frontend retains mock data.
