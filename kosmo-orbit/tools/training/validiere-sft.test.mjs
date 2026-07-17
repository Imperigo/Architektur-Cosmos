#!/usr/bin/env node
/**
 * Test für `tools/training/validiere-sft.mjs` (v0.8.2/P1) — `node:test`
 * (Aufruf `node --test tools/training/validiere-sft.test.mjs`), damit die
 * Standard-TAP-/Spec-Ausgabe ("N passed") als Gate-Beweis literal vorliegt.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  klassifiziereDatei,
  validiereZeile,
  validiereDatei,
  liesRegistryAdapter,
  standardDateien,
} from './validiere-sft.mjs';

const REGISTRY_ADAPTER = [
  'kosmo-buero',
  'kosmo-zeichner-grundriss',
  'kosmo-zeichner-commands',
  'kosmo-buero-dpo',
  'whisper-ch',
  'kosmo-werkplan',
  'vis-befehle',
  'kosmo-publish-layout',
];

// ---------------------------------------------------------------------------
// 1) klassifiziereDatei — Pfad → Typ
// ---------------------------------------------------------------------------

test('klassifiziereDatei erkennt korpora/sft/signale/dpo korrekt', () => {
  assert.equal(klassifiziereDatei('korpora/persona.jsonl'), 'korpora');
  assert.equal(klassifiziereDatei('sft/kosmo-buero/persona-v1.jsonl'), 'sft');
  assert.equal(klassifiziereDatei('signale/2026-07.jsonl'), 'signale');
  assert.equal(klassifiziereDatei('dpo/kosmo-buero/paare.jsonl'), 'dpo');
  assert.equal(klassifiziereDatei('eval/kosmo-buero/prompts.jsonl'), 'sonstiges');
});

// ---------------------------------------------------------------------------
// 2) korpora/ — toleriert als "rohwissen, kein SFT"
// ---------------------------------------------------------------------------

test('korpora/-Zeilen ohne messages/adapter/visibility sind gültig (rohwissen)', () => {
  const { errors, warnings } = validiereZeile(
    { text: 'irgendein Chunk-Text', quelle: 'Heft X', seite: 3 },
    'korpora',
    REGISTRY_ADAPTER,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

// ---------------------------------------------------------------------------
// 3) kosmo-sft/v1 — harte Fehler
// ---------------------------------------------------------------------------

test('sft: fehlendes messages-Array ist ein harter Fehler', () => {
  const { errors } = validiereZeile({ meta: { adapter: 'kosmo-buero' } }, 'sft', REGISTRY_ADAPTER);
  assert.ok(errors.some((e) => e.includes('messages')));
});

test('sft: fehlendes meta.adapter ist ein harter Fehler', () => {
  const { errors } = validiereZeile(
    { messages: [{ role: 'user', content: 'x' }] },
    'sft',
    REGISTRY_ADAPTER,
  );
  assert.ok(errors.some((e) => e.includes('meta.adapter fehlt')));
});

test('sft: meta.adapter ausserhalb der REGISTRY.md-Liste ist ein harter Fehler', () => {
  const { errors } = validiereZeile(
    { messages: [{ role: 'user', content: 'x' }], meta: { adapter: 'kosmo-erfunden' } },
    'sft',
    REGISTRY_ADAPTER,
  );
  assert.ok(errors.some((e) => e.includes('nicht in der REGISTRY.md-Adapterliste')));
});

test('sft: gültige Zeile hat 0 Fehler, fehlende meta.quelle ist nur eine Warnung', () => {
  const { errors, warnings } = validiereZeile(
    { messages: [{ role: 'user', content: 'x' }], meta: { adapter: 'kosmo-buero' } },
    'sft',
    REGISTRY_ADAPTER,
  );
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('meta.quelle fehlt')));
});

test('sft: ungewöhnlich lange messages-Nachricht ist nur eine Warnung, kein Fehler', () => {
  // Echte Fliesstext-Wiederholung (mit Leerzeichen) — kein Base64-Blob-Muster,
  // damit die Warnung isoliert getestet wird (Blob-Erkennung s. eigener Test unten).
  const langerText = 'Dies ist ein Bürostil-Grundsatz aus dem Archiv. '.repeat(120);
  const { errors, warnings } = validiereZeile(
    {
      messages: [{ role: 'assistant', content: langerText }],
      meta: { adapter: 'kosmo-buero', quelle: 'journal:2026-07-17' },
    },
    'sft',
    REGISTRY_ADAPTER,
  );
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('ungewöhnlich lange')));
});

// ---------------------------------------------------------------------------
// 4) kosmo-signal/v1 — harte Fehler
// ---------------------------------------------------------------------------

test('signale: fehlendes art/payload ist ein harter Fehler', () => {
  const { errors } = validiereZeile({ visibility: 'public' }, 'signale', REGISTRY_ADAPTER);
  assert.ok(errors.some((e) => e.includes('"art"')));
  assert.ok(errors.some((e) => e.includes('"payload"')));
});

test('signale: fehlende visibility ist ein harter Fehler (Owner-Entscheid 1)', () => {
  const { errors } = validiereZeile(
    { art: 'journal', payload: { sentiment: 'gut' } },
    'signale',
    REGISTRY_ADAPTER,
  );
  assert.ok(errors.some((e) => e.includes('visibility')));
});

test('signale: vollständige Zeile ist fehlerfrei', () => {
  const { errors } = validiereZeile(
    { art: 'layout', visibility: 'private', payload: { sheetId: 's1' }, meta: { quelle: 'AutoPackPanel' } },
    'signale',
    REGISTRY_ADAPTER,
  );
  assert.deepEqual(errors, []);
});

// ---------------------------------------------------------------------------
// 5) kosmo-dpo/v1 — harte Fehler
// ---------------------------------------------------------------------------

test('dpo: fehlendes prompt/chosen/rejected ist je ein harter Fehler', () => {
  const { errors } = validiereZeile({ meta: { visibility: 'private' } }, 'dpo', REGISTRY_ADAPTER);
  assert.ok(errors.some((e) => e.includes('"prompt"')));
  assert.ok(errors.some((e) => e.includes('"chosen"')));
  assert.ok(errors.some((e) => e.includes('"rejected"')));
});

test('dpo: fehlendes meta.visibility ist ein harter Fehler', () => {
  const { errors } = validiereZeile(
    { prompt: 'p', chosen: 'c', rejected: 'r', meta: { id: '1' } },
    'dpo',
    REGISTRY_ADAPTER,
  );
  assert.ok(errors.some((e) => e.includes('meta.visibility')));
});

// ---------------------------------------------------------------------------
// 6) Nie-ins-Git-Muster (§3.5) — harte Fehler in jedem Typ
// ---------------------------------------------------------------------------

test('Audio-Rohdaten-Schlüssel lösen einen harten Fehler aus', () => {
  const { errors } = validiereZeile(
    {
      art: 'transkript',
      visibility: 'private',
      payload: { audioBase64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' },
    },
    'signale',
    REGISTRY_ADAPTER,
  );
  assert.ok(errors.some((e) => e.includes('Audio-Rohdaten')));
});

test('Fremd-PDF-Magic-Bytes lösen einen harten Fehler aus', () => {
  const { errors } = validiereZeile({ text: '%PDF-1.4 ...' }, 'korpora', REGISTRY_ADAPTER);
  assert.ok(errors.some((e) => e.includes('Fremd-PDF')));
});

test('langer Base64-Blob löst einen harten Fehler aus (hochentropisch, wie echte Binärdaten)', () => {
  const blob = randomBytes(200).toString('base64'); // ~270 Zeichen, echte Zufalls-Entropie
  const { errors } = validiereZeile({ text: blob }, 'korpora', REGISTRY_ADAPTER);
  assert.ok(errors.some((e) => e.includes('Binär-/Base64-Blob')));
});

test('niedrig-entropische Zeichenwiederholung löst KEINEN Base64-Blob-Fund aus (Falsch-Positiv-Schutz)', () => {
  const wiederholung = 'ab'.repeat(150); // 300 Zeichen, aber Entropie ~1 Bit — keine echten Binärdaten
  const { errors } = validiereZeile({ text: wiederholung }, 'korpora', REGISTRY_ADAPTER);
  assert.ok(!errors.some((e) => e.includes('Binär-/Base64-Blob')));
});

// ---------------------------------------------------------------------------
// 7) validiereDatei — kaputtes JSON pro Zeile
// ---------------------------------------------------------------------------

test('validiereDatei meldet ungültiges JSON als harten Fehler mit Zeilennummer', async () => {
  const tmp = mktemp();
  const datei = path.join(tmp, 'sft', 'kosmo-buero', 'fixture.jsonl');
  mkdirSync(path.dirname(datei), { recursive: true });
  writeFileSync(
    datei,
    [
      JSON.stringify({ messages: [{ role: 'user', content: 'ok' }], meta: { adapter: 'kosmo-buero', quelle: 'x' } }),
      '{ nicht valides json',
    ].join('\n'),
  );
  const bericht = await validiereDatei(datei, REGISTRY_ADAPTER);
  assert.equal(bericht.zeilen, 2);
  assert.equal(bericht.errors.length, 1);
  assert.equal(bericht.errors[0].zeile, 2);
  assert.match(bericht.errors[0].meldung, /kein valides JSON/);
  rmSync(tmp, { recursive: true, force: true });
});

test('validiereDatei markiert doppelte meta.id nur als Warnung', async () => {
  const tmp = mktemp();
  const datei = path.join(tmp, 'sft', 'kosmo-buero', 'fixture.jsonl');
  mkdirSync(path.dirname(datei), { recursive: true });
  const zeile = (id) =>
    JSON.stringify({
      messages: [{ role: 'user', content: 'x' }],
      meta: { id, adapter: 'kosmo-buero', quelle: 'x' },
    });
  writeFileSync(datei, [zeile('a-1'), zeile('a-1')].join('\n'));
  const bericht = await validiereDatei(datei, REGISTRY_ADAPTER);
  assert.equal(bericht.errors.length, 0);
  assert.ok(bericht.warnings.some((w) => w.meldung.includes('doppelte/ähnliche meta.id')));
  rmSync(tmp, { recursive: true, force: true });
});

function mktemp() {
  return mkdtempSync(path.join(tmpdir(), 'kosmo-validiere-sft-'));
}

// ---------------------------------------------------------------------------
// 8) liesRegistryAdapter — echte REGISTRY.md (Integrationscheck)
// ---------------------------------------------------------------------------

test('liesRegistryAdapter findet alle 8 Adapter-Zeilen der echten REGISTRY.md', () => {
  const adapter = liesRegistryAdapter();
  for (const name of REGISTRY_ADAPTER) {
    assert.ok(adapter.includes(name), `Adapter "${name}" fehlt in REGISTRY.md`);
  }
  assert.equal(adapter.length, 8);
});

// ---------------------------------------------------------------------------
// 9) standardDateien — findet die migrierten Korpora + den Konverter-Output
// ---------------------------------------------------------------------------

test('standardDateien findet die 7 korpora-Dateien + persona-v1.jsonl unter sft/', () => {
  const dateien = standardDateien();
  const rel = dateien.map((d) => d.split(path.sep).join('/'));
  assert.ok(rel.some((d) => d.endsWith('korpora/persona.jsonl')));
  assert.ok(rel.some((d) => d.endsWith('sft/kosmo-buero/persona-v1.jsonl')));
  assert.ok(rel.some((d) => d.endsWith('korpora/buecher.jsonl')));
});
