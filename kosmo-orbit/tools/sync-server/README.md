# Kosmo-Sync-Server

Hocuspocus + SQLite für die HomeStation: Desktop und iPad editieren dasselbe
Projekt live (Yjs-CRDT). Läuft im Büro-LAN.

## Start

```bash
cd tools/sync-server
npm install
npm start          # = node src/server.mjs
```

## Env

| Variable | Standard | Bedeutung |
|---|---|---|
| `KOSMO_SYNC_PORT` | `8700` | Port. |
| `KOSMO_SYNC_DB` | `./kosmo-sync.sqlite` | Persistenz-Datei. |
| `KOSMO_SYNC_TOKEN` | — (leer = offen) | Geteiltes Sync-Passwort. Ohne Token ist der Server im Netz offen — das Startlog sagt das ehrlich. |
| `KOSMO_SYNC_ORIGIN` | `*` ohne Token, sonst eng (kein Header) | `Access-Control-Allow-Origin` für `GET /raeume`. |
| `KOSMO_SYNC_MAX_BYTES` | `8388608` (8 MiB) | Nachricht-Grössendeckel je WebSocket-Frame (`maxPayload`) — schützt vor Speicher-DoS durch übergrosse Payloads. |
| `KOSMO_SYNC_RATE_LIMIT` | `20` | Verbindungen/Sekunde, die eine einzelne IP aufbauen darf (WS-Handshake **und** `GET /raeume`); danach `429`. |
| `KOSMO_SYNC_LIZENZ_PFLICHT` | aus | `1`/`true`/`ja` schaltet die Lizenzprüfung zusätzlich zum Token ein (Serie I / Batch B6). **Default: aus — reines B3-Verhalten, nur der Token zählt.** |
| `KOSMO_SYNC_LIZENZ_PUBKEY` | — | Der ÖFFENTLICHE Ed25519-Schlüssel (32 Rohbytes, base64) — kein Secret, darf im Build/Env stehen. Ohne ihn lehnt der Server bei aktiver Pflicht ALLES ab (fail closed). |
| `KOSMO_SYNC_LIZENZ_WIDERRUF` | — | Komma-Liste widerrufener Lizenz-IDs. |
| `KOSMO_SYNC_LIZENZ_WIDERRUF_DATEI` | — | Zusätzliche Datei mit Lizenz-IDs (eine pro Zeile ODER JSON-Array) — wird mit der Env-Liste zusammengeführt; fehlt/kaputt die Datei, wird sie ehrlich ignoriert (kein Serverabsturz). |

## Signierte Lizenz + Server-Bindung (Serie I / Batch B6)

Der **einzige wirklich harte Anti-Copy-Hebel** (siehe
`docs/SERIE-I-BUILDPLAN.md` §3 und `docs/LIZENZ.md`): eine rein clientseitige
Lizenzprüfung ist immer umgehbar (Public Key im Build patchbar), aber die
Server-Bindung hier läuft serverseitig — ein Client-Patch reicht nicht.

- **Additiv, Default unverändert.** Ohne `KOSMO_SYNC_LIZENZ_PFLICHT` prüft
  `onAuthenticate` exakt wie in B3 nur den geteilten Token — die
  geteilte-Token-E2E bleibt unverändert grün.
- Ist die Pflicht aktiv, akzeptiert der Server zusätzlich zum Token eine
  signierte Lizenz (`@kosmo/lizenz`, Ed25519 über Web Crypto). Der Browser-
  `WebSocket` erlaubt keine eigenen Header — die Lizenz reist deshalb als
  Query-Parameter auf der Verbindungs-URL (`wss://host:8700?lizenz=<lizenzText>`)
  und kommt über Hocuspocus' `requestParameters` in `onAuthenticate` an.
- Geprüft werden: Signatur, `gueltigBis` (gegen den aktuellen Serverzeitpunkt)
  und die Widerrufsliste. Jede fehlgeschlagene Prüfung lehnt die Verbindung
  ab — auch, wenn kein Public Key konfiguriert ist (fail closed, siehe
  Startlog).
- Die reine Entscheidungslogik lebt in `src/lizenz-auth.mjs` (kein
  Serverstart nötig) und ist unit-getestet: `npm test` (`node --test`,
  10 Fälle: Default-B3-Verhalten, gültig/abgelaufen/manipuliert/widerrufen/
  fehlende Lizenz/fehlender Public Key/Token-zuerst/Widerrufsliste-Merge).

## Härtung (Serie I / Batch B3)

- **Token-Vergleich** läuft über `crypto.timingSafeEqual` mit Längenpolsterung
  (kein Crash bei unterschiedlicher Länge, kein Timing-Seitenkanal über die
  Puffergrösse).
- **`GET /raeume`** verlangt bei gesetztem Token denselben Token wie der
  WebSocket-Weg (Header `Authorization: Bearer <token>` / `x-sync-token` oder
  `?token=`) — sonst würde die Raumliste (Namen + Teilnehmerzahl) jedem im Netz
  offenstehen, auch ohne gültigen Sync-Zugang.
- **Nachricht-Grössendeckel** (`maxPayload`) und **Rate-Limit pro IP**
  (`verifyClient`, vor dem WS-Handshake, kein neuer npm-Dep) verhindern
  Speicher- bzw. Verbindungs-DoS durch einen einzelnen Client.

## TLS-Hinweis — bitte ernst nehmen

Dieser Prozess spricht **bewusst nur `ws`/`http`**, kein TLS. Im Büro-LAN ist
das die ehrliche Realität dieses Servers — er terminiert selbst kein TLS.

**Für Remote-Betrieb (ausserhalb des Büro-LANs) darf dieser Port NIE direkt ins
Internet gestellt werden.** `wss://` muss auf einem vorgeschalteten
Reverse-Proxy oder der HomeStation selbst terminieren (siehe
`docs/FIREWALL-KONZEPT.md`, Batch B8: WireGuard/mTLS + Firewall-Regeln je
Betriebsmodus). Ohne diese TLS-Terminierung ist ein gesetzter
`KOSMO_SYNC_TOKEN` im Netz **im Klartext mitlesbar** — der Token schützt dann
nur gegen einen zufälligen, nicht gegen einen mitlauschenden Angreifer im
selben Netzsegment.

## Restgrenze

Ein geteilter Token pro Server — keine Pro-Raum-ACL (die bräuchte
Nutzerkonten, siehe `docs/SERIE-I-BUILDPLAN.md`). Ohne TLS (siehe oben) ist der
Token im LAN abhörbar.
