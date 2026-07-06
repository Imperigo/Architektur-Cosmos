/**
 * Kosmo-Sync-Server — läuft auf der HomeStation im Büronetz.
 *
 * Start:  cd tools/sync-server && npm install && npm start
 * Env:    KOSMO_SYNC_PORT (Standard 8700), KOSMO_SYNC_DB (Standard ./kosmo-sync.sqlite),
 *         KOSMO_SYNC_TOKEN (optional — Clients senden ihn als Token),
 *         KOSMO_SYNC_ORIGIN (Access-Control-Allow-Origin; Default '*' NUR ohne Token),
 *         KOSMO_SYNC_MAX_BYTES (Nachricht-Grössendeckel, Standard 8 MiB),
 *         KOSMO_SYNC_RATE_LIMIT (Verbindungen/Sekunde pro IP, Standard 20).
 *
 * Persistenz: eine SQLite-Datei — jedes Projekt (Raum) überlebt Neustarts.
 *
 * TLS-Hinweis (Serie I / B3, Firewall-Seite siehe B8): dieser Prozess spricht
 * bewusst nur `ws`/`http` — im Büro-LAN ist das ehrlich benannte Realität.
 * Für Remote-Betrieb NIE dieses `ws` direkt ins Internet stellen: `wss://`
 * muss auf einem Reverse-Proxy/der HomeStation terminieren (WireGuard/mTLS).
 * Ohne TLS ist ein gesetzter Token im LAN im Klartext abhörbar — das ist
 * Reibung, kein Ersatz für Netzwerk-Härtung (siehe README.md).
 */

import { timingSafeEqual } from 'node:crypto';
import { Server } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';

const port = Number(process.env.KOSMO_SYNC_PORT ?? 8700);
const token = process.env.KOSMO_SYNC_TOKEN ?? '';
const konfigurierterOrigin = process.env.KOSMO_SYNC_ORIGIN ?? '';
const maxBytes = Number(process.env.KOSMO_SYNC_MAX_BYTES ?? 8 * 1024 * 1024);
const ratenLimitProSekunde = Number(process.env.KOSMO_SYNC_RATE_LIMIT ?? 20);

// Raum-Verwaltung: aktive Räume mit Teilnehmerzahl (D4-Betriebshärte)
const raeume = new Map();

/**
 * Timing-sicherer Token-Vergleich (R2-Härtung): `crypto.timingSafeEqual`
 * verlangt gleich lange Puffer — beide vorher auf eine gemeinsame (Mindest-)
 * Länge polstern, damit ungleiche Länge nicht crasht und die Puffergrösse
 * selbst keinen Seitenkanal über die echte Token-Länge öffnet.
 */
function tokenGleich(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  const laenge = Math.max(bufA.length, bufB.length, 32);
  const gepolstertA = Buffer.alloc(laenge);
  const gepolstertB = Buffer.alloc(laenge);
  bufA.copy(gepolstertA);
  bufB.copy(gepolstertB);
  const inhaltGleich = timingSafeEqual(gepolstertA, gepolstertB);
  return inhaltGleich && bufA.length === bufB.length;
}

/** Token aus einem HTTP-Request lesen — Header (Authorization/x-sync-token) oder ?token=, konsistent mit dem WS-Weg. */
function tokenAusRequest(request) {
  const auth = request.headers?.['authorization'];
  if (auth) {
    const treffer = /^Bearer\s+(.+)$/i.exec(auth);
    return treffer ? treffer[1] : auth;
  }
  const kopf = request.headers?.['x-sync-token'];
  if (kopf) return Array.isArray(kopf) ? kopf[0] : kopf;
  try {
    const url = new URL(request.url ?? '/', 'http://kosmo.local');
    return url.searchParams.get('token') ?? '';
  } catch {
    return '';
  }
}

/** Access-Control-Allow-Origin: explizite Vorgabe > Default '*' nur ohne Token > sonst eng (kein Header). */
function corsOrigin() {
  if (konfigurierterOrigin) return konfigurierterOrigin;
  return token ? '' : '*';
}

function mitCors(headers) {
  const origin = corsOrigin();
  return origin ? { ...headers, 'Access-Control-Allow-Origin': origin } : headers;
}

/**
 * Rate-Limit pro IP (R2-Härtung, kein neues npm-Dep): einfaches 1s-Zeitfenster
 * je IP — grosszügig genug für die Mehrfach-Client-E2E, deckelt aber eine
 * Verbindungsflut. Gilt für WebSocket-Verbindungsaufbau UND für `/raeume`.
 */
