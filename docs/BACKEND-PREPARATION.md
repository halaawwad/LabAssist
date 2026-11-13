# Web/mobile backend preparation

This change prepares existing local interfaces. It adds no API, authentication service, cross-origin bridge, synchronization, database changes or external delivery. Follow-up tests, production builds and browser/Expo-web runtime checks are recorded in [verification results](BACKEND-PREPARATION-VERIFICATION.md). Physical-device behavior remains unverified.

## Shared boundary and identities

`shared/web/domain.ts` is dependency-free and usable by all four web apps and Expo. The existing isolated CI preparation copies all of `shared/web`, preserving these imports. This is an integration boundary, not a replacement state framework.

| Source/local representation | SQL-facing identity or semantics |
| --- | --- |
| student / supervisor / workshop / department | STUDENT / SUPERVISOR / WORKSHOP_MANAGER / DEPARTMENT_HEAD |
| Group | Existing project ID; optional draft title, term, student IDs, deduplicated supervisor IDs |
| Primary demo project | TEAM01 / CropBot, `10000000-0000-4000-8000-000000002001` |
| Primary demo term | `10000000-0000-4000-8000-000000000100`, demo capacity 25 |
| Students | SQL IDs ending `1001`, `1002`, `1003`; numbers 20260001–20260003; university emails |
| Supervisor | SUP01 SQL ID `10000000-0000-4000-8000-000000000001`; staff number 1024 |
| Workshop manager | `30000000-0000-4000-8000-000000000001`; staff number 10001 |
| Explicit legacy project aliases | Student primary; supervisor cropbot/CPE-590; workshop G01; mobile p1. Only these aliases map to TEAM01. Other historic fixtures remain local/unmapped. |
| Mobile s1/s2/s3/d1/w1 | Keep local references; additive canonicalId metadata maps known fixture identities to SQL IDs. No display-name matching. |
| Seed review-circuit tasks | Three stage-2 md5-derived SQL UUIDs in shared demoTasks; TODO and canonical assignees |
| Pending / In Progress / Completed tasks | TODO / IN_PROGRESS / DONE |
| Report version lifecycle | SUBMITTED / WITHDRAWN / SUPERSEDED; review outcome is separate |
| reviewed / revision or changes / approved | REVIEWED / NEEDS_CHANGES / APPROVED |
| present / absent or absence | PRESENT / ABSENT, keyed by student and date |
| scheduled / completed / cancelled meetings | SCHEDULED / COMPLETED / CANCELLED; responses PENDING / ACCEPTED / DECLINED |
| Part-request Pending / Ready for Pickup / Rejected | PENDING / READY / REJECTED |
| Other local request labels | Draft/Approved/Completed/Cancelled map to null until a backend contract exists; never silently coerce them |
| Legacy table R01 etc. | Explicit SQL R1 etc.; C1–C3 unchanged |
| Handover | Project reference, issued/returned/damaged/missing counts; name-based kit previews require inventory-item mapping |

Shared types also cover account status, terms, tasks, submissions, requests, meetings, attendance, assignments and handovers. They do not assert every historic mock row is a SQL seed row. Active preview fixtures are not evidence of SQL account activation; SQL reference/pending accounts still require owner activation.

## Implemented operations

- Department web/mobile share active-account/group validation and membership-history preservation. Provisioned accounts await owner activation. Identity edits, duplicates, group size, student uniqueness, supervisor load and capacity are checked. Referenced accounts are disabled instead of deleted. Failed writes retain forms.
- Student project details/tasks persist locally; only the assignee updates existing tasks. Weekly reports keep submitted snapshots separately from editable drafts; withdrawal/resubmission preserves previous versions. Final-report draft saving persists editor content.
- Supervisor team/account registration is removed. Final and weekly report views scope explicit linked projects; private final drafts are excluded. Feedback binds to version/submission identity. Supervisor-generated student resubmission is disabled. Student BOM milestones are excluded from supervisor progress lists.
- Workshop allocation persists and drives map/details/summary/attendance/handover views. Release/move retains timestamps and frees capacity. Attendance changes retain dates/history. Handover creation rejects outstanding returns; inspections preserve earlier records.
- Writes precede visible success. Web storage failures display error/reload; native serialized writes return success/failure and suppress identical pending actions. Native private preview stores guard concurrent saves. Forms survive failure. Notices/feedback remain local without delivery claims.

## Storage compatibility

