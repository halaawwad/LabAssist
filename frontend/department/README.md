# Department Head

Independent Vite/React application. The existing Department Head component,
groups, messages, validation and responsive CSS have been moved from the Student
app. It opens at `/`; it does not depend on the Student router or providers.
The shared background and favicon are local assets. Fresh sign-ins use Noor's
shared login in the Student app; a saved valid demo session can display the
interface without the Student server. Account management and messages remain local
demo interactions, with no new authentication or API integration.

From the repository root:

```sh
npm install
npm run dev:department
```

Open **http://localhost:5176/**. The server binds to `0.0.0.0` for access from
other devices; use the development machine's hostname/IP in that case. Port
5176 is reserved for this app and fails explicitly if occupied. The existing
Student port is 8080; the workshop port is 5175. Preview uses 4176.

```sh
npm run build:department
npm --prefix frontend/department run preview
```

The production output is `frontend/department/dist/`. This application is part
of the root npm workspace and uses the root `package-lock.json`. The Student
app retains its existing Bun lockfile; the other standalone applications retain
their own npm locks.

## Portal links and deployment

Vite environment variables are set in the application directory (copy the
corresponding `.env.example` to `.env.local`) or the build environment. Restart
development servers / rebuild after changing them.

- Student: `VITE_DEPARTMENT_URL` is the Department Head app's root URL, e.g.
  `https://department.example.edu/`.
- Department: `VITE_LOGIN_URL` is Noor's exact shared login URL, e.g.
  `https://students.example.edu/login`. The existing `VITE_STUDENT_URL` root
  setting is also supported; return links append `login` in that case.
- In development, absent overrides, both links retain the current protocol and
  hostname and change only the port/path (5176 `/`, or 8080 `/login`). This also
  works with a LAN hostname; localhost is not embedded in production links.
- Outside development, explicitly set both applications' URL settings and
  `VITE_DEMO_MODE=true`; missing configuration shows a clear demo error. There
  is no implicit same-origin or localhost production destination. If deploying
  the independent app at a subpath, set `VITE_DEPARTMENT_URL` to that full root,
  and build it with
  `npm --prefix frontend/department run build -- --base=/department/` and configure
  the reverse proxy to serve its `dist/` at `/department/`. The old
  Student `/department` route is removed; optionally redirect legacy bookmarks
  at the reverse proxy to the independent app.

See [shared web demo login](../../docs/SHARED-WEB-LOGIN.md) for all four roles,
session initialization, startup commands and the browser-only demo limitations.
Opening Department without a valid demo flag leads to Noor's shared login.
Return-to-login links end only its demo session, preserving preview records.

## Preserve existing local preview data

The storage key remains **`labassist.department.preview`**, with its existing
`accounts`, `groups` (including every `supervisorId`) and `messages` structure.
Changing a port, protocol or hostname changes the localStorage origin. The new
app cannot automatically read another origin's storage. Source data is never
deleted by this move.

Use the same browser profile where you previously used Department Head:

1. Open the original Student origin's `/department-preview-data.html`
   (normally `http://localhost:8080/department-preview-data.html`). Select
   **Export preview data**. Only the Department Head key is downloaded.
2. Open `http://localhost:5176/department-preview-data.html` and select that
   JSON file. Replacing existing destination data asks for confirmation and
   downloads a backup first. Invalid imports leave saved data untouched.
3. Continue to `http://localhost:5176/` (or reload an already open app) to see
   the transferred accounts, groups and messages.

The two public transfer pages keep the same transfer script so the tool can run on
both storage origins. Keep that script in sync; the Department page uses its own
shared visual theme. They contain no account-management
implementation and work without either application's React code. When the
Student demo login detects existing department preview data, it opens this
transfer page before leaving and supplies links to the configured destination.
Without existing data, login opens the independent app directly. Import/export
is also available for subsequent backups; no preview records are put in URLs.

The existing Department Head demo login is `head@demo.com` / `Noor123!` on the
Student login page. It is still a demo, not authentication.

## Manual verification

1. Start Student (`npm run dev:student`) and Department
   (`npm run dev:department`) separately. Select Department Head at `/login`;
   verify the destination, transfer prompt/page when legacy data exists, and
   all three return-to-login links. After signing in, stop Student and refresh Department to
   verify that its interface and assets are independent.
2. Verify account role filters/search, add/edit, generated student email,
   number/email duplicate validation, one-active-workshop-manager validation,
   immediate Active local status, and delete vs. disable/reactivate confirmations.
