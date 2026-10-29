# Project work verification

28 project-work SQL checks passed locally in PGlite; existing student/supervisor/workshop checks (37/16/21) also passed. Seed replay passed.

Real PostgreSQL 17 runs in .github/workflows/project-work-checks.yml. This is ordinary SQL acceptance, not multi-connection concurrency or API authorization coverage. No frontend source changed. Independent-connection races and backend integration remain pending.
