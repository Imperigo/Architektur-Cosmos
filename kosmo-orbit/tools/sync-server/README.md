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
