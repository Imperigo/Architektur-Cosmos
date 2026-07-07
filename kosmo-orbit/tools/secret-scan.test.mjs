#!/usr/bin/env node
/**
 * Selbständige Prüfung für `tools/secret-scan.mjs` (Serie I / Batch B2) — kein
 * Test-Framework nötig, gleiches Muster wie
 * `tools/homestation-bridge/test_bridge_haerte.py`: reines Node, Exit-Code 0
 * = alle Prüfungen grün, sonst != 0 mit Liste der Fehlschläge.
 *
 * Deckt das Abnahmekriterium aus `docs/SERIE-I-BUILDPLAN.md` §5/B2 ab:
 * "Secret-Scan bricht bei Test-Key ab, grün bei sauberem `dist/`."
 *
 * Aufruf: node tools/secret-scan.test.mjs
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  scanText,
  scanSource,
  scanDist,
  findEnvLeftovers,
  entropy,
  kosmoOrbitRoot,
} from './secret-scan.mjs';

const failures = [];

function check(label, condition) {
  if (!condition) failures.push(label);
}

function findingsOf(rule, findings) {
  return findings.filter((f) => f.rule === rule);
}

// ---------------------------------------------------------------------------
// 1) Reine Muster-Erkennung (scanText) — Positiv- und Negativkontrolle
// ---------------------------------------------------------------------------

// Echt aussehender Anthropic-Schlüssel (Fake, nur für den Test erzeugt).
const FAKE_ANTHROPIC_KEY = 'sk-ant-api03-' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0'.slice(0, 40);
{
  const findings = scanText(`const key = "${FAKE_ANTHROPIC_KEY}";`, 'fixture.ts', { genericRule: true });
  check('Anthropic-Schlüssel wird erkannt', findingsOf('anthropic-key', findings).length === 1);
}
{
  // Kurzer Test-Platzhalter aus echten Unit-Tests — DARF NICHT anschlagen.
  const findings = scanText(`expect(h).toEqual({ 'x-api-key': 'sk-ant-test' });`, 'fixture.test.ts', {
    genericRule: true,
  });
  check(
    'Kurzer Test-Platzhalter "sk-ant-test" löst KEINEN Fund aus (Negativkontrolle gegen Falsch-Positiv)',
    findings.length === 0,
  );
}

// AWS Access Key ID (Fake-Form, korrektes Muster: AKIA + 16 Grossbuchstaben/Ziffern).
const FAKE_AWS_KEY = 'AKIA' + 'ABCDEFGHIJ0123456'.slice(0, 16);
{
  const findings = scanText(`AWS_ACCESS_KEY_ID=${FAKE_AWS_KEY}`, 'fixture.env', { genericRule: false });
  check('AWS-Access-Key wird erkannt', findingsOf('aws-access-key', findings).length === 1);
}

// x-api-key als Objekt-Literal mit einem langen, nicht-sk-ant-förmigen Fake-Geheimnis.
const FAKE_GENERIC_SECRET = 'Zx9Qw3Er7Ty2Ui8Op1As5Df6Gh4Jk0Lz';
{
  const findings = scanText(`headers: { 'x-api-key': '${FAKE_GENERIC_SECRET}' }`, 'fixture.ts', {
    genericRule: true,
  });
  check(
    'x-api-key-Literal mit langem Fake-Geheimnis wird erkannt',
    findingsOf('x-api-key-literal', findings).length === 1,
  );
}
{
  // Echte Codeform aus packages/kosmo-ai/src/anthropic.ts — Variablen-Referenz,
  // KEIN Literal. Muss grün bleiben, sonst wäre das Gate für den echten Code rot.
  const findings = scanText(`return { 'x-api-key': cfg.apiKey ?? '' };`, 'anthropic.ts', {
    genericRule: true,
  });
  check(
    'Variablen-Referenz cfg.apiKey löst KEINEN Fund aus (Negativkontrolle gegen Falsch-Positiv)',
    findings.length === 0,
  );
}
{
  // curl-/Header-Schreibweise in einer Doku-Zeile.
  const findings = scanText(`curl -H "x-api-key: ${FAKE_GENERIC_SECRET}" https://api.anthropic.com`, 'fixture.md', {
    genericRule: true,
  });
  check(
    'x-api-key im Header-/curl-Stil wird erkannt',
    findingsOf('x-api-key-header', findings).length >= 1,
  );
}

// Generischer Hex-Token (40+ Zeichen, hohe Entropie) — nur mit genericRule.
const FAKE_HEX_TOKEN = 'a3f9c1b8e2d7406f9a1c8b3e7d2f4061a9c3e8f1';
{
  const withGeneric = scanText(`const token = "${FAKE_HEX_TOKEN}";`, 'fixture.ts', { genericRule: true });
  check('Generischer Hex-Token wird im Quelltext-Modus erkannt', findingsOf('generic-hex-token', withGeneric).length === 1);

  const withoutGeneric = scanText(`const token = "${FAKE_HEX_TOKEN}";`, 'fixture.js', { genericRule: false });
  check(
    'Generischer Hex-Token wird im dist-Modus (genericRule=false) bewusst NICHT geprüft',
    findingsOf('generic-hex-token', withoutGeneric).length === 0,
  );
}

// Generischer Base64-Token (40+ Zeichen, hohe Entropie).
const FAKE_B64_TOKEN = 'qW3eR7tY9uI0oP1aS5dF8gH2jK4lZ6xC9vB3nM7q';
{
  const findings = scanText(`const secret = "${FAKE_B64_TOKEN}";`, 'fixture.ts', { genericRule: true });
  check('Generischer Base64-Token wird erkannt', findingsOf('generic-base64-token', findings).length === 1);
}

// ---------------------------------------------------------------------------
// 2) Bekannte Falsch-Positiv-Formen aus dem echten Kalibrierungslauf gegen
//    den gebauten dist/-Ordner (siehe Kopfkommentar von secret-scan.mjs) —
//    dürfen NICHT anschlagen, auch nicht mit genericRule=true.
// ---------------------------------------------------------------------------

{
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const findings = scanText(`const b64chars="${alphabet}";`, 'fixture-vendor.js', { genericRule: true });
  check(
    'Wörtliche Base64-Alphabet-Konstante löst KEINEN Fund aus',
    findingsOf('generic-base64-token', findings).length === 0,
  );
}
{
  const sri =
    'script.integrity="sha512-4ze/a9/4jqu+tX9dfOqJYSvyYd5M6qum/3HpCLr+/Jqf0whc37VUbkpNGHR7/8pSnCFw47T1fmIpwBV7UySh3g==";';
  const findings = scanText(sri, 'fixture-vendor.js', { genericRule: true });
  check('Subresource-Integrity-Hash (sha512-…) löst KEINEN Fund aus', findingsOf('generic-base64-token', findings).length === 0);
}
{
  // Ein Dateipfad in Prosa sieht zufällig wie ein Base64-Lauf aus (nur "/" +
  // Wortzeichen) — in .md-Dateien greift die generische Regel ohnehin nicht.
  const findings = scanText(
    'siehe apps/kosmo-orbit/src/modules/design/DesignWorkspace für Details',
    'fixture.md',
    { genericRule: false },
  );
  check('Dateipfad-Prosa in .md löst KEINEN Fund aus (generische Regel gilt dort nicht)', findings.length === 0);
}

// ---------------------------------------------------------------------------
// 3) Entropie-Sanity: Wiederholungen haben niedrige, echte Zufalls-Token
//    hohe Entropie.
// ---------------------------------------------------------------------------
check('Entropie von Wiederholung ("AAAA...") ist niedrig', entropy('A'.repeat(50)) < 1);
check('Entropie eines Zufalls-Tokens ist hoch', entropy(FAKE_B64_TOKEN) > 4.5);

// ---------------------------------------------------------------------------
// 4) .env-Leichen — echte Datei wird gefunden, .example bleibt grün.
// ---------------------------------------------------------------------------

const tmpRoot = mkdtempSync(path.join(tmpdir(), 'kosmo-secret-scan-test-'));
try {
  mkdirSync(path.join(tmpRoot, 'apps', 'demo'), { recursive: true });
  writeFileSync(path.join(tmpRoot, '.env'), 'ANTHROPIC_API_KEY=sollte-nicht-hier-stehen\n');
  writeFileSync(path.join(tmpRoot, '.env.example'), 'ANTHROPIC_API_KEY=\n');
  writeFileSync(path.join(tmpRoot, 'apps', 'demo', '.env.local'), 'TOKEN=x\n');

  const envFindings = findEnvLeftovers(tmpRoot);
  const flaggedFiles = envFindings.map((f) => f.snippet);
  check('.env wird als Leiche erkannt', flaggedFiles.includes('.env'));
  check('.env.local wird als Leiche erkannt', flaggedFiles.includes('.env.local'));
  check('.env.example wird NICHT geflaggt (Vorlage erlaubt)', !flaggedFiles.includes('.env.example'));
  check('genau 2 .env-Leichen gefunden (nicht mehr, nicht weniger)', envFindings.length === 2);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 5) Voller Baum-Scan (scanSource) gegen ein präpariertes Fixture-Verzeichnis
//    — beweist, dass ein injizierter Schlüssel im echten Dateibaum-Lauf
//    (nicht nur in scanText direkt) gefangen wird, UND dass ein sauberer
//    Baum grün bleibt.
// ---------------------------------------------------------------------------

const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'kosmo-secret-scan-fixture-'));
try {
  mkdirSync(path.join(fixtureRoot, 'apps', 'demo', 'src'), { recursive: true });
  mkdirSync(path.join(fixtureRoot, 'node_modules', 'irrelevant'), { recursive: true });
  mkdirSync(path.join(fixtureRoot, 'dist'), { recursive: true });

  // Sauberer Quelltext.
  writeFileSync(
    path.join(fixtureRoot, 'apps', 'demo', 'src', 'clean.ts'),
    `export function ok() { return { 'x-api-key': cfg.apiKey ?? '' }; }\n`,
  );
  // node_modules muss ignoriert werden — dort ein "Schlüssel" als Ablenkung.
  writeFileSync(
    path.join(fixtureRoot, 'node_modules', 'irrelevant', 'index.js'),
    `const k = "${FAKE_ANTHROPIC_KEY}";`,
  );

  const cleanRun = scanSource(fixtureRoot);
  check('Sauberer Fixture-Baum ist grün (node_modules ignoriert)', cleanRun.length === 0);

  // Jetzt einen echten Fund im Quelltext injizieren.
  writeFileSync(
    path.join(fixtureRoot, 'apps', 'demo', 'src', 'dirty.ts'),
    `const leaked = "${FAKE_ANTHROPIC_KEY}"; // versehentlich eingecheckt\n`,
  );
  const dirtyRun = scanSource(fixtureRoot);
  check(
    'Injizierter Test-Schlüssel im Fixture-Baum wird gefangen (scanSource bricht ab)',
    findingsOf('anthropic-key', dirtyRun).some((f) => f.file.includes('dirty.ts')),
  );

  // dist/ mit demselben Schlüssel in einer Vendor-artigen JS-Datei — muss
  // trotz genericRule=false über die präzise sk-ant-Regel gefunden werden.
  writeFileSync(path.join(fixtureRoot, 'dist', 'bundle.js'), `var K="${FAKE_ANTHROPIC_KEY}";`);
  const distRun = scanDist(path.join(fixtureRoot, 'dist'));
  check(
    'Injizierter Test-Schlüssel im dist-Bundle wird gefangen (präzise Regel greift auch ohne genericRule)',
    findingsOf('anthropic-key', distRun).length === 1,
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 6) Regression gegen den ECHTEN Workspace — Abnahmekriterium B2: "grün bei
//    sauberem dist/". Baut NICHT selbst (das macht das CI/Gate vorher via
//    `npm run build`); überspringt ehrlich, wenn dist/ fehlt.
// ---------------------------------------------------------------------------

{
  const realSourceFindings = scanSource(kosmoOrbitRoot);
  check(
    `Echter Quelltext ist grün (${realSourceFindings.length} Fund(e))`,
    realSourceFindings.length === 0,
  );
  if (realSourceFindings.length > 0) {
    for (const f of realSourceFindings) console.error('  ', f);
  }
}
{
  const distDir = path.join(kosmoOrbitRoot, 'apps', 'kosmo-orbit', 'dist');
  const realDistFindings = scanDist(distDir);
  check(`Echter dist/-Build ist grün (${realDistFindings.length} Fund(e))`, realDistFindings.length === 0);
  if (realDistFindings.length > 0) {
    for (const f of realDistFindings) console.error('  ', f);
  }
}

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`secret-scan.test.mjs: ${failures.length} Fehlschlag/Fehlschläge:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('secret-scan.test.mjs: alle Prüfungen grün.');
process.exit(0);
