# Web CI build contexts

Use Node 22. Student additionally uses Bun 1.3.3 and its committed
`frontend/student/bun.lock`. Supervisor and Workshop use their own
`package-lock.json` files with `npm ci`. Department uses the root npm workspace
lockfile with `npm ci --workspace frontend/department --include-workspace-root=false`.

The web apps import branding, assets and demo-session code from `shared/web`.
Do not flatten an application into the root of a temporary directory: relative
imports assume `frontend/<role>` and `shared/web` are siblings under a repository
root. `.github/scripts/prepare-web-workspace.sh` preserves those paths for the
three standalone jobs. Its temporary root `node_modules` link makes shared React
modules resolve the app's own locked dependencies, rather than a second copy of
React or dependencies from another role.

The Department job keeps the full checkout layout and installs only the
Department workspace. Native optional dependencies in the root lockfile must
include platform metadata for Linux, not just the Windows binaries present on a
developer's machine. The Rolldown, Lightning CSS and Tailwind Oxide platform
entries are pinned to the existing parent package versions.

## Reproduce standalone jobs on Linux

Start from a clean checkout without local `node_modules` or build output:

```bash
export RUNNER_TEMP="$(mktemp -d)"
export GITHUB_ENV="$RUNNER_TEMP/check-env"
bash .github/scripts/prepare-web-workspace.sh student
bash .github/scripts/prepare-web-workspace.sh supervisor
bash .github/scripts/prepare-web-workspace.sh workshop
source "$GITHUB_ENV"

cd "$STUDENT_CHECK_DIR"
bun install --frozen-lockfile
bun run build # Generates TanStack route metadata as in static-analysis CI.
bun run typecheck
bun run lint
bun run test

cd "$SUPERVISOR_CHECK_DIR"
npm ci
npm run lint
npm run typecheck
npm test
npm run build

cd "$WORKSHOP_CHECK_DIR"
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run Department checks from the repository root:

```bash
npm ci --workspace frontend/department --include-workspace-root=false
npm run typecheck --workspace frontend/department
npm run build:department
```

The `crypto-js` browser-externalization warning about `node:crypto` also appears
in a successful Student production build. It is separate from an unresolved
`shared/web` import and does not by itself indicate a build failure.
