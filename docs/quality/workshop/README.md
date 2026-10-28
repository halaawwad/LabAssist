# Workshop verification

| Check | Local result |
|---|---|
| Oxlint | Passed; no findings |
| TypeScript | Passed |
| Production build | Passed |
| Vitest | 15 tests in 3 files passed |
| Workshop SQL acceptance | 21 checks passed in PGlite |
| Student / supervisor SQL regression | 37 / 16 checks passed in PGlite |
| Seed replay | Passed |
| Dependency installation audit | 0 reported vulnerabilities |

GitHub Actions: `.github/workflows/workshop-checks.yml`. Real PostgreSQL 17 is checked separately in CI; local PGlite is not a concurrency test.

Tests cover storage isolation/failure, AR/EN key parity, floor bounds and capacity, table status, team locations and search by table/student/project/supervisor.

Database foundation: one current manager role, profile/settings, private read state, daily availability and a shared project/student roster view. No passwords, fixed absence threshold, attendance history or inventory seeded.

UI stays local/mock. Backend authorization, attendance calendars and edit windows, all-project-supervisor notification routing, handover and delivery are later feature work. Current workshop mock fixtures are independent from the 23-team shared SQL seed. No student/supervisor UI source changed.
