#!/usr/bin/env node
/**
 * Secret-Scan-Gate (Serie I / Batch B2, R3 + R9) — reines Node, KEINE
 * npm-Dependency (läuft mit blossem `node`, auch offline/air-gapped).
 *
 * Zweck: verhindert, dass ein echter Schlüssel/Token in den Quelltext, ins
 * Repo oder in den ausgelieferten `dist/`-Build gerät (Bauplan
 * `docs/SERIE-I-BUILDPLAN.md` §B2, Risiko R3 „Secret im Build/Repo/Artefakt“).
 *
 * Muster:
 *   1. Anthropic-Schlüssel (`sk-ant-…`)
 *   2. AWS-Access-Key-ID (`AKIA…`)
 *   3. Ein Klartext-Geheimnis, das wörtlich an `x-api-key` hängt (Objekt-
 *      Literal ODER Header-/curl-Schreibweise)
 *   4. Generischer hochentropischer Hex-/Base64-Token (40+ Zeichen)
 *   5. Liegengebliebene `.env`-Dateien (echte, keine `.example`/`.sample`)
 *
 * ZWEI SCAN-BEREICHE MIT UNTERSCHIEDLICHEM REGELSATZ — bewusst, empirisch
 * begründet (nicht geraten): ein erster Kalibrierungslauf dieses Skripts
 * gegen den echten `npm run build -w @kosmo/orbit-app`-Output zeigte, dass
 * Regel 4 (generischer Hoch-Entropie-Token) im **minifizierten Vendor-Bundle**
 * (three.js/GLTFLoader, html2canvas, pdf.js/pdf.worker, jspdf, MSAL, web-ifc)
 * literal Dutzende Falsch-Treffer erzeugt: eingebettete Schriftart-Binärdaten
 * (`atob("T1RUTw...")`), Subresource-Integrity-Hashes (`sha512-…`,
 * öffentlich und absichtlich sichtbar), wörtliche Base64-Alphabet-Konstanten
 * in Encoder-Bibliotheken sowie obfuskierte pdf.js-Strings und IFC-
 * Bezeichner, die zufällig wie Base64 aussehen. Ein Blind-Scan hätte JEDEN
 * Build rot gemacht — das Gate wäre nach kurzer Zeit ignoriert worden.
 *
 * Deshalb gilt Regel 4 (generischer Token) NUR für den **Quelltext**, den
 * wir selbst schreiben (`src/`, `tools/`, eigene Configs) — dort ist die
 * Falsch-Positiv-Rate im Kalibrierungslauf 0. Ein Geheimnis kann nur in den
 * Build gelangen, wenn es vorher im eigenen Quelltext stand — das
 * Quelltext-Gate greift also strukturell VOR dem Artefakt. Für `dist/`
 * bleiben die drei präzisen, praktisch falsch-positiv-freien Regeln
 * (Anthropic-Schlüssel, AWS-Key, `x-api-key`-Literal) plus die
 * `.env`-Leichen-Prüfung aktiv — siehe `scanDist()`.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const kosmoOrbitRoot = path.resolve(here, '..');

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'dev-dist',
  'test-results',
  'playwright-report',
  'e2e-results',
  '.venv',
  '__pycache__',
  'target', // Rust-Build-Output (src-tauri)
  'gen', // generierte Tauri-Schemas
]);

const LOCKFILE_NAMES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock']);

// Eigene Fixture-/Selbsttest-Dateien, die ABSICHTLICH Fake-Geheimnisse als
// Literal enthalten, um dieses Skript selbst zu prüfen — sonst würde das
// Gate auf sich selbst anschlagen. Einzige Ausnahme im ganzen Baum.
const SELF_TEST_FILES = new Set(['tools/secret-scan.test.mjs']);

const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.wasm',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.glb',
  '.gltf',
  '.mp3',
  '.mp4',
  '.pdf',
  '.zip',
  '.sqlite',
  '.map', // Source-Maps: gleiche Falsch-Positiv-Problematik wie Vendor-Bundles
  '.icns',
  '.ico',
]);

// Texterweiterungen, die auf die drei präzisen Regeln (Anthropic/AWS/x-api-key)
// UND die .env-Leichen-Prüfung geprüft werden — überall (Quelltext wie dist/).
const ALL_TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.json',
  '.md',
  '.toml',
  '.yml',
  '.yaml',
  '.html',
  '.css',
  '.txt',
  '.webmanifest',
  '.jsonl', // Trainings-Korpus (wissen/training/*.jsonl)
]);

// Nur diese Erweiterungen bekommen zusätzlich die generische Hoch-Entropie-
// Regel (Regel 4) — reiner, selbst geschriebener Code, kein Vendor-Output,
// kein Prosatext (Doku/Pfade in .md sehen sonst wie Base64 aus, siehe oben).
const GENERIC_RULE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs']);

// Wörtliche Base64/Base62-Alphabet-Konstanten aus Encoder-Bibliotheken
// (html2canvas, derive.worker via fflate/base64-Polyfills, index-Bundle) —
// keine Geheimnisse, sondern Zeichensatz-Definitionen. Exakt als Substring
// im Kalibrierungslauf gefunden.
const KNOWN_ALPHABETS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
];

function isKnownAlphabetSubstring(token) {
  const doubled = (s) => s + s; // erlaubt auch rotierte Ausschnitte
  return KNOWN_ALPHABETS.some((a) => doubled(a).includes(token));
}

// Bekannte Datei-Magic-Byte-Signaturen, base64-kodiert — Falsch-Positiv-Form
// entdeckt in v0.8.1/P7 (Büro-Logo-SVG/JPG-Feature, `git log` f888f20):
// Mini-Bild-Fixtures (JPEG/PNG/GIF/WEBP/BMP/SVG) werden in Test-Dateien als
// nackte Base64-String-Literale eingebettet (kein `data:…;base64,`-Präfix
// nötig, s. `e2e/plankopf.spec.ts`/`export-pdf-haertung.spec.ts`), damit ein
// echter Browser-Decode-Schritt im Test funktioniert. Diese Präfixe sind
// FESTE Datei-Signaturen (erste Bytes jedes Formats) — kein Zufalls-Geheimnis
// beginnt zufällig exakt damit UND ist gleichzeitig 40+ hoch-entropische
// Zeichen lang. Analog zur bestehenden SRI-/Alphabet-Ausnahme oben.
// Hinweis JPEG: die volle Signatur ist "/9j/" (FF D8 FF), aber `RE_B64_TOKEN`
// verankert `\b` — der Regex-Treffer beginnt bei sowohl vorangehendem
// Anführungszeichen als auch führendem "/" NICHT (kein \w↔\W-Übergang
// zwischen den beiden Nicht-Wortzeichen), sondern erst beim ersten
// Wortzeichen danach. Der eingefangene Token beginnt also praktisch immer
// bei "9j/…", nicht bei "/9j/…" — beide Formen bleiben hier zugelassen.
const KNOWN_IMAGE_B64_PREFIXES = [
  '/9j/', // JPEG (Magic-Bytes FF D8 FF), falls der Regex-Treffer den Slash mit einfängt
  '9j/', // JPEG — die praktisch vorkommende, um das führende "/" verkürzte Form
  'iVBORw0KGgo', // PNG
  'R0lGOD', // GIF87a/89a
  'UklGR', // WEBP (RIFF-Container)
  'Qk0', // BMP
  'PHN2Zy', // reiner SVG-Text, beginnt mit "<svg"
  'PD94bWwg', // SVG mit XML-Deklaration, beginnt mit "<?xml "
];

function looksLikeEmbeddedImageBase64(token) {
  return KNOWN_IMAGE_B64_PREFIXES.some((p) => token.startsWith(p));
}

// Shannon-Entropie in Bit/Zeichen — filtert Wiederholungen/Dateipfade/
// generische Bezeichner (niedrig) von echten Zufalls-Token (hoch).
export function entropy(str) {
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    h -= p * Math.log2(p);
  }
  return h;
}

// ---------------------------------------------------------------------------
// Muster
// ---------------------------------------------------------------------------

const RE_ANTHROPIC = /sk-ant-[A-Za-z0-9_-]{20,}/g;
const RE_AWS = /\bAKIA[0-9A-Z]{16}\b/g;
// Objekt-/JSON-Literal: "x-api-key": "<wert>" — Wert muss gequotet + reines
// Token-Zeichenset sein (kein Punkt/Klammer/Dollar → keine Variablen-
// Referenzen wie `cfg.apiKey` oder Template-Strings `${apiKey}`).
const RE_X_API_KEY_LITERAL = /["']x-api-key["']\s*:\s*["']([A-Za-z0-9_\-+/=]{16,})["']/gi;
// Header-/curl-Schreibweise: `x-api-key: <wert>` ohne Anführungszeichen um
// den Schlüsselnamen (z. B. in Shell-Beispielen/Docs/Logs).
const RE_X_API_KEY_HEADER = /x-api-key:\s*([A-Za-z0-9_\-+/=]{16,})/gi;
const RE_HEX_TOKEN = /\b[A-Fa-f0-9]{40,}\b/g;
const RE_B64_TOKEN = /\b[A-Za-z0-9+/]{40,200}={0,2}\b/g;

const HEX_ENTROPY_MIN = 3.0; // Max für reines Hex-Alphabet (16 Symbole) = 4.0
const B64_ENTROPY_MIN = 4.6; // Max für Base64-Alphabet (64 Symbole) = 6.0

// ---------------------------------------------------------------------------
// Dateibaum
// ---------------------------------------------------------------------------

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name) || name.startsWith('.') && name !== '.github';
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(path.join(dir, entry.name));
    }
  }
}

function listFiles(root) {
  const out = [];
  walk(root, out);
  return out;
}

// ---------------------------------------------------------------------------
// Scan-Kern
// ---------------------------------------------------------------------------

/**
 * @param {string} content Dateiinhalt
 * @param {string} relPath Für die Meldung (relativer Pfad)
 * @param {{ genericRule: boolean }} opts
 * @returns {Array<{rule: string, file: string, snippet: string}>}
 */
