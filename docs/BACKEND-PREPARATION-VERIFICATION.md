# Backend preparation verification — 2026-11-13

Verified the dirty `main` worktree without staging, committing, modifying database data or contacting/deploying to application services. Tools: Windows PowerShell, Node **24.14.0**, npm **11.9.0**, Bun **1.3.3**, installed Chrome and Playwright. These are local results, not a GitHub Actions run or an Ubuntu/Node 22 certification.

## Final results and exact commands

From the repository root (`D:\LabAssist\LabAssist`), the following commands were run:

| Application | Command | Result |
| --- | --- | --- |
| Student | `npm --prefix frontend/student test` | 73 tests passed |
| Supervisor | `npm --prefix frontend/supervisor test` | 12 tests passed after fixes |
| Workshop | `npm --prefix frontend/workshop test` | 17 tests passed after fixes |
| Department | No test script or unit suite is defined | Not reported as a passing test suite; type/build/browser checks below passed |
| Mobile | `npm --prefix mobile test` | 43 tests passed; no skips |
| Student | `npm run build:student` | Passed; final changes also built in isolation below |
| Supervisor | `npm run build:supervisor` | Passed; final changes also built in isolation |
| Workshop | `npm run build:workshop` | Passed; final changes also built in isolation |
| Department | `npm run build:department` | Passed locally and in the clean workspace context below |
| Student | `npm --prefix frontend/student run typecheck` | Passed |
| Supervisor | `npm --prefix frontend/supervisor run typecheck` | Passed |
| Workshop | `npm --prefix frontend/workshop run typecheck` | Passed |
| Department | `npm --prefix frontend/department run typecheck` | Passed |
| Mobile | `npm --prefix mobile run typecheck` | Passed again after final native fixes |
| Diff | `git -c core.safecrlf=false diff --check` | Passed; no whitespace errors |

Final isolated suites also passed: Student **73**, Supervisor **12**, Workshop **17**. The mobile total includes three focused new domain regressions. Supervisor/Workshop each include two new storage regressions while retaining the original non-throwing storage assertions.

## Isolated CI reproduction

Created `D:\LabAssist\.verification-backend-20261113\source` from tracked/current working files plus the new shared modules, excluding existing dependency/build directories. Kept repository-relative `frontend/<role>` and `shared/web` locations, root package/lock files and workspace manifests. No existing installation or lockfile was replaced.

From that temporary `source` directory, using Git Bash and `RUNNER_TEMP=D:/LabAssist/.verification-backend-20261113/runner` and `GITHUB_ENV=D:/LabAssist/.verification-backend-20261113/github.env`, ran:

```sh
bash .github/scripts/prepare-web-workspace.sh student
bash .github/scripts/prepare-web-workspace.sh supervisor
bash .github/scripts/prepare-web-workspace.sh workshop
```

The copies completed, but Git Bash's emulated `ln` could not create the dangling dependency links on Windows. Created the equivalent Windows junction from each isolated root's `node_modules` to its `frontend/<role>/node_modules`, then installed locked dependencies. The repository workflow was not altered.

In `runner/labassist-student/frontend/student`:

```sh
npm exec --yes --package=bun@1.3.3 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.3.3 -- bun run test --reporter=default --reporter=junit --outputFile=reports/vitest.xml
npm exec --yes --package=bun@1.3.3 -- bun run build
npm exec --yes --package=bun@1.3.3 -- bun run typecheck
npm exec --yes --package=bun@1.3.3 -- bun run lint --format json --output-file D:/LabAssist/.verification-backend-20261113/student-isolated-final-eslint.json
```

All final commands passed. Student lint: **0 errors, 29 warnings**. The first lint run reported only CRLF formatting errors because `core.autocrlf=true` had supplied Windows text files. Normalized temporary source files to LF, as in the Linux checkout, and reran the unchanged lint rules. The original working files were not mass-normalized.

In each of `runner/labassist-supervisor/frontend/supervisor` and `runner/labassist-workshop/frontend/workshop`:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

All final commands passed. Lint warnings remain; the temporary Workshop traversal also produced dependency warnings. No rules, assertions or tests were disabled.

In temporary `source`, preserving Department's npm workspace configuration:

```sh
npm ci --workspace frontend/department --include-workspace-root=false
npm run typecheck --workspace frontend/department
npm run build:department
```

All passed. A static check also resolved **36 shared imports** in changed source files and verified exact filename casing.

Some initial concurrent checks hit Windows/Bun/V8 memory failures or a process exit; the affected install/build commands passed on serial retry. Non-failing build warnings remain for PDF dependencies (`node:crypto` externalization/fontkit exports) and bundle size. Installation also reported an audit finding in unchanged locked dependencies; no unrelated dependency upgrades were made.

## Regressions found and fixed

