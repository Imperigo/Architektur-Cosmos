# Firewall- & Netzarchitektur-Konzept (Serie I / Batch B8, R10)

> Ehrlich vorab: der Owner-Wunsch «Firewall» ist zu grossen Teilen
> **Host-/Router-Arbeit** — eine echte `ufw`/`nftables`-Regel, ein WireGuard-Tunnel
> oder ein TLS-Zertifikat lassen sich nicht aus einer Cloud-Build-Umgebung heraus
> auf der HomeStation durchsetzen. Was hier geliefert wird: das **Regelwerk als
> Konzept**, die **App-seitige Kopplung** (`betrieb.ts` kann `wss`/`https` statt
> `ws`/`http` bauen, wenn TLS terminiert ist) und ein **Prüfskript**
> (`tools/netz-check.mjs`), das die real prüfbaren Teile davon testet. R10
> («Remote-Betrieb über Klartext abgehört») gilt erst mit der tatsächlichen
> HomeStation-Umsetzung als geschlossen — dieses Dokument beschreibt, wie diese
> Umsetzung aussehen muss.

## 1 · Die drei Betriebsarten und ihr Netz-Bedarf

KosmoOrbit kennt genau drei Betriebsarten (`packages/kosmo-ai/src/betrieb.ts`,
`betriebKonfig()`). Jede hat ein eigenes, sehr unterschiedliches Netzprofil:

### Standard (HomePC)

Alle Dienste laufen auf demselben Rechner, den der Nutzer bedient — Bridge
(Render/STT/TTS, Port `8600`), Sync (Yjs, Port `8700`) und Ollama (LLM, Port
`11434`). Der Bedarf ist minimal:

- **Bind-Ziel:** `127.0.0.1` (rein lokal am selben Rechner) oder, wenn ein
  zweites Gerät im selben Büro-LAN mitarbeiten soll (z.B. iPad via Sync-Server),
  die LAN-Schnittstelle — **nie** `0.0.0.0` ohne Firewall davor.
- **Keine Internet-Inbound-Ports.** Diese drei Ports haben im Router **nichts**
  verloren — kein Portforwarding, keine DMZ.
- Der Router-NAT allein reicht in der Praxis oft schon (kein Portforwarding =
  von aussen unerreichbar), eine explizite Default-Deny-Regel auf dem Host
  selbst ist trotzdem die robustere, konfigurationsfehler-tolerante Variante
  (siehe Checkliste unten).

### Remote (VPN)

Der Laptop/das MacBook greift von unterwegs auf denselben HomePC zu — über
`remoteHost` in `betrieb.ts`. Das darf **niemals** heissen, dass Port
8600/8700/11434 direkt ins offene Internet gestellt werden:

- **Zugang ausschliesslich über einen VPN-Tunnel** (WireGuard oder gleichwertig,
  siehe `docs/BETRIEBSARTEN.md`, Werkzeug «VPN (Tailscale/WireGuard)»). Der
  `remoteHost` ist die VPN-Tunneladresse (z.B. `100.87.3.2`), nicht die
  öffentliche IP des Routers.
- **TLS-Terminierung** zusätzlich zum VPN-Tunnel: ein Reverse-Proxy (Caddy,
  nginx, traefik) auf der HomeStation terminiert `wss`/`https`, idealerweise mit
  mTLS (Client-Zertifikat), bevor die Anfrage an Bridge/Sync/Ollama weitergeht.
  Das ist **Verteidigung in der Tiefe**: WireGuard verschlüsselt den Tunnel
  bereits, aber eine zusätzliche TLS-Schicht schützt auch, falls der Proxy
  versehentlich über den Tunnel hinaus erreichbar wird, und macht den
  `KOSMO_SYNC_TOKEN` (siehe `tools/sync-server/README.md`) nicht mehr im
  Klartext mitlesbar.
- **Keine direkte Portfreigabe im Router** für 8600/8700/11434 — der einzige
  vom Internet aus erreichbare Port ist der WireGuard-UDP-Port (typischerweise
  `51820`), sonst nichts.
- Die App baut in diesem Modus mit `betriebKonfig({ betriebsart: 'remote',
  remoteHost, remoteTls: true })` automatisch `https://`/`wss://`-Adressen statt
  `http://`/`ws://` (siehe Abschnitt 3).

### Cloud

