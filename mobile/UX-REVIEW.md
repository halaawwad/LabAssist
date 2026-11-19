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

## Phase 1 — runtime errors, clipped content, navigation (2026-11-19)

### Confirmed causes and fixes

| Issue | Cause found | Fix |
| --- | --- | --- |
| BackHandler error on Messages (web) | Hardware-Back listener registered on every platform | Registered on Android only, removal on blur kept; the conversation's own Back closes it on web/iOS |
| `POP_TO_TOP was not handled` (seen at the next login) | Log out called `dismissAll()` with nothing to pop | Guarded with `canDismiss()`; login, logout and tab switches use `replace` |
| `Invalid style property of "direction"` | react-native-web rejects and drops the `direction` style | Native-only `directionStyle`; the web uses the document `dir`. Manual `ltr` + `row-reverse` pinning removed, so Arabic web layout now mirrors like native |
| Department list "stops after two cards" | Web `ImageBackground` used the asset's pixel size, leaving 100–290px of hidden overflow in the shell; switching to Accounts scrolled the shell, moving the tab bar mid-screen | Shared `ShellFrame` sizes the backdrop to the screen; same fix in Messages and the supervisor support card (its photo now shows) |
| Student CropBot / Supervisor Recent Activity | Not reproduced as clipping on Expo Web, before or after; both lists reached their end. The same shell overflow affected these screens | Same shell fix; one vertical scroll owner per screen; web no longer wraps the supervisor dashboard in a second (RefreshControl) scroll container |
| Also found | Stray text node on Issues; `<button>` nested in `<button>` in message bubbles | Removed; on web the bubble is a labelled group (its inner Message actions button remains) |

### Navigation

- `src/native/AppShell.tsx` (header, tabs, frame, More) is used by all four roles, including Department.
- Tabs: Student — Home, Project, Reports, Messages, More. Supervisor — Home, Projects, Reports, Messages, More.
  Workshop — Home, Attendance, Map, Messages, More. Department — Home, Accounts, Groups, Messages, More.
- More: Project / Workshop / Communication / Account rows (52px), Language, then a full-width Log out row.
  Every former menu destination is retained. Hamburger menus and drawers are removed.
- Tab roots show no Back; sub-pages show Back and a centred 17px semibold title. Home shows the logo and
  notifications. Duplicated in-page titles and the inventory breadcrumb were removed.
- `/{role}/more/{page}` and `final-reports` links still resolve. Logout preserves stored records and preferences.

### Verification (Expo Web only)

Dev server `http://localhost:8081`, headless Chrome, scripts and screenshots in
`D:/LabAssist/.verification-mobile-phase1-20261119` (`audit.cjs`, `flows.cjs`, `dialogs.cjs`).

- Route audit: 50 destinations × {EN, AR} × {390×844, 320×640}: no console errors, no hidden-overflow shift,
  no nested vertical scrollers, no horizontal page overflow, tab bar pinned to the bottom.
- Flows, all four roles, EN 390×844 and AR 320×640 (8/8 pass): login, browser Back cannot reopen login, all
  tabs, More → sub-page → Back, list ends (last item and action visible and hit-testable), logout keeps every
  other stored key, Back after logout stays signed out, re-login with zero console errors.
- Conversation and account dialog at 320×640, EN/AR: independent scrolling, composer and Save reachable.
- `npm run typecheck`, `npm run lint` (no warnings) and `npm test` (53 pass).

### Not verified / limitations

- No Android/iOS device or simulator here: native safe areas, hardware Back, keyboard, and native text
  measurement in wrapping rows (a possible native-only source of the CropBot/activity reports) are unverified.
- Department sections are local tabs; Android hardware Back does not step between them.
- Some content strings inside screens remain English in Arabic mode (unchanged in this phase).
- Unused legacy `features/supervisor/screens/MoreScreen.tsx` and `PlaceholderScreen.tsx` were left in place.

## Phase 2 completion and Phase 3 follow-up (2026-11-19)

### Phase 2 targeted verification

- Reused the previous successful attendance checks (English 390×844 and Arabic
  320×640) and the 320×640 workshop map check. The account, task and final-report
  cases were rerun in isolated contexts in `recheck.cjs`.