- `shared/web/localStorage.ts` and Supervisor/Workshop storage adapters: restored browser `window.localStorage` access and support for minimal test environments without DOM event dispatch. Preserved the existing non-throwing `writeStored` API for legacy/preferences callers; core state/account saves explicitly use `writeStoredOrThrow`, so failed writes cannot commit optimistic state. Added tests proving quota failures and malformed saved data preserve existing records.
- `frontend/student/src/components/WeeklyReportEditor.tsx`: typing no longer removes draft saving or labels a new draft as a submitted-report edit. Editable drafts remain separate; reviewed/opened reports remain locked. Failed writes retain input and do not announce success.
- Student task forms, Supervisor review controls and Workshop attendance controls handle failed strict writes in the UI instead of leaking event exceptions. Final desktop runtime checks recorded no page errors, including during injected quota failures.
- `frontend/workshop/src/pages/HandoverPage.tsx`: added an explicit accessible label to the project selector.
- `mobile/src/native/StudentReference.tsx`, `StudentDashboard.tsx`, `ProjectDetails.tsx`: the actual native Student dashboard/project path previously still used an independent in-memory preview. It now adapts the existing workspace, derives task IDs/progress/membership from saved records, persists project edits, exposes the existing task editor and reuses the full report editor. No extra state framework or storage bridge was added.
- Native error presentation: Student destinations now display storage failures; confirmation views retain error feedback. Unreadable workspace data displays an error immediately, blocks overwrite, and supports retry after storage is restored.
- Native Department account editing preserves existing record metadata, including prior access/activation state, instead of reconstructing only visible fields.
- `mobile/tests/workspace.test.cjs`: updated obsolete fixture assumptions (legacy task IDs/progress, optional report fields, missing submission identity and Supervisor-created groups) to the confirmed domain/permissions. Added positive group-constraint coverage, stale-version rejection, atomic publish/draft separation, assignment release/history, attendance history and return history checks.

## Browser/runtime verification actually performed

Started the four app servers with `npm run dev:student`, `npm run dev:supervisor`, `npm run dev:workshop`, `npm run dev:department`. Started Expo web with `npm --prefix mobile start -- --web --port 8094` (`EXPO_OFFLINE=1`). Earlier attempts used occupied ports 8081 and then temporary ports 8091–8093; the occupied pre-existing 8081 service was not stopped.

Directed browser interactions used headless installed Chrome through Playwright, a desktop viewport for web and **390 × 844** for Expo web. Every context was disposable, initialized with synthetic existing demo records/session flags. No real browser profile, database or existing device storage was edited. Storage failures were injected at the Web Storage boundary used by these browser runtimes.

Exact harness commands:

```sh
node D:/LabAssist/.verification-backend-20261113/browser-checks.cjs
node D:/LabAssist/.verification-backend-20261113/mobile-checks.cjs
```

Desktop web: **5/5 scenario groups passed**:

- Department account edit/provisioning, pending activation, multi-supervisor group edit/history, failed account/group saves retaining input/selections, reload and preservation of pre-existing messages/unknown metadata.
- Student task creation/completion/reload, failed task save retaining input, existing task preservation, weekly draft save/submission, and separate editable draft preserving submitted content/version history.
- Supervisor feedback stored against the current submitted version, failed save retaining feedback, and unchanged submission content after reload.
- Workshop dated attendance, failed attendance save, table release/reallocation with retained history/free capacity, handover/return history and reload.
- Malformed Department data remains untouched and produces the load error.

Expo web: **9/9 scenario groups passed**:

- Native dashboard task failure/retry/reload with existing custom tasks/root metadata retained.
- Task creation, failed-save input preservation and duplicate-click handling.
- Project details edit/failure/retry/reload.
- Private weekly draft failure/retry/reload and resubmission preserving the earlier submitted snapshot.
- Supervisor feedback on the exact native submission version, including a failed-save retry.
- Department account/group edits, failed-save preservation, metadata retention and multi-supervisor membership history.
- Workshop attendance failure/retry/history/reload.
- Workshop table release/reallocation, failed saves, dated assignment history, handover failure/retry/return history/reload.
- Malformed native workspace remains untouched, rejects writes, and successfully reloads restored data through Retry.

Results, screenshots, JUnit and build/lint logs remain in `D:\LabAssist\.verification-backend-20261113`. Harnesses are local verification artifacts outside the repository, not new application dependencies.

## Limits

These were scripted browser runtime checks, not a physical-device/manual OS certification. No Android emulator/ADB device or iOS runtime was available; native AsyncStorage/filesystem/module behavior on Android/iOS remains unverified. The actual Ubuntu/Node 22 GitHub jobs still require a user-authorized commit/push/rerun; none was performed. Department has no unit-test command. Checks do not establish real authentication, backend authorization, delivery, cross-origin synchronization or exhaustive locale/accessibility coverage. No database acceptance commands were run or database data modified.
