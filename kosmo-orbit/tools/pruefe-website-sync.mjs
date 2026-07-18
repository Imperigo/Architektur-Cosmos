#!/usr/bin/env node
/**
 * pruefe-website-sync.mjs — Website-Sync-Gate (V084-SPEZ §3 E7, Diagnose D16,
 * Paket PD1). Reines Node, KEINE npm-Dependency (gleiches Muster wie
 * `tools/release-notiz.mjs`, `tools/secret-scan.mjs`, `tools/netz-check.mjs`
 * — läuft auch offline/air-gapped).
 *
 * FAKTEN (V084-SPEZ §1.2 Owner-Antwort 4, §3 E7): die Website IST der
 * Repo-Root (Next.js-Export, `src/worker.ts` serviert Root-`data/mock-
 * entries.json` als `/api/entries.json`). `kosmo-orbit/tools/build-
 * kosmodata-seed.mjs` liest DIESELBE Datei und baut daraus
 * `apps/kosmo-orbit/public/kosmodata-seed.json` (112 Einträge, App-Offline-
 * Seed). Quelle der Wahrheit ist die Repo-Datei — Schreibrichtung ist NIE
 * die App→Website (`packages/kosmo-data/src/live.ts` bleibt rein lesend).
 *
 * Dieses Gate prüft, dass der eingecheckte Seed nicht hinter der Quelle
 * zurückgefallen ist:
 *
 *   a) regeneriert den Seed über eine UNVERÄNDERTE Kopie von
 *      `build-kosmodata-seed.mjs` in einem Temp-Verzeichnis (eigene
 *      `kosmo-orbit/tools/` + `data/`-Struktur, damit dessen fest verdrahtete
 *      relative Pfadauflösung unangetastet funktioniert) — schreibt NIE in
 *      den echten Checkout,
 *   b) byte-difft das Ergebnis gegen den eingecheckten
 *      `apps/kosmo-orbit/public/kosmodata-seed.json` — Differenz = Exit 1
 *      mit der Meldung «Seed veraltet — node tools/build-kosmodata-seed.mjs
 *      ausführen»,
 *   c) protokolliert den sha256-Hash + die Eintragszahl von
 *      `../data/mock-entries.json`,
 *   d) prüft zusätzlich, dass JEDER eingecheckte Seed-Eintrag per `id` in
 *      `mock-entries.json` existiert (Drift-Schutz, unabhängig vom
 *      Byte-Diff — fängt z.B. einen von Hand nachbearbeiteten Seed).
 *
 * Teil von `release-gate` (`package.json`, Script-Zeile 23).
 *
 * Aufruf: node tools/pruefe-website-sync.mjs
 * Exit 0 = Seed aktuell + kein Drift. Exit 1 = veraltet und/oder Drift, mit
 * klarer Meldung, welcher Befehl das behebt.
 */

import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** `kosmo-orbit/` — Wurzel dieses Workspace. */
export const kosmoOrbitRoot = path.resolve(__dirname, '..');
/** Repo-Wurzel (Geschwister von `kosmo-orbit/`, enthält `data/mock-entries.json`). */
export const repoRoot = path.resolve(kosmoOrbitRoot, '..');

export const SEED_RELPFAD = path.join('apps', 'kosmo-orbit', 'public', 'kosmodata-seed.json');
export const BUILD_SKRIPT_RELPFAD = path.join('tools', 'build-kosmodata-seed.mjs');
export const MOCK_ENTRIES_RELPFAD = path.join('data', 'mock-entries.json');

/** sha256 (hex) einer Datei. */
export function sha256Datei(pfad) {
  return createHash('sha256').update(readFileSync(pfad)).digest('hex');
}

/**
 * Regeneriert den Seed über eine UNVERÄNDERTE Kopie von
 * `build-kosmodata-seed.mjs` in einem frischen Temp-Verzeichnis. Das Skript
 * berechnet seine Pfade relativ zur EIGENEN Datei (zwei Ebenen hoch =
 * kosmo-orbit-Wurzel, drei Ebenen hoch = Repo-Wurzel) — deshalb bekommt die
 * Kopie exakt dieselbe relative Verzeichnisform (`<tmp>/kosmo-orbit/tools/…`,
 * `<tmp>/data/mock-entries.json`), statt das Skript selbst anzufassen oder zu
 * parametrisieren. Schreibt NIE in den echten Checkout; räumt das
 * Temp-Verzeichnis danach immer auf (auch bei Fehlern). Gibt den rohen
 * Buffer des frisch gebauten Seeds zurück.
 */
