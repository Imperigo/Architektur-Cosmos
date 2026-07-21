#!/usr/bin/env bash
# KosmoOrbit HomeServer-Update (andrins-workstation)
# Holt den neusten Stand des Entwicklungs-Branches, baut die App und
# startet die systemd-Dienste neu — damit iPad/Mac sofort die neue
# Version sehen. Aufruf auf dem Home-PC:
#   ~/Architektur-Cosmos/kosmo-orbit/tools/homeserver-update.sh
set -euo pipefail

BRANCH="claude/kosmo-orbit-v1-build-pzxkbj"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$REPO_ROOT"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$REPO_ROOT/kosmo-orbit"
npm install
npm run build

if systemctl list-unit-files kosmo-app.service >/dev/null 2>&1 \
   && systemctl is-enabled kosmo-app.service >/dev/null 2>&1; then
  sudo systemctl restart kosmo-app kosmo-bridge kosmo-sync
  systemctl --no-pager --lines=0 status kosmo-app kosmo-bridge kosmo-sync | grep -E 'service|Active'
else
  echo "Hinweis: systemd-Dienste noch nicht eingerichtet"
  echo "(Einrichtung: docs/HOMEPC-WORKER-PROMPT.md) — App-Preview manuell neu starten."
fi

echo "HomeServer steht auf: $(git -C "$REPO_ROOT" log --oneline -1)"
