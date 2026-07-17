#!/usr/bin/env -S npx tsx
/**
 * Eval-Suite-Prüfer für den Adapter `kosmo-zeichner-grundriss` (v0.8.2/P2,
 * V082-SPEZ.md §6.2/§9.3 C-10, docs/LORA-KONZEPT.md §1.4).
 *
 * Liest die zwölf festen Prompts aus `prompts.json` und wertet sie auf ZWEI
 * Arten aus:
 *
 *   (1) SELBSTCHECK (Standard, kein Argument): erzeugt die Referenz-Antwort
 *       für jeden Prompt DIREKT aus dem deterministischen Kernel-Generator
 *       (`generiereGrundriss`/`generiereGrundrissL`/`segmentiere`/
 *       `zerlegeRektilinear`, dieselben reinen Funktionen wie
 *       `tools/training/generiere-grundriss-sft.mts`) und prüft sie gegen
 *       die maschinenlesbaren Kriterien in `prompts.json`. Muss 12/12 grün
 *       sein — das beweist, dass die Kriterien selbst korrekt sind (bevor
 *       sie je einen Modell-Kandidaten bewerten).
 *   (2) KANDIDATEN-CHECK (`--kandidat=pfad.jsonl`): liest eine JSONL-Datei
 *       mit Zeilen `{ "id": "eval-01-rect-klein", "assistant": "<JSON-
 *       String, wie ihn ein LoRA/Basis-Modell zurückgäbe>" }` und prüft
 *       jede gegen dieselben Kriterien — das ist der vorher/nachher-
 *       Vergleich aus `docs/LORA-KONZEPT.md` §1.4, sobald ein HomeStation-
 *       Checkpoint existiert (heute: noch keiner, GRENZE dokumentiert in
 *       `docs/LORA-KONZEPT.md` §0).
 *
 * Exit-Code 0 nur wenn ALLE geprüften Prompts bestehen, sonst 1 mit
 * Tabelle der Fehlschläge.
 *
 * Aufruf:
 *   npx tsx wissen/training/eval/kosmo-zeichner-grundriss/pruefe-eval.mts
 *   npx tsx wissen/training/eval/kosmo-zeichner-grundriss/pruefe-eval.mts --kandidat=pfad.jsonl
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Relativer Import statt `@kosmo/kernel`: diese Datei liegt unter `wissen/`
// (Geschwisterverzeichnis von `kosmo-orbit/`, V082-SPEZ.md §2.1) — sie ist
// KEIN npm-Workspace-Mitglied und hat darum kein `node_modules/@kosmo/*`
// über sich, das die Kernel-Symlinks auflösen könnte (anders als
// `tools/training/generiere-grundriss-sft.mts`, das direkt unter
// `kosmo-orbit/` liegt). tsx löst den relativen `.ts`-Pfad direkt auf.
import {
  generiereGrundriss,
  generiereGrundrissL,
  segmentiere,
  zerlegeRektilinear,
  type GenerierterGrundriss,
  type SegmentierungsErgebnis,
  type WohnungsTypSoll,
  type Pt,
} from '../../../../kosmo-orbit/packages/kosmo-kernel/src/index';

const HIER = dirname(fileURLToPath(import.meta.url));

interface Prompt {
  id: string;
  aufgabe: 'grundriss-generieren' | 'wohnung-segmentieren';
  input: Record<string, unknown>;
  erwartung: {
    typ: 'layout' | 'ablehnung' | 'diagnose' | 'unregelmaessig' | 'segmentierung-layout' | 'segmentierung-ablehnung';
    diagnoseEnthaelt?: string;
    grundEnthaelt?: string;
  };
}

interface PromptsDatei {
  adapter: string;
  prompts: Prompt[];
}

function polyArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function minBreite(poly: Pt[]): number {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return Math.min(maxX - minX, maxY - minY);
}

const rechteck = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

interface Befund {
  id: string;
  ok: boolean;
  begruendung: string;
}

/** Geometrischer Näherungs-Check, identisch zur Vollmengen-Filterlogik
 * (`tools/training/generiere-grundriss-sft.mts` `pruefeGeometrisch()`). */
function zimmerBreiteOk(g: GenerierterGrundriss): { ok: boolean; verletzung?: string } {
  for (const r of g.raeume) {
    if (r.sia !== 'HNF') continue;
    const b = minBreite(r.outline);
    if (b < 2400) return { ok: false, verletzung: `«${r.name}» ${(b / 1000).toFixed(2)} m < 2.40 m` };
  }
  return { ok: true };
}

