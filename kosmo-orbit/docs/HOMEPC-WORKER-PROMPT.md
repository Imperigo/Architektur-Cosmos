# HOMEPC-WORKER-PROMPT — Server-Einrichtung andrins-workstation

**Zweck:** Diesen Prompt vollständig in eine lokale Claude-Code-Session auf
dem Home-PC kopieren (Terminal: `claude` im Ordner `~/Architektur-Cosmos`).
Der lokale Worker richtet Autostart und die komplette KosmoOrbit-Brücke
vollautomatisch ein. Stand/Kontext: 21.07.2026, Owner-Auftrag im Cloud-Chat.

---

Du bist Claude Code, lokal auf dem Ubuntu-Home-PC «andrins-workstation»
(Benutzer `andrin-baumann`). Du hast vollen Zugriff auf diese Maschine.
Antworte deutsch (Schweizer Schreibung, kein ß). Owner ist Andrin.

## Kontext (verbindlich, nicht neu erforschen)
- Repo liegt unter `~/Architektur-Cosmos`, Branch
  `claude/kosmo-orbit-v1-build-pzxkbj` ist ausgecheckt und gebaut.
- Python-venv existiert: `~/Architektur-Cosmos/kosmo-orbit/.venv`
  (fastapi, uvicorn, python-multipart, httpx installiert — PEP 668).
- Tailscale läuft; Tailnet-IP dieser Maschine: `100.88.48.73`.
- Referenzdokumente im Repo (lesen, sie sind die Wahrheit):
  `kosmo-orbit/docs/VPN-HOMEPC-ANLEITUNG.md` (§9 systemd, §10 iPad) und
  `kosmo-orbit/docs/FIREWALL-KONZEPT.md`.
- Die Bridge (`kosmo-orbit/tools/homestation-bridge/kosmo_bridge/main.py`)
  verlangt bei nicht-lokalem `--host` zwingend `KOSMO_BRIDGE_TOKEN`;
  die Apps senden den Token als Header `X-Kosmo-Token` (Einstellung
  `kosmo.bridge.token`).

## Harte Regeln
1. NICHTS im Repo committen oder pushen — das Repo verwaltet der
   Cloud-Worker. Du änderst nur System-Konfiguration AUSSERHALB des Repos
   (`/etc/…`, `~/.config/…`). Das Repo selbst höchstens `git pull`.
2. Nichts deinstallieren oder löschen. Autostart-Einträge nur
   DEAKTIVIEREN, mit Sicherungskopie.
3. Vor jedem `sudo`-Schritt kurz sagen, was er tut. Am Ende ehrlicher
   Bericht mit rohen Ausgaben — nichts beschönigen.

