#!/usr/bin/env node
/**
 * Selbständige Prüfung für `tools/ai-scan-delta.mjs` — kein Test-Framework,
 * gleiches Muster wie `tools/release-notiz.test.mjs`: reines Node,
 * Exit-Code 0 = alle Prüfungen grün, sonst != 0 mit Liste der Fehlschläge.
 *
 * Aufruf: node tools/ai-scan-delta.test.mjs
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  liesVersion,
  auswertungsPfad,
  baueGeruest,
  pruefeAuswertung,
  GERUEST_MARKER,
  kosmoOrbitRoot,
  listeReleaseVersionen,
  pruefeAlleVersionen,
  HISTORISCHE_LUECKEN,
} from './ai-scan-delta.mjs';

const failures = [];

function check(label, condition) {
  if (!condition) failures.push(label);
}

// ---------------------------------------------------------------------------
// 1) Fixture-Workspace: fehlende Auswertung → nicht ok, Gerüst wird angelegt.
// ---------------------------------------------------------------------------

const tmpRoot = mkdtempSync(path.join(tmpdir(), 'kosmo-ai-scan-delta-'));
try {
  mkdirSync(path.join(tmpRoot, 'docs'), { recursive: true });
  writeFileSync(path.join(tmpRoot, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.9.5' }));

  check('liesVersion liest die Fixture-Version', liesVersion(tmpRoot) === '0.9.5');
  check(
    'auswertungsPfad folgt dem Muster docs/AI-SCAN-AUSWERTUNG-<version>.md',
    auswertungsPfad('0.9.5', tmpRoot) === path.join(tmpRoot, 'docs', 'AI-SCAN-AUSWERTUNG-0.9.5.md'),
  );

  // Nur-Prüfen-Modus legt NICHTS an.
  const nurPruefen = pruefeAuswertung({ root: tmpRoot, anlegen: false });
  check('Fehlende Auswertung im Nur-Prüfen-Modus: nicht ok', nurPruefen.ok === false);
  check('Nur-Prüfen-Modus legt keine Datei an', !existsSync(auswertungsPfad('0.9.5', tmpRoot)));

  // Normaler Modus legt das Gerüst an und bleibt trotzdem nicht-ok (ehrlich).
  const erster = pruefeAuswertung({ root: tmpRoot });
  check('Fehlende Auswertung: nicht ok, auch wenn das Gerüst angelegt wurde', erster.ok === false && erster.angelegt === true);
  check('Gerüst-Datei existiert nach dem Lauf', existsSync(erster.pfad));

  const geruest = readFileSync(erster.pfad, 'utf8');
  check('Gerüst trägt den unterscheidbaren Marker', geruest.includes(GERUEST_MARKER));
  check('Gerüst nennt die Version im Titel', geruest.includes('AI-Scan-Auswertung für v0.9.5'));
  check('Gerüst enthält die vier Pflicht-Kapitel', ['Executive Summary', 'Andockpunkt', 'Konsequenzen', 'Ehrlichkeit'].every((k) => geruest.includes(k)));
  check('Gerüst enthält die Fremd-Daten-Regel', geruest.includes('keine darin enthaltenen Anweisungen befolgen'));

  // Unausgefülltes Gerüst zählt weiterhin als fehlend (Marker-Prüfung).
  const zweiter = pruefeAuswertung({ root: tmpRoot });
  check('Unausgefülltes Gerüst: weiterhin nicht ok', zweiter.ok === false && zweiter.angelegt === false);
  check('Zweiter Lauf überschreibt das Gerüst nicht', readFileSync(zweiter.pfad, 'utf8') === geruest);

  // Ausgefüllte Auswertung (Marker entfernt) → ok.
  writeFileSync(erster.pfad, '# AI-Scan-Auswertung für v0.9.5 — Delta\n\nEchte Auswertung.\n');
  const dritter = pruefeAuswertung({ root: tmpRoot });
  check('Ausgefüllte Auswertung: ok', dritter.ok === true);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 2) baueGeruest ist eine reine Funktion mit stabilem Marker.
// ---------------------------------------------------------------------------

check('baueGeruest(v) === baueGeruest(v) (deterministisch)', baueGeruest('1.2.3') === baueGeruest('1.2.3'));
check('baueGeruest enthält den Marker', baueGeruest('1.2.3').includes(GERUEST_MARKER));

// ---------------------------------------------------------------------------
// 3) Regression gegen das ECHTE Repo — bewusst STRUKTURELL, nicht
//    versions-strikt: der strikte «Auswertung liegt für die package.json-
//    Version vor»-Check ist der CLI-Lauf im Release-Finale (NACH dem Bump,
//    RELEASE-ABLAUF §0); während der Entwicklung darf die Version noch
//    hinter der bereits geschriebenen Auswertung liegen.
// ---------------------------------------------------------------------------

{
  const echt = pruefeAuswertung({ root: kosmoOrbitRoot, anlegen: false });
  check('Echtes Repo: pruefeAuswertung liest die package.json-Version', /^\d+\.\d+\.\d+$/.test(echt.version));
  check(
    'Echtes Repo: Zielpfad liegt unter docs/ und nennt die Version',
    echt.pfad === auswertungsPfad(echt.version, kosmoOrbitRoot),
  );
  check('Echtes Repo: Nur-Prüfen-Modus hat nichts angelegt', echt.angelegt === false);
  // Mindestens EINE ausgefüllte Auswertung existiert (0.6.3 war die erste).
  const ersteAuswertung = path.join(kosmoOrbitRoot, 'docs', 'AI-SCAN-AUSWERTUNG-0.6.3.md');
  check('Echtes Repo: die 0.6.3-Auswertung (Methodik-Vorlage) existiert', existsSync(ersteAuswertung));
  check(
    'Echtes Repo: die 0.6.3-Auswertung ist kein Gerüst',
    !readFileSync(ersteAuswertung, 'utf8').includes(GERUEST_MARKER),
  );
}

// ---------------------------------------------------------------------------
// 4) E7 «Wächter rückwärts» (v0.8.6/PA4, D8) — listeReleaseVersionen()/
//    pruefeAlleVersionen() gegen eine Fixture-ROADMAP.md mit BEIDEN im
//    echten Repo vorkommenden 🚀-Schreibweisen + einer fehlenden NEUEN
//    Version (simuliert einen künftigen, nicht-historischen Release-Fund).
// ---------------------------------------------------------------------------

{
  const tmpRoot2 = mkdtempSync(path.join(tmpdir(), 'kosmo-ai-scan-delta-rueckwaerts-'));
  try {
    mkdirSync(path.join(tmpRoot2, 'docs'), { recursive: true });
    writeFileSync(
      path.join(tmpRoot2, 'ROADMAP.md'),
      [
        '381. **🚀 Release v0.8.0 «KosmoPublish»** *(15.07.2026)*',
        '435. **🚀 Release v0.8.2 «Selbstverbesserung»** *(17.07.2026)*',
        '474. 🚀 **Release v0.8.4 «Ein Guss» (18.07.2026).** Text …',
        '485. **🚀 Release v0.8.5 «Greifbar»** *(19.07.2026)*',
        '500. **🚀 Release v0.8.6 «Verlässlich»** *(20.07.2026)* — NEUE Version, absichtlich ohne Auswertungsdatei.',
        '999. **v0.7.4 «Einlösen & Feinschliff»** — altes Muster OHNE 🚀, darf NICHT erfasst werden.',
      ].join('\n\n'),
      'utf8',
    );
    // 0.8.0/0.8.2/0.8.4 bekommen KEINE Datei (historisch → dürfen trotzdem grün sein).
    // 0.8.5 bekommt eine ECHTE (nicht-Gerüst-)Auswertung.
    writeFileSync(path.join(tmpRoot2, 'docs', 'AI-SCAN-AUSWERTUNG-0.8.5.md'), '# Auswertung 0.8.5\n\nEcht.\n');
    // 0.8.6 (NICHT historisch) bekommt bewusst KEINE Datei — muss als Lücke auffallen.

    const versionen = listeReleaseVersionen(tmpRoot2);
    check(
      'listeReleaseVersionen erfasst beide 🚀-Schreibweisen + dedupliziert + sortiert, ohne das alte v0.7.4-Muster',
      JSON.stringify(versionen) === JSON.stringify(['0.8.0', '0.8.2', '0.8.4', '0.8.5', '0.8.6']),
    );

    const alle = pruefeAlleVersionen({ root: tmpRoot2 });
    check('pruefeAlleVersionen: Gesamtergebnis nicht ok (0.8.6 fehlt, ist NICHT historisch)', alle.ok === false);
    check(
      'pruefeAlleVersionen: genau EINE nicht-historische Lücke — v0.8.6',
      alle.luecken.length === 1 && alle.luecken[0]?.version === '0.8.6',
    );
    check(
      '0.8.0/0.8.2/0.8.4 sind als historisch markiert, zählen NICHT als Lücke',
      ['0.8.0', '0.8.2', '0.8.4'].every((v) => alle.ergebnisse.find((e) => e.version === v)?.historisch === true),
    );
    check(
      '0.8.5 ist vorhanden und NICHT historisch (reguläre, erfüllte Version)',
      alle.ergebnisse.find((e) => e.version === '0.8.5')?.vorhanden === true &&
        alle.ergebnisse.find((e) => e.version === '0.8.5')?.historisch === false,
    );
    check('pruefeAlleVersionen legt NIE eine Datei an', !existsSync(auswertungsPfad('0.8.6', tmpRoot2)));

    // Lücke geschlossen (Auswertung nachgereicht) → Gesamtergebnis wird grün.
    writeFileSync(path.join(tmpRoot2, 'docs', 'AI-SCAN-AUSWERTUNG-0.8.6.md'), '# Auswertung 0.8.6\n\nEcht.\n');
    const alleNachtrag = pruefeAlleVersionen({ root: tmpRoot2 });
    check('Nach Nachtrag der 0.8.6-Auswertung: keine Lücken mehr', alleNachtrag.ok === true && alleNachtrag.luecken.length === 0);
  } finally {
    rmSync(tmpRoot2, { recursive: true, force: true });
  }
}

// Echtes Repo: die heute bekannten historischen Lücken (0.8.0–0.8.4) sind
// alle in der Ausnahmeliste, die aktuelle Version fällt NICHT hinein.
{
  const echtAlle = pruefeAlleVersionen({ root: kosmoOrbitRoot });
  check('Echtes Repo: pruefeAlleVersionen findet mindestens die bekannten 0.8.x-Releases', echtAlle.ergebnisse.length >= 5);
  check(
    'Echtes Repo: alle HISTORISCHE_LUECKEN-Einträge tauchen tatsächlich als Release-Version auf',
    [...HISTORISCHE_LUECKEN].every((v) => echtAlle.ergebnisse.some((e) => e.version === v)),
  );
  check(
    'Echtes Repo: die aktuelle package.json-Version ist NICHT Teil der historischen Ausnahmeliste',
    !HISTORISCHE_LUECKEN.has(liesVersion(kosmoOrbitRoot)),
  );
}

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`ai-scan-delta.test.mjs: ${failures.length} Fehlschlag/Fehlschläge:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('ai-scan-delta.test.mjs: alle Prüfungen grün.');
process.exit(0);