- Department accounts passed in both languages: action/assignment sheets,
  disable and restore with reload persistence, failed save with preserved input,
  storage reload, and successful Pending-account retry. After a failed multi-key
  write, recovery must reload storage before retrying; the existing form offers it.
- Student task failed-save and double-submit protection passed. The repeated
  error announcements are the page banner and the form's local error, rather
  than two task forms; the test now scopes to the form.
- Arabic final reports passed: project selection, four 44px sections, page and
  slide navigation, and feedback stored against the submitted version and shown
  in history. The former timeout selected a section radio outside the picker.
- The preceding 50-route Phase 2 audit at 390×844 English reported one 46px date
  input; the current web DateField specifies a 48px minimum. The broader audit
  below checks visible controls, not every control in every possible dialog.

### Phase 3 changes and checks

- Shared Student/Supervisor/Workshop messages now use 56px inbox avatars,
  grouped narrower bubbles, long-press/tap actions with a keyboard alternative,
  no per-message ellipsis or implied delivery check, and a quiet background.
  Sending is guarded against duplicates; failed sends retain the draft and show
  an error. The list tracks reading position, scrolls on open and send, and
  offers a jump to new messages without moving a reader who is higher up.
- Department keeps its separate existing message store and contact model. Its
  working background is cream, inbox avatars are 56px with preview and time,
  conversation bubbles are bounded, and storage recovery is reachable from the
  open conversation. No unread or delivery state was invented for that store.
- Isolated Expo Web contexts tested all four roles in English at 390×844 and
  Arabic at 320×640: send, visible message, no page overflow and no page errors;
  the shared conversation's action menu also opened with the keyboard. Student
  and Department failed-send/retry and reload persistence passed. Long-history
  checks confirmed reopening at the latest message for both stores; the Student
  test also checked that reading older content did not jump to the end.
- A route audit covered 50 destinations at both 390×844 and 320×640 in both
  languages (200 checks): visible control sizes, input sizes, page overflow,
  shell position and console/page errors. One Workshop Notices load reported
  `ERR_NETWORK_IO_SUSPENDED`; its isolated rerun passed. These route checks do
  not exercise every dialog or prove contrast of every text/background pair.
- Final `npm run typecheck`, `npm run lint`, and `npm test`: passed; 53 tests.
  Screenshots, scripts and logs are in `D:/LabAssist/.verification-mobile-phase2-20261119`.
  Tests used isolated browser contexts and did not use the review browser profile.

### Remaining verification limits

- Android/iOS simulator or physical-device runtime was unavailable. Native
  keyboard avoidance, safe-area placement, native picker and long-press/screen
  reader behavior are unverified; Expo Web does not validate these.
- The final route audit is not a fresh interactive review of every nested form,
  export and dialog, and a complete measured 4.5:1 contrast audit across all
  role screens was not performed. Previous coverage above predates these edits.
  The user-specified complete contrast and interaction review therefore remains
  open; no blanket conformance is claimed.

## Mobile follow-up (2026-11-19)

- Recovered existing follow-up work and left the earlier navigation, messaging,
  local data and uncommitted changes intact. The interrupted final-review script
  was not present in the helper directory, so whether it wrote any changes cannot
  be established from the script. The source still contained untranslated status
  and interface strings; these were edited directly. Saved report content was not
  translated.
- Supervisor Final Reports: localized status/feedback labels and dates, and kept
  the review editor and text visible on a failed save. Isolated English and Arabic
  tests passed failure, retry and submitted-version history.
- Meetings: fixed Expo Web focus of the first invalid field, separated persistence
  feedback from validation, and guarded rapid duplicate submissions; an isolated
  test passed validation/focus, failed save, retry, double tap and reload.
- Workshop: the table list is the initial phone view. Map table selection is
  available only when all actual shapes are at least 44×44; the list remains
  available where zoom cannot reach that size. EN/AR checks at 320 and 390 passed.
- Department account action-sheet X, backdrop and Escape dismissal followed by
  immediate tab taps passed on web with mouse and touch. Department notifications
  have no Department identity or destination in the existing data model; no bell,
  count or other role's alerts were invented.
- The shared profile screen accepts the Department demo's own read-only identity;
  Department settings reuse the shared settings screen without another role's data.
  Profile, settings and Back passed for all roles in English and Arabic.
