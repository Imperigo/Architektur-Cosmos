# VPN zum Home-PC — Schritt-für-Schritt (Wiederaufnahme der Remote-Verbindung)

**Owner-Auftrag 21.07.2026:** «schritt für schritt … wie wir über vpn wieder
verbindung mit home pc aufnehmen können; hauptchat bleibt hier, aber soll
auf home pc zugreifbar werden». Grundlage: das bestehende
`docs/FIREWALL-KONZEPT.md` (WireGuard/`wg0`, Ports 8600/8700/11434) und die
Remote-Betriebsart aus `docs/BETRIEBSARTEN.md`.

## Zuerst die wichtigste Klarstellung

**Der Hauptchat braucht KEIN VPN.** Diese Claude-Session läuft in der
Cloud — auf dem Home-PC einfach im Browser `claude.ai` öffnen und
einloggen: es ist dieselbe Session, gleicher Stand, von jedem Gerät.

**Das VPN braucht ihr für KosmoOrbit-Remote:** damit die App (Laptop
unterwegs, iPad — oder später die HomeStation-Dienste) den Home-PC
erreicht: Kosmo-Bridge `:8600`, Sync `:8700`, Ollama `:11434`.

**Ehrliche Grenze:** Diese Cloud-Session selbst kann NICHT ins VPN
(ephemerer Container, Ausgang nur über einen HTTPS-Proxy, kein
WireGuard-UDP). Alles unterhalb machst du auf deinen Geräten; ich liefere
die Befehle und prüfe danach mit dir die Ergebnisse (du kopierst mir die
Ausgaben in den Chat). Optionaler Schritt 8 zeigt den einzigen Weg, wie
auch die Cloud-Session den Home-PC erreichen könnte.

## Empfohlener Weg: Tailscale (WireGuard-basiert, kein Router-Gefummel)

Tailscale steht bereits als Werkzeug im Betriebsarten-Katalog
(`BETRIEBSARTEN.md` Z.49). Vorteil gegenüber purem WireGuard: kein
Port-Forwarding am Router, funktioniert hinter jedem NAT, Geräte sehen
sich unter stabilen `100.x.y.z`-Adressen. (Der gehärtete Pur-WireGuard-Weg
steht fertig in `FIREWALL-KONZEPT.md` — Schritt 7 unten übernimmt dessen
ufw-Regeln sinngemäss.)

### Schritt 1 — Home-PC (Ubuntu): Tailscale installieren
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Der `up`-Befehl zeigt eine Login-URL — im Browser öffnen, mit einem
Konto anmelden (Google/GitHub/Apple/E-Mail). Danach:
```bash
tailscale ip -4
```
→ notiere die Adresse, z. B. `100.87.3.2`. **Das ist ab jetzt die
VPN-Adresse deines Home-PCs** (genau die `remoteHost`-Adresse, die das
Firewall-Konzept meint).

### Schritt 2 — Zweitgerät (Laptop und/oder iPad)
- Laptop (Ubuntu/macOS/Windows): Tailscale installieren, **mit demselben
  Konto** anmelden.
- iPad: Tailscale aus dem App Store, gleiches Konto, VPN-Profil erlauben.

### Schritt 3 — Sichtverbindung prüfen (vom Zweitgerät)
```bash
ping 100.87.3.2        # deine Adresse aus Schritt 1
```
Antwortet der Home-PC, steht der Tunnel.

### Schritt 4 — KosmoOrbit-Dienste auf dem Home-PC starten
Im Repo-Ordner auf dem Home-PC (bzw. nach Installation der .deb für die
App selbst — die Dienste laufen aus dem Repo):
```bash
cd kosmo-orbit
python3 tools/homestation-bridge/kosmo_bridge/main.py --port 8600 &   # echte Bridge (ohne --fake)
node tools/sync-server/src/server.mjs &                                # Yjs-Sync :8700
# optional, für Kosmo-Remote-LLM:
ollama serve                                                           # :11434
```

### Schritt 5 — Dienste ans VPN binden lassen + lokal prüfen
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8600/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8700/
```
Beide antworten? Dann vom **Zweitgerät** dasselbe gegen `100.87.3.2`.

### Schritt 6 — KosmoOrbit (App auf dem Zweitgerät) auf Remote stellen
In der App: **Einstellungen → Betriebsart → Remote**, als Host die
Tailscale-Adresse eintragen — Bridge `http://100.87.3.2:8600`, Sync
`ws://100.87.3.2:8700`, Ollama `http://100.87.3.2:11434`. (Die
Startsequenz seit 584 zeigt dir ehrlich «BRIDGE — VERBUNDEN», sobald es
stimmt.)

### Schritt 7 — Firewall auf dem Home-PC härten (aus FIREWALL-KONZEPT.md)
Tailscale-Interface heisst `tailscale0` (statt `wg0` im Konzept):
```bash
sudo ufw default deny incoming
sudo ufw allow in on tailscale0 to any port 8600 proto tcp comment 'Kosmo-Bridge über VPN'
sudo ufw allow in on tailscale0 to any port 8700 proto tcp comment 'Kosmo-Sync über VPN'
sudo ufw allow in on tailscale0 to any port 11434 proto tcp comment 'Ollama über VPN'
sudo ufw enable && sudo ufw status verbose
```
Ergebnis: **kein einziger Kosmo-Port ist aus dem Internet erreichbar** —
nur über den Tunnel (Verteidigung in der Tiefe wie im Konzept; die
TLS-Terminierung via Caddy aus FIREWALL-KONZEPT §Remote bleibt als
Ausbaustufe möglich).

### Schritt 8 (optional, NUR bei Bedarf) — Cloud-Session → Home-PC
Soll auch DIESE Cloud-Session (Claude) die Bridge erreichen (z. B. echte
statt Fake-Renders in E2E), gibt es genau einen sauberen Weg:
`tailscale funnel 8600` veröffentlicht die Bridge als HTTPS-URL.
**Achtung:** Funnel macht den Port im Internet erreichbar (TLS, aber ohne
Tailscale-Login-Zwang) — nur einschalten, wenn wir es brauchen, idealerweise
mit einem Auth-Token vor der Bridge, und danach wieder
`tailscale funnel off`. Standard-Empfehlung: AUS lassen; die Cloud-Session
arbeitet weiter mit der Fake-Bridge.

## Prüfliste am Ende
| Prüfung | Erwartung |
|---|---|
| `tailscale status` auf beiden Geräten | beide online, 100.x-Adressen |
| `curl http://100.x:8600/health` vom Zweitgerät | 200 |
| KosmoOrbit-Startsequenz auf dem Zweitgerät | «BRIDGE — VERBUNDEN» |
| `sudo ufw status` auf dem Home-PC | deny incoming; 8600/8700/11434 nur auf tailscale0 |
| Router | KEINE Portweiterleitungen nötig |
