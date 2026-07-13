#!/bin/bash
# SessionStart-Hook für KosmoOrbit (Claude Code on the web).
#
# ZWECK 1 — Rollback-Riegel (der eigentliche Grund für diesen Hook):
#   Der Web-Container wird gelegentlich auf einen ÄLTEREN Commit zurückgerollt
#   (Snapshot-Restore). Ohne Gegenmassnahme fängt eine neue Sitzung dann auf
#   veralteter Historie an zu arbeiten (z.B. v0.6.6 statt v0.7.7) und baut
#   längst archivierte Stände nach. Dieser Hook holt den echten Remote-Kopf und
#   setzt lokal HART darauf zurück — ABER nur, wenn der lokale HEAD ein Vorfahre
#   von origin ist (= die Rollback-Signatur). Bei echten lokalen Zusatz-Commits
#   (voraus oder divergiert) wird NICHT angefasst, nur gewarnt.
#
# ZWECK 2 — Abhängigkeiten für Tests/Linter (npm workspaces unter kosmo-orbit/).
#
# Der Hook läuft synchron und darf die Sitzung NIE hart abbrechen — jeder
# Schritt ist mit `|| true` abgesichert. Diagnose geht nach stdout, damit der
# Agent im Kontext sieht, auf welchen Stand synchronisiert wurde.

set -uo pipefail

BRANCH="claude/kosmo-orbit-v1-build-pzxkbj"
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
cd "$ROOT" 2>/dev/null || exit 0

echo "[session-start] KosmoOrbit — Rollback-Riegel + Setup (Branch $BRANCH)"

# ── Rollback-Riegel: immer vom echten Remote-Kopf ausgehen ────────────────
if git rev-parse --git-dir >/dev/null 2>&1; then
  for i in 1 2 3; do
    git fetch origin "$BRANCH" >/dev/null 2>&1 && break || sleep $((i * 2))
  done
  LOCAL="$(git rev-parse HEAD 2>/dev/null || echo '')"
  REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo '')"
  if [ -z "$REMOTE" ]; then
    echo "[session-start] WARNUNG: origin/$BRANCH nicht erreichbar (Netz?) — lokaler Stand bleibt unverändert."
  elif [ "$LOCAL" = "$REMOTE" ]; then
    echo "[session-start] OK: lokal == origin/$BRANCH (${REMOTE:0:12}). Aktueller Stand."
  elif git merge-base --is-ancestor HEAD "origin/$BRANCH" 2>/dev/null; then
    echo "[session-start] ROLLBACK erkannt: lokal ${LOCAL:0:12} liegt HINTER origin/$BRANCH ${REMOTE:0:12}."
    if git reset --hard "origin/$BRANCH" >/dev/null 2>&1; then
      echo "[session-start] → hart auf den Remote-Kopf synchronisiert. Immer von HIER ausgehen."
    else
      echo "[session-start] WARNUNG: reset --hard fehlgeschlagen — bitte manuell 'git reset --hard origin/$BRANCH'."
    fi
  else
    echo "[session-start] WARNUNG: lokal ${LOCAL:0:12} weicht von origin/$BRANCH ${REMOTE:0:12} ab (voraus/divergiert)."
    echo "[session-start] KEIN Auto-Reset (könnte echte lokale Commits verwerfen) — bitte Historie prüfen."
  fi
  # Sichtbarer Versions-Label aus der Marker-Datei (falls vorhanden).
  if [ -f STAND.md ]; then
    head -n 3 STAND.md | sed 's/^/[session-start] /'
  fi
fi

# ── Abhängigkeiten (npm workspaces) ───────────────────────────────────────
if [ -f kosmo-orbit/package.json ]; then
  echo "[session-start] npm install (kosmo-orbit workspaces) …"
  ( cd kosmo-orbit && npm install >/dev/null 2>&1 ) \
    && echo "[session-start] npm install fertig." \
    || echo "[session-start] WARNUNG: npm install nicht sauber durchgelaufen — bitte manuell prüfen."
fi

echo "[session-start] fertig."
exit 0