function pruefeLayout(g: GenerierterGrundriss, wohnungFlaecheM2: number): Befund {
  if (g.raeume.length === 0) return { id: '', ok: false, begruendung: 'kein Layout erzeugt (erwartet: mind. 1 Raum)' };
  const breite = zimmerBreiteOk(g);
  if (!breite.ok) return { id: '', ok: false, begruendung: `Zimmerbreite-Verletzung: ${breite.verletzung}` };
  let hnfM2 = 0, vfM2 = 0;
  for (const r of g.raeume) {
    const a = polyArea(r.outline) / 1e6;
    if (r.sia === 'HNF') hnfM2 += a; else vfM2 += a;
  }
  if (hnfM2 <= 0) return { id: '', ok: false, begruendung: 'HNF-Summe ist 0' };
  if (hnfM2 + vfM2 > wohnungFlaecheM2 * 1.02) {
    return { id: '', ok: false, begruendung: `HNF+VF (${(hnfM2 + vfM2).toFixed(1)} m²) > Wohnungsfläche (${wohnungFlaecheM2.toFixed(1)} m²)` };
  }
  return { id: '', ok: true, begruendung: `HNF ${hnfM2.toFixed(1)} m², VF ${vfM2.toFixed(1)} m², ${g.raeume.length} Räume — plausibel` };
}

function pruefeAblehnung(g: GenerierterGrundriss): Befund {
  if (g.raeume.length !== 0) return { id: '', ok: false, begruendung: 'erwartet: 0 Räume (Ablehnung), aber ein Layout wurde erzeugt' };
  if (g.diagnose.length === 0) return { id: '', ok: false, begruendung: 'Ablehnung ohne Diagnose-Begründung' };
  return { id: '', ok: true, begruendung: `abgelehnt mit Begründung: "${g.diagnose[0]}"` };
}

function pruefeDiagnose(g: GenerierterGrundriss, erwarteterTeilstring: string): Befund {
  if (g.raeume.length === 0) return { id: '', ok: false, begruendung: 'erwartet: Layout MIT Diagnose, aber 0 Räume erzeugt' };
  const treffer = g.diagnose.some((d) => d.includes(erwarteterTeilstring));
  if (!treffer) {
    return { id: '', ok: false, begruendung: `erwartete Diagnose-Teilzeichenkette "${erwarteterTeilstring}" nicht gefunden (Diagnose: ${JSON.stringify(g.diagnose)})` };
  }
  return { id: '', ok: true, begruendung: `Diagnose enthält "${erwarteterTeilstring}"` };
}

function pruefeUnregelmaessig(outline: Pt[], erwarteterTeilstring: string | undefined): Befund {
  const z = zerlegeRektilinear(outline);
  if (z.typ !== 'unregelmaessig') {
    return { id: '', ok: false, begruendung: `erwartet: 'unregelmaessig', aber zerlegeRektilinear() liefert '${z.typ}'` };
  }
  if (erwarteterTeilstring && !z.grund.includes(erwarteterTeilstring)) {
    return { id: '', ok: false, begruendung: `Grund "${z.grund}" enthält nicht erwarteten Teilstring "${erwarteterTeilstring}"` };
  }
  return { id: '', ok: true, begruendung: `ehrlich als unregelmässig erkannt: "${z.grund}"` };
}

function pruefeSegmentierungLayout(erg: SegmentierungsErgebnis, footprintFlaecheM2: number): Befund {
  if (erg.wohnungen.length === 0) return { id: '', ok: false, begruendung: 'erwartet: mind. 1 geschnittene Wohnung, aber 0' };
  const summe = erg.wohnungen.reduce((s, w) => s + w.flaeche, 0);
  if (summe > footprintFlaecheM2 * 1.02) {
    return { id: '', ok: false, begruendung: `Wohnungsflächen-Summe (${summe.toFixed(1)} m²) > Footprint-Fläche (${footprintFlaecheM2.toFixed(1)} m²)` };
  }
  return { id: '', ok: true, begruendung: `${erg.wohnungen.length} Wohnungen, ${summe.toFixed(1)} m² — plausibel, Mix: ${JSON.stringify(erg.mix)}` };
}

function pruefeSegmentierungAblehnung(erg: SegmentierungsErgebnis): Befund {
  if (erg.wohnungen.length !== 0) return { id: '', ok: false, begruendung: 'erwartet: 0 Wohnungen (kein Band), aber Wohnungen wurden geschnitten' };
  if (erg.diagnose.length === 0) return { id: '', ok: false, begruendung: 'keine Wohnungen, aber auch keine Diagnose-Begründung' };
  return { id: '', ok: true, begruendung: `abgelehnt mit Begründung: "${erg.diagnose[0]}"` };
}