- Existing keys/prefixes remain, including `labassist.department.preview`, Student `labassist.student.weekly.v1`, Supervisor `reports.v1` / `final-reports.v2`, and Workshop `attendance`, `handover`, notices and other keys (with existing role prefixes).
- New Student keys: `labassist.student.project-details.v1`, `labassist.student.team-work.v1`, `labassist.student.final-draft.v1`. These persist previously volatile editors rather than replace saved records.
- New Workshop keys: `table-allocations.v1`, `attendance-ledger.v1` under the existing prefix. Original undated attendance remains readable and unchanged; it is a legacy preview baseline, not attributed to invented historical dates. New edits carry dates/history.
- Mobile retains `labassist.mobile.workspace.v1` and existing role-preview keys, including Department accounts/groups/messages. Additive domainVersion 2/canonical metadata preserves existing IDs, content and unknown fields. Department/private preview stores do not become a synchronization framework.
- Legacy non-draft mobile reports without versions gain a named `legacy-submission-<report id>` snapshot of available content; unknown submission dates stay unknown. This cannot recover unavailable original server content.
- Unreadable JSON/unsupported workspace data blocks overwriting that store and offers retry. Seeds do not replace saved records. Department transfer/export/import and its key remain unchanged.
- Web origins/devices are isolated. Membership changes in one demo do not revoke another app's session, deliver reports or synchronize attendance. Supplemental mock projects remain local historical examples needing explicit IDs before integration.

## Backend-dependent gaps and policy

Backend work must supply authenticated identity/current memberships, authorization, activation/password hashing, transactional group limits, immutable version IDs/open tracking, durable attachments, report delivery, inventory-item/request mapping, date rules, notifications and concurrency control. Client role selection and storage are not security.

Confirmed local table-release policy: retain dated inactive assignment history and free capacity. SQL has no release-state contract yet; backend integration must define it. No unanswered local policy question remains.

The old quality baseline references issues #12–#16. Its earlier failing-lint statements (#13/#14) predate its cleanup entry and are historical, not current permission requirements. Remote issue status was not inspected or changed.

## Manual verification checklist

The follow-up report records the core scenarios exercised; the full checklist below also includes combinations not covered by that run. Use existing app README startup commands and a disposable browser profile/device. Export existing preview data before deliberately corrupting storage.

1. **Department web/mobile:** provision all allowed roles; reject missing/duplicate/malformed identifiers and a second manager. Pending accounts cannot join groups or be activated by the Head. Check name/staff-number edits vs immutable identity. With active fixtures, edit membership and multiple supervisors; reject duplicates, wrong group sizes, inactive/assigned students, fifth supervisor project and full term. Keep project ID, allow blank draft title, retain previous links/history. Check unused deletion vs referenced disable, reload and Department transfer.
2. **Student web/mobile:** edit details/reload; create teammate tasks and update only own assignments. Save/reopen weekly/final drafts; reject incomplete submissions. Submit, edit a separate draft and confirm submitted content is unchanged. Withdraw/resubmit; retain versions. After viewing/review, check locked behavior. Display team identity rather than an individual owner.
3. **Supervisor web/mobile:** confirm no account/group registration, BOM/budget controls or private draft access. Review linked versions and retain exact-version feedback. Check multiple linked supervisors and an unlinked actor/unknown stored project; unauthorized submissions must be unavailable. Supervisor resubmission remains disabled.
4. **Workshop web/mobile:** record/edit attendance today through seven days ago; reject older/future/invalid dates, retain history. Fill rectangular/round capacity, reject overflow, move/release groups; verify occupancy across views and reload, retaining history. Issue handovers, reject empty/duplicate/outstanding issues, validate return counts/conditions and retain previous inspections. No academic approvals/progress editing.
5. **Failure/repeat/locale:** deny or quota-fill storage; retry saving/loading. No success, cleared form or duplicate record on failure/double click. Malformed saved data stays untouched. Restore storage/retry/reload. Inspect empty/loading/saving/error states, Arabic/English, RTL/LTR and narrow layouts; branding/backgrounds remain unchanged.
6. **Isolation:** another role/origin/device must not pretend to receive local changes. Verify shared login/demo handoff/logout remain intact; no new private data in URLs.

The original implementation received static checks. The subsequent [verification run](BACKEND-PREPARATION-VERIFICATION.md) exercised existing tests, all web production builds, type/lint checks and browser/Expo-web flows; no external application services or database data were used.

## Changed-file inventory

Shared files define identity/status, storage, allocation and handover helpers. Department files enforce provisioning/groups; Student files persist project/tasks/report drafts; Supervisor files scope reviews; Workshop files persist operations/history. Mobile caller changes await successful storage before closing forms or announcing success. Documentation records rules, mappings and manual checks.

<details>
<summary>Full file list</summary>

