# Shared web demo login

All four web roles use **Noor's existing login page** at
`frontend/student/src/routes/login.tsx`: **http://localhost:8080/login** in
development. Its engineering workbench asset, role selector, circuit lighting,
animation timings and **Use demo details** button remain in use. Supervisor's
old `/login` and Workshop's `/login` only redirect to this page.

## Start the apps

Run each command in a separate terminal at the repository root:

| Application | Command | Normal entry / dashboard |
| --- | --- | --- |
| Student and shared login | `npm run dev:student` | `http://localhost:8080/` |
| Supervisor | `npm run dev:supervisor` | `http://localhost:5174/` → `/supervisor/dashboard` |
| Workshop Manager | `npm run dev:workshop` | `http://localhost:5175/` → `/dashboard` |
| Department Head | `npm run dev:department` | `http://localhost:5176/` |

The development ports are explicit and strict: an occupied port causes an error
rather than moving an application to an unexpected port. Development URL
defaults retain the current hostname and protocol, including LAN hostnames.
Keep Student running for fresh sign-ins. Valid saved demo sessions can open
their own app without contacting the login server.

## Demo credentials and validation

All roles use **`Noor123!`**. The chosen role's details and the demo limitation
are displayed on Noor's page, and **Use demo details** fills the form.

| Role | Demo identifier | Identifier convention |
| --- | --- | --- |
| Student | `noor@demo.com` | University email field; this is the existing demo email |
| Supervisor | `1024` | Exactly four digits |
| Workshop Manager | `10001` | Exactly five digits |
| Department Head | `head@demo.com` | Existing email convention |

Email-shaped identifiers are checked before the existing exact demo-credential
comparison. Incorrect identifiers/passwords stay on the same login page.

## URL configuration

Copy each app's `.env.example` to `.env.local` and fill the values where needed.
Vite reads these values at server start/build time. Application-root URLs must
not contain credentials, query parameters or fragments; do not put dashboard
paths into them.

**Student / shared-login app**:

```dotenv
VITE_STUDENT_URL=https://students.example.edu/
VITE_SUPERVISOR_URL=https://supervisors.example.edu/
VITE_WORKSHOP_URL=https://workshop.example.edu/
VITE_DEPARTMENT_URL=https://department.example.edu/
VITE_DEMO_MODE=true
```

Student's own URL is optional when its current origin/root is correct. The
other three destination URLs are required outside Vite development mode. Their
dashboard paths are appended by the shared helper, not configured as separate
login implementations.

**Supervisor, Workshop and Department**:

```dotenv
VITE_LOGIN_URL=https://students.example.edu/login
VITE_DEMO_MODE=true
```

Their existing `VITE_STUDENT_URL` root setting is also supported as an
alternative to `VITE_LOGIN_URL`; the helper appends `login`. Missing destination
or login configuration produces an explicit error instead of silently choosing
a localhost or same-origin application. Outside development, the demo must be
explicitly enabled with `VITE_DEMO_MODE=true` in every app. This opt-in does not
turn it into production authentication.

## Cross-origin demo sessions

`shared/web/demoSession.ts` coordinates browser-only demo sessions. It has no
React or new package dependencies. A successful demo credential check records
only a role, expected destination origin and a 30-minute pending-handoff expiry
on the login origin. It then navigates to the normal dashboard URL.

Before mounting its providers, a destination without a valid session opens a
hidden instance of the same Student `/login` page in transport mode. The two
windows exchange origin-checked `postMessage` messages; the shared page consumes
the pending handoff, and the destination writes its own existing demo-session
flag. No password, token, account record or personal data travels in a URL or
in these messages. Request IDs are only message-correlation values. URL query
flags identify the requested role, signed-out notice or iframe transport mode;
they never establish a session by themselves.

| Role | Session storage key | Signed-in value (JSON) |
| --- | --- | --- |
| Student | `labassist.student.session` | `"signed-in"` |
| Supervisor | `labassist.supervisor.session` | `"signed-in"` (existing key) |
| Workshop | `labassist.workshop.signedOut` | `false` (existing key) |
| Department | `labassist.department.session` | `"signed-in"` |

Absent, malformed or signed-out flags require shared login. Explicit existing
Supervisor/Workshop signed-in values remain valid. Defaults no longer create a
session just by opening the app. Logging out retains Supervisor's existing
`signOut` cleanup and Workshop's dialog/state cleanup, writes the signed-out
flag before navigation, and returns to the shared login. Student's sidebar has
a logout action; Department's existing return-to-login links end its demo
session. Only session/pending-handoff flags are changed; saved profile,
attendance, messages, groups and other business data are not cleared. Back-page
restoration and same-origin cross-tab sign-out also recheck the flag.

This mechanism is intended for the current local demo (the same hostname on
different development ports). Embedding the login origin and browser storage
must be permitted. Unrelated-site iframe storage partitioning or CSP/frame
restrictions may prevent the handoff: an explicit error is shown and no
dashboard is mounted. A timeout also explains how to start/configure Student;
it does not repeatedly redirect. Supported hosted-demo arrangements need manual
verification of origin/storage/framing policies.

These flags, public credentials, client-side role checks and messages are
editable by browser users. **They are not secure authorization or backend
authentication.** Real authentication requires a separate server design. No API,
database integration or mobile login behavior is added here.

## Department preview transfer

The existing `labassist.department.preview` key, shared background and visual
theme are unchanged. When Student's legacy origin contains Department preview
data, successful Department login still opens its existing export/import tool
before continuing. The pending handoff allows 30 minutes for this operation.
If it expires, sign in again; imported data and original data remain intact.
The standalone transfer pages and their scripts remain independent of the
session guards. See [Department transfer instructions](../frontend/department/README.md).

## Manual verification (not performed)

1. In a fresh browser profile, open each normal entry URL. All four should open
   Noor's Student `/login`, preselecting the requested role. Verify the original
   workbench, animations and demo button; Supervisor's old design and Workshop's
   old signed-out sign-in card should never appear.
2. Student: check invalid email/password feedback, use `noor@demo.com` /
   `Noor123!`, and verify `/`, refresh persistence, existing features and sidebar
   logout. Check browser Back after logout.
3. Supervisor: check four-digit validation, sign in as `1024`, verify
   `/supervisor/dashboard` and refresh. Confirm logout through its existing
   dialog, then sign in again without a redirect loop. Check its `/login` URL.
4. Workshop: check five-digit validation, sign in as `10001`, verify
   `/dashboard`, attendance/messages persistence and refresh. Confirm logout and
   re-entry through shared login. Check its `/login` URL.
5. Department: sign in as `head@demo.com`, verify its independent `/`, all tabs,
   dialogs, background and saved preview records. Exercise legacy data transfer,
   refresh and every return-to-login link, then sign in again.
6. Check valid existing Supervisor/Workshop flags, malformed/signed-out flags,
   cross-tab logout, blocked storage, unavailable Student server, missing hosted
   URL configuration and demo opt-in. Confirm clear errors and no redirect loops.
7. Inspect navigation URLs and verify that none contain credentials, session
   values, account data or handoff secrets. Verify intended hosted-demo framing
   and storage policies separately.

Static review and TypeScript diagnostics do not verify browser handoff behavior,
appearance or hosting policies. No tests, builds or browser automation were run.
