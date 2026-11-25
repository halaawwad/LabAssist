# Change: no account disabling or re-enabling

Date: 2026-11-24. This is a shared Auth/Accounts change, kept separate from Sprint 6 work. Nothing has been staged or committed.

**Requirement:** LabAssist must not let anyone disable or re-enable an account.

## What changed

**Backend** (`backend/api`)
- Removed the `PATCH /v1/accounts/:id/status` route, the `AuthService.status()` method and `StatusDto` (`src/controllers.ts`, `src/auth.service.ts`, `src/dto.ts`). The route now returns 404, and it no longer appears in Swagger.
- Unchanged:
  - account provisioning and the Pending-activation state;
  - invitation resend and activation;
  - login, refresh and logout (which revokes the session);
  - password recovery and reset (which revokes all sessions);
  - the rule that only `ACTIVE` accounts can sign in or hold a session.

**Department web** (`frontend/department/src/Department.tsx`)
- The account row no longer has a Disable or Reactivate button. Delete is shown only for unused accounts.
- If records appear before the delete is confirmed, the dialog shows "Account kept" instead of disabling the account.

**Department mobile** (`mobile/src/features/department/DepartmentScreen.tsx`)
- Removed the "Disable" and "Restore access" menu actions.
- Deleting an account that has records used to disable it silently. It is now refused with a message, and the account is kept.

**Shared** (`shared/web/domain.ts`)
- Removed `toggleAccountAccess`. `AccountStatus` still includes `DISABLED`, and `effectiveAccountStatus` is unchanged, so existing records still read and display correctly.
- The legacy `disabledFrom` field is still accepted on stored department records (`shared/department/records.ts`).

**Tests**
- `backend/api/test/auth.spec.ts`: asserts the status route returns 404 for both `DISABLED` and `ACTIVE`. A *pre-existing* disabled record, set directly in SQL, still cannot sign in.
- `backend/api/test/market.spec.ts`: the inactive-owner test now uses a pre-existing disabled record set in SQL instead of the removed route. No offer behavior changed, and no offer hiding was added.
- `mobile/tests/department.test.cjs`: asserts the helper no longer exists. Preservation of a legacy disabled record is still tested, using a literal record.

**Docs**
- `docs/REQUIREMENTS.md`, `docs/DEPARTMENT-MOBILE-PARITY.md`, `frontend/department/README.md`.

**Not changed**
- Accounts and records: nothing was deleted, and existing disabled accounts were not reactivated.
- Database stages and applied migrations. `DISABLED` stays a valid stored status, and the SQL reader checks (`communication_actor`, the manager uniqueness index and others) still treat it as inactive.
- The department-head-only delete of unused, unlinked local accounts.

## Checks (2026-11-24)

- Backend: `npm run build` passed. The full suite (`npm test`) passed 3 suites, 36/36, on a disposable postgres:17 container.
- Department web: `npm run typecheck` passed.
- Mobile: `npm run typecheck` passed. `node --test tests/department.test.cjs` passed 9/9.
- Not run: browser or Expo UI walkthroughs, `expo lint`, and the other web apps (they don't use the removed helper).

## Separate data decision: existing disabled records

These need an owner decision; no code here changes them.
- `backend/database/semester-demo/seed.sql` (frozen stage SQL) inserts previous-term demo students with status `DISABLED`. The stage 8 marketplace seed relies on one of them as the owner of a "previous-student" seller.
- Real databases may already hold `DISABLED` accounts from the removed route. None were queried.
- Local department previews (web `labassist.department.preview` and the mobile department keys) may hold accounts with `active: false` or `DISABLED`, plus `disabledFrom`.
- Options include:
  - keeping them as read-only historical records (the current behavior);
  - converting them to another status through a reviewed migration;
  - re-inviting the people concerned.

  Until that's decided they stay unable to sign in, and nothing reactivates them automatically.

## Coordination with Noor

This removes a Sprint 1 Auth/Accounts endpoint that Noor's unpublished work may call or test. Please confirm with Noor:
1. No branch or client calls `PATCH /v1/accounts/:id/status`, or uses `StatusDto` or `AuthService.status()`.
2. No branch uses `toggleAccountAccess` from `shared/web/domain.ts`.
3. The data decision above, especially before any migration touches `accounts.status`.
4. Any merge conflict in `controllers.ts`, `auth.service.ts` or `dto.ts` should keep this removal.