Kein lokaler Dienst wird erreicht — nur ausgehende Verbindungen zu
`api.anthropic.com` über TLS (Port 443). Das Netzprofil ist am einfachsten und
zugleich am sichersten:

- **Nur ausgehend, nur TLS 443.** Kein Inbound-Port überhaupt.
- **Least Privilege:** keine HomeStation-Werkzeuge, keine Bridge, kein
  Sync-Server nötig oder erreichbar — die Browser-Fallbacks (Web-Speech,
  Fake-Render) übernehmen (siehe `docs/BETRIEBSARTEN.md`).
- Der Cloud-Modus ist die Betriebsart mit der **kleinsten Angriffsfläche** im
  Netz, weil sie überhaupt keine eigenen offenen Ports voraussetzt.

## 2 · HomeStation-Checkliste (Host-Firewall)

Die folgenden Regeln sind als **Beispiel/Vorlage** gedacht — die reale
Umsetzung (Subnetz-Adressen, Interface-Namen, WireGuard-Setup) ist
Host-/Router-Arbeit auf der HomeStation und muss dort geprüft werden. Beide
Varianten (ufw **oder** nftables) erreichen dasselbe Ziel: **Default-Deny
eingehend, gezielte Ausnahmen für LAN und VPN-Interface.**

### Variante A — `ufw` (Ubuntu/Debian, einfacher)

```bash
# 1) Default: eingehend zu, ausgehend offen
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2) Bridge/Sync/Ollama nur aus dem Büro-LAN (Beispiel-Subnetz anpassen!)
sudo ufw allow from 192.168.1.0/24 to any port 8600 proto tcp comment 'Kosmo-Bridge nur LAN'
sudo ufw allow from 192.168.1.0/24 to any port 8700 proto tcp comment 'Kosmo-Sync nur LAN'
sudo ufw allow from 192.168.1.0/24 to any port 11434 proto tcp comment 'Ollama nur LAN'

# 3) Dieselben Ports zusätzlich über das WireGuard-Interface (Remote-Betrieb),
#    Beispiel-Interface wg0 mit Tunnel-Subnetz 10.8.0.0/24
sudo ufw allow in on wg0 to any port 8600 proto tcp comment 'Kosmo-Bridge über VPN'
sudo ufw allow in on wg0 to any port 8700 proto tcp comment 'Kosmo-Sync über VPN'
sudo ufw allow in on wg0 to any port 11434 proto tcp comment 'Ollama über VPN'

# 4) WireGuard selbst braucht seinen UDP-Port von überall (das ist der einzige
#    Port, der wirklich aus dem offenen Internet erreichbar sein darf)
sudo ufw allow 51820/udp comment 'WireGuard'

sudo ufw enable
sudo ufw status verbose
```

### Variante B — `nftables` (feingranularer, moderner)

```nft
table inet kosmo_firewall {
  chain input {
    type filter hook input priority 0; policy drop;

    # loopback + bereits etablierte Verbindungen immer zulassen
    iif lo accept
    ct state established,related accept
    ct state invalid drop

    # WireGuard-UDP-Port von überall (Tunnel-Aufbau)
    udp dport 51820 accept

    # Büro-LAN darf Bridge/Sync/Ollama erreichen (Subnetz anpassen!)
    ip saddr 192.168.1.0/24 tcp dport { 8600, 8700, 11434 } accept

    # dasselbe zusätzlich über das VPN-Interface (Remote-Betrieb)
    iifname "wg0" tcp dport { 8600, 8700, 11434 } accept

    # alles andere: Default-Deny (policy drop) + Logging der Ablehnung
    log prefix "kosmo-firewall-drop: " counter drop
  }
}
```

```bash
sudo nft -f /etc/nftables.conf   # nach dem Einfügen obiger Tabelle
sudo systemctl enable --now nftables
```

### TLS-Terminierung für den Remote-Modus

Weder `tools/sync-server/src/server.mjs` noch die homestation-bridge
terminieren selbst TLS (siehe `tools/sync-server/README.md`, Abschnitt
«TLS-Hinweis»). Für `wss`/`https` im Remote-Betrieb braucht es einen
vorgeschalteten Reverse-Proxy **auf der HomeStation selbst** (Caddy/nginx/
traefik), der:

1. auf dem WireGuard-Interface (oder `127.0.0.1`, falls der Proxy auf demselben
   Host läuft) lauscht,