export function regeneriereSeedBuffer({ kosmoOrbitRootPfad = kosmoOrbitRoot, repoRootPfad = repoRoot } = {}) {
  const buildSkriptQuelle = path.join(kosmoOrbitRootPfad, BUILD_SKRIPT_RELPFAD);
  const mockEntriesQuelle = path.join(repoRootPfad, MOCK_ENTRIES_RELPFAD);

  const tmpRoot = mkdtempSync(path.join(tmpdir(), 'kosmo-website-sync-'));
  try {
    const tmpKosmoOrbit = path.join(tmpRoot, 'kosmo-orbit');
    const tmpTools = path.join(tmpKosmoOrbit, 'tools');
    const tmpPublicDir = path.join(tmpKosmoOrbit, 'apps', 'kosmo-orbit', 'public');
    const tmpDataDir = path.join(tmpRoot, 'data');
    mkdirSync(tmpTools, { recursive: true });
    mkdirSync(tmpPublicDir, { recursive: true });
    mkdirSync(tmpDataDir, { recursive: true });

    const tmpBuildSkript = path.join(tmpTools, 'build-kosmodata-seed.mjs');
    const tmpMockEntries = path.join(tmpDataDir, 'mock-entries.json');
    copyFileSync(buildSkriptQuelle, tmpBuildSkript);
    copyFileSync(mockEntriesQuelle, tmpMockEntries);

    execFileSync(process.execPath, [tmpBuildSkript], { stdio: 'pipe' });

    const tmpSeedPfad = path.join(tmpPublicDir, 'kosmodata-seed.json');
    return readFileSync(tmpSeedPfad);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
}

/** Byte-Gleichheit zweier Buffer (kleiner Buffer.equals-Wrapper, gut testbar). */
export function bufferByteGleich(a, b) {
  return Buffer.isBuffer(a) && Buffer.isBuffer(b) && a.equals(b);
}

/**
 * Drift-Schutz (d): jeder Seed-Eintrag muss per `id` in `mock-entries.json`
 * existieren — unabhängig vom Byte-Diff (fängt z.B. einen von Hand
 * nachbearbeiteten Seed, dessen Bytes zufällig nicht mehr geprüft wurden).
 * Gibt die Liste der fehlenden ids zurück (leer = kein Drift).
 */
export function pruefeIdDrift(seedEntries, mockEntries) {
  const mockIds = new Set(mockEntries.map((e) => e.id));
  return seedEntries.filter((e) => !mockIds.has(e.id)).map((e) => e.id);
}

/**
 * Volle Prüfung (a–d): regeneriert, byte-difft, protokolliert Hash/Zahl,
 * prüft Drift. Kein `process.exit` hier — der CLI-Wrapper unten entscheidet
 * den Exit-Code. Alle Pfade injizierbar, damit Selbsttests gegen
 * Fixture-Bäume laufen können, ohne den echten Checkout anzufassen.
 */
export function fuehreVollpruefungAus({ kosmoOrbitRootPfad = kosmoOrbitRoot, repoRootPfad = repoRoot } = {}) {
  const meldungen = [];
  const mockEntriesPfad = path.join(repoRootPfad, MOCK_ENTRIES_RELPFAD);
  const checkedSeedPfad = path.join(kosmoOrbitRootPfad, SEED_RELPFAD);

  // (c) Hash + Eintragszahl der Quelle protokollieren — immer, unabhängig
  // vom Ausgang der übrigen Prüfungen.
  const mockHash = sha256Datei(mockEntriesPfad);
  const mockEntries = JSON.parse(readFileSync(mockEntriesPfad, 'utf8'));
  meldungen.push(`Quelle ${MOCK_ENTRIES_RELPFAD}: sha256=${mockHash} Einträge=${mockEntries.length}`);

  // (a)+(b) regenerieren + byte-diff.
  const regeneriert = regeneriereSeedBuffer({ kosmoOrbitRootPfad, repoRootPfad });
  const eingecheckt = readFileSync(checkedSeedPfad);
  const seedBytesGleich = bufferByteGleich(regeneriert, eingecheckt);

  if (seedBytesGleich) {
    meldungen.push(`OK Seed ist aktuell (byte-gleich mit ${SEED_RELPFAD}).`);
  } else {
    meldungen.push(
      `FEHL Seed veraltet — node tools/build-kosmodata-seed.mjs ausführen (Byte-Diff zwischen regeneriertem und eingecheckten ${SEED_RELPFAD}).`,
    );
  }

  // (d) Drift-Schutz — gegen den EINGECHECKTEN Seed (der aktuell wahre
  // Stand des Repos), unabhängig vom Ausgang des Byte-Diffs oben.
  let idDrift = [];
  let checkedSeed = null;
  try {
    checkedSeed = JSON.parse(eingecheckt.toString('utf8'));
    idDrift = pruefeIdDrift(checkedSeed.entries ?? [], mockEntries);
  } catch (error) {
    meldungen.push(`FEHL eingecheckter Seed ist kein gültiges JSON: ${error.message}`);
    idDrift = ['<seed-parse-fehler>'];
  }

  if (idDrift.length === 0 && checkedSeed) {
    meldungen.push(
      `OK ${checkedSeed.entries.length}/${mockEntries.length} Seed-Einträge haben eine passende id in mock-entries.json (kein Drift).`,
    );
  } else if (idDrift.length > 0) {
    meldungen.push(
      `FEHL ${idDrift.length} Seed-Eintrag/Einträge ohne passende id in mock-entries.json: ${idDrift.join(', ')}`,
    );
  }

  const ok = seedBytesGleich && idDrift.length === 0;
  return { ok, meldungen, mockHash, mockCount: mockEntries.length, seedBytesGleich, idDrift };
}

// ---------------------------------------------------------------------------
// CLI — nur wenn direkt ausgeführt (nicht beim Import in Tests).
// ---------------------------------------------------------------------------

const istCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (istCli) {
  console.log('[pruefe-website-sync] Website-Sync-Vertrag (V084-SPEZ E7/D16) …');
  const ergebnis = fuehreVollpruefungAus();
  for (const zeile of ergebnis.meldungen) console.log(`[pruefe-website-sync] ${zeile}`);
  if (ergebnis.ok) {
    console.log('[pruefe-website-sync] GRÜN — Seed aktuell, kein Drift.');
    process.exit(0);
  } else {
    console.error('[pruefe-website-sync] ROT — siehe FEHL-Zeile(n) oben.');
    process.exit(1);
  }
}
