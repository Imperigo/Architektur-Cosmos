# HOMESERVER-STATUS — andrins-workstation (verifiziert 22.07.2026, lokaler Worker)

Gegengeprüfter Ist-Zustand des KosmoOrbit-Servers (Quelle: Abschlussbericht
des lokalen Home-PC-Workers im Owner-Chat, 07:16; Cloud-Gegenprüfung durch
Fable — Konsistenz der Beweise bestätigt, s. unten).

## Dienste (systemd, überleben Reboot — 2× echte Reboot-Probe, 2. Lauf 4/4)
- `kosmo-bridge` — `.venv/bin/python … --host 100.88.48.73 --port 8600`,
  Token via `/etc/kosmo/bridge.env` (root:andrin-baumann 640). Beweise:
  `/health` 200 (per Code token-frei, main.py:191), `/jobs` OHNE Token 401,
  MIT Token 200.
- `kosmo-sync` — **Abweichung von §9:** läuft über `/usr/local/bin/tsx`,
  weil `tools/sync-server` das TS-only-Paket `@kosmo/lizenz` importiert und
  Ubuntu-Node 22.22 kein Type-Stripping kann (ERR_NO_TYPESCRIPT); dazu
  `npm install` in tools/sync-server (gitignored Deps @hocuspocus/*).
  → Repo-Posten E-S in V090-SPEZ: JS-Build für den Sync-Pfad, dann fällt
  tsx weg.
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
1. E-S (0.9.0): Sync-Server ohne tsx lauffähig machen (JS-Build-Weg).
2. E-V: Mac-Ende-zu-Ende (Ein-Klick-HomeServer + Token) — erster echter
   Remote-Traffic durch die tailscale0-Regeln.
3. TLS/Caddy: erst wenn die App-Seite `remoteTls` trägt (Folgeposten;
   über Tailscale ist der Verkehr bereits WireGuard-verschlüsselt).
