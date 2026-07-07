/**
 * Serie I / Batch B9 — Sicherheits-Logging, rein unit-getestet (kein
 * Serverstart nötig): `formatiereSicherheitsereignis` ist eine reine
 * Funktion, `node --test` — kein Testframework-Dep.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatiereSicherheitsereignis } from '../src/sicherheits-log.mjs';

test('formatiereSicherheitsereignis: ein Ereignis → eine strukturierte JSON-Zeile mit den vier Feldern', () => {
  const zeile = formatiereSicherheitsereignis({
    ereignis: 'auth_fehlgeschlagen',
    quelle: 'sync:onAuthenticate',
    detail: 'Token ungültig oder fehlt',
    ts: '2026-07-07T12:00:00.000Z',
  });
  assert.equal(
    zeile,
    JSON.stringify({
      ts: '2026-07-07T12:00:00.000Z',
      ereignis: 'auth_fehlgeschlagen',
      quelle: 'sync:onAuthenticate',
      detail: 'Token ungültig oder fehlt',
    }),
  );
  // Genau eine Zeile — kein eingebetteter Zeilenumbruch.
  assert.equal(zeile.includes('\n'), false);
});

test('formatiereSicherheitsereignis: detail ist optional (Default leerer String)', () => {
  const zeile = formatiereSicherheitsereignis({
    ereignis: 'rate_limit_abgelehnt',
    quelle: 'sync:websocket',
    ts: '2026-07-07T12:00:00.000Z',
  });
  const geparst = JSON.parse(zeile);
  assert.equal(geparst.detail, '');
  assert.equal(geparst.ereignis, 'rate_limit_abgelehnt');
});

test('formatiereSicherheitsereignis: ohne ts-Parameter ein gültiges ISO-Datum setzen', () => {
  const zeile = formatiereSicherheitsereignis({ ereignis: 'lizenz_fehlgeschlagen', quelle: 'sync:onAuthenticate' });
  const geparst = JSON.parse(zeile);
  assert.equal(Number.isNaN(Date.parse(geparst.ts)), false);
});

test('formatiereSicherheitsereignis: NIE ein Token/eine Signatur im detail — nur Kurzbeschreibungen', () => {
  // Kein Geheimnis-Feld in der Signatur; Lizenz-ID (kein Geheimnis) darf
  // erscheinen, aber niemals ein Token- oder Signaturwert.
  const zeile = formatiereSicherheitsereignis({
    ereignis: 'lizenz_fehlgeschlagen',
    quelle: 'bridge:token_guard',
    detail: 'Lizenz abgelehnt: signatur_ungueltig',
    ts: '2026-07-07T12:00:00.000Z',
  });
  assert.equal(zeile.includes('geheim'), false);
  assert.match(zeile, /Lizenz abgelehnt: signatur_ungueltig/);
});