type WohnungInput =
  | { breiteMm: number; tiefeMm: number }
  | { typ: 'l'; haupt: { breiteMm: number; tiefeMm: number }; fluegel: { breiteMm: number; tiefeMm: number } }
  | { typ: 'frei'; outline: Pt[] };

function werteGrundrissPromptAus(p: Prompt): Befund {
  const input = p.input as { wohnung: WohnungInput; korridorKante: 'unten' | 'oben' | 'links' | 'rechts' };
  const wohnung = input.wohnung;
  let g: GenerierterGrundriss;
  let wohnungFlaecheM2: number;

  if ('typ' in wohnung && wohnung.typ === 'frei') {
    if (p.erwartung.typ !== 'unregelmaessig') {
      return { id: p.id, ok: false, begruendung: 'freier Umriss ohne erwartung.typ=unregelmaessig — Prompt-Definition inkonsistent' };
    }
    const befund = pruefeUnregelmaessig(wohnung.outline, p.erwartung.grundEnthaelt);
    return { ...befund, id: p.id };
  }

  if ('typ' in wohnung && wohnung.typ === 'l') {
    const haupt = rechteck(0, 0, wohnung.haupt.breiteMm, wohnung.haupt.tiefeMm);
    const fluegel = rechteck(wohnung.haupt.breiteMm, 0, wohnung.haupt.breiteMm + wohnung.fluegel.breiteMm, wohnung.fluegel.tiefeMm);
    g = generiereGrundrissL(haupt, fluegel, input.korridorKante);
    wohnungFlaecheM2 = (polyArea(haupt) + polyArea(fluegel)) / 1e6;
  } else {
    const rechteckWohnung = wohnung as { breiteMm: number; tiefeMm: number };
    const outline = rechteck(0, 0, rechteckWohnung.breiteMm, rechteckWohnung.tiefeMm);
    g = generiereGrundriss(outline, input.korridorKante);
    wohnungFlaecheM2 = polyArea(outline) / 1e6;
  }

  let befund: Befund;
  if (p.erwartung.typ === 'layout') befund = pruefeLayout(g, wohnungFlaecheM2);
  else if (p.erwartung.typ === 'ablehnung') befund = pruefeAblehnung(g);
  else if (p.erwartung.typ === 'diagnose') befund = pruefeDiagnose(g, p.erwartung.diagnoseEnthaelt ?? '');
  else return { id: p.id, ok: false, begruendung: `unbekannter erwartung.typ "${p.erwartung.typ}" für grundriss-generieren` };
  return { ...befund, id: p.id };
}

function werteSegmentierungPromptAus(p: Prompt): Befund {
  const input = p.input as {
    footprint: { laengeMm: number; tiefeMm: number };
    korridor: { breiteMm: number };
    mix: WohnungsTypSoll[];
    optionen: { kern: boolean };
  };
  const footprint = rechteck(0, 0, input.footprint.laengeMm, input.footprint.tiefeMm);
  const kb = input.korridor.breiteMm;
  const t = input.footprint.tiefeMm;
  const korridor = rechteck(0, t / 2 - kb / 2, input.footprint.laengeMm, t / 2 + kb / 2);
  const erg = segmentiere(footprint, korridor, input.mix, { kern: input.optionen.kern });
  const footprintFlaecheM2 = polyArea(footprint) / 1e6;

  let befund: Befund;
  if (p.erwartung.typ === 'segmentierung-layout') befund = pruefeSegmentierungLayout(erg, footprintFlaecheM2);
  else if (p.erwartung.typ === 'segmentierung-ablehnung') befund = pruefeSegmentierungAblehnung(erg);
  else return { id: p.id, ok: false, begruendung: `unbekannter erwartung.typ "${p.erwartung.typ}" für wohnung-segmentieren` };
  return { ...befund, id: p.id };
}

// ── Kandidaten-Modus: externe Antworten statt Referenz-Generator ─────────

interface KandidatenZeile {
  id: string;
  assistant: string;
}