## Auftrag A — Autostart aufräumen (nur Notion + Claude Code)
Ziel: beim Login starten automatisch NUR noch (1) Notion und (2) Firefox
mit Claude Code (https://claude.ai/code).
1. Bestand sichern: `mkdir -p ~/autostart-backup-2026-07-21 && cp -a
   ~/.config/autostart/. ~/autostart-backup-2026-07-21/ 2>/dev/null`;
   zusätzlich alle systemweiten Einträge aus `/etc/xdg/autostart` nur
   AUFLISTEN (nicht anfassen — das sind Desktop-Basisdienste).
2. Alle vorhandenen Einträge in `~/.config/autostart/` deaktivieren
   (`Hidden=true` anhängen oder `X-GNOME-Autostart-enabled=false`),
   ausser sie gehören zu Notion/Firefox-Claude.
3. Neue Einträge schreiben:
   - `~/.config/autostart/notion.desktop` — starte Notion so, wie es
     installiert ist (prüfe Snap `notion-snap-reborn`/Flatpak/AppImage/
     `which notion`; falls KEINE Notion-App existiert: Firefox-Tab
     `https://notion.so` als Fallback und das im Bericht ausweisen).
   - `~/.config/autostart/claude-code-firefox.desktop` mit
     `Exec=firefox --new-window https://claude.ai/code`.
4. KEINE Server-Dienste in den Autostart legen — die laufen als systemd
   (Auftrag B), unabhängig vom Login.

## Auftrag B — KosmoOrbit-Brücke vollautomatisch (systemd, für ferne Clients)
1. Token erzeugen: `openssl rand -hex 24`. Ablegen in
   `/etc/kosmo/bridge.env` (Inhalt: `KOSMO_BRIDGE_TOKEN=<wert>`;
   `sudo chown root:andrin-baumann /etc/kosmo/bridge.env && sudo chmod 640
   /etc/kosmo/bridge.env`). Den Klartext-Wert am Ende dem Owner anzeigen —
   er trägt ihn auf iPad/Mac als `kosmo.bridge.token` ein.
2. Vier Units anlegen (Vorlagen in VPN-HOMEPC-ANLEITUNG §9, mit diesen
   Abweichungen — sie sind verbindlich):
   - **kosmo-bridge.service**: `ExecStart=/home/andrin-baumann/
     Architektur-Cosmos/kosmo-orbit/.venv/bin/python
     tools/homestation-bridge/kosmo_bridge/main.py --host 100.88.48.73
     --port 8600` · `EnvironmentFile=/etc/kosmo/bridge.env` ·
     `WorkingDirectory=/home/andrin-baumann/Architektur-Cosmos/kosmo-orbit`
     · `User=andrin-baumann` · `After=network-online.target
     tailscaled.service` · `Wants=network-online.target` ·
     `Restart=on-failure` · `RestartSec=5` (der Bind an die Tailnet-IP
     schlägt fehl, solange tailscaled noch nicht bereit ist — der Restart
     fängt das ab).
   - **kosmo-sync.service**: `ExecStart=/usr/bin/node
     tools/sync-server/src/server.mjs`, gleiche Working-Dir/User/After.
     Prüfe mit `which node`, ob node wirklich unter /usr/bin liegt
     (nvm-Installationen liegen woanders — dann absoluten Pfad einsetzen).
   - **kosmo-app.service** (die App fürs iPad, §10): `ExecStart=<absoluter
     npx-Pfad> vite preview --host --port 5183 --strictPort` ·
     `WorkingDirectory=/home/andrin-baumann/Architektur-Cosmos/kosmo-orbit/
     apps/kosmo-orbit` · gleiche User/After/Restart.
   - **Ollama** (Kosmo-Remote-LLM): falls nicht installiert:
     `curl -fsSL https://ollama.com/install.sh | sh` (bringt eigenen
     systemd-Dienst mit), danach `ollama pull llama3.2`. Damit ferne
     Clients zugreifen: `sudo systemctl edit ollama` → `[Service]` +
     `Environment=OLLAMA_HOST=0.0.0.0` → restart. (Zugriffsschutz kommt
     über die Firewall, Auftrag C.)
3. `sudo systemctl daemon-reload && sudo systemctl enable --now
   kosmo-bridge kosmo-sync kosmo-app` und Status aller Dienste prüfen.

## Auftrag C — Firewall härten (ufw)
Reihenfolge wichtig, damit nichts aussperrt:
```bash
sudo ufw allow OpenSSH                # nur falls SSH-Zugriff je gebraucht wird
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0 to any port 8600  proto tcp comment 'Kosmo-Bridge VPN'
sudo ufw allow in on tailscale0 to any port 8700  proto tcp comment 'Kosmo-Sync VPN'
sudo ufw allow in on tailscale0 to any port 5183  proto tcp comment 'KosmoOrbit App VPN'
sudo ufw allow in on tailscale0 to any port 11434 proto tcp comment 'Ollama VPN'
sudo ufw enable && sudo ufw status verbose
```
Ergebnis: kein Kosmo-Port aus dem Internet erreichbar, alles nur durchs
Tailnet. Falls von früheren Tests noch ein Funnel offen ist:
`sudo tailscale funnel reset`.

## Auftrag D — Verifikation + Bericht (Pflicht)
1. `systemctl status kosmo-bridge kosmo-sync kosmo-app ollama --no-pager`
2. Vom PC selbst gegen die Tailnet-IP (so sehen es die fernen Clients):
   - `curl -s -o /dev/null -w "%{http_code}\n" -H "X-Kosmo-Token: <token>"
     http://100.88.48.73:8600/health` → erwartet 200
   - dieselbe Abfrage OHNE Token → erwartet 401/403 (Beweis Token-Schutz)
   - `curl -s -o /dev/null -w "%{http_code}\n" http://100.88.48.73:5183`
     → 200 · `…:8700/` → Antwort · `…:11434/api/tags` → JSON
   - LLM-Beweis: `curl -s http://100.88.48.73:11434/api/generate -d
     '{"model":"llama3.2","prompt":"Sag in einem Satz Hallo an Andrin.",
     "stream":false}'` — Antwort + Dauer in den Bericht.
3. Reboot-Probe: Owner fragen, ob JETZT neu gestartet werden darf; nach
   dem Reboot müssen alle vier Dienste ohne Handgriff laufen (Status +
   die curl-Reihe wiederholen) und nur Notion + Firefox/Claude offen sein.
4. Abschlussbericht: deaktivierte Autostart-Einträge (Liste), Token-Wert,
   Unit-Dateien (Pfade), rohe Prüf-Ausgaben, offene Punkte. Der Owner
   kopiert diesen Bericht in den Cloud-Chat.
