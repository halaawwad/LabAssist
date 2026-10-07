# LabAssist Database

## Technology
- PostgreSQL
- Prisma ORM
- Docker

## Initial Core Tables
- users
- projects
- project_members
- project_supervisors
- milestones
- tasks
- weekly_reports
- supervisor_feedback
- attendance

## Main Relationships

Project <-> Student
Many-to-Many through project_members.

Project <-> Supervisor
Many-to-Many through project_supervisors.

A project normally has 2 to 3 students.

A project may have multiple supervisors.

A supervisor may supervise multiple projects.

Each project has a unique project_code.

## Future Database Areas
Later migrations will add:
- Components
- BOM
- Inventory
- Part Requests
- Issues
- Meetings
- Workshop Tables
- Workshop Spaces
- Virtual Lab Circuits
- Circuit Versions
- Wiring Connections
- AI Analysis
