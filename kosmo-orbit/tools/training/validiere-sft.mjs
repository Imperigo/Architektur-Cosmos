#!/usr/bin/env node
/**
 * Schema-Validator für den Trainings-Datenraum `wissen/training/` (v0.8.2/P1,
 * `docs/V082-SPEZ.md` §3.4) — reines Node, KEINE npm-Dependency (gleiches
 * Muster wie `tools/secret-scan.mjs`).
 *
 * Prüft **Struktur + Visibility** der drei kanonischen Schemata
 * (`kosmo-sft/v1`, `kosmo-signal/v1`, `kosmo-dpo/v1`) und toleriert die
 * Alt-Korpora unter `korpora/` als «rohwissen, kein SFT» (nur JSON-Gültigkeit
 * + Nie-ins-Git-Muster, keine SFT-Feldpflicht). Secrets sind NICHT Aufgabe
 * dieses Skripts — das bleibt exklusiv `tools/secret-scan.mjs` (§3.4, keine
 * Doppelspurigkeit).
 *
 * Aufruf:
 *   node tools/training/validiere-sft.mjs                # Standard: ganz wissen/training/
 *   node tools/training/validiere-sft.mjs <pfad …>        # gezielt einzelne Dateien/Ordner
 *
 * Exit 0 = keine harten Fehler (Warnungen sind erlaubt, werden aber gelistet).
 * Exit 1 = mindestens ein harter Fehler.
 */

