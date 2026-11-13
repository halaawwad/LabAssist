# LabAssist permissions

The PostgreSQL scripts, particularly `backend/database/department-stage12`, are the relationship reference. These are UI/demo restrictions, not secure authorization. The backend must authenticate users and enforce every permission independently.

| Role | Permitted responsibility | Excluded responsibility |
| --- | --- | --- |
| Department Head | Provision Student, Supervisor and Workshop Manager accounts; manage group membership and supervisor links under SQL constraints | Choosing owners' passwords, activating their accounts, academic review, student BOM/budget management |
| Student | Work on their existing project; fill project details; create teammate tasks; update their own assigned tasks; manage BOM, planning and budgets; use 3D Lab; request parts/meetings; save private drafts and submit reports | Provisioning accounts/groups, editing others' assigned tasks, official attendance, academic approval, inventory management |
| Supervisor | View linked projects and permitted submitted versions; academic review and feedback; existing meetings, issues, attendance and circuit review | Account/group creation, private student drafts, unrelated projects, BOM/component planning/project budgets, workshop operations |
| Workshop Manager | Existing inventory/part-request operations; dated attendance; table allocation/verification/release; handovers/returns; local observations and notices | Group formation, academic approvals, academic progress editing, student budget/BOM management |

## Accounts and groups

- Provisioned accounts remain `PENDING_ACTIVATION`. Owners activate and choose their passwords through future backend functionality. The demo neither sends activation mail nor hashes/stores passwords.
- Role, university number and email are immutable account identity. Staff employee numbers remain editable where the SQL permits. Reject duplicate numbers/emails and a second non-disabled workshop-manager account.
- Only active Student/Supervisor accounts may be linked. Groups contain 2–3 students and at least one supervisor, without duplicate links. A student belongs to one current group per term; a supervisor has at most four projects per term. The local demo term capacity is 25 groups.
- Group identity **is project identity**. A draft can have no title; students fill in project details later. Multiple supervisors have the same linked-project rights; no invented primary-supervisor or team-role privileges.
- Preserve prior membership links with an end timestamp. Disabling access preserves references. Delete only eligible unused accounts; current/historical group and message references prevent deletion. This demo cannot discover references held on another web origin/device.

## Submission and workshop history

- Reports belong to projects/groups. Private editable drafts are separate from submitted snapshots. Reviews bind to the submitted version, not later editable content. Withdrawal/resubmission preserves prior versions and feedback.
- Only currently linked supervisors may enter the local review flow. Historical records remain stored when links change; preservation does not grant former members continued access.
- Attendance changes retain dated history and follow the current-day/previous-seven-day edit window in `Asia/Hebron`.
- Table release retains dated inactive history and frees capacity (confirmed local policy). Rectangular tables hold one group; round tables hold two; a group occupies at most one table. Students retain the SQL-supported own-project allocation flow; workshop managers verify/manage it.
- Handovers and return inspections retain previous records. Invalid quantities, empty issues, conflicting allocation and outstanding unreturned handovers are rejected.

See [backend preparation](BACKEND-PREPARATION.md) for identity mappings, storage boundaries, limitations and manual checks.