function ladeKandidaten(pfad: string): Map<string, unknown> {
  const zeilen = readFileSync(pfad, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  const map = new Map<string, unknown>();
  for (const z of zeilen) {
    const obj = JSON.parse(z) as KandidatenZeile;
    map.set(obj.id, JSON.parse(obj.assistant));
  }
  return map;
}

function werteKandidatAus(p: Prompt, kandidat: unknown): Befund {
  // Strukturelle Prüfung: hat der Kandidat die für die erwartete Kategorie
  // plausible Form? Ein echtes LoRA/Modell muss NICHT bytegleich zum
  // Referenz-Generator sein — hier zählt nur Schema + die grobe Kategorie.
  if (typeof kandidat !== 'object' || kandidat === null) {
    return { id: p.id, ok: false, begruendung: 'Kandidaten-Antwort ist kein JSON-Objekt' };
  }
  const obj = kandidat as Record<string, unknown>;
  if (p.erwartung.typ === 'unregelmaessig') {
    const raeume = obj.raeume;
    const ok = Array.isArray(raeume) && raeume.length === 0;
    return { id: p.id, ok, begruendung: ok ? 'Kandidat lehnt ehrlich ab (0 Räume)' : 'Kandidat liefert ein Layout, wo Ablehnung erwartet war' };
  }
  if (p.erwartung.typ === 'ablehnung') {
    const raeume = obj.raeume;
    const ok = Array.isArray(raeume) && raeume.length === 0 && Array.isArray(obj.diagnose) && (obj.diagnose as unknown[]).length > 0;
    return { id: p.id, ok, begruendung: ok ? 'Kandidat lehnt ab, Diagnose vorhanden' : 'Kandidat liefert kein 0-Raum-Ergebnis mit Diagnose' };
  }
  if (p.erwartung.typ === 'diagnose' || p.erwartung.typ === 'layout') {
    const raeume = obj.raeume;
    const ok = Array.isArray(raeume) && raeume.length > 0 && typeof obj.kennzahlen === 'object';
    return { id: p.id, ok, begruendung: ok ? 'Kandidat liefert Layout mit Kennzahlen' : 'Kandidat liefert kein plausibles Layout' };
  }
  if (p.erwartung.typ === 'segmentierung-layout') {
    const wohnungen = obj.wohnungen;
    const ok = Array.isArray(wohnungen) && wohnungen.length > 0;
    return { id: p.id, ok, begruendung: ok ? 'Kandidat schneidet ≥ 1 Wohnung' : 'Kandidat liefert keine geschnittene Wohnung' };
  }
  if (p.erwartung.typ === 'segmentierung-ablehnung') {
    const wohnungen = obj.wohnungen;
    const ok = Array.isArray(wohnungen) && wohnungen.length === 0;
    return { id: p.id, ok, begruendung: ok ? 'Kandidat lehnt ab (0 Wohnungen)' : 'Kandidat schneidet Wohnungen, wo Ablehnung erwartet war' };
  }
  return { id: p.id, ok: false, begruendung: `unbekannter erwartung.typ "${p.erwartung.typ}"` };
}

// ── Hauptlauf ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { kandidat?: string } {
  for (const a of argv) {
    const m = /^--kandidat=(.+)$/.exec(a);
    if (m?.[1]) return { kandidat: m[1] };
  }
  return {};
}

const datei = JSON.parse(readFileSync(resolve(HIER, 'prompts.json'), 'utf8')) as PromptsDatei;
const args = parseArgs(process.argv.slice(2));
const kandidaten = args.kandidat ? ladeKandidaten(resolve(process.cwd(), args.kandidat)) : null;

const befunde: Befund[] = [];
for (const p of datei.prompts) {
  if (kandidaten) {
    const antwort = kandidaten.get(p.id);
    if (antwort === undefined) {
      befunde.push({ id: p.id, ok: false, begruendung: 'Kandidaten-Datei enthält keine Antwort für diese Prompt-ID' });
      continue;
    }
    befunde.push(werteKandidatAus(p, antwort));
    continue;
  }
  befunde.push(p.aufgabe === 'wohnung-segmentieren' ? werteSegmentierungPromptAus(p) : werteGrundrissPromptAus(p));
}

const modus = kandidaten ? `Kandidat (${args.kandidat})` : 'Selbstcheck (Referenz-Generator)';
console.log(`Eval-Suite kosmo-zeichner-grundriss — Modus: ${modus}\n`);
let nOk = 0;
for (const b of befunde) {
  console.log(`${b.ok ? 'OK  ' : 'FAIL'}  ${b.id.padEnd(32)} ${b.begruendung}`);
  if (b.ok) nOk++;
}
console.log(`\n${nOk}/${befunde.length} bestanden.`);
process.exit(nOk === befunde.length ? 0 : 1);
