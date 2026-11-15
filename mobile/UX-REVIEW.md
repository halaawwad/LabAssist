# Mobile UX inventory and verification

The user-facing application uses Expo Router under `/native`. Existing storage,
permissions and shared domain rules remain the source of truth. No backend
connection, credential provisioning or cross-client storage bridge was added.

## Route checklist

**Updated** includes routes receiving the shared input, action, surface, keyboard,
modal and navigation changes. Each destination was also inspected individually.

| Role / route prefix | Destinations | Status |
| --- | --- | --- |
| Entry | `/`, `/native/login` | Updated: native microchip identity; role chooser; validation, password visibility and demo access; keyboard and small-phone form |
| Student | `/native` and `/native/student/dashboard` | Updated: compact project summary, useful actions above the fold, shared brand/navigation; dashboard alias corrected |
| `/native/student/` | `project`, `team`, `parts` | Updated: compact project summary, expandable photo section, task/member rows and BOM details; original editing actions retained |
| `/native/student/` | `tasks`, `issues`, `budget` | Updated: focused task-creation dialog, task list rows, bounded issue editing and finance controls |
| `/native/student/` | `reports` | Updated: compact report entry and week chooser; weekly/final/presentation editors, previews and review actions retained |
| `/native/student/` | `meetings` | Updated: expandable overview, usable schedule list, focused create/edit/detail/calendar actions |
| `/native/student/` | `catalog` | Updated: search-first two-column grid; detail, specifications, pins, guide, documents, BOM and lab actions retained |
| `/native/student/` | `lab`, `circuits` | Updated: focused workbench, expandable position/pin tools, full-screen viewer, versions/sharing/library retained |
| `/native/student/` | `offers` | Updated and final visual review complete: expandable inventory overview and filter/comparison tools; stock, requests, local-store comparison, request/edit dialogs retained |
| `/native/student/` | `learning` | Updated: compact lesson list and on-demand model/detail expansion; bookmarks, original references and existing assistant availability state retained |
| `/native/student/` | `messages` | Updated: inbox → full-height conversation, message bubbles, compact composer, labeled action menu and hardware Back to inbox |
| `/native/student/` | `profile`, `settings`, `notifications`, `workshop` | Updated: readable profile/notebook inputs, preferences, actions, notices and notification states; logout retained |
| `/native/supervisor/` | `dashboard` | Updated: shared surfaces, compact heading and comfortable actions; existing statistics, progress, meetings, activity and support retained |
| `/native/supervisor/` | `projects`, `students`, `progress`, `tasks`, `issues` | Updated: smaller project imagery/headings, readable rows, search/filter and existing detail/follow-up dialogs; final students/tasks list review complete with expandable overviews |
| `/native/supervisor/` | `reports`, `finalReports` | Updated: readable submission/version review, section controls, feedback, document/presentation preview and reopening actions |
| `/native/supervisor/` | `meetings`, `messages`, `notifications`, `profile`, `settings` | Updated: focused meeting form, full-height conversations and shared personal/settings/notification controls |
| `/native/workshop/` | `dashboard`, `attendance` | Updated: compact shell, attendance rows and controls; work-day rules unchanged |
| `/native/workshop/` | `map` | Updated: initially fitted diagram, deliberate zoom/pan, working web/native table hit targets, safe-area assignment/detail dialog |
| `/native/workshop/` | `handover`, `notices`, `observations`, `notifications` | Updated: readable records, forms, filters, confirmation and action targets; release/history and handover rules unchanged |
| `/native/workshop/` | `messages`, `profile`, `settings` | Updated: shared conversation, account and preference patterns |
| `/native/department` | Overview, Accounts, Groups, Communication | Updated: compact branding/header, short tab labels, readable account/group records, inbox and separate conversation with compact composer |
| `/native/department` | Account create/edit; group create/edit; member/supervisor selection; transfer/disable/delete confirmation | Updated: shared keyboard-safe forms and actions; Pending rules, mixed batches, multiple supervisors, history and restrictions retained |
| `/native/department` | Excel file/mapping/preview/confirmation; contact details; navigation | Updated: same import/reconciliation logic and state, readable controls, grouped previews, explicit save and errors |
| Compatibility | `/native/{role}/more/{destination}` | Reviewed: existing path normalization retained; secondary destinations also listed in the shared More menu |
| Preview | `/native-preview` | Reviewed: existing web phone-frame preview and native redirect retained; it is a development wrapper |
| Legacy portal links | `/[...route]` and explicit original-portal QR links | Reviewed: existing external web handoff retained; its web interface is outside this mobile redesign. Existing bridge tests remain in the test suite |

## Dialog/editor coverage

The shared `MobileModal` supplies a keyboard boundary and direction to existing
dialogs. Existing visibility, confirmation, cancellation and save handlers remain
attached to their original state. Focused editors keep one vertical scroll owner.

- Login role selection and password/error states.
- Student project/photo edits; task/issue/finance forms; inventory request,
  comparison, request history and editing; catalog component details; full-screen
  lab; meeting create/edit/details/calendar/invitations/notes.