import { readFileSync, readdirSync, statSync, existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const kosmoOrbitRoot = path.resolve(here, '..', '..');
export const wissenTrainingRoot = path.resolve(kosmoOrbitRoot, '..', 'wissen', 'training');

// ---------------------------------------------------------------------------
// REGISTRY.md — die massgebliche Adapterliste (§2.4/§3.4: "meta.adapter …
// nicht in der REGISTRY.md-Adapterliste enthalten" ist ein harter Fehler)
// ---------------------------------------------------------------------------

/** Liest die erste Tabellenspalte ("Adapter") aus `REGISTRY.md` — Backtick-
 * umschlossene Werte in Tabellenzeilen, Kopf-/Trennzeilen übersprungen. */
export function liesRegistryAdapter(registryPfad = path.join(wissenTrainingRoot, 'REGISTRY.md')) {
  if (!existsSync(registryPfad)) return [];
  const text = readFileSync(registryPfad, 'utf8');
  const adapter = new Set();
  for (const zeile of text.split('\n')) {
    const t = zeile.trim();
    if (!t.startsWith('|')) continue;
    const zellen = t.split('|').map((z) => z.trim());
    // erste "echte" Zelle nach dem führenden leeren Split-Element
    const erste = zellen[1] ?? '';
    if (!erste || /^-+$/.test(erste.replace(/[:\s]/g, '')) || erste === 'Adapter') continue;
    const m = erste.match(/`([^`]+)`/);
    if (m) adapter.add(m[1]);
  }
  return [...adapter];
}

// ---------------------------------------------------------------------------
// Nie-ins-Git-Muster (§3.5) — Ergänzung, kein Ersatz für secret-scan.mjs
// ---------------------------------------------------------------------------

const RE_LONG_B64 = /\b[A-Za-z0-9+/]{200,}={0,2}\b/g;
const RE_PDF_MAGIC = /%PDF-\d/;
const AUDIO_SCHLUESSEL = /^(audio|audioData|audioBase64|wav|pcm|mp3|mp3Base64)$/i;

// Base64-Alphabet hat 64 Symbole (max. Entropie 6.0 Bit/Zeichen) — reale
// Binärdaten liegen nahe der Gleichverteilung; Prosa ohne Leerzeichen (lange
// zusammengesetzte Wörter/Wiederholungen) hat spürbar weniger Entropie. Nach
// demselben Muster wie `tools/secret-scan.mjs` (B64_ENTROPY_MIN dort 4.6) —
// verhindert Falsch-Treffer auf Trainings-Fliesstext ohne echte Binärdaten.
const B64_ENTROPY_MIN = 4.6;

function entropie(str) {
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const anzahl of freq.values()) {
    const p = anzahl / str.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Läuft rekursiv über ein geparstes JSON-Objekt/Array und sammelt
 * Nie-ins-Git-Treffer (Audio-Schlüssel, lange Base64-Blobs, PDF-Magic-Bytes). */
function findeNieInsGit(wert, schluessel = '') {
  const funde = [];
  if (wert == null) return funde;
  if (typeof wert === 'string') {
    if (AUDIO_SCHLUESSEL.test(schluessel) && wert.length > 0) {
      funde.push(`Audio-Rohdaten im Feld "${schluessel}"`);
    }
    if (RE_PDF_MAGIC.test(wert)) {
      funde.push(`Fremd-PDF-Signatur ("%PDF-") im Feld "${schluessel || '(Wurzel)'}"`);
    }
    for (const treffer of wert.matchAll(RE_LONG_B64)) {
      const token = treffer[0];
      if (entropie(token) >= B64_ENTROPY_MIN) {
        funde.push(`Binär-/Base64-Blob (${token.length} Zeichen) im Feld "${schluessel || '(Wurzel)'}"`);
      }
    }
    return funde;
  }
  if (Array.isArray(wert)) {
    for (const eintrag of wert) funde.push(...findeNieInsGit(eintrag, schluessel));
    return funde;
  }
  if (typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) funde.push(...findeNieInsGit(v, k));
    return funde;
  }
  return funde;
}

// ---------------------------------------------------------------------------
// Dateityp-Erkennung anhand des Pfads (relativ zu wissen/training/)
// ---------------------------------------------------------------------------

const BEKANNTE_ORDNER = new Set(['korpora', 'sft', 'signale', 'dpo']);

/** Sucht den ERSTEN bekannten Trainingsordner-Namen irgendwo im Pfad — robust
 * gegenüber relativen Pfaden (ab `wissen/training/…`) UND absoluten
 * Fixture-Pfaden in Tests (z. B. ein tmp-Verzeichnis, das seinerseits
 * `.../sft/kosmo-buero/datei.jsonl` nachbildet).
 * @returns {'korpora'|'sft'|'signale'|'dpo'|'sonstiges'} */
export function klassifiziereDatei(pfad) {
  const segs = pfad.split(path.sep).join('/').split('/');
  for (const seg of segs) {
    if (BEKANNTE_ORDNER.has(seg)) return seg;
  }
  return 'sonstiges';
}

// ---------------------------------------------------------------------------
// Zeilen-Validierung je Typ
// ---------------------------------------------------------------------------

const LANGE_NACHRICHT_SCHWELLE = 4000; // Zeichen — reiner Budget-Hinweis, keine harte Grenze

/**
 * @param {unknown} zeile geparstes JSON-Objekt einer Zeile
 * @param {'korpora'|'sft'|'signale'|'dpo'} typ
 * @param {string[]} registryAdapter gültige Adapterwerte aus REGISTRY.md
 * @returns {{errors: string[], warnings: string[], id?: string}}
 */
export function validiereZeile(zeile, typ, registryAdapter) {
  const errors = [];
  const warnings = [];

  if (typeof zeile !== 'object' || zeile === null || Array.isArray(zeile)) {
    errors.push('Zeile ist kein JSON-Objekt');
    return { errors, warnings };
  }

  // Nie-ins-Git-Muster gelten für ALLE Typen (auch korpora/ als Sicherheitsnetz).
  for (const fund of findeNieInsGit(zeile)) errors.push(`Nie-ins-Git-Muster: ${fund}`);

  if (typ === 'korpora') {
    // Rohwissen, kein SFT — keine Feldpflicht über "ist valides JSON" hinaus.
    return { errors, warnings };
  }

  if (typ === 'sft') {
    if (!Array.isArray(zeile.messages)) {
      errors.push('"messages" fehlt (kosmo-sft/v1 verlangt ein messages-Array)');
    } else {
      for (const m of zeile.messages) {
        const len = typeof m?.content === 'string' ? m.content.length : 0;
        if (len > LANGE_NACHRICHT_SCHWELLE) {
          warnings.push(`ungewöhnlich lange messages-Nachricht (${len} Zeichen, Budget-Hinweis)`);
        }
      }
    }
    const adapter = zeile.meta?.adapter;
    if (!adapter) {
      errors.push('meta.adapter fehlt');
    } else if (!registryAdapter.includes(adapter)) {
      errors.push(`meta.adapter "${adapter}" ist nicht in der REGISTRY.md-Adapterliste enthalten`);
    }
    if (!zeile.meta?.quelle) warnings.push('meta.quelle fehlt (Provenienz-Lücke)');
    return { errors, warnings, id: zeile.meta?.id };
  }

  if (typ === 'signale') {
    if (!zeile.art) errors.push('"art" fehlt (kosmo-signal/v1 verlangt art)');
    if (!zeile.payload || typeof zeile.payload !== 'object') {
      errors.push('"payload" fehlt (kosmo-signal/v1 verlangt payload)');
    }
    if (!zeile.visibility) {
      errors.push('"visibility" fehlt — Pflichtfeld unter signale/ (Owner-Entscheid 1)');
    }
    if (!zeile.meta?.quelle) warnings.push('meta.quelle fehlt (Provenienz-Lücke)');
    return { errors, warnings, id: zeile.meta?.quelle };
  }

  if (typ === 'dpo') {
    if (typeof zeile.prompt !== 'string') errors.push('"prompt" fehlt (kosmo-dpo/v1 verlangt prompt)');
    if (typeof zeile.chosen !== 'string') errors.push('"chosen" fehlt (kosmo-dpo/v1 verlangt chosen)');
    if (typeof zeile.rejected !== 'string') errors.push('"rejected" fehlt (kosmo-dpo/v1 verlangt rejected)');
    if (!zeile.meta?.visibility) {
      errors.push('meta.visibility fehlt — Pflichtfeld unter dpo/ (Owner-Entscheid 1)');
    }
    if (!zeile.meta?.quelle) warnings.push('meta.quelle fehlt (Provenienz-Lücke)');
    return { errors, warnings, id: zeile.meta?.id };
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Datei-Lauf (Streaming — buecher.jsonl/vorlesungen.jsonl sind zweistellig MB)
// ---------------------------------------------------------------------------

/**
 * @param {string} datei absoluter Pfad
 * @param {string[]} registryAdapter
 * @returns {Promise<{datei: string, typ: string, zeilen: number, errors: Array<{zeile: number, meldung: string}>, warnings: Array<{zeile: number, meldung: string}>}>}
 */
export async function validiereDatei(datei, registryAdapter) {
  const rel = path.relative(wissenTrainingRoot, datei).split(path.sep).join('/');
  const typ = klassifiziereDatei(rel);
  const errors = [];
  const warnings = [];
  const gesehenIds = new Map(); // normalisierte id -> zeilennummer der ersten Sichtung
  let zeilen = 0;

  const rl = readline.createInterface({ input: createReadStream(datei, 'utf8'), crlfDelay: Infinity });
  let nr = 0;
  for await (const rohzeile of rl) {
    nr += 1;
    const t = rohzeile.trim();
    if (!t) continue;
    zeilen += 1;
    let json;
    try {
      json = JSON.parse(t);
    } catch (e) {
      errors.push({ zeile: nr, meldung: `kein valides JSON (${e.message})` });
      continue;
    }
    const { errors: zErrors, warnings: zWarnings, id } = validiereZeile(json, typ, registryAdapter);
    for (const m of zErrors) errors.push({ zeile: nr, meldung: m });
    for (const m of zWarnings) warnings.push({ zeile: nr, meldung: m });
    if (id) {
      const norm = String(id).trim().toLowerCase();
      if (gesehenIds.has(norm)) {
        warnings.push({ zeile: nr, meldung: `doppelte/ähnliche meta.id "${id}" (zuerst Zeile ${gesehenIds.get(norm)})` });
      } else {
        gesehenIds.set(norm, nr);
      }
    }
  }

  return { datei: rel, typ, zeilen, errors, warnings };
}

// ---------------------------------------------------------------------------
// Datei-Sammlung
// ---------------------------------------------------------------------------

function sammleJsonlDateien(wurzel) {
  const out = [];
  if (!existsSync(wurzel)) return out;
  const stat = statSync(wurzel);
  if (stat.isFile()) {
    if (wurzel.endsWith('.jsonl')) out.push(wurzel);
    return out;
  }
  for (const eintrag of readdirSync(wurzel, { withFileTypes: true })) {
    if (eintrag.name.startsWith('.')) continue;
    const voll = path.join(wurzel, eintrag.name);
    if (eintrag.isDirectory()) out.push(...sammleJsonlDateien(voll));
    else if (eintrag.isFile() && eintrag.name.endsWith('.jsonl')) out.push(voll);
  }
  return out;
}

/** Standard-Scope: korpora/ + sft/ + signale/ + dpo/ (nicht eval/, nicht
 * claude/ — beide tragen keine JSONL-Trainingszeilen). */
export function standardDateien(wurzel = wissenTrainingRoot) {
  const unterordner = ['korpora', 'sft', 'signale', 'dpo'];
  const out = [];
  for (const u of unterordner) out.push(...sammleJsonlDateien(path.join(wurzel, u)));
  return out.sort();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const argDateien = process.argv.slice(2);
  const registryAdapter = liesRegistryAdapter();
  const dateien =
    argDateien.length > 0
      ? argDateien.flatMap((a) => sammleJsonlDateien(path.resolve(a)))
      : standardDateien();

  if (dateien.length === 0) {
    console.log('[validiere-sft] keine .jsonl-Dateien gefunden — nichts zu prüfen.');
    process.exit(0);
  }

  let gesamtFehler = 0;
  let gesamtWarnungen = 0;
  const berichte = [];
  for (const datei of dateien) {
    const bericht = await validiereDatei(datei, registryAdapter);
    berichte.push(bericht);
    gesamtFehler += bericht.errors.length;
    gesamtWarnungen += bericht.warnings.length;
    if (bericht.errors.length === 0) {
      console.log(`[OK]     ${bericht.datei} — ${bericht.zeilen} Zeilen (${bericht.typ}), ${bericht.warnings.length} Warnung(en)`);
    } else {
      console.log(`[FEHLER] ${bericht.datei} — ${bericht.errors.length} Fehler von ${bericht.zeilen} Zeilen (${bericht.typ})`);
    }
    for (const w of bericht.warnings) console.log(`         ~ Zeile ${w.zeile}: ${w.meldung}`);
    for (const e of bericht.errors) console.log(`         ✗ Zeile ${e.zeile}: ${e.meldung}`);
  }

  console.log('');
  console.log(
    `[validiere-sft] ${berichte.length} Datei(en) geprüft — ${gesamtFehler} harte(r) Fehler, ${gesamtWarnungen} Warnung(en).`
  );
  process.exit(gesamtFehler > 0 ? 1 : 0);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