3. New manual/imported accounts are approved local records immediately and can
   be assigned to groups without an account onboarding step. Add/edit a group
   with 2–3 students and multiple supervisors.
   Verify selection limits, disabled-account restrictions, confirmed transfers,
   search, and reload persistence.
4. Verify messages, conversation/message search, starred conversations,
   conversation information, send validation, and reload persistence. Stars
   retain their original component-local lifetime.
5. Check desktop and narrow layouts, sidebar collapse/overlay, dialogs, mobile
   conversation navigation, typography and backgrounds against the previous
   interface. Verify reduced-motion behavior.
6. Export/import using the old and new origins; verify all records and group
   supervisor selections, rejected invalid files, replacement confirmation,
   downloaded backup, and unchanged original storage.
7. Verify configured production portal URLs and the chosen deployment base path
   in the intended hosting environment.

This move was reviewed statically. Builds, tests and browser automation were
not run; appearance, runtime interactions, transfer downloads and deployment
behavior still need the manual checks above.

## Shared appearance

`public/department-theme.css` defines the palette and typography used by both
the workspace and its standalone transfer page. `src/styles.css` provides the
reset/glass aliases; `src/department.css` applies those tokens to Accounts,
Groups, Communication, every dialog and their interaction states. Change the
semantic tokens to adjust contrast consistently instead of adding page-specific
color overrides. The desktop and responsive layout rules remain in place.

The shared page background is the original supplied image in
`public/assets/department-desk-background.png`. The theme paints it once on a
fixed, non-interactive viewport layer with `cover`, no repetition and no white
overlay. Desktop uses centered positioning; tablet/mobile positioning favors
the right edge to retain the electronics and notebook where the viewport crop
allows. Accounts, Groups, Communication and the standalone transfer page all
use this layer. The main panel stays transparent; cards, the message thread and
dialogs retain their readable cream/glass surfaces. Image URLs are relative to
the public theme stylesheet, so they also work under a configured Vite base path.

## Account assignments and Excel import

Accounts has separate Supervisors, Students and Workshop Manager views, plus
All accounts. Search includes names, numbers and emails. Assignment details use
the same account and group records as Groups; there is no parallel import store.
Groups have an editable project number and optional project title. Existing group
IDs, independent names/codes, extra metadata and dated membership history remain
intact. Legacy project numbers fall back to the existing code, label or group ID
until explicitly saved. New groups use the existing demo term. Historical completed
and archived projects cannot be reassigned. There is no group deletion action.

New manually created and Excel-imported accounts are **Active immediately** as
approved local demo records. There is no invitation or owner onboarding step.
They can be assigned directly to groups using the same existing membership,
term and capacity validation. Disabled and reference-only records cannot be assigned.
Group/project workflow statuses, including Draft, remain separate and unchanged.

This management/import flow is strictly frontend-only: no backend mutations, API,
authentication, server validation, database schema or migrations are changed or
called. Active is a local record state, not an authentication result. Neither account
creation nor assignment creates backend login credentials or bypasses authentication.
Group validation uses the actual saved local Active/Disabled state.

On loading existing Department preview data, the app upgrades older pending local
records to Active, preserving their IDs, metadata, assignments, history, groups,
messages and storage key. Deliberately disabled accounts stay disabled; their restore
state becomes Active when appropriate. The complete snapshot is saved atomically
before the updated records are displayed. A failed write preserves the previous
saved snapshot and blocks editing until loading can be retried. Repeated loads are
idempotent. The same compatibility update applies after importing old preview JSON.
The legacy `invited` property is retained for JSON compatibility only and is not an
account-management action or prerequisite.

Import Excel reads one-sheet `.xlsx` files locally (2 MB compressed, 12 MB expanded,
2,000 data rows, 64 columns maximum). It uses the same `fflate` ZIP dependency as
Student with a data-only OOXML reader/writer; no spreadsheet formulas, macros or
external worksheet links are executed. Formula cells are blocking errors even if
they have cached results. Dates, errors, booleans and unsupported numeric formatting
are rejected. Blank rows are ignored; original Excel row numbers remain visible.
Use Text cells for identifiers to preserve leading zeros. Simple explicit zero
formats such as `00000000` are also supported; digits already lost by Excel cannot
be recovered.