```text
docs/BACKEND-PREPARATION-VERIFICATION.md
docs/BACKEND-PREPARATION.md
docs/PERMISSIONS.md
docs/REQUIREMENTS.md
frontend/department/README.md
frontend/department/src/Department.tsx
frontend/department/src/components/DepartmentGroups.tsx
frontend/department/src/components/DepartmentMessages.tsx
frontend/student/src/components/FinalReportEditor.tsx
frontend/student/src/components/ProjectTeamTasks.tsx
frontend/student/src/components/WeeklyReportEditor.tsx
frontend/student/src/lib/projectWorkspace.tsx
frontend/student/src/lib/reports.tsx
frontend/student/src/lib/studentProfile.tsx
frontend/student/src/lib/useStoredState.ts
frontend/student/src/routes/__root.tsx
frontend/student/src/routes/index.tsx
frontend/student/src/routes/login.tsx
frontend/student/src/routes/project.tsx
frontend/student/src/routes/reports.tsx
frontend/student/src/routes/team.tsx
frontend/supervisor/src/components/supervisor/finalReports/ReviewPanel.tsx
frontend/supervisor/src/data/supervisor/finalReportsMockData.ts
frontend/supervisor/src/data/supervisor/profileMockData.ts
frontend/supervisor/src/data/supervisor/progressMockData.ts
frontend/supervisor/src/data/supervisor/weeklyReportsMockData.ts
frontend/supervisor/src/i18n/ar.ts
frontend/supervisor/src/i18n/en.ts
frontend/supervisor/src/layouts/supervisor/SupervisorLayout.tsx
frontend/supervisor/src/pages/supervisor/FinalReports.tsx
frontend/supervisor/src/pages/supervisor/WeeklyReports.tsx
frontend/supervisor/src/state/storage.ts
frontend/supervisor/src/state/supervisor/AccountProvider.tsx
frontend/supervisor/src/state/useLocalState.ts
frontend/supervisor/tests/storage.test.ts
frontend/workshop/src/components/SummaryStrip.tsx
frontend/workshop/src/components/WorkshopFloor.tsx
frontend/workshop/src/components/dialogs/AttendanceDialog.tsx
frontend/workshop/src/components/dialogs/ReturnCheckDialog.tsx
frontend/workshop/src/components/dialogs/TableDetailsDialog.tsx
frontend/workshop/src/data/handover.ts
frontend/workshop/src/data/teams.ts
frontend/workshop/src/data/workshopTables.ts
frontend/workshop/src/i18n/ar.ts
frontend/workshop/src/i18n/en.ts
frontend/workshop/src/layouts/WorkshopLayout.tsx
frontend/workshop/src/pages/AttendancePage.tsx
frontend/workshop/src/pages/HandoverPage.tsx
frontend/workshop/src/pages/WorkshopDashboard.tsx
frontend/workshop/src/pages/WorkshopMapPage.tsx
frontend/workshop/src/state/WorkshopProvider.tsx
frontend/workshop/src/state/storage.ts
frontend/workshop/src/state/useLocalState.ts
frontend/workshop/src/state/workshopContext.ts
frontend/workshop/tests/storage.test.ts
mobile/src/components/MobileKit.tsx
mobile/src/domain/webSupervisor/finalReportsMockData.ts
mobile/src/domain/webSupervisor/progressMockData.ts
mobile/src/domain/webWorkshop/handover.ts
mobile/src/domain/webWorkshop/teams.ts
mobile/src/domain/webWorkshop/workshopTables.ts
mobile/src/domain/workshopAllocation.ts
mobile/src/domain/workspace.ts
mobile/src/features/department/DepartmentScreen.tsx
mobile/src/features/shared/AccountPanels.tsx
mobile/src/features/shared/CommunicationPanels.tsx
mobile/src/features/shared/ProjectPanels.tsx
mobile/src/features/shared/ReportsPanel.tsx
mobile/src/features/student/DiscoveryPanels.tsx
mobile/src/features/student/HardwarePanels.tsx
mobile/src/features/student/StudentCatalog.tsx
mobile/src/features/student/StudentMeetingsPanel.tsx
mobile/src/features/student/StudentScreen.tsx
mobile/src/features/supervisor/screens/FinalReviewScreen.tsx
mobile/src/features/supervisor/screens/WebSupervisorPanels.tsx
mobile/src/features/workshop/WebWorkshopScreen.tsx
mobile/src/features/workshop/WorkshopScreen.tsx
mobile/src/lib/useLocalPreview.ts
mobile/src/native/MessagesScreen.tsx
mobile/src/native/NativeScreen.tsx
mobile/src/native/ProjectDetails.tsx
mobile/src/native/StudentDashboard.tsx
mobile/src/native/StudentReference.tsx
mobile/src/native/reports/FinalReportEditor.tsx
mobile/src/native/reports/PresentationEditor.tsx
mobile/src/native/reports/WeeklyReportEditor.tsx
mobile/src/state/WorkspaceProvider.tsx
mobile/tests/workspace.test.cjs
shared/web/LocalStorageNotice.tsx
shared/web/domain.ts
shared/web/handover.ts
shared/web/localStorage.ts
shared/web/workshopAllocation.ts
```

</details>
