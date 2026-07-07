/**
 * Serie I / Batch B6 — Sync-Server-Lizenzprüfung, rein unit-getestet (kein
 * Serverstart, kein WebSocket nötig): `lizenz-auth.mjs` hat keine
 * Seiteneffekte beim Import, anders als `server.mjs` (das sofort einen
 * echten Hocuspocus-Prozess startet). `node --test` — kein Testframework-Dep.
 */
import { timingSafeEqual } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { erzeugeTestLizenz, erzeugeTestSchluesselpaar } from '../../../packages/kosmo-lizenz/test/test-hilfen.ts';
import { ladeWiderrufsliste, pruefeZugang } from '../src/lizenz-auth.mjs';

// Derselbe timing-sichere Vergleich wie in server.mjs (Duplikat hier bewusst
// klein gehalten, statt server.mjs — das beim Import einen Server startet —
// mit anzuziehen).
function tokenGleich(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  const laenge = Math.max(bufA.length, bufB.length, 32);
  const gepolstertA = Buffer.alloc(laenge);
  const gepolstertB = Buffer.alloc(laenge);
  bufA.copy(gepolstertA);
  bufB.copy(gepolstertB);
  return timingSafeEqual(gepolstertA, gepolstertB) && bufA.length === bufB.length;
}

const beispielDaten = {
  inhaber: 'Baubüro Andrin',
  edition: 'standard',
  gueltigBis: '2026-12-31',
  ausgestelltAm: '2026-01-01T00:00:00.000Z',
  lizenzId: 'lz-sync-0001',
};

test('Default (keine Lizenz-Pflicht): NUR der geteilte Token zählt — exakt B3-Verhalten', async () => {
  const ergebnisRichtig = await pruefeZugang({
    clientToken: 'buero-geheim',
    sharedToken: 'buero-geheim',
    tokenGleich,
    lizenzPflicht: false,
    lizenzText: '',
    lizenzPublicKeyBase64: '',
    widerrufsliste: [],
    jetzt: new Date(),
  });
  assert.equal(ergebnisRichtig.ok, true);

  const ergebnisFalsch = await pruefeZugang({
    clientToken: 'falsch',
    sharedToken: 'buero-geheim',
    tokenGleich,
    lizenzPflicht: false,
    lizenzText: '',
    lizenzPublicKeyBase64: '',
    widerrufsliste: [],
    jetzt: new Date(),
  });
  assert.equal(ergebnisFalsch.ok, false);
  assert.equal(ergebnisFalsch.grund, 'token_falsch');
});

test('Default ohne Token-Pflicht: offen, wie in B3 (kein Token konfiguriert)', async () => {
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: false,
    lizenzText: '',
    lizenzPublicKeyBase64: '',
    widerrufsliste: [],
    jetzt: new Date(),
  });
  assert.equal(ergebnis.ok, true);
});

test('Lizenz-Pflicht aktiv: gültige Lizenz wird akzeptiert', async () => {
  const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
  const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText,
    lizenzPublicKeyBase64: publicKeyBase64,
    widerrufsliste: [],
    jetzt: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(ergebnis.ok, true);
});

test('Lizenz-Pflicht aktiv: abgelaufene Lizenz wird abgelehnt', async () => {
  const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
  const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText,
    lizenzPublicKeyBase64: publicKeyBase64,
    widerrufsliste: [],
    jetzt: new Date('2027-03-01T00:00:00.000Z'),
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.grund, 'abgelaufen');
});

test('Lizenz-Pflicht aktiv: manipulierte/falsch signierte Lizenz wird abgelehnt', async () => {
  const { publicKeyBase64 } = await erzeugeTestSchluesselpaar();
  const fremd = await erzeugeTestSchluesselpaar();
  const lizenzText = await erzeugeTestLizenz(beispielDaten, fremd.privateKey); // mit FREMDEM Key signiert
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText,
    lizenzPublicKeyBase64: publicKeyBase64,
    widerrufsliste: [],
    jetzt: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.grund, 'signatur_ungueltig');
});

test('Lizenz-Pflicht aktiv: widerrufene Lizenz-ID wird abgelehnt', async () => {
  const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
  const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText,
    lizenzPublicKeyBase64: publicKeyBase64,
    widerrufsliste: [beispielDaten.lizenzId],
    jetzt: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.grund, 'lizenz_widerrufen');
});

test('Lizenz-Pflicht aktiv, aber keine Lizenz übergeben: abgelehnt statt stillschweigend offen', async () => {
  const { publicKeyBase64 } = await erzeugeTestSchluesselpaar();
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText: '',
    lizenzPublicKeyBase64: publicKeyBase64,
    widerrufsliste: [],
    jetzt: new Date(),
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.grund, 'lizenz_fehlt');
});

test('Lizenz-Pflicht aktiv, aber kein Public Key konfiguriert: fail closed statt vorgetäuschter Prüfung', async () => {
  const { privateKey } = await erzeugeTestSchluesselpaar();
  const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
  const ergebnis = await pruefeZugang({
    clientToken: '',
    sharedToken: '',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText,
    lizenzPublicKeyBase64: '',
    widerrufsliste: [],
    jetzt: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.grund, 'lizenzpruefung_nicht_konfiguriert');
});

test('Token UND Lizenz-Pflicht kombiniert: falscher Token schlägt zuerst fehl', async () => {
  const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
  const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
  const ergebnis = await pruefeZugang({
    clientToken: 'falsch',
    sharedToken: 'buero-geheim',
    tokenGleich,
    lizenzPflicht: true,
    lizenzText,
    lizenzPublicKeyBase64: publicKeyBase64,
    widerrufsliste: [],
    jetzt: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.grund, 'token_falsch');
});

test('ladeWiderrufsliste: Env-Kommaliste + Datei werden zusammengeführt, kaputte Datei crasht nicht', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kosmo-sync-widerruf-'));
  const datei = join(dir, 'widerruf.json');
  writeFileSync(datei, JSON.stringify(['lz-datei-1', 'lz-datei-2']));
  const liste = ladeWiderrufsliste({
    KOSMO_SYNC_LIZENZ_WIDERRUF: 'lz-env-1, lz-env-2',
    KOSMO_SYNC_LIZENZ_WIDERRUF_DATEI: datei,
  });
  assert.equal(liste.includes('lz-env-1'), true);
  assert.equal(liste.includes('lz-datei-1'), true);
  assert.equal(liste.length, 4);

  const listeKaputteDatei = ladeWiderrufsliste({
    KOSMO_SYNC_LIZENZ_WIDERRUF: 'lz-env-1',
    KOSMO_SYNC_LIZENZ_WIDERRUF_DATEI: join(dir, 'existiert-nicht.json'),
  });
  assert.deepEqual(listeKaputteDatei, ['lz-env-1']);
});
