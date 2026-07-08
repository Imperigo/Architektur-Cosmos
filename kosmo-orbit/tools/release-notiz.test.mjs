#!/usr/bin/env node
/**
 * Selbständige Prüfung für `tools/release-notiz.mjs` — kein Test-Framework
 * nötig, gleiches Muster wie `tools/secret-scan.test.mjs`: reines Node,
 * Exit-Code 0 = alle Prüfungen grün, sonst != 0 mit Liste der Fehlschläge.
 *
 * Aufruf: node tools/release-notiz.test.mjs
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseRoadmapEintraege,
  eintraegeAb,
  baueReleaseNotiz,
  zielPfad,
  schreibeReleaseNotiz,
  heutigesDatum,
  parseArgs,
} from './release-notiz.mjs';

const failures = [];

function check(label, condition) {
  if (!condition) failures.push(label);
}

// ---------------------------------------------------------------------------
// 1) ROADMAP-Parsing auf einem kleinen Fixture-Text — genau die erwarteten
//    Einträge ab `--von N`, unabhängig vom echten (langen) ROADMAP.md.
// ---------------------------------------------------------------------------

const FIXTURE_ROADMAP = `# ROADMAP (Fixture)

1. **Erster Punkt (alt)** ✅: Text eins.

2. **Zweiter Punkt (alt)** ✅: Text zwei, mit **eingebettetem Bold** mittendrin.

3. **Dritter Punkt — der neue Batch** ✅: Text drei.

**Phase X abgeschlossen:** irrelevante Fussnote, keine Nummer am Zeilenanfang.
`;

{
  const alle = parseRoadmapEintraege(FIXTURE_ROADMAP);
  check('parseRoadmapEintraege findet genau 3 nummerierte Einträge', alle.length === 3);
  check('Eintrag 1 hat den erwarteten Titel', alle[0]?.titel === 'Erster Punkt (alt)');
  check(
    'Eintrag 2: Titel endet an der ERSTEN schliessenden ** (nicht am eingebetteten Bold)',
    alle[1]?.titel === 'Zweiter Punkt (alt)',
  );
  check('Die Fussnotenzeile ohne führende Nummer wird NICHT als Eintrag erkannt', !alle.some((e) => e.titel.includes('Fussnote')));

  const ab3 = eintraegeAb(alle, 3);
  check('eintraegeAb(alle, 3) liefert genau 1 Eintrag (Nummer 3)', ab3.length === 1 && ab3[0].nummer === 3);

  const ab2 = eintraegeAb(alle, 2);
  check('eintraegeAb(alle, 2) liefert genau 2 Einträge, aufsteigend sortiert', ab2.length === 2 && ab2[0].nummer === 2 && ab2[1].nummer === 3);

  const ab99 = eintraegeAb(alle, 99);
  check('eintraegeAb(alle, 99) liefert 0 Einträge (ehrlich leer statt Crash)', ab99.length === 0);
}

// ---------------------------------------------------------------------------
// 2) Frontmatter/Wikilink-Form der erzeugten Notiz.
// ---------------------------------------------------------------------------

{
  const eintraege = eintraegeAb(parseRoadmapEintraege(FIXTURE_ROADMAP), 2);
  const notiz = baueReleaseNotiz({ version: '9.9.9', datum: '2026-01-02', eintraege, von: 2 });

  check('Notiz beginnt mit Frontmatter-Marker "---"', notiz.startsWith('---\n'));
  check('Frontmatter enthält den Titel mit Version', notiz.includes('titel: "Release 9.9.9"'));
  check('Frontmatter enthält das Datum', notiz.includes('erstellt: "2026-01-02"'));
  check('Frontmatter enthält den Versions-Tag', notiz.includes('"v9.9.9"'));
  check('Notiz enthält den Wikilink [[Release-Ablauf]]', notiz.includes('[[Release-Ablauf]]'));
  check('Notiz nennt beide Fixture-Einträge in der Kurzliste', notiz.includes('Zweiter Punkt') && notiz.includes('Dritter Punkt'));
  check('Notiz enthält den vollen Zeilentext je Eintrag (Volltext-Abschnitt)', notiz.includes('Text drei.'));
}

// Leere Trefferliste (von-Nummer existiert nicht) bleibt ehrlich statt zu crashen.
{
  const notizLeer = baueReleaseNotiz({ version: '9.9.9', datum: '2026-01-02', eintraege: [], von: 500 });
  check(
    'Leere Eintragsliste erzeugt einen ehrlichen Hinweis statt Platzhalter-Fantasie',
    notizLeer.includes('Keine ROADMAP-Einträge ab dieser Nummer gefunden'),
  );
}

// ---------------------------------------------------------------------------
// 3) Datei wird real in einen temporären Vault geschrieben und ist danach
//    lesbar/inhaltlich korrekt — kein Seiteneffekt auf den echten Vault.
// ---------------------------------------------------------------------------

const tmpRepoRoot = mkdtempSync(path.join(tmpdir(), 'kosmo-release-notiz-'));
try {
  const kosmoOrbitFixture = path.join(tmpRepoRoot, 'kosmo-orbit');
  mkdirSync(kosmoOrbitFixture, { recursive: true });
  writeFileSync(path.join(kosmoOrbitFixture, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.9.0' }));
  writeFileSync(path.join(kosmoOrbitFixture, 'ROADMAP.md'), FIXTURE_ROADMAP);

  const ergebnis = schreibeReleaseNotiz({ root: tmpRepoRoot, kosmoOrbitRootPfad: kosmoOrbitFixture, von: 2, datum: '2026-03-04' });

  check('schreibeReleaseNotiz liest die Version aus dem Fixture-package.json', ergebnis.version === '0.9.0');
  check('schreibeReleaseNotiz findet 2 Einträge ab Nummer 2', ergebnis.anzahlEintraege === 2);
  check('Zielpfad folgt dem Muster wissen/vault/Releases/Release-<version>-<datum>.md', ergebnis.ziel === zielPfad({ root: tmpRepoRoot, version: '0.9.0', datum: '2026-03-04' }));
  check('Die Datei existiert wirklich auf der Platte', existsSync(ergebnis.ziel));

  const geschrieben = readFileSync(ergebnis.ziel, 'utf8');
  check('Die geschriebene Datei enthält den Frontmatter-Titel', geschrieben.includes('titel: "Release 0.9.0"'));
  check('Die geschriebene Datei enthält den Wikilink', geschrieben.includes('[[Release-Ablauf]]'));

  // Zweiter Aufruf mit gleichem Datum überschreibt dieselbe Datei (Update, kein Duplikat).
  writeFileSync(path.join(kosmoOrbitFixture, 'ROADMAP.md'), FIXTURE_ROADMAP + '\n4. **Vierter Punkt (neu dazugekommen)** ✅: Text vier.\n');
  const ergebnis2 = schreibeReleaseNotiz({ root: tmpRepoRoot, kosmoOrbitRootPfad: kosmoOrbitFixture, von: 2, datum: '2026-03-04' });
  check('Erneuter Lauf mit gleichem Datum aktualisiert dieselbe Datei (kein Duplikat)', ergebnis2.ziel === ergebnis.ziel);
  check('Aktualisierte Datei enthält jetzt auch den neu dazugekommenen Eintrag', readFileSync(ergebnis2.ziel, 'utf8').includes('Vierter Punkt'));
} finally {
  rmSync(tmpRepoRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 4) Kleine Helfer: Datumsformat + Argument-Parser.
// ---------------------------------------------------------------------------

check('heutigesDatum liefert YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(heutigesDatum(new Date('2026-07-08T12:00:00Z'))));
{
  const args = parseArgs(['--von', '213', '--datum', '2026-07-08']);
  check('parseArgs liest --von korrekt', args.von === '213');
  check('parseArgs liest --datum korrekt', args.datum === '2026-07-08');
}

// ---------------------------------------------------------------------------
// 5) Regression gegen das ECHTE ROADMAP.md dieses Repos: --von 213 muss
//    mindestens den 0.6.1-Nachtbatch (213–221) finden, ohne zu crashen.
// ---------------------------------------------------------------------------

{
  const echtesRoadmap = readFileSync(new URL('../ROADMAP.md', import.meta.url), 'utf8');
  const alleEchten = parseRoadmapEintraege(echtesRoadmap);
  const ab213 = eintraegeAb(alleEchten, 213);
  check('Echtes ROADMAP.md: --von 213 findet mindestens 9 Einträge (213–221 sind der 0.6.1-Nachtbatch)', ab213.length >= 9);
  check('Echtes ROADMAP.md: Eintrag 213 ist wirklich dabei', ab213.some((e) => e.nummer === 213));
}

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`release-notiz.test.mjs: ${failures.length} Fehlschlag/Fehlschläge:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('release-notiz.test.mjs: alle Prüfungen grün.');
process.exit(0);
