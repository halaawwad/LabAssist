# LabAssist — Student Database

PostgreSQL 17 · SQL · Docker Compose  
Schema: `labassist_student`

## Tables

| Table | Data |
|---|---|
| `accounts` | Student accounts and supervisor references |
| `student_profiles` | Student profile details |
| `student_settings` | Language and preferences |
| `files` | File metadata |
| `academic_terms` | Academic terms |
| `student_enrollments` | Student term enrollment |
| `term_workshop_capacity` | Workshop team capacity |
| `projects` | Project details |
| `project_students` | Project members |
| `project_supervisors` | Project supervisors |
| `activation_invitations` | Account activation tokens (hashed) |
| `personal_notes` | Private notes |
| `personal_tasks` | Personal tasks |
| `personal_reminders` | Personal reminders |
| `audit_events` | Audit history |

## Seed

23 teams · 54 students · 7 supervisor references  
Workshop capacity: 25 teams  
Student accounts: pending activation; no preset passwords.

## Files

| Path | Content |
|---|---|
| `sql/01-schema.sql` | Tables, constraints and functions |
| `sql/02-demo-seed.sql` | Sample data |
| `tests/acceptance.sql` | Database checks |
| `compose.yaml` | PostgreSQL container |
| `Initialize-Local.ps1` | Local configuration |
| `.env.example` | Port configuration |
| `LabAssist_Student_Stage1.sql` | Combined schema and seed for manual import |
| `validation.json` | Validation results |

## Run

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Initialize-Local.ps1
docker compose up -d --wait
```

Connection: `localhost:5433` · Database: `labassist_student` · User: `labassist_owner`  
Local database password: `secrets/postgres_password.txt` (not committed).

Docker initializes the files in `sql/` on a new volume. Use the combined SQL only for a separate manual installation.

## Tests

```powershell
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U labassist_owner -d labassist_student -f /labassist-tests/acceptance.sql
```
