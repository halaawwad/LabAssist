# Department Head

Independent Vite/React application. The existing Department Head component,
groups, messages, validation and responsive CSS have been moved from the Student
app. It opens at `/`; it does not depend on the Student router or providers.
The shared background and favicon are local assets. Fresh sign-ins use Noor's
shared login in the Student app; a saved valid demo session can display the
interface without the Student server. Account invitations and messages remain local
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
   activation invitation notices, and delete vs. enable/disable confirmations.
3. Create student/supervisor accounts, then add/edit a group with 2–3 students
   and multiple supervisors. Verify selection limits, inactive/assigned-student
   restrictions, search, and reload persistence.
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
