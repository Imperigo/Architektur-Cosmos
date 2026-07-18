#!/usr/bin/env node
/**
 * Selbständige Prüfung für `tools/pruefe-website-sync.mjs` (V084-SPEZ PD1) —
 * kein Test-Framework nötig, gleiches Muster wie `tools/secret-scan.test.mjs`
 * und `tools/netz-check.test.mjs`: reines Node, Exit-Code 0 = alle Prüfungen
 * grün, sonst != 0 mit Liste der Fehlschläge.
 *
 * Deckt zwei Fälle ab, wie im Paketauftrag verlangt:
 *   - grüner Fall: der echte Checkout ist byte-gleich und driftfrei.
 *   - roter Fall: ein manipulierter Temp-Seed (fabrizierter Fixture-Baum
 *     mit veraltetem/falschem `kosmodata-seed.json`) wird als FEHL erkannt.
 * Dazu Unit-Prüfungen der reinen Bausteine (sha256Datei, bufferByteGleich,
 * pruefeIdDrift), damit ein künftiger Umbau gezielt lokalisierbar bricht.
 *
 * Aufruf: node tools/pruefe-website-sync.test.mjs
 */

import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  kosmoOrbitRoot,
  repoRoot,
  SEED_RELPFAD,
  BUILD_SKRIPT_RELPFAD,
  MOCK_ENTRIES_RELPFAD,
  sha256Datei,
  bufferByteGleich,
  pruefeIdDrift,
  fuehreVollpruefungAus,
} from './pruefe-website-sync.mjs';

const failures = [];
function check(label, condition) {
  if (!condition) failures.push(label);
}

// ---------------------------------------------------------------------------
// 1) Bausteine — synthetische Fixtures (keine Dateisystem-Abhängigkeit)
// ---------------------------------------------------------------------------

check('bufferByteGleich: identische Buffer sind gleich', bufferByteGleich(Buffer.from('a'), Buffer.from('a')));
check('bufferByteGleich: unterschiedliche Buffer sind ungleich', !bufferByteGleich(Buffer.from('a'), Buffer.from('b')));
check('bufferByteGleich: kein Buffer → false statt Crash', !bufferByteGleich('a', 'a'));

check(
  'pruefeIdDrift: kein Drift, wenn alle Seed-ids in mock-entries vorkommen',
  pruefeIdDrift([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'b' }, { id: 'c' }]).length === 0,
);
check(
  'pruefeIdDrift: fehlende id wird gefunden',
  pruefeIdDrift([{ id: 'a' }, { id: 'geistert' }], [{ id: 'a' }]).join(',') === 'geistert',
);
check('pruefeIdDrift: leerer Seed → kein Drift', pruefeIdDrift([], [{ id: 'a' }]).length === 0);

{
  // sha256Datei() gegen eine unabhängig (direkt über node:crypto, ohne
  // Dateilesen) berechnete Vergleichs-Prüfsumme über denselben Inhalt — kein
  // hartcodiertes Hex-Literal im Quelltext (löst sonst das secret-scan-Gate
  // als generischen Hoch-Entropie-Token aus, siehe tools/secret-scan.mjs).
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'kosmo-website-sync-hash-'));
  try {
    const inhalt = 'kosmo-website-sync-selbsttest-inhalt';
    const datei = path.join(tmpDir, 'inhalt.txt');
    writeFileSync(datei, inhalt);
    const erwartet = createHash('sha256').update(inhalt).digest('hex');
    check('sha256Datei: liefert dieselbe Prüfsumme wie eine unabhängige node:crypto-Berechnung', sha256Datei(datei) === erwartet);
    check('sha256Datei: liefert einen 64-stelligen Hex-String', /^[0-9a-f]{64}$/.test(sha256Datei(datei)));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 2) Grüner Fall — echter Checkout ist byte-gleich und driftfrei
// ---------------------------------------------------------------------------