const verbindungenProIp = new Map(); // ip -> { start: number, anzahl: number }
const RATEN_FENSTER_MS = 1000;

function ipErlaubt(ip) {
  const schluessel = ip || 'unbekannt';
  const jetzt = Date.now();
  const eintrag = verbindungenProIp.get(schluessel);
  if (!eintrag || jetzt - eintrag.start > RATEN_FENSTER_MS) {
    verbindungenProIp.set(schluessel, { start: jetzt, anzahl: 1 });
    return true;
  }
  eintrag.anzahl += 1;
  return eintrag.anzahl <= ratenLimitProSekunde;
}

const raeumTimer = setInterval(() => {
  const jetzt = Date.now();
  for (const [ip, eintrag] of verbindungenProIp) {
    if (jetzt - eintrag.start > RATEN_FENSTER_MS * 10) verbindungenProIp.delete(ip);
  }
}, 30_000);
raeumTimer.unref();

const server = new Server({
  port,
  // Nachricht-Grössendeckel + Rate-Limit: reine `ws`-Serveroptionen, von
  // Hocuspocus/crossws unverändert an `new WebSocketServer()` gereicht — kein
  // neuer npm-Dep. `verifyClient` lehnt VOR dem Handshake ab (kein Crash-Risiko,
  // der Server selbst bleibt bei einer 429-Ablehnung unberührt).
  websocketOptions: {
    maxPayload: maxBytes,
    verifyClient(info, callback) {
      const ip = info.req.socket?.remoteAddress ?? 'unbekannt';
      if (!ipErlaubt(ip)) {
        callback(false, 429, 'Zu viele Verbindungen — bitte kurz warten');
        return;
      }
      callback(true);
    },
  },
  extensions: [new SQLite({ database: process.env.KOSMO_SYNC_DB ?? './kosmo-sync.sqlite' })],
  async onAuthenticate({ token: clientToken }) {
    if (token && !tokenGleich(clientToken, token)) {
      throw new Error('Token falsch');
    }
  },
  async onConnect({ documentName }) {
    raeume.set(documentName, (raeume.get(documentName) ?? 0) + 1);
  },
  async onDisconnect({ documentName }) {
    const n = (raeume.get(documentName) ?? 1) - 1;
    if (n <= 0) raeume.delete(documentName);
    else raeume.set(documentName, n);
  },
  async onRequest({ request, response }) {
    const url = new URL(request.url ?? '/', 'http://kosmo.local');
    // GET /raeume — aktive Räume fürs Beitreten aus der App. Bei Token-Pflicht
    // ebenfalls Token verlangen, sonst verrät die Liste Raumnamen an jeden im Netz.
    if (url.pathname === '/raeume') {
      const ip = request.socket?.remoteAddress ?? 'unbekannt';
      if (!ipErlaubt(ip)) {
        response.writeHead(429, mitCors({ 'Content-Type': 'application/json' }));
        response.end(JSON.stringify({ error: 'Zu viele Anfragen' }));
        return Promise.reject(null);
      }
      if (token && !tokenGleich(tokenAusRequest(request), token)) {
        response.writeHead(401, mitCors({ 'Content-Type': 'application/json' }));
        response.end(JSON.stringify({ error: 'Token fehlt oder falsch' }));
        return Promise.reject(null); // beantwortet — Hocuspocus übernimmt nicht
      }
      response.writeHead(200, mitCors({ 'Content-Type': 'application/json' }));
      response.end(
        JSON.stringify({
          raeume: [...raeume.entries()].map(([name, verbindungen]) => ({ name, verbindungen })),
          tokenPflicht: token !== '',
        }),
      );
      return Promise.reject(null); // beantwortet — Hocuspocus übernimmt nicht
    }
  },
});

server.listen().then(() => {
  if (!token) {
    console.log('Hinweis: KOSMO_SYNC_TOKEN nicht gesetzt — Sync ist im Netz offen');
  }
  console.log(`Kosmo-Sync-Server läuft auf Port ${port}`);
  console.log(
    `Härtung: Nachricht-Deckel ${Math.round(maxBytes / 1024 / 1024)} MiB, ` +
      `Rate-Limit ${ratenLimitProSekunde}/s je IP.`,
  );
  console.log(
    'TLS-Hinweis: dieser Prozess spricht nur ws/http (LAN-ehrlich). Remote-Betrieb ' +
      'NUR hinter wss://-Terminierung (Reverse-Proxy/HomeStation) — sonst ist der Token im Klartext abhörbar.',
  );
});