export function scanText(content, relPath, opts = {}) {
  const { genericRule = false } = opts;
  const findings = [];

  for (const m of content.matchAll(RE_ANTHROPIC)) {
    findings.push({ rule: 'anthropic-key', file: relPath, snippet: redact(m[0]) });
  }
  for (const m of content.matchAll(RE_AWS)) {
    findings.push({ rule: 'aws-access-key', file: relPath, snippet: redact(m[0]) });
  }
  for (const m of content.matchAll(RE_X_API_KEY_LITERAL)) {
    findings.push({ rule: 'x-api-key-literal', file: relPath, snippet: redact(m[0]) });
  }
  for (const m of content.matchAll(RE_X_API_KEY_HEADER)) {
    findings.push({ rule: 'x-api-key-header', file: relPath, snippet: redact(m[0]) });
  }

  if (genericRule) {
    for (const m of content.matchAll(RE_HEX_TOKEN)) {
      const token = m[0];
      if (entropy(token) >= HEX_ENTROPY_MIN) {
        findings.push({ rule: 'generic-hex-token', file: relPath, snippet: redact(token) });
      }
    }
    for (const m of content.matchAll(RE_B64_TOKEN)) {
      const token = m[0];
      if (isKnownAlphabetSubstring(token)) continue;
      if (isSriContext(content, m.index)) continue;
      if (looksLikeEmbeddedImageBase64(token)) continue;
      if (entropy(token) >= B64_ENTROPY_MIN) {
        findings.push({ rule: 'generic-base64-token', file: relPath, snippet: redact(token) });
      }
    }
  }

  return findings;
}

