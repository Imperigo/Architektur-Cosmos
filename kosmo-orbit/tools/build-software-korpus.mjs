#!/usr/bin/env node
/**
 * Software-Korpus-Builder (Serie D, Batch 3 — D3 «Training sichtbar &
 * pflegbar»).
 *
 * Baut die Doku-Hälfte der Software-Selbstwissen-Achse: liest ausgewählte
 * Repo-Doku (ROADMAP.md + ein paar Kern-Dokumente) und schreibt daraus
 * `apps/kosmo-orbit/public/training/software-korpus.json` — ein Array von
 * `TrainBeispiel` (siehe `apps/kosmo-orbit/src/state/training-korpus.ts`),
 * `achse: 'software'`.
 *
 * Die andere Hälfte der Software-Achse (jedes registrierte Kernel-Command)
 * ist NICHT hier drin — die entsteht zur Laufzeit aus `allCommands()`
 * (`softwareKorpusCommands()`), weil die Command-Registry aus Code kommt,
 * nicht aus Dateien.
 *
 * Deterministisch: stabile Ids/Reihenfolge, keine Zeitstempel im Inhalt —
 * ein zweiter Lauf ohne Doku-Änderung erzeugt eine byte-identische Datei.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kosmoOrbitRoot = path.resolve(here, '..');
const outPath = path.join(kosmoOrbitRoot, 'apps', 'kosmo-orbit', 'public', 'training', 'software-korpus.json');

const HERKUNFT = 'KosmoOrbit · Doku';
const ANZAHL_ROADMAP_EINTRAEGE = 15;
const KUERZUNG = 400;

/** ~400 Zeichen, an einer Wortgrenze gekürzt (nie mitten im Wort). */
function kuerzen(text, limit = KUERZUNG) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= limit) return t;
  const geschnitten = t.slice(0, limit);
  const letzterRaum = geschnitten.lastIndexOf(' ');
  return `${letzterRaum > limit * 0.6 ? geschnitten.slice(0, letzterRaum) : geschnitten} …`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── ROADMAP.md: die letzten N nummerierten Einträge ──────────────────────

function baueRoadmapBeispiele(inhalt) {
  const zeilen = inhalt.split('\n');
  const eintraege = [];
  for (const zeile of zeilen) {
    const treffer = /^(\d+)\.\s+(.*)$/.exec(zeile.trim());
    if (treffer) eintraege.push({ nr: Number(treffer[1]), rest: treffer[2] });
  }
  const letzte = eintraege.slice(-ANZAHL_ROADMAP_EINTRAEGE);

  return letzte.map(({ nr, rest }) => {
    // Titel = Text bis zum ersten «✅» oder «:» (✅ zuerst, falls vorhanden —
    // Eintragstitel enthalten selbst oft einen Doppelpunkt, z.B. «V2-D1: …»).
    const idxHaken = rest.indexOf('✅');
    const idxDoppelpunkt = rest.indexOf(':');
    let schnitt;
    if (idxHaken !== -1) schnitt = idxHaken;
    else if (idxDoppelpunkt !== -1) schnitt = idxDoppelpunkt;
    else schnitt = Math.min(rest.length, 120);

    const titel = rest.slice(0, schnitt).replace(/\*\*/g, '').trim();
    const antwortRoh = rest.slice(schnitt).replace(/^[✅:\s]+/, '').replace(/\*\*/g, '');

    return {
      achse: 'software',
      id: `doku-roadmap-${nr}`,
      frage: `Was steht in ROADMAP-Eintrag ${nr} («${titel}»)?`,
      antwort: kuerzen(antwortRoh || titel),
      quelle: 'doku:ROADMAP.md',
      herkunft: HERKUNFT,
    };
  });
}

// ── Überschriften-Dokumente: ##/### + erster Folgeabsatz ─────────────────

function baueUeberschriftenBeispiele(dateiname, inhalt) {
  const zeilen = inhalt.split('\n');
  const slug = slugify(dateiname);
  const beispiele = [];
  let n = 0;

  for (let i = 0; i < zeilen.length; i++) {
    const kopf = /^(##|###)\s+(.+)$/.exec(zeilen[i]);
    if (!kopf) continue;
    const ueberschrift = kopf[2].replace(/[`*]/g, '').trim();

    // Ersten nicht-leeren Absatz nach der Überschrift einsammeln — bis zur
    // nächsten Leerzeile oder der nächsten Überschrift.
    const absatzZeilen = [];
    for (let j = i + 1; j < zeilen.length; j++) {
      const z = zeilen[j];
      if (/^#{1,6}\s+/.test(z)) break;
      if (z.trim() === '') {
        if (absatzZeilen.length > 0) break;
        continue;
      }
      if (z.trim().startsWith('```')) break; // Codeblock — keine Prosa
      absatzZeilen.push(z.trim().replace(/^[-*]\s+/, ''));
    }
    const absatz = absatzZeilen
      .join(' ')
      .replace(/[`*]/g, '')
      .trim();
    if (absatz.length < 30) continue; // zu dünn für ein brauchbares Beispiel

    n++;
    beispiele.push({
      achse: 'software',
      id: `doku-${slug}-${n}`,
      frage: `Was bedeutet «${ueberschrift}» (${dateiname})?`,
      antwort: kuerzen(absatz),
      quelle: `doku:${dateiname}`,
      herkunft: HERKUNFT,
    });
  }
  return beispiele;
}

async function main() {
  const dateien = [
    { pfad: path.join(kosmoOrbitRoot, 'CLAUDE.md'), name: 'CLAUDE.md' },
    { pfad: path.join(kosmoOrbitRoot, 'docs', 'GESTALTUNGSKONZEPT.md'), name: 'GESTALTUNGSKONZEPT.md' },
    { pfad: path.join(kosmoOrbitRoot, 'docs', 'BETRIEBSARTEN.md'), name: 'BETRIEBSARTEN.md' },
    { pfad: path.join(kosmoOrbitRoot, 'docs', 'KI-MODELL-GUIDELINE.md'), name: 'KI-MODELL-GUIDELINE.md' },
  ];

  const roadmapInhalt = await readFile(path.join(kosmoOrbitRoot, 'ROADMAP.md'), 'utf8');
  const beispiele = [...baueRoadmapBeispiele(roadmapInhalt)];

  for (const { pfad, name } of dateien) {
    const inhalt = await readFile(pfad, 'utf8');
    beispiele.push(...baueUeberschriftenBeispiele(name, inhalt));
  }

  if (beispiele.length === 0) throw new Error('Kein Doku-Beispiel erzeugt — Quellen prüfen.');

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(beispiele, null, 0)}\n`, 'utf8');
  console.log(`Software-Korpus geschrieben: ${outPath}`);
  console.log(`  Beispiele: ${beispiele.length}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
