# HOMESERVER-STATUS — andrins-workstation (verifiziert 22.07.2026, lokaler Worker)

Gegengeprüfter Ist-Zustand des KosmoOrbit-Servers (Quelle: Abschlussbericht
des lokalen Home-PC-Workers im Owner-Chat, 07:16; Cloud-Gegenprüfung durch
Fable — Konsistenz der Beweise bestätigt, s. unten).

## Dienste (systemd, überleben Reboot — 2× echte Reboot-Probe, 2. Lauf 4/4)
- `kosmo-bridge` — `.venv/bin/python … --host 100.88.48.73 --port 8600`,
  Token via `/etc/kosmo/bridge.env` (root:andrin-baumann 640). Beweise:
  `/health` 200 (per Code token-frei, main.py:191), `/jobs` OHNE Token 401,
  MIT Token 200.
- `kosmo-sync` — **Abweichung von §9, behoben ab 0.9.0 (E-S,
  Repo-Seite; Unit-Rückbau beim nächsten Server-Worker-Lauf):** lief über
  `/usr/local/bin/tsx`, weil `tools/sync-server` das TS-only-Paket
  `@kosmo/lizenz` importiert und Ubuntu-Node 22.22 kein Type-Stripping kann
  (ERR_NO_TYPESCRIPT); dazu `npm install` in tools/sync-server (gitignored
  Deps @hocuspocus/*). E-S baut `@kosmo/lizenz` jetzt einen JS-`dist`
  (`packages/kosmo-lizenz/tsconfig.build.json`, `npm run build -w
  @kosmo/lizenz` — im Workspace-`npm run build` mit eingeschlossen); der
  Subpfad `@kosmo/lizenz/verify` (den nur `tools/sync-server` nutzt) zeigt
  jetzt auf `dist/lizenz.js` statt `src/lizenz.ts` — `server.mjs` selbst
  ist unverändert (kein Protokoll-/Verhaltens-Byte angefasst) und läuft
  node-only bewiesen: purer `node --no-experimental-strip-types` (simuliert
  das fehlende Type-Stripping des Ubuntu-Node-Builds; der Sandbox-Container
  hat es serienmässig, im Unterschied zum Owner-Server) ohne `tsx` im PATH
  antwortet 200 auf `GET /raeume`. **Offener Handgriff (Maschinenseite,
  nicht Repo):** die LIVE-Unit auf dem Owner-Server noch auf `ExecStart=
  /usr/bin/node tools/sync-server/src/server.mjs` zurückstellen (Vorlage
  in `docs/VPN-HOMEPC-ANLEITUNG.md` §9 war schon korrekt — nur die
  tatsächlich laufende Unit wich per Hand auf tsx ab), davor `npm run
  build -w @kosmo/lizenz` sowie ein `npm install` in `tools/sync-server`
  selbst (eigenes npm-Projekt, ausserhalb der Root-Workspaces) sicherstellen,
  dann `sudo systemctl daemon-reload && sudo systemctl restart kosmo-sync`.
  `tools/homeserver-update.sh` fährt bereits `npm run build` im Workspace —
  das baut den lizenz-dist ab jetzt automatisch mit; nur das `ExecStart`
  der schon laufenden Unit ändert sich dadurch nicht von selbst.
- `kosmo-app` — `npx vite preview --host --port 5183` (iPad-Quelle).
- `ollama` — Bestandsinstallation `/mnt/data/tools/ollama` (73 GB Modelle),
  Systemunit mit `OLLAMA_HOST=0.0.0.0`; Alt-Konflikt (User-Unit
  kosmo-ollama auf 127.0.0.1:11434) per umkehrbarem Drop-in neutralisiert.
  LLM-Beweis: llama3.2 antwortet in ~2 s.
- `kosmo-reboot-check` (oneshot) — Boot-Selbstprüfung nach
  `~/kosmo-reboot-check.log`.

## Auto-Update (NEU, ändert das Zustell-Ritual)
`kosmo-autoupdate.timer` (15 min, Persistent): zieht bei NEUEN Commits auf
`claude/kosmo-orbit-v1-build-pzxkbj` automatisch `git pull` +
`tools/homeserver-update.sh` (Build + Dienst-Neustart); verwirft nur
package-lock-Rauschen, bricht bei anderen lokalen Änderungen ab. Live
bewiesen (ce0b8dc automatisch deployt).
**Konsequenz A (RELEASE-ABLAUF §7 angepasst):** der iPad-Schritt der
Doppel-Zustellung geschieht automatisch ≤15 min nach dem Release-Push.
**Konsequenz B (Betriebsregel für den Cloud-Worker):** JEDER Push auf den
Branch deployt binnen 15 min auf den Owner-Server — die bestehende
Gate-Disziplin (kein Commit ohne grüne Gates) ist damit auch
BETRIEBS-kritisch, nicht nur repo-hygienisch. Falls das je stört:
Umschaltbar auf Nur-Release-Deploys (Filter auf 🚀-Commits) — Owner-Entscheid.

## Firewall / Exposition
ufw deny incoming; 8600/8700/5183/11434 NUR auf tailscale0 (v4+v6);
Anti-Spoofing ts-input; `tailscale funnel status` leer = nichts im
Internet. Kein SSH-Server installiert. Cloud-Worker bleibt ohne Zugriff
(ehrliche Grenze) — Funnel bleibt AUS (Owner-/Doku-Linie).

## Autostart (Login)
Nur noch Notion (Snap notion-snap-reborn) + Firefox→claude.ai/code; drei
Alt-Einträge Hidden=true, Backup ~/autostart-backup-2026-07-21/,
/etc/xdg/autostart unangetastet. sleep/suspend maskiert, tailscaled enabled.

## Peers
Mac vorhanden: macbook-pro-von-andrin = 100.117.120.59 (Ende-zu-Ende-Test
steht aus — E-V-Rundgang).

## Offene Posten aus dem Bericht
1. E-S (0.9.0): Repo-Seite behoben (JS-Build-Weg, `@kosmo/lizenz/dist`,
   node-only-Beweis erbracht) — offen bleibt nur der Maschinen-Handgriff:
   die LIVE-`kosmo-sync`-Unit auf dem Owner-Server von `tsx` zurück auf
   `/usr/bin/node` stellen (nächster Server-Worker-Lauf, s. o.).
2. E-V: Mac-Ende-zu-Ende (Ein-Klick-HomeServer + Token) — erster echter
   Remote-Traffic durch die tailscale0-Regeln.
3. TLS/Caddy: erst wenn die App-Seite `remoteTls` trägt (Folgeposten;
   über Tailscale ist der Verkehr bereits WireGuard-verschlüsselt).


## Fehlerbericht-Eingang (v0.9.0, Owner-Auftrag 22.07.2026)

Die App bündelt ihre Fehlermeldungen (Fehler-Toasts, window-Fehler) und
POSTet sie token-geschützt an die Bridge: `POST /fehlerbericht`. Die Bridge
hängt jede Meldung als JSON-Zeile an:

- `KOSMO_FEHLERBERICHT_PFAD` — Default `~/kosmo-fehlerberichte.jsonl`.
  EMPFOHLEN (damit der Repo-Agent den Eingang liest):
  `~/Architektur-Cosmos/kosmo-orbit/wissen/fehlerberichte/eingang.jsonl`
- `KOSMO_FEHLERBERICHT_GIT=1` — dann committet+pusht die Bridge die Datei
  best-effort auf den Entwicklungs-Branch (eigener Thread, Fehler nur im
  Journal). **Voraussetzung: Push-Rechte des Klons** (Deploy-Key/PAT —
  offener Worker-Punkt; ohne Rechte bleibt die Datei lokal, ehrlich
  geloggt als «push fehlgeschlagen»).

Beide Variablen gehören in die systemd-Unit `kosmo-bridge` (Environment=).
Der Repo-Agent sichtet `wissen/fehlerberichte/eingang.jsonl` vor jedem
Release (RELEASE-ABLAUF §0b) und setzt die Punkte auf die Fix-Liste der
nächsten Version.
