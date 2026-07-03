/**
 * Kosmo-Sync-Server — läuft auf der HomeStation im Büronetz.
 *
 * Start:  cd tools/sync-server && npm install && npm start
 * Env:    KOSMO_SYNC_PORT (Standard 8700), KOSMO_SYNC_DB (Standard ./kosmo-sync.sqlite),
 *         KOSMO_SYNC_TOKEN (optional — Clients senden ihn als Token)
 *
 * Persistenz: eine SQLite-Datei — jedes Projekt (Raum) überlebt Neustarts.
 */

import { Server } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';

const port = Number(process.env.KOSMO_SYNC_PORT ?? 8700);
const token = process.env.KOSMO_SYNC_TOKEN ?? '';

// Raum-Verwaltung: aktive Räume mit Teilnehmerzahl (D4-Betriebshärte)
const raeume = new Map();

const server = new Server({
  port,
  extensions: [
    new SQLite({ database: process.env.KOSMO_SYNC_DB ?? './kosmo-sync.sqlite' }),
  ],
  async onAuthenticate({ token: clientToken }) {
    if (token && clientToken !== token) {
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
    // GET /raeume — aktive Räume fürs Beitreten aus der App
    if (request.url === '/raeume') {
      response.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
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
});