// Subresource-Integrity-Hashes (`integrity="sha256-…"` u. Ä.) sind
// öffentliche, absichtlich sichtbare Hashes von Drittinhalten — kein Geheimnis.
function isSriContext(content, matchIndex) {
  const before = content.slice(Math.max(0, matchIndex - 16), matchIndex);
  return /sha(256|384|512)-$/.test(before);
}

function redact(token) {
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} Zeichen)`;
}

// ---------------------------------------------------------------------------
// .env-Leichen
// ---------------------------------------------------------------------------

const ENV_ALLOW_SUFFIXES = ['.example', '.sample', '.template'];

export function findEnvLeftovers(root) {
  const findings = [];
  const files = listFiles(root);
  for (const file of files) {
    const base = path.basename(file);
    if (base === '.env' || /^\.env\.[a-z0-9_-]+$/i.test(base)) {
      if (ENV_ALLOW_SUFFIXES.some((suf) => base.endsWith(suf))) continue;
      findings.push({ rule: 'env-leftover', file: path.relative(kosmoOrbitRoot, file), snippet: base });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Scan-Läufe
// ---------------------------------------------------------------------------

/** Quelltext: eigener Code + Tools + Docs + Configs — mit generischer Regel
 * für Code-Dateien (siehe Datei-Kopfkommentar für die Begründung). */
export function scanSource(root = kosmoOrbitRoot) {
  const findings = [];
  const files = listFiles(root);
  for (const file of files) {
    const base = path.basename(file);
    if (LOCKFILE_NAMES.has(base)) continue; // npm-Integrity-Hashes, kein Geheimnis
    const ext = path.extname(file).toLowerCase();
    if (BINARY_EXTS.has(ext)) continue;
    if (!ALL_TEXT_EXTS.has(ext)) continue;
    const rel = path.relative(kosmoOrbitRoot, file);
    if (SELF_TEST_FILES.has(rel.split(path.sep).join('/'))) continue;
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    findings.push(...scanText(content, rel, { genericRule: GENERIC_RULE_EXTS.has(ext) }));
  }
  return findings;
}

/** Gebauter `dist/`-Ordner: nur die drei präzisen Regeln (siehe Kopfkommentar). */
export function scanDist(distDir) {
  const findings = [];
  if (!existsSync(distDir)) return findings;
  const files = listFiles(distDir);
  for (const file of files) {
    const base = path.basename(file);
    const ext = path.extname(file).toLowerCase();
    if (BINARY_EXTS.has(ext)) continue;
    if (!ALL_TEXT_EXTS.has(ext)) continue;
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(kosmoOrbitRoot, file);
    findings.push(...scanText(content, rel, { genericRule: false }));
  }
  return findings;
}

// ---------------------------------------------------------------------------
// wissen/ (Serie I / I2-Nachtrag, 08.07.2026) — Büro-Wissenskorpus
// ---------------------------------------------------------------------------

// `wissen/vault` (Obsidian-Notizen) und `wissen/training` (LoRA-/Fine-Tune-
// Korpus, `.jsonl`) liegen als Geschwister-Verzeichnis von `kosmo-orbit/` im
// selben Repo, ausserhalb von `kosmoOrbitRoot` — der ursprüngliche
// Scan-Bereich (`scanSource(kosmoOrbitRoot)`) hat sie darum NIE erfasst.
// Genau die Art Text, in die versehentlich ein API-Key/Token aus einem
// eingefügten Briefing/Log geraten könnte (I1: Büro-Daten + Schlüssel/Token
// sind beide benannte Assets). Nur die drei präzisen Regeln (wie `dist/`),
// keine generische Hoch-Entropie-Regel — Prose/Trainingsdaten enthalten
// legitime lange Zeichenketten (ISBNs, ID-Listen, ISO-Zeitstempel-Reihen),
// die als Falsch-Treffer explodieren würden.
export const WISSEN_UNTERORDNER = ['vault', 'training'];

export function wissenRoots(root = kosmoOrbitRoot) {
  return WISSEN_UNTERORDNER.map((name) => path.resolve(root, '..', 'wissen', name));
}

/** `wissen/vault` + `wissen/training`: dieselben drei präzisen Regeln wie
 * `dist/` (kein generischer Hoch-Entropie-Treffer auf Prosa/Trainingsdaten).
 * Fehlt `wissen/` in der Umgebung (z. B. isolierter Checkout ohne den
 * Geschwister-Ordner), wird der jeweilige Unterordner ehrlich übersprungen. */
export function scanWissen(root = kosmoOrbitRoot) {
  const findings = [];
  for (const dir of wissenRoots(root)) {
    if (!existsSync(dir)) continue;
    for (const file of listFiles(dir)) {
      const ext = path.extname(file).toLowerCase();
      if (BINARY_EXTS.has(ext)) continue;
      if (!ALL_TEXT_EXTS.has(ext)) continue;
      let content;
      try {
        content = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const rel = path.relative(path.resolve(root, '..'), file);
      findings.push(...scanText(content, rel, { genericRule: false }));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const distDir = path.join(kosmoOrbitRoot, 'apps', 'kosmo-orbit', 'dist');
  const findings = [
    ...scanSource(kosmoOrbitRoot),
    ...scanDist(distDir),
    ...findEnvLeftovers(kosmoOrbitRoot),
    ...scanWissen(kosmoOrbitRoot),
  ];

  if (findings.length === 0) {
    console.log('[secret-scan] grün — keine Geheimnis-Muster in Quelltext, dist/ oder wissen/ gefunden.');
    const wissenGefunden = wissenRoots(kosmoOrbitRoot).filter((d) => existsSync(d));
    console.log(`[secret-scan] geprüft: Quelltext unter ${kosmoOrbitRoot} + ${existsSync(distDir) ? distDir : '(dist/ fehlt — nicht gebaut, übersprungen)'}`);
    console.log(
      `[secret-scan] geprüft: wissen/{vault,training} — ${wissenGefunden.length > 0 ? wissenGefunden.join(', ') : '(wissen/ hier nicht vorhanden — übersprungen)'}`
    );
    process.exit(0);
  }

  console.error(`[secret-scan] ROT — ${findings.length} Fund(e):`);
  for (const f of findings) {
    console.error(`  [${f.rule}] ${f.file} — ${f.snippet}`);
  }
  console.error('[secret-scan] Schlüssel/Token gehören NIE ins Repo/den Build — rotieren + entfernen, dann erneut prüfen.');
  process.exit(1);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
