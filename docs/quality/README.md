# Quality checks

## Automated checks

| Workflow | Checks |
|---|---|
| `Student tests and database` | Student Vitest suite, frontend build, PostgreSQL 17 schema/seed/replay/acceptance tests, Compose configuration |
| `Student static analysis` | TypeScript and ESLint, reported as separate checks |

Workflows run on pushes and pull requests targeting `main` or `noor`, and support manual dispatch. Artifacts are retained for 14 days.

The student workspace is copied into a standalone runner directory before installing its committed Bun lockfile. This prevents the root workspace manifest from changing dependency resolution.

## Local commands

```sh
cd frontend/student
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run lint
bun run build
```

For PostgreSQL acceptance tests, see `backend/database/student-stage1/README.md`.

## Tracking

- Use Bug report for reproducible failures.
- Use Task / feature for implementation work with acceptance criteria.
- Use Test coverage for missing verification scenarios.
- Link each PR to its issue and include validation results.

CI failure does not silently disable a rule. Existing lint failures remain visible until resolved. Required branch protection is a repository setting and is not enabled by these files alone.

SonarQube, coverage reporting, backend/mobile E2E and load/security scans are not configured in these baseline workflows. They remain separate implementation tasks.
