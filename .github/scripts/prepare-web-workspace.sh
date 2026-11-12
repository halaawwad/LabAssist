#!/usr/bin/env bash
set -euo pipefail

# Keep repository-relative shared imports valid without installing other apps.
role="${1:?Usage: prepare-web-workspace.sh student|supervisor|workshop}"
case "$role" in
  student|supervisor|workshop) ;;
  *) echo "Unsupported standalone web role: $role" >&2; exit 1 ;;
esac

target="${RUNNER_TEMP:?RUNNER_TEMP must be set}/labassist-$role"
app="$target/frontend/$role"
mkdir -p "$app" "$target/shared"
cp -a "frontend/$role/." "$app/"
cp -a shared/web "$target/shared/"

# Shared React modules use the same locked React/lucide installation as the app.
# The link can be created before the install and remains valid after npm ci.
ln -s "$app/node_modules" "$target/node_modules"
echo "${role^^}_CHECK_DIR=$app" >> "${GITHUB_ENV:?GITHUB_ENV must be set}"