- Weekly report drafts, editing, submission/withdrawal confirmation, paper preview;
  final report metadata, students, outline, requirements, sections, images/tables,
  PDF preview/export, feedback; presentation slides/design/content/object controls,
  PowerPoint import, PDF/PPTX export, full-screen presentation and confirmation.
- Conversation creation, group editing, contact details, search, starred messages,
  reply/forward/delete, attachment picking/opening and existing file errors.
- Supervisor project/student/task details, progress history, feedback requests and
  exact-submission document review.
- Workshop table assignment/move/release, handover issue/return check, notices and
  supervisor observations.
- Department account/group forms, membership transfer, protected deletion,
  disable/restore, Excel mapping/reconciliation, import confirmation and messages.
- Shared preference-reset confirmations, notebook/profile editing and error/retry.

## Renderer and bundling changes

The original report and presentation renderer HTML is bundled in
`assets/engines/report.html` and `deck.html`, rather than multi-megabyte TypeScript
string literals. Renderer content was compared after newline normalization before replacing its
transport. The original Arabic fonts, stationery, document generation, PPTX
import/export and message bridges remain. The two existing generator scripts now
write these assets. The already-installed `expo-asset` is now declared directly
and resolves HTML assets on Expo Web; no unrelated dependency was added.

Metro retains Expo's defaults and monorepo resolution, with one transform worker.
This limits memory use on the available Windows host. The initial unrestricted
worker run failed during worker startup; the initial embedded-renderer iOS run
failed at Hermes. An iOS export with local renderer assets produced Hermes
bytecode successfully. Final verification results are recorded below.

## Verification record

- `npm test`: **53 passed**; account status/history, report snapshots, permissions,
  circuits, attendance, allocation/release, handovers and routing regressions.
- `npm run typecheck`: passed on the final implementation.
- `npm run lint`: passed on the final implementation, with no errors or warnings.
- Expo Web: exported production assets served locally in isolated Chrome browser
  contexts. Phone sizes: 390×844 and 320×740; additional RTL/dialog/long-content
  and flow checks are recorded in the final report. No existing browser profile
  or development database was used.
- iOS export is native **bundling**, not an iOS runtime test. Windows has no iOS
  simulator here. Physical Android/iOS keyboards, native file/photo pickers,
  sharing and platform-specific 3D rendering remain device-verification limits.

### Final results

- All 46 role destinations passed the Expo Web route/layout review at 390×844
  and 320×740, with no recorded page errors or unintended horizontal overflow.
  The final inventory, Supervisor dashboard, students and tasks adjustments were
  recaptured at both widths and reviewed; all options remain reachable. Intended
  horizontal filter scrollers remain.
- All 12 recorded browser flows passed: weekly save/submit, exact submitted-version
  Supervisor review, Back/logout with stored-data preservation, RTL search/navigation,
  task failed-save/retry, messaging with long content/actions, final-report PDF,
  presentation PPTX, Department Pending-account failed-save/retry, invalid/valid
  Excel import with draft groups and reload persistence, group editing/conversation,
  and Workshop attendance/table release/handover.
- PDF/PPTX runtime export is resolved **in Expo Web**: the browser downloaded an
  actual PDF with a `%PDF` signature and a PowerPoint ZIP with a `PK` signature.
  This validates generation/download, not document fidelity in external readers.
- Final web export passed:
  `node --max-old-space-size=1536 ../node_modules/expo/bin/cli export --platform web --max-workers 1 --output-dir D:/LabAssist/.verification-mobile-ux-20261114/web`.
- Final `npm run build:ios:preview` passed and produced a **7.8 MB Hermes bundle**.
  This confirms native compilation/bundling after the renderer asset change;
  native runtime PDF/PPTX generation, opening and sharing remain unverified.
- The 53-test success predates the final visual-only list adjustments. Final
  TypeScript, lint, web export and iOS export include those adjustments. Unchanged
  successful tests were not repeated.
- Verification artifacts are outside the repository at
  `D:/LabAssist/.verification-mobile-ux-20261114`: `inventory-results.json`,
  `inventory-last-results.json`, `flow-results.json`, phone screenshots,
  `web-final.log` and `ios-final.log`.
- The concluding resume made documentation changes only and reused these existing
  successful checks; no tests, builds or browser flows were rerun.

### Remaining platform limits

| Check | Status |
| --- | --- |
| Native role destinations and their editor/dialog families | Updated; Expo Web phone review completed as listed above |
| Compatibility aliases, development preview and legacy portal handoff | Reviewed; original behavior retained |
| Android/iOS device or simulator runtime, native keyboard, file/photo pickers, sharing and platform-specific 3D | Blocked by unavailable device/simulator runtime; not claimed as verified |
| Native PDF/PPTX runtime export and external document-reader fidelity | Unverified; Expo Web generation/download and iOS bundling passed separately |

There is no outstanding reproduced Expo Web renderer/export failure. Physical
device checks remain required before declaring native runtime export verified.