- Home and More comparison screenshots were captured for four roles, two languages
  and both phone sizes under `D:/LabAssist/.verification-mobile-followup-20261119/shots/comparison`.
  These are disposable browser contexts. The 200 route/size/language audit checked
  visible text/controls, layout and browser errors; one settings navigation aborted
  during development reload and passed in isolation. The Arabic working-day switch
  and English counterpart passed checked-state, knob containment and 44px checks.
- Login, logout, tabs, Back and list ends passed for all roles at English 390×844
  and Arabic 320×640. A concurrent earlier Arabic run hit browser resource
  exhaustion and was rerun successfully after the route audit completed.
- Final `npm run typecheck`, `npm run lint`, and `npm test` passed, including all
  53 existing tests. The local Expo Web server remains on port 8081.

### Follow-up limits

- There is no Department Head notification identity or notification destination
  in the current model. The shared header therefore cannot show a functioning
  Department bell without additional product/data functionality.
- All four roles share the message-bubble component; Department still uses its
  separate local data model and conversation screen, while the other three roles
  share the native messages screen. A full conversation-screen consolidation
  remains unfinished. After extracting the component, English/Arabic send and
  keyboard-action checks passed for the shared screen, and Department send checks
  passed; Student and Department failed-send/retry/reload checks also passed.
- The browser audit covers route surfaces and targeted interactions, not every
  nested form, error path, translation or accessibility label. User-authored
  text, names, identifiers and document contents were preserved; a complete
  interactive Arabic and bidi review of every nested screen remains outstanding.
- Native keyboard, safe-area, SVG touch and screen-reader behavior remain
  unverified without a physical device or native simulator.

## Department notifications, shared messaging and Arabic follow-up (2026-11-19)

- Department has no compatible notification records or identity in the existing
  model. The shared header bell now opens a localized empty view and Back returns
  to the originating Department tab. It shows no badge, borrowed alerts, counts
  or delivery claims. The EN/AR × 390×844/320×640 isolated checks passed.
- All four roles now render shared inbox rows, conversation header, composer frame
  and message bubbles. Their adapters retain the existing role-specific actions,
  contact IDs, domain logic and separate message stores. Department contact stars,
  formerly held only in memory, now persist in the new independent key
  `labassist.mobile.department.contact-stars.v1`; no existing key was migrated or
  replaced. Star reload and a failed write followed by retry passed in isolated
  contexts. All-role send and keyboard-action checks passed across both sizes and
  languages; Student and Department failed-send/retry/reload checks and long
  history position checks also passed.
- Arabic route surfaces were inspected using the existing isolated Latin-text audit;
  report and presentation dialogs were inspected interactively. Fixed interface
  labels include report status/checks, form and tool accessibility labels,
  presentation sections/layouts, inventory comparison, the table action sheet,
  and the web preview controls. Names, codes, user text and document/export
  content were not translated or rewritten. Untranslated interface still possible:
  low-level PDF/PowerPoint renderer, file or platform error details can appear in
  their original language; a complete interactive traversal of every conditional
  dialog and native screen has not been achieved. Template/theme names and the
  English text within the report/presentation document previews are retained as
  names or document content, not claimed as translated UI.
- No Android device was listed by the available SDK paths and no emulator process
  was running. Metro on port 8081 returned an Expo SDK 58 Android manifest and an
  Android JavaScript bundle over `192.168.1.13`; this is bundling/network readiness,
  not native runtime verification. Native keyboard, safe area, picker, long press,
  screen reader and device-only behavior remain unverified.
- `npx expo install --check` reported installed expo 58.0.25 vs ~58.0.26,
  expo-file-system 58.0.13 vs ~58.0.14, and expo-router 58.0.31 vs ~58.0.32.
  No dependencies or lockfiles were changed during this follow-up. These warnings
  may affect native testing and should not be mistaken for a confirmed device issue.
- Final `npm run typecheck`, `npm run lint`, and `npm test` passed (53 tests).
  Browser checks used isolated contexts. Screenshots and scripts are under
  `D:/LabAssist/.verification-mobile-followup-20261119`; the existing Expo server
  remains running for review.
