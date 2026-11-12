# LabAssist Architecture

## Repository
LabAssist uses a Monorepo.

- frontend/
- backend/
- shared/
- docs/

## Architecture

Web / Mobile
    |
    v
REST API
    |
    v
Backend
    |
    v
Prisma ORM
    |
    v
PostgreSQL

## Backend
The backend follows a Modular Monolith and Feature-Based Architecture.

Main modules will include:
- auth
- users
- projects
- teams
- supervisors
- tasks
- milestones
- reports
- attendance
- components
- bom
- inventory
- part-requests
- workshop
- meetings
- notifications
- issues
- ai
- virtual-lab

## Frontend
The web interfaces live in separate applications: `frontend/student`,
`frontend/supervisor`, `frontend/workshop`, and `frontend/department`.
Department Head opens at its application's root URL and preserves its local
preview state independently of the Student application. See
[Department Head setup](../frontend/department/README.md) for development ports,
cross-application navigation configuration, and transfer of origin-specific
preview data. This separation does not add authentication or API integration.

All four web applications use the Student `/login` page as their shared demo
entry. The browser-only session coordinator in `shared/web/demoSession.ts`
uses origin-checked messages to initialize each destination's local demo flag;
client-side guards and public demo credentials are not secure authorization.
See [shared web login](SHARED-WEB-LOGIN.md) for configuration and limitations.

## Database
PostgreSQL with Prisma ORM.

PostgreSQL will run locally using Docker during development.

## 3D Lab
The 3D workspace focuses on hardware placement, wiring, validation, and safety checks.

It does not simulate circuit behavior.
