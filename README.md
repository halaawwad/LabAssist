# LabAssist

LabAssist is an intelligent platform for managing university hardware graduation projects from idea to completion.

## Main Users
- Student
- Supervisor
- Workshop Manager
- Department Head

## Main Features
- Project management
- Tasks and milestones
- BOM and component management
- Workshop inventory and part requests
- Attendance and workshop management
- Weekly reports and supervisor feedback
- AI-assisted project analysis and troubleshooting
- 3D Virtual Hardware Lab
- Wiring validation and safety checks

## Architecture
- Monorepo
- Client-Server Architecture
- Modular Monolith Backend
- Feature-Based Frontend and Backend
- REST API
- PostgreSQL
- Prisma ORM
- Docker

## Applications
- Web Application
- Mobile Application

The web frontends are separate applications in `frontend/student`,
`frontend/supervisor`, `frontend/workshop`, and `frontend/department`.

Start Department Head with `npm run dev:department` and open
`http://localhost:5176/`. Build it with `npm run build:department`.
See [Department Head setup and preview-data transfer](frontend/department/README.md)
for portal URL configuration, deployment, and migration of existing local demo data.

All four web roles share Noor's existing Student login at
**http://localhost:8080/login** (`npm run dev:student`). Start the other apps
with `npm run dev:supervisor`, `npm run dev:workshop`, and
`npm run dev:department`. See [shared web demo login](docs/SHARED-WEB-LOGIN.md)
for destinations, credentials, required URL settings, local session handoff,
logout behavior and demo authentication limitations.
