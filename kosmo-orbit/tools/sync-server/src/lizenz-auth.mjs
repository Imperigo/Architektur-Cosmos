/**
 * Serie I / Batch B6 — Server-Bindung, der wirksame Anti-Copy-Hebel
 * (docs/SERIE-I-BUILDPLAN.md §3): getrennt von `server.mjs`, damit die
 * Entscheidungslogik OHNE einen echten Hocuspocus-Serverstart unit-testbar
 * bleibt (`server.mjs` startet beim Import sofort einen echten Prozess).
 *
 * **Default (kein `KOSMO_SYNC_LIZENZ_PFLICHT`): unverändertes B3-Verhalten.**
 * Nur der geteilte Token zählt — die Lizenzprüfung wird dann gar nicht erst
 * ausgewertet. Das ist Absicht: ohne konfigurierte Lizenz läuft KosmoOrbit
 * exakt wie vor B6 (die geteilte-Token-E2E darf nicht brechen).
 */

import { readFileSync } from 'node:fs';
// Subpfad `@kosmo/lizenz/verify` → self-contained `src/lizenz.ts` (keine
// relativen Importe), kompiliert nach `dist/lizenz.js` (E-S/V090:
// `npm run build -w @kosmo/lizenz`, `tsconfig.build.json`) — lädt unter
// purem Node OHNE Type-Stripping/tsx, ohne den Index-Re-Export, der für
// die App (Vite/Bundler-Resolution) extensionslos auf `src/index.ts`
// bleibt. Vorher zeigte dieser Subpfad direkt auf `src/lizenz.ts` und
// brauchte Node-Type-Stripping (auf Ubuntu-Node 22.22 nicht vorhanden,
// docs/HOMESERVER-STATUS.md).
import { istWiderrufen, verifiziereLizenz } from '@kosmo/lizenz/verify';

/**
 * Widerrufsliste laden: Komma-Liste aus `KOSMO_SYNC_LIZENZ_WIDERRUF` und/oder
 * eine Datei (`KOSMO_SYNC_LIZENZ_WIDERRUF_DATEI`, eine Lizenz-ID pro Zeile
 * ODER ein JSON-Array). Fehlt/kaputt → ehrlich ignorieren, kein Absturz beim
 * Serverstart (eine kaputte Widerrufsliste darf den Sync-Server nicht lahmlegen).
 */
export function ladeWiderrufsliste(env = process.env) {
  const ids = new Set();
  for (const id of String(env.KOSMO_SYNC_LIZENZ_WIDERRUF ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    ids.add(id);
  }
  const datei = env.KOSMO_SYNC_LIZENZ_WIDERRUF_DATEI;
  if (datei) {
    try {
      const inhalt = readFileSync(datei, 'utf8').trim();
      const werte = inhalt.startsWith('[') ? JSON.parse(inhalt) : inhalt.split('\n');
      for (const w of werte) {
        const t = String(w).trim();
        if (t) ids.add(t);
      }
    } catch {
      /* Datei fehlt/kaputt — ehrlich ignorieren statt den Server zu crashen */
    }
  }
  return [...ids];
}

/**
 * Zugangs-Entscheidung: geteilter Token (unverändertes B3-Verhalten) +
 * additive, per Env aktivierbare Lizenz-Pflicht (B6).
 *
 * @param clientToken       vom Client übermittelter Token (Hocuspocus `onAuthenticate`).
 * @param sharedToken       `KOSMO_SYNC_TOKEN` — leer = keine Token-Pflicht (wie B3).
 * @param tokenGleich       timing-sicherer Vergleich aus `server.mjs` (Injektion, damit diese Datei `node:crypto`-frei bleibt).
 * @param lizenzPflicht     `KOSMO_SYNC_LIZENZ_PFLICHT` — Default AUS.
 * @param lizenzText        aus `requestParameters.get('lizenz')` der WS-Verbindung (Query-Parameter — Browser-`WebSocket` erlaubt keine eigenen Header, aber eine Query-String-URL).
 * @param lizenzPublicKeyBase64  `KOSMO_SYNC_LIZENZ_PUBKEY` — der ÖFFENTLICHE Schlüssel, kein Secret.
 * @param widerrufsliste    Lizenz-IDs aus `ladeWiderrufsliste()`.
 * @param jetzt             Prüfzeitpunkt — Parameter, kein `Date.now()` intern (testbar).
 */
export async function pruefeZugang({
  clientToken,
  sharedToken,
  tokenGleich,
  lizenzPflicht,
  lizenzText,
  lizenzPublicKeyBase64,
  widerrufsliste,
  jetzt,
}) {
  if (sharedToken && !tokenGleich(clientToken, sharedToken)) {
    return { ok: false, grund: 'token_falsch' };
  }
  if (!lizenzPflicht) return { ok: true }; // Default: exakt B3-Verhalten, Lizenz spielt keine Rolle.

  if (!lizenzPublicKeyBase64) {
    // Pflicht aktiviert, aber kein Public Key konfiguriert — ehrlich ablehnen
    // (fail closed) statt eine Prüfung vorzutäuschen, die gar nicht laufen kann.
    return { ok: false, grund: 'lizenzpruefung_nicht_konfiguriert' };
  }
  if (!lizenzText) return { ok: false, grund: 'lizenz_fehlt' };

  const ergebnis = await verifiziereLizenz(lizenzText, lizenzPublicKeyBase64, jetzt);
  if (!ergebnis.gueltig) return { ok: false, grund: ergebnis.grund ?? 'lizenz_ungueltig' };
  if (istWiderrufen(ergebnis.lizenz.lizenzId, widerrufsliste ?? [])) {
    return { ok: false, grund: 'lizenz_widerrufen' };
  }
  return { ok: true, lizenz: ergebnis.lizenz };
}
