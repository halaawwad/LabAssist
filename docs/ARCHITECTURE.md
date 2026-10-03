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
The same application serves all roles using Role-Based Access Control.

Dashboards, navigation, and actions change according to the user's role and permissions.

## Database
PostgreSQL with Prisma ORM.

PostgreSQL will run locally using Docker during development.

## 3D Lab
The 3D workspace focuses on hardware placement, wiring, validation, and safety checks.

It does not simulate circuit behavior.
