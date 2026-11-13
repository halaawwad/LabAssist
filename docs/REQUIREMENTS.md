# LabAssist Requirements

## Users
- Student
- Supervisor
- Workshop Manager
- Department Head

## Project Rules
- Each project has a unique project code.
- Department Head forms each group using its project identity and 2 to 3 active students.
- A project may have multiple supervisors.
- A supervisor may supervise up to four projects per term; duplicate links are rejected.
- Multiple linked supervisors have equal review rights; no separate Primary Supervisor privilege is defined.
- A student belongs to at most one current project per term; workshop term capacity applies (demo: 25).
- Draft projects may have no title; students complete project details after group formation.
- Membership changes preserve historical submissions, reviews, attendance and handovers.

## Department Head

- Provision Student, Supervisor and Workshop Manager accounts, validate duplicates, and manage groups/supervisor links.
- New accounts await owner activation and password selection; real activation delivery and password hashing require the backend.
- Disable referenced accounts; delete only eligible unused accounts. Do not activate accounts on behalf of owners.

## Student
Students can:
- Manage projects.
- Manage tasks and milestones.
- Manage BOM and components.
- Use the 3D Virtual Hardware Lab.
- Create pin-to-pin wiring.
- View wiring validation.
- Report issues and blockers.
- Submit weekly reports.
- View supervisor feedback.
- Request parts from the workshop.
- Purchase workshop parts when available.
- Use AI project analysis and troubleshooting.

## Supervisor
Supervisors can:
- View supervised projects.
- Access submitted versions only for linked groups; private drafts remain private.
- Monitor progress.
- Review tasks and milestones.
- Review 3D circuits.
- View wiring validation.
- Add feedback.
- Review weekly and final reports.
- Monitor issues and risks.
- Manage meetings.
- View attendance and part requests.
- Bind feedback to the exact submitted version. Do not provision accounts/groups or manage/review student BOM, component planning or budgets.

## Workshop Manager
Workshop Managers can:
- Manage inventory.
- Sell workshop components when available.
- Manage part requests.
- Record attendance.
- Manage workshop tables.
- Manage workshop spaces.
- Add student/group observations.
- Send alerts to supervisors.
- Publish announcements.

## 3D Lab Scope
The 3D Lab supports:
- 3D component placement.
- Move and rotate.
- Snap/Grid.
- Visible pins.
- Pin-to-pin wiring.
- Wire editing.
- Circuit versions.
- Wiring validation.
- Safety checks.

## Out of Scope
- Circuit simulation.
- Sensor simulation.
- Arduino code execution.

Local demo persistence does not synchronize web origins or mobile. UI guards are not authorization, and notices/feedback are saved locally without delivery guarantees. See [permissions](PERMISSIONS.md) and [backend preparation](BACKEND-PREPARATION.md) for integration boundaries and manual checks.
