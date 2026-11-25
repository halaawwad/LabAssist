# Department mobile/web parity

The native entry remains `/native/department`, implemented in
`mobile/src/features/department/DepartmentScreen.tsx`. There is no backend
connection or cross-app storage bridge. Web visuals and navigation remain unchanged.

## Shared account policy

Both web and mobile manual creation and Excel import save new accounts as
`PENDING_ACTIVATION`, `active: false`, without invitation delivery or login
credentials. Existing account statuses, including pre-existing disabled records, are preserved unchanged;
loading stored records does not activate them. Pending accounts may be assigned
only to draft planning groups; non-draft groups require Active members.
Disabled/reference-only accounts cannot be newly assigned. Backend authentication
and membership validation remain unchanged.

## Implemented parity

| Area | Mobile behavior |
| --- | --- |
| Accounts | Student/Supervisor/Workshop filters and counts; name/number/email search; shared assignment summaries/details; edit, message, protected deletion (no disable or re-enable action) |
| Identity | Eight-digit student number; generated `s<number>@stu.najah.edu`; four-digit supervisor and five-digit manager numbers; valid staff email, matching web; role/student number/email immutable on edit; unique numbers/emails and one non-disabled manager |
| Groups | Project number, optional name, preserved legacy IDs/metadata; normal expandable cards for manual/imported groups; multiple supervisors; adding/removing students; same account form for missing people |
| Membership | Mixed batches allowed; 2–3 students; one current group per student per term; at most four groups per supervisor and existing term capacity; confirmed transfers preserve dated history and source limits; historical completed/archived projects protected |
| Excel | Expo document picker; shared OOXML reader and template; automatic English/Arabic headers, adjustable mapping, grouped previews, original row numbers/errors, keep-existing conflict choice, explicit transfers and Add groups confirmation |
| Reconciliation | Shared deduplication and current-data revalidation; whole-file blocking errors; repeat import reuses accounts/groups; successful import closes preview and opens normal Groups; account counts refresh |
| Communication | All account contacts, contact search, session-local starred filter like web, contact information, message search, retained messages, explicit send, 4,000-character limit |
| State | Existing account/group/message keys, save-before-success, duplicate-action guard, loading/empty/error states, retry inside forms/import, failed-save input preservation, undo recovery and stale-write detection |
| Presentation | Existing mobile background/navigation/components; English/Arabic labels, RTL modal layouts, readable structured member details, stored photos or initials, no group/term UUID display |

## Reuse and storage

`shared/department/records.ts` and `workbook.ts` contain the existing web import
logic extracted into reusable modules. The original web modules re-export them;
the browser template download stays in the web wrapper. Both clients use the shared
`pending-drafts` default policy.

Mobile reads XML with the already-used `@xmldom/xmldom` package declared directly,
and ZIP data with the existing `fflate` version. On native platforms it reads the
picked cache file through Expo FileSystem and shares a generated template through
Expo Sharing. Expo Web uses the browser picker/download. Formula cells are never
executed, and blocking errors prevent writes. Existing size/sheet/row limits remain.

These storage keys remain authoritative:

- `labassist.mobile.department.accounts`
- `labassist.mobile.department.groups`
- `labassist.mobile.department.messages`

A temporary undo journal contains the previous serialized values before changing
these keys. Failed/interrupted writes restore the old records before the next read.
If recovery cannot finish, loading stays blocked; saved data is never replaced with
seeds. Missing display titles/photos may be filled from the existing mobile workspace
without replacing explicitly saved fields, IDs, statuses or historical links.

Web and mobile previews are isolated. Department changes do not automatically
update Student/Supervisor fixtures on other ports or devices. Future shared API
integration must supply synchronization, authenticated identity and server approval.

## Verification

Existing mobile tests plus focused Department regression cases cover actual XLSX
template parsing, formulas, aliases/mapping, invalid identities/conflicts, pending
imports, mixed batches, idempotency, term-scoped transfers/history, disabled-pending
restoration, partial-write rollback, crash recovery, corrupt data and stale writes.

