#!/usr/bin/env node
/**
 * Alt→kanonisch-Konverter: `wissen/training/korpora/persona.jsonl` («Golden
 * Rules Andrin», 124 rohe OCR-/Textlayer-Chunks, Format `{text, quelle,
 * seite}`) → `wissen/training/sft/kosmo-buero/persona-v1.jsonl`
 * (`kosmo-sft/v1`, `docs/V082-SPEZ.md` §3.1, Adapter `kosmo-buero`).
 *
 * **Ehrlich, nicht kuratiert**: dieser Konverter normalisiert nur das
 * FORMAT (Format-Wildwuchs-Behebung, §9.3 C-8) — er erfindet keine
 * Qualität. Jede erzeugte Zeile trägt `meta.qualitaet.checksBestanden:
 * false` + einen Hinweis, dass sie unkuratiert ist. Echte Kuration
 * (Journal-Notizen → kosmo-buero) ist P4s Aufgabe (Playbook
 * `journal-zu-sft.md`), additiv zu dieser Datei.
 *
 * Deterministisch: keine Zeitstempel/Zufallswerte im Output — ein
 * zweimaliger Lauf über denselben Eingabestand liefert ein byte-identisches
 * Ergebnis (Gate-Beweis P1, `docs/V082-SPEZ.md` §6.1).
 *
 * Aufruf: node tools/training/konvertiere-persona-sft.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kosmoOrbitRoot = path.resolve(here, '..', '..');
const wissenTrainingRoot = path.resolve(kosmoOrbitRoot, '..', 'wissen', 'training');

export const QUELLE_DATEI = path.join(wissenTrainingRoot, 'korpora', 'persona.jsonl');
export const ZIEL_DATEI = path.join(wissenTrainingRoot, 'sft', 'kosmo-buero', 'persona-v1.jsonl');

const SYSTEM_PROMPT =
  'Du bist Kosmo im Bürostil des Büros Andrin — antworte mit den ' +
  'architektonischen Grundsätzen und Referenzen (Golden Rules) aus dem ' +
  'persönlichen Archiv.';

const UNKURATIERT_HINWEIS =
  'unkuratiert: automatisch aus korpora/persona.jsonl kanonisiert, kein manuell geprüftes SFT-Beispiel';

function slug(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * @param {{text: string, quelle: string, seite: number}} eintrag
 * @param {number} laufendeNummer 1-basiert, für Eindeutigkeit bei
 *   gleichem quelle+seite (kommt in der Praxis nicht vor, aber Ids müssen
 *   pro Datei eindeutig sein, §3.1)
 */
export function kanonisiereEintrag(eintrag, laufendeNummer) {
  const quelleName = String(eintrag.quelle ?? '').replace(/^Golden Rules Andrin:\s*/, '').trim();
  const seite = eintrag.seite ?? '?';
  const id = `persona-${slug(quelleName)}-s${seite}-${laufendeNummer}`;
  return {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Was hält das Archiv-Dokument «${quelleName}» auf Seite ${seite} zum Bürostil/zur Architekturhaltung fest?`,
      },
      { role: 'assistant', content: eintrag.text },
    ],
    meta: {
      id,
      adapter: 'kosmo-buero',
      quelle: `korpora/persona.jsonl#${eintrag.quelle}:${eintrag.seite}`,
      visibility: 'public',
      qualitaet: { checksBestanden: false, hinweise: [UNKURATIERT_HINWEIS] },
    },
  };
}

/** @param {string} quellInhalt roher persona.jsonl-Inhalt */
export function konvertiere(quellInhalt) {
  const zaehler = new Map(); // quelle:seite -> laufende Nummer
  const zeilen = [];
  for (const roh of quellInhalt.split('\n')) {
    const t = roh.trim();
    if (!t) continue;
    const eintrag = JSON.parse(t);
    const schluessel = `${eintrag.quelle}:${eintrag.seite}`;
    const nr = (zaehler.get(schluessel) ?? 0) + 1;
    zaehler.set(schluessel, nr);
    zeilen.push(JSON.stringify(kanonisiereEintrag(eintrag, nr)));
  }
  return zeilen.join('\n') + (zeilen.length > 0 ? '\n' : '');
}

function main() {
  if (!existsSync(QUELLE_DATEI)) {
    console.error(`[konvertiere-persona-sft] Quelle fehlt: ${QUELLE_DATEI}`);
    process.exit(1);
  }
  const quellInhalt = readFileSync(QUELLE_DATEI, 'utf8');
  const ausgabe = konvertiere(quellInhalt);
  writeFileSync(ZIEL_DATEI, ausgabe, 'utf8');
  const anzahl = ausgabe.split('\n').filter((z) => z.trim()).length;
  console.log(`[konvertiere-persona-sft] ${anzahl} Zeilen → ${path.relative(kosmoOrbitRoot, ZIEL_DATEI)}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