2. ein TLS-Zertifikat terminiert (interne CA oder DNS-01-Zertifikat für einen
   internen Namen — kein öffentlich erreichbares HTTP-01-Challenge nötig, weil
   der Proxy ja gerade nicht öffentlich erreichbar sein soll),
3. optional mTLS mit einem Client-Zertifikat verlangt (Verteidigung in der
   Tiefe zusätzlich zum VPN-Tunnel),
4. erst danach klartext-intern an `127.0.0.1:8600`/`:8700`/`:11434`
   weiterreicht.

Das ist **kein** Bestandteil dieses Batches (B8 liefert das Konzept + die
App-Kopplung), sondern reale Konfigurationsarbeit auf der HomeStation.

## 3 · App-Kopplung (`betrieb.ts`)

`betriebKonfig()` bekommt im Remote-Modus optional `remoteTls: true` (siehe
`packages/kosmo-ai/src/betrieb.ts`):

```ts
betriebKonfig({ betriebsart: 'remote', remoteHost: '100.87.3.2', remoteTls: true });
// → llmBaseUrl: 'https://100.87.3.2:11434'
// → bridgeUrl:  'https://100.87.3.2:8600'
// → syncUrl:    'wss://100.87.3.2:8700'
```

Ohne das Flag (Default, `remoteTls` weggelassen oder `false`) bleibt exakt das
bisherige Verhalten (`http://`/`ws://`) — bestehende Aufrufer und Tests sind
unberührt. Das Flag wirkt **nur** im Remote-Modus; Standard bleibt bewusst
immer im Klartext-Schema, weil es im vertrauenswürdigen Büro-LAN läuft und
keine TLS-Terminierung voraussetzt. Cloud ignoriert das Flag ohnehin (dort gibt
es keine lokalen Adressen).

Das Flag setzt **keine** TLS-Terminierung um — es sorgt nur dafür, dass die App
die richtigen Adressen anspricht, **sobald** die HomeStation (Abschnitt 2)
tatsächlich einen TLS-Reverse-Proxy davor betreibt. Wird `remoteTls: true`
gesetzt, ohne dass der Proxy existiert, schlägt die Verbindung schlicht fehl —
das ist beabsichtigt (kein stiller Fallback auf Klartext).

## 4 · `tools/netz-check.mjs` — was das Prüfskript real leistet

Das Skript läuft mit reinem Node (keine Abhängigkeit) und dokumentiert im
eigenen Kopf ehrlich, was es prüfen kann und was nicht. Kurzfassung:

**Real geprüft:**

1. **Konfig-Lint** der `betrieb.ts`-Quelle: Standard-Betriebsart baut
   ausschliesslich `http://localhost:*`/`ws://localhost:*`-Adressen, keine
   feste Bindung an eine öffentliche Adresse; das TLS-Schema wird nur bei
   explizitem `remote`+`remoteTls`-Flag verwendet.
2. **Bind-Smoke:** ein Testdienst, der bewusst nur auf `127.0.0.1` bindet
   (wie Bridge/Sync/Ollama es laut Konzept in Abschnitt 2 tun sollen), ist
   über die LAN-Adresse dieses Hosts **nicht** erreichbar. Das beweist das
   Betriebssystem-Prinzip «loopback-only bindet wirklich nur loopback» — nicht,
   dass die reale Installation auf der HomeStation tatsächlich so konfiguriert
   ist.

**Bleibt ehrlich HomeStation-/Router-Sache (nicht in einer Cloud-Umgebung
prüfbar):**

- ob `ufw`/`nftables` auf der realen HomeStation aktiv und korrekt geladen ist,
- ob der Router tatsächlich keine Portweiterleitung für 8600/8700/11434 hat,
- die WireGuard-Konfiguration und Schlüsselverwaltung,
- das TLS-Zertifikat/mTLS-Setup eines echten Reverse-Proxys.

## 5 · Restgrenze

«Unhackbar» gibt es nicht (siehe `docs/SERIE-I-SICHERHEIT.md`). Dieses Konzept
schliesst R10 nicht allein — es liefert das Regelwerk, die App-seitige
`wss`/`https`-Fähigkeit und ein Prüfskript für den real testbaren Teil. Die
tatsächliche Firewall/VPN/TLS-Terminierung entsteht erst, wenn jemand die
Checkliste aus Abschnitt 2 auf der echten HomeStation ausführt und den
Reverse-Proxy aus Abschnitt 2 tatsächlich betreibt.