| Command actually run | Result |
| --- | --- |
| `npm run test --workspace mobile` | 51 passed, including 8 new Department cases |
| `npm run typecheck --workspace mobile` | Passed |
| `npx --no-install eslint src/features/department` from `mobile/` | Passed, zero warnings/errors |
| `npm run typecheck --workspace frontend/department` | Passed |
| `npm run build:department` | Production build passed after shared-module extraction |
| `npx --no-install expo start --web --port 8095 --offline` from `mobile/` | Expo Web served `/native/department` successfully |

Runtime checks used **Expo Web in installed Chrome**, through Playwright, at a
430×932 viewport with an isolated browser profile and synthetic data. No Android,
iOS simulator or physical device was used. The Playwright-managed browser revision
was absent, so the available installed Chrome was used instead.

Fourteen focused runtime scenarios passed:

1. Manual account creation, pending states, duplicate/identity validation and
   duplicate-click prevention.
2. Manual mixed-batch group with multiple supervisors and the existing missing-account form.
3. Invalid actual `.xlsx` preview blocked without saved changes.
4. Valid `.xlsx`, failed-save preservation, in-modal retry, normal Groups visibility.
5. Repeat import and adjustable mapping without duplicate accounts/groups/links.
6. Messages, starred filter, message search and reload persistence.
7. Account edit preserves identity, assignments and input through a failed save.
8. Confirmed transfer updates both groups and retains dated prior membership.
9. Referenced-account deletion restriction (accounts with records are kept; no disable or re-enable action), manager limit.
10. Arabic controls, RTL modal/page layout, immutable student identity and reload.
11. Failed transfer save/reload invalidates old consent and requires reconfirmation.
12. Message save failure retains text; retry succeeds without stale error display.
13. Corrupt saved Department data blocks writes; retry restores original records.
14. A manually created pending account retains `active: false`, `invited: false`
    after a subsequent Excel import.

Detailed XLSX formula rejection, Arabic aliases, leading zeros, term scope,
capacity/size constraints and undo-journal crash recovery were also exercised by
the regression suite. Collected runtime page errors were empty. Verification
scripts, synthetic workbook fixtures, JSON results and screenshots are outside
the repository at `D:\LabAssist\.verification-department-20261114`:

```powershell
node D:/LabAssist/.verification-department-20261114/runtime.cjs
node D:/LabAssist/.verification-department-20261114/focused-runtime.cjs
node D:/LabAssist/.verification-department-20261114/pending-flags.cjs
```

Native Android/iOS document picking, FileSystem reads, template sharing and device
layout still need device checks. No `adb` runtime was available in the environment.
Some detailed shared spreadsheet validation diagnostics remain English, matching
the current web parser; mobile labels/actions and common form errors support Arabic.
No backend/SQL files or data were changed; nothing was staged, committed or pushed.

## Changed-file inventory

- `mobile/src/features/department/DepartmentScreen.tsx`: account/group/message flow.
- `DepartmentCards.tsx`, `DepartmentImport.tsx`: native reusable presentation and picker preview.
- `departmentData.ts`, `departmentFiles.ts`, `departmentPersistence.ts`,
  `useDepartmentStore.ts`: role adapters, file APIs, recovery, serialized saves.
- `shared/department/records.ts`, `workbook.ts`: reused pure rules and OOXML logic.
- `frontend/department/src/departmentRecords.ts`, `departmentWorkbook.ts`,
  `components/DepartmentGroups.tsx`: compatibility exports/types and shared pending-account eligibility.
- `mobile/tests/department.test.cjs`: focused regression cases.
- `mobile/package.json`, both applicable package locks: declared existing ZIP/XML dependencies.
- This document, `PERMISSIONS.md`, `REQUIREMENTS.md`, `BACKEND-PREPARATION.md`:
  shared Pending policy, storage boundary and verification.

Final targeted correction: both clients create/import Pending accounts. Focused import/status-preservation regression checks were run after this correction; the earlier full-suite and runtime results above predate it. Manual web creation, saved-record loading, and status display received static review only for this correction.