{
  const ergebnis = fuehreVollpruefungAus();
  check(
    `Grüner Fall: echter Checkout ist ok (Meldungen: ${JSON.stringify(ergebnis.meldungen)})`,
    ergebnis.ok === true,
  );
  check('Grüner Fall: Seed ist byte-gleich', ergebnis.seedBytesGleich === true);
  check('Grüner Fall: kein id-Drift', Array.isArray(ergebnis.idDrift) && ergebnis.idDrift.length === 0);
  check('Grüner Fall: mockHash ist ein 64-stelliger Hex-String', /^[0-9a-f]{64}$/.test(ergebnis.mockHash));
  check('Grüner Fall: mockCount > 0', ergebnis.mockCount > 0);
  check(
    'Grüner Fall: Protokollzeile nennt Hash + Eintragszahl der Quelle',
    ergebnis.meldungen.some((m) => m.includes(MOCK_ENTRIES_RELPFAD) && m.includes('sha256=') && m.includes('Einträge=')),
  );
}

// ---------------------------------------------------------------------------
// 3) Roter Fall — fabrizierter Fixture-Baum mit manipuliertem Temp-Seed
// ---------------------------------------------------------------------------

{
  const fixtureRepoRoot = mkdtempSync(path.join(tmpdir(), 'kosmo-website-sync-rot-'));
  try {
    const fixtureKosmoOrbit = path.join(fixtureRepoRoot, 'kosmo-orbit');
    const fixtureTools = path.join(fixtureKosmoOrbit, 'tools');
    const fixturePublicDir = path.join(fixtureKosmoOrbit, 'apps', 'kosmo-orbit', 'public');
    const fixtureDataDir = path.join(fixtureRepoRoot, 'data');
    mkdirSync(fixtureTools, { recursive: true });
    mkdirSync(fixturePublicDir, { recursive: true });
    mkdirSync(fixtureDataDir, { recursive: true });

    // Unverändertes echtes Build-Skript + echte Quelldaten kopieren — nur
    // der eingecheckte Seed wird unten manipuliert.
    copyFileSync(path.join(kosmoOrbitRoot, BUILD_SKRIPT_RELPFAD), path.join(fixtureKosmoOrbit, BUILD_SKRIPT_RELPFAD));
    copyFileSync(path.join(repoRoot, MOCK_ENTRIES_RELPFAD), path.join(fixtureRepoRoot, MOCK_ENTRIES_RELPFAD));

    // Manipulierter Temp-Seed: weder inhaltlich noch byte-gleich zu dem, was
    // build-kosmodata-seed.mjs aus den echten mock-entries bauen würde —
    // simuliert einen von Hand nachbearbeiteten/veralteten Seed.
    const manipulierterSeed = JSON.stringify({
      schema: 'kosmodata-seed/v2',
      source: 'architekturkosmos.ch',
      count: 1,
      entries: [{ id: 'nicht-in-mock-entries', title: 'Fabriziert für den Selbsttest' }],
    });
    writeFileSync(path.join(fixturePublicDir, 'kosmodata-seed.json'), manipulierterSeed);

    const ergebnis = fuehreVollpruefungAus({
      kosmoOrbitRootPfad: fixtureKosmoOrbit,
      repoRootPfad: fixtureRepoRoot,
    });

    check('Roter Fall: manipulierter Seed wird als NICHT ok erkannt', ergebnis.ok === false);
    check('Roter Fall: Byte-Diff schlägt an', ergebnis.seedBytesGleich === false);
    check(
      'Roter Fall: Meldung nennt den Reparaturbefehl',
      ergebnis.meldungen.some((m) => m.includes('Seed veraltet') && m.includes('node tools/build-kosmodata-seed.mjs ausführen')),
    );
    check(
      'Roter Fall: id-Drift der fabrizierten id wird ebenfalls gefunden',
      ergebnis.idDrift.includes('nicht-in-mock-entries'),
    );
  } finally {
    rmSync(fixtureRepoRoot, { recursive: true, force: true });
  }
}

// Referenz auf SEED_RELPFAD halten (Export-Oberfläche mitgeprüft, s.o. genutzt).
check('SEED_RELPFAD zeigt auf apps/kosmo-orbit/public/kosmodata-seed.json', SEED_RELPFAD.endsWith('kosmodata-seed.json'));

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`pruefe-website-sync.test.mjs: ${failures.length} Fehlschlag/Fehlschläge:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('pruefe-website-sync.test.mjs: alle Prüfungen grün (grüner Fall + roter Fall).');
process.exit(0);