Download Excel template generates a workbook at runtime with these columns and
fictional examples: project P001, supervisor 9099, students 20990001/20990002.
Supervisor numbers remain four digits; students remain eight digits with email
`s<number>@stu.najah.edu`, matching existing manual validation. The six-digit student
numbers/non-university student emails in the illustrative request are therefore not
used in the template. Project Name cells may be empty; all eight columns must be
mapped. Name, number and email are required for each account.

Supported automatic headers (case-insensitive English, whitespace trimmed):

| Field | English aliases | Arabic aliases |
| --- | --- | --- |
| Project Number | Project Number, Project Code | رقم المشروع، رمز المشروع |
| Project Name | Project Name, Project Title | اسم المشروع، عنوان المشروع |
| Supervisor Number | Supervisor Number, Staff Number, Employee Number | رقم المشرف، الرقم الوظيفي |
| Supervisor Name | Supervisor Name | اسم المشرف |
| Supervisor Email | Supervisor Email | بريد المشرف، البريد الإلكتروني للمشرف |
| Student Number | Student Number, University Number | رقم الطالب، الرقم الجامعي |
| Student Name | Student Name | اسم الطالب |
| Student Email | Student Email | بريد الطالب، البريد الإلكتروني للطالب |

The Adjust columns control handles unfamiliar headers; it opens automatically only
when headers cannot be recognized. Every field must map to a
distinct column. Each row represents one student; repeat identical project and
supervisor details for a group. Accounts match by number; projects match by project
number **and term**. Import retains unlisted existing members and additional
supervisors instead of silently replacing them. Changes to saved project names or
supervisors require a corrected workbook or explicit manual editing. Conflicting
saved account details can be reviewed and explicitly retained; conflicting rows,
email collisions and different project assignments for one student block import.

The file is parsed immediately into compact project cards using the same card
component as the regular Groups list. The selected filename and parsed data remain
available throughout preview. Cards show project number/name, supervisors and students,
with original rows and proposed changes available in expandable details.
Any blocking row or group error disables Add groups and displays the specific reason
beside the button; no rows are silently skipped. Successful Add groups confirmation
closes the modal, opens the regular Groups list with search cleared, and refreshes
accounts/counters. Failed saves retain the preview. Transfers need explicit
confirmation and must leave each source/target group
within the existing 2–3-student, supervisor-load and term-capacity limits. Saving
revalidates current records and writes accounts/groups together under the unchanged
`labassist.department.preview` key before updating the interface. Storage failures
preserve the preview and old saved data. Changes in another tab or the transfer page
block stale writes; use Reload saved data before reviewing and confirming again.
Repeated imports reuse records and do not append duplicate members or history.

The existing JSON export/import page remains compatible: it transports the entire
stored snapshot, including project numbers and history. Its backup/replacement
confirmation is unchanged. **Different application ports do not share localStorage.**
Assignment visibility in Department account/group views updates immediately, but
Student/Supervisor apps still have their existing demo fixtures; they do not receive
new Department assignments automatically. No cross-origin bridge or backend sync
has been added. Transferring Department preview data moves that preview between
origins; it is not cross-role account provisioning or authenticated access.

### Manual checks for this change (not executed)

1. Create one supervisor and two students; verify immediate Active status, distinct
   account views/search and generated university email. From Groups open
   the same missing-account form, then save a draft with a project number and no
   title. Check all account/group assignment details and preserved Workshop management.
2. Edit title, members and multiple supervisors. With a three-student source and a
   two-student destination, transfer one student: unconfirmed save must fail; confirmed
   save must update both groups and preserve history. Reject moves leaving fewer than
   two students, duplicate memberships, disabled accounts and historical reassignment.
3. Download the template and import it. Verify preview causes no saved changes;
   confirm creates one Active supervisor, two Active students and one draft group.
   Check Arabic aliases, unfamiliar-header mapping and leading-zero Text identifiers.
4. Import the identical workbook again: zero new records/links and unchanged history.
5. Try inconsistent IDs, duplicate email, mismatching project/supervisor, invalid
   numbers/email, formulas and conflicting memberships. No blocking file may commit.
   Simulate denied/full storage: keep preview/form and existing saved data unchanged.
6. Reload and check assignments/messages/old metadata remain. Export/import JSON
   through the existing transfer page. Confirm another-tab writes cannot be overwritten.
   Load older pending local records: they become Active with identical IDs and
   memberships; disabled records remain disabled and can be restored separately.
   Check Student/Supervisor's existing demo assignment visibility separately; newly
   created Department assignments require future backend integration across origins.

The current local-account flow received static review only. No builds, tests,
typecheck commands or browser/runtime verification were run for this update.
