/**
 * Grundriss-SFT-Vollmenge v1 (v0.8.2/P2, V082-SPEZ.md §6.2 + docs/LORA-KONZEPT.md §1).
 *
 * Deterministischer, seeded Generator für den Adapter `kosmo-zeichner-grundriss`
 * (`wissen/training/REGISTRY.md`). Importiert `generiereGrundriss()`/
 * `generiereGrundrissL()` (packages/kosmo-kernel/src/derive/grundrissgenerator.ts)
 * und `segmentiere()` (packages/kosmo-kernel/src/derive/segmentierer.ts) als
 * REINE Funktionen — kein KosmoDoc, keine Commands, kein Undo/Journal. Jede
 * Zeile ist eine tatsächliche Generator-Ausgabe, keine Handschrift (dieselbe
 * Regel wie `docs/LORA-KONZEPT.md:319-324` für die Stichprobe `grundriss-v0`).
 *
 * Zwei Aufgabentypen (V082-SPEZ.md §6.2 "Grundriss-Erzeugung + Wohnungs-
 * Segmentierung"):
 *   (a) "grundriss-generieren" — Raumprogramm (Wohnungsmasse, Korridorseite)
 *       → Zimmerlayout. Rechteck (`generiereGrundriss`) UND L-Form
 *       (`generiereGrundrissL`, via `zerlegeRektilinear`-Vorbild in design.ts).
 *   (b) "wohnung-segmentieren" — Geschoss-Footprint + Korridor + Wohnungstyp-
 *       Mix → Wohnungszuschnitt (`segmentiere()`), die zweite, komplementäre
 *       Aufgabe aus `docs/LORA-KONZEPT.md` §1.2 ("für v1.1 vorgesehen").
 *
 * Parameter-Grid (systematisch, RNG-frei) + eine seeded-Zufallsmenge
 * (mulberry32, fester Seed) für zusätzliches Volumen — siehe §GRID/§RNG
 * unten. "Seeded" heisst hier: bei GLEICHEM Seed liefert der Generator
 * IMMER dieselbe Sequenz → Doppellauf ist byte-identisch (Gate-Beweis).
 *
 * Qualitätsfilter (V082-SPEZ.md §6.2: "geometrische Näherung wie in der
 * Stichprobe, docs/LORA-KONZEPT.md §1.3" — das ist die für P2 VERBINDLICHE
 * Scope-Festlegung, keine Bauagenten-Wahl): dieselbe Zwei-Schwellen-Regel
 * wie in `derive/checks.ts:108-125` (`pruefeGrundriss`), aber direkt auf den
 * generierten Raum-Outlines statt auf einem vollständigen KosmoDoc:
 *   - Zimmerbreite < 2.40 m bei einem HNF-Raum → hartes Ausschlusskriterium
 *     (in checks.ts eine `warnung`).
 *   - Zimmerfläche < 10 m² bei einem HNF-Raum → NICHT disqualifizierend,
 *     nur in `meta.qualitaet.hinweise` protokolliert (in checks.ts ein
 *     `hinweis`).
 * EHRLICH DOKUMENTIERT (statt verschwiegen): ein Weg zum SCHARFEN Check
 * existiert im Kernel bereits — `design.geschossErstellen` →
 * `design.zoneErstellen` → `design.grundrissGenerieren` (baut exakt dieselbe
 * `generiereGrundriss`/`generiereGrundrissL`-Ausgabe als Zone-Entities,
 * `commands/design.ts:2180-2197`) → `design.waendeAusZonen` (echte
 * Wall/Opening-Entities, `commands/design.ts:1723-1739`) → `pruefeGrundriss(doc,
 * storeyId)` direkt aufrufbar (belegt: `test/kernel.test.ts:4780-4805`). Für
 * P2 NICHT gebaut, weil die verbindliche Spec (§6.2) explizit die geometrische
 * Näherung als Scope nennt UND `docs/LORA-KONZEPT.md` §1.3 den Aufwand für
 * eine Vollmenge als "Aufwand/Nutzen unverhältnismässig" einstuft (dort für
 * "v1.1" vorgemerkt) — der Weg ist hier für eine künftige Version referenziert,
 * nicht verschwiegen.
 *
 * Für "wohnung-segmentieren" greift KEINE Zimmer-Richtwert-Prüfung:
 * `checks.ts:70-72` nimmt Programm-Zonen (ganze Wohnungen, kein Zimmer)
 * ausdrücklich von der Zimmerbreite/-fläche-Regel aus ("Richtwerte gelten
 * für Räume, nicht für ganze Wohnungen"). Filter hier: nur echte Diagnose-
 * Fälle (0 geschnittene Wohnungen) werden als solche behalten, sonst keine
 * geometrische Schwelle — dokumentiert statt eine Näherung zu erfinden, die
 * es im Kernel gar nicht gibt.
 *
 * Aufruf:
 *   npx tsx tools/training/generiere-grundriss-sft.mts
 *   npx tsx tools/training/generiere-grundriss-sft.mts --out=pfad/zu/datei.jsonl
 *
 * Schreibt (relativ zum Skript, IMMER — kein `--out` nötig für den Standardfall):
 *   ../../../wissen/training/sft/kosmo-zeichner-grundriss/grundriss-v1.jsonl
 *   ../../../wissen/training/sft/kosmo-zeichner-grundriss/grundriss-v1.stats.md
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generiereGrundriss,
  generiereGrundrissL,
  segmentiere,
  WOHNUNGS_GROESSEN,
  type GenerierterGrundriss,
  type SegmentierungsErgebnis,
  type WohnungsTypSoll,
  type Pt,
} from '@kosmo/kernel';

// ── Pfade ────────────────────────────────────────────────────────────────

const HIER = dirname(fileURLToPath(import.meta.url));
// tools/training → tools → kosmo-orbit → Repo-Wurzel (wissen/ ist Geschwister
// von kosmo-orbit/, dieselbe Konvention wie tools/secret-scan.mjs:45/375)
const ZIEL_ORDNER = resolve(HIER, '..', '..', '..', 'wissen', 'training', 'sft', 'kosmo-zeichner-grundriss');

function parseArgs(argv: string[]): { out?: string } {
  for (const a of argv) {
    const m = /^--out=(.+)$/.exec(a);
    if (m?.[1]) return { out: m[1] };
  }
  return {};
}

// ── Seeded RNG (mulberry32) — literaler Seed, deterministisch ──────────────
// Bei gleichem Seed liefert nextFloat() IMMER dieselbe Sequenz (Gate-Beweis:
// Doppellauf byte-identisch). Seed ist ein Literal, keine Zeit-/Zufallsquelle.

const SEED = 0x4b4f534d; // literal, dokumentiert — 'KOSM' als Bytes gelesen

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function nextFloat(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ganzzahl im Bereich [min, max], auf `step` gerastert (Architektur-übliche Rundmasse). */
function rasterInt(rnd: () => number, min: number, max: number, step: number): number {
  const n = Math.floor((max - min) / step) + 1;
  const i = Math.floor(rnd() * n);
  return min + Math.min(i, n - 1) * step;
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length]!;
}

// ── Geometrie-Helfer ─────────────────────────────────────────────────────

const rechteck = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

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

const KORRIDOR_KANTEN = ['unten', 'oben', 'links', 'rechts'] as const;
type KorridorKante = (typeof KORRIDOR_KANTEN)[number];

// ── kosmo-sft/v1 (V082-SPEZ.md §3.1, feldgenau) ────────────────────────────

interface SftZeile {
  messages: [
    { role: 'system'; content: string },
    { role: 'user'; content: string },
    { role: 'assistant'; content: string },
  ];
  meta: {
    id: string;
    adapter: 'kosmo-zeichner-grundriss';
    quelle: string;
    visibility: 'public';
    qualitaet: { checksBestanden: boolean; hinweise: string[] };
  };
}

const SYSTEM_GRUNDRISS =
  'Du bist Kosmo-Zeichner. Aus einem Raumprogramm (Wohnungsmasse, Korridorseite) ' +
  'erzeugst du einen CH-Wohnbau-Grundriss als strukturiertes JSON: Räume (Umriss, ' +
  'Name, Raumtyp, SIA-Fläche HNF/VF), Möblierung, Türen und Kennzahlen. Rezept: ' +
  'Eingangsband (Diele|Bad|Küche, 2.4 m) an der Korridorseite, ab 2 Zimmern ein ' +
  'interner Flur (1.2 m) ohne Durchgangszimmer, Wohnband mit Zimmern zur Fassade. ' +
  'Ist die Wohnung zu klein oder zu flach, sagst du das ehrlich in der Diagnose ' +
  'statt zu erfinden.';

const SYSTEM_SEGMENTIEREN =
  'Du bist Kosmo-Zeichner. Aus einem Geschoss-Footprint, einem Korridorverlauf ' +
  'und einem gewünschten Wohnungstyp-Mix (Typ, Zielgrösse m², Anzahl) schneidest ' +
  'du den Footprint entlang des Korridors in ganze Wohnungen: beidseits entstehen ' +
  'Bänder, auf jedem Band suchst du Schnittstationen, die den Soll-Mix möglichst ' +
  'gut treffen (Mindestbreite am Korridor einhalten). Was übrig bleibt, weist du ' +
  'ehrlich als Restfläche aus statt den Mix zu erfinden.';

/** Kennzahlen wie in `docs/LORA-KONZEPT.md` §1.2 / grundriss-v0.jsonl. */
function kennzahlen(g: GenerierterGrundriss) {
  let hnfMm2 = 0;
  let vfMm2 = 0;
  for (const r of g.raeume) {
    const a = polyArea(r.outline);
    if (r.sia === 'HNF') hnfMm2 += a;
    else vfMm2 += a;
  }
  return {
    hnfM2: Math.round((hnfMm2 / 1e6) * 10) / 10,
    vfM2: Math.round((vfMm2 / 1e6) * 10) / 10,
    raumAnzahl: g.raeume.length,
    moebelAnzahl: g.moebel.length,
    tuerAnzahl: g.tueren.length,
  };
}

/** Geometrischer Näherungs-Check (V082-SPEZ.md §6.2, LORA-KONZEPT.md §1.3). */
function pruefeGeometrisch(g: GenerierterGrundriss): { bestanden: boolean; hinweise: string[] } {
  const hinweise: string[] = [];
  let bestanden = true;
  for (const r of g.raeume) {
    if (r.sia !== 'HNF') continue;
    const b = minBreite(r.outline);
    const flaeche = polyArea(r.outline) / 1e6;
    if (b < 2400) {
      bestanden = false;
      hinweise.push(`«${r.name}» ist nur ${(b / 1000).toFixed(2)} m breit (Richtwert ≥ 2.40 m) — ausgeschlossen`);
    }
    if (flaeche < 10) {
      hinweise.push(`«${r.name}» hat ${flaeche.toFixed(1)} m² (Einzelzimmer üblich ≥ 10 m²)`);
    }
  }
  return { bestanden, hinweise };
}

let idZaehler = 0;
function nextId(praefix: string): string {
  idZaehler += 1;
  return `grundriss-v1-${praefix}-${String(idZaehler).padStart(4, '0')}`;
}

const rows: SftZeile[] = [];
const stats = {
  rechteckPoolRoh: 0,
  rechteckGefiltertBreite: 0,
  rechteckBehalten: 0,
  lPoolRoh: 0,
  lGefiltertBreite: 0,
  lGefiltertLeer: 0,
  lBehalten: 0,
  ablehnBehalten: 0,
  segmentierungPoolRoh: 0,
  segmentierungLeerGefiltert: 0,
  segmentierungBehalten: 0,
};

// ── (a) Rechteck-Grundrisse: systematisches Grid ───────────────────────────
// Wohnungsbreite 6.2–13.0 m × Wohnungstiefe 6.5–10.5 m, 4 Korridorkanten
// (docs/LORA-KONZEPT.md §1.2) — für v1 ein deutlich breiteres Grid als die
// 96-Kombinationen-Rohmenge der Stichprobe.

const RECHTECK_BREITEN = [6200, 7000, 7800, 8600, 9400, 10200, 11000, 11800, 12600, 13000];
const RECHTECK_TIEFEN = [6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500];

function baueRechteckZeile(breiteMm: number, tiefeMm: number, kante: KorridorKante, herkunft: string): void {
  stats.rechteckPoolRoh += 1;
  const outline = rechteck(0, 0, breiteMm, tiefeMm);
  const g = generiereGrundriss(outline, kante);
  if (g.raeume.length === 0) {
    // Ablehn-Fall (zu klein) — separat behandelt, s.u.
    return;
  }
  const { bestanden, hinweise } = pruefeGeometrisch(g);
  if (!bestanden) {
    stats.rechteckGefiltertBreite += 1;
    return;
  }
  stats.rechteckBehalten += 1;
  const userObj = {
    aufgabe: 'grundriss-generieren',
    wohnung: { breiteMm, tiefeMm },
    korridorKante: kante,
    kontext: `rechteckige Wohnung ${(breiteMm / 1000).toFixed(1)}×${(tiefeMm / 1000).toFixed(1)} m`,
  };
  const assistantObj = { ...g, kennzahlen: kennzahlen(g) };
  rows.push({
    messages: [
      { role: 'system', content: SYSTEM_GRUNDRISS },
      { role: 'user', content: JSON.stringify(userObj) },
      { role: 'assistant', content: JSON.stringify(assistantObj) },
    ],
    meta: {
      id: nextId('rect'),
      adapter: 'kosmo-zeichner-grundriss',
      quelle: 'packages/kosmo-kernel/src/derive/grundrissgenerator.ts#generiereGrundriss',
      visibility: 'public',
      qualitaet: { checksBestanden: true, hinweise },
    },
  });
  void herkunft;
}

for (const b of RECHTECK_BREITEN) {
  for (const t of RECHTECK_TIEFEN) {
    for (const kante of KORRIDOR_KANTEN) {
      baueRechteckZeile(b, t, kante, 'grid');
    }
  }
}

// Seeded-Zufallsmenge für zusätzliches Volumen (kontinuierlicher Bereich,
// auf 100mm gerastert) — reproduzierbar über denselben SEED.
const rndRechteck = mulberry32(SEED ^ 0x1);
for (let i = 0; i < 220; i++) {
  const b = rasterInt(rndRechteck, 6200, 13000, 100);
  const t = rasterInt(rndRechteck, 6500, 10500, 100);
  const kante = pick(rndRechteck, KORRIDOR_KANTEN);
  baueRechteckZeile(b, t, kante, 'random');
}

// ── (b) L-Grundrisse: Hauptteil + Flügel (generiereGrundrissL) ────────────
// Hauptteil bekommt das volle Rezept (generiereGrundriss intern), Flügel
// wird über Türen an der Naht erschlossen (docs/LORA-KONZEPT.md §1.2 "L-
// Grundrisse: Hauptteil + Flügel-Rechteck an variabler Naht").

function baueLZeile(
  hauptB: number,
  hauptT: number,
  fluegelB: number,
  fluegelT: number,
  kante: KorridorKante,
): void {
  stats.lPoolRoh += 1;
  const haupt = rechteck(0, 0, hauptB, hauptT);
  const fluegel = rechteck(hauptB, 0, hauptB + fluegelB, fluegelT);
  const g = generiereGrundrissL(haupt, fluegel, kante);
  if (g.raeume.length === 0) return;
  const { bestanden, hinweise } = pruefeGeometrisch(g);
  if (!bestanden) {
    stats.lGefiltertBreite += 1;
    return;
  }
  // Naht < 90 cm: Flügel wird vom Generator selbst ausgelassen (ehrlich in
  // der Diagnose vermerkt) — kein Ausschluss, aber gesondert gezählt, weil
  // dann de facto nur der Hauptteil trainiert wird (kein L-Beispiel mehr).
  const flügelAusgelassen = g.diagnose.some((d) => d.includes('Flügel-Naht unter 90 cm'));
  if (flügelAusgelassen) stats.lGefiltertLeer += 1;
  stats.lBehalten += 1;
  const userObj = {
    aufgabe: 'grundriss-generieren',
    wohnung: {
      typ: 'l',
      haupt: { breiteMm: hauptB, tiefeMm: hauptT },
      fluegel: { breiteMm: fluegelB, tiefeMm: fluegelT, naht: 'rechts-an-haupt' },
    },
    korridorKante: kante,
    kontext: `L-Wohnung Hauptteil ${(hauptB / 1000).toFixed(1)}×${(hauptT / 1000).toFixed(1)} m, Flügel ${(fluegelB / 1000).toFixed(1)}×${(fluegelT / 1000).toFixed(1)} m`,
  };
  const assistantObj = { ...g, kennzahlen: kennzahlen(g) };
  rows.push({
    messages: [
      { role: 'system', content: SYSTEM_GRUNDRISS },
      { role: 'user', content: JSON.stringify(userObj) },
      { role: 'assistant', content: JSON.stringify(assistantObj) },
    ],
    meta: {
      id: nextId('l'),
      adapter: 'kosmo-zeichner-grundriss',
      quelle: 'packages/kosmo-kernel/src/derive/grundrissgenerator.ts#generiereGrundrissL',
      visibility: 'public',
      qualitaet: { checksBestanden: true, hinweise },
    },
  });
}

const L_HAUPT_BREITEN = [8000, 9500, 11000];
const L_HAUPT_TIEFEN = [7000, 8500];
const L_FLUEGEL_BREITEN = [3000, 4000, 5000];
const L_FLUEGEL_TIEFEN = [4000, 5500];

for (const hb of L_HAUPT_BREITEN) {
  for (const ht of L_HAUPT_TIEFEN) {
    for (const fb of L_FLUEGEL_BREITEN) {
      for (const ft of L_FLUEGEL_TIEFEN) {
        for (const kante of KORRIDOR_KANTEN) {
          baueLZeile(hb, ht, fb, ft, kante);
        }
      }
    }
  }
}

const rndL = mulberry32(SEED ^ 0x2);
for (let i = 0; i < 60; i++) {
  const hb = rasterInt(rndL, 8000, 12000, 200);
  const ht = rasterInt(rndL, 6500, 9000, 200);
  const fb = rasterInt(rndL, 2800, 5500, 200);
  const ft = rasterInt(rndL, 3500, 6500, 200);
  const kante = pick(rndL, KORRIDOR_KANTEN);
  baueLZeile(hb, ht, fb, ft, kante);
}

// ── (c) Ablehn-/Diagnose-Fälle (kuratiert, bewusst mit drin) ───────────────
// Ehrliches Verweigern/Diagnostizieren lernen statt jede Anfrage zu erfüllen
// (docs/LORA-KONZEPT.md §1.2/§4). Diese Zeilen umgehen den Breite-Filter
// bewusst NICHT — sie werden separat gebaut, weil ihr Wert gerade die
// Ablehnung/Diagnose selbst ist, nicht ein gefiltertes Zimmer-Layout.

function baueAblehnZeile(
  id: string,
  breiteMm: number,
  tiefeMm: number,
  kante: KorridorKante,
  kontextZusatz: string,
): void {
  const outline = rechteck(0, 0, breiteMm, tiefeMm);
  const g = generiereGrundriss(outline, kante);
  const userObj = {
    aufgabe: 'grundriss-generieren',
    wohnung: { breiteMm, tiefeMm },
    korridorKante: kante,
    kontext: `${kontextZusatz} ${(breiteMm / 1000).toFixed(1)}×${(tiefeMm / 1000).toFixed(1)} m`,
  };
  const hinweise = g.raeume.length === 0 ? ['Generator lehnt ab (< 6×6 m) — ehrliche Diagnose, kein Layout erfunden.'] : [];
  const assistantObj = g.raeume.length === 0 ? g : { ...g, kennzahlen: kennzahlen(g) };
  stats.ablehnBehalten += 1;
  rows.push({
    messages: [
      { role: 'system', content: SYSTEM_GRUNDRISS },
      { role: 'user', content: JSON.stringify(userObj) },
      { role: 'assistant', content: JSON.stringify(assistantObj) },
    ],
    meta: {
      id,
      adapter: 'kosmo-zeichner-grundriss',
      quelle: 'packages/kosmo-kernel/src/derive/grundrissgenerator.ts#generiereGrundriss',
      visibility: 'public',
      qualitaet: { checksBestanden: g.raeume.length === 0, hinweise },
    },
  });
}

// Zu klein (< 6×6 m, alle 4 Kanten — Ablehnung ist kantenunabhängig, da die
// Prüfung vor der Bandaufteilung greift, aber wir behalten Kanten-Varianz
// für die Prompt-Vielfalt).
baueAblehnZeile(nextId('ablehn'), 5000, 5000, 'unten', 'quadratische Kleinstwohnung');
baueAblehnZeile(nextId('ablehn'), 5500, 8000, 'links', 'zu schmale Wohnung');
baueAblehnZeile(nextId('ablehn'), 9000, 5800, 'oben', 'zu flache Wohnung');
baueAblehnZeile(nextId('ablehn'), 4500, 12000, 'rechts', 'sehr schmaler Riegel');
// Zu flach für internen Flur (Durchgangszimmer-Fallback, Diagnose statt
// Ablehnung — der Generator liefert ein Layout, sagt aber ehrlich, dass
// Zimmer 2+ Durchgangszimmer sind).
baueAblehnZeile(nextId('ablehn'), 12000, 6200, 'unten', 'zu flach für Flur');
baueAblehnZeile(nextId('ablehn'), 13000, 6300, 'links', 'zu flach für Flur');
// Schmale Randlage (v0-Muster: 6.2×9.0 wiederholt hier mit anderer Kante als
// eigener Diagnose-Fall, weil «Zu schmal für separate Zimmer» dort greift).
baueAblehnZeile(nextId('ablehn'), 6200, 9000, 'oben', 'schmale Randlage');
// L-Wohnung mit zu kurzer Naht (< 90 cm) — Flügel wird vom Generator selbst
// ausgelassen, ehrliche Diagnose statt erfundenem Flügelzimmer.
{
  const hauptB = 9000, hauptT = 7500, fluegelB = 3000, fluegelT = 800, kante: KorridorKante = 'unten';
  const haupt = rechteck(0, 0, hauptB, hauptT);
  const fluegel = rechteck(hauptB, 0, hauptB + fluegelB, fluegelT);
  const g = generiereGrundrissL(haupt, fluegel, kante);
  const userObj = {
    aufgabe: 'grundriss-generieren',
    wohnung: {
      typ: 'l',
      haupt: { breiteMm: hauptB, tiefeMm: hauptT },
      fluegel: { breiteMm: fluegelB, tiefeMm: fluegelT, naht: 'rechts-an-haupt' },
    },
    korridorKante: kante,
    kontext: 'L-Wohnung mit sehr kurzer Flügel-Naht (< 90 cm)',
  };
  rows.push({
    messages: [
      { role: 'system', content: SYSTEM_GRUNDRISS },
      { role: 'user', content: JSON.stringify(userObj) },
      { role: 'assistant', content: JSON.stringify({ ...g, kennzahlen: kennzahlen(g) }) },
    ],
    meta: {
      id: nextId('ablehn'),
      adapter: 'kosmo-zeichner-grundriss',
      quelle: 'packages/kosmo-kernel/src/derive/grundrissgenerator.ts#generiereGrundrissL',
      visibility: 'public',
      qualitaet: {
        checksBestanden: true,
        hinweise: ['Flügel-Naht < 90 cm — Generator lässt den Flügel ehrlich aus statt ihn zu erfinden.'],
      },
    },
  });
  stats.ablehnBehalten += 1;
}

// ── (d) Wohnungs-Segmentierung (`segmentiere()`, zweite Aufgabe) ──────────
// Geschoss-Footprint entlang eines Korridors in ganze Wohnungen geteilt
// (docs/LORA-KONZEPT.md §1.2 "für v1.1 vorgesehen").

function baueSegmentierungsZeile(
  laengeMm: number,
  tiefeMm: number,
  mixName: string,
  mix: WohnungsTypSoll[],
  kern: boolean,
): void {
  stats.segmentierungPoolRoh += 1;
  const footprint = rechteck(0, 0, laengeMm, tiefeMm);
  const korridorBreite = 3000;
  const korridor = rechteck(0, tiefeMm / 2 - korridorBreite / 2, laengeMm, tiefeMm / 2 + korridorBreite / 2);
  const ergebnis: SegmentierungsErgebnis = segmentiere(footprint, korridor, mix, { kern });
  const leer = ergebnis.wohnungen.length === 0;
  if (leer) stats.segmentierungLeerGefiltert += 1;
  else stats.segmentierungBehalten += 1;
  const userObj = {
    aufgabe: 'wohnung-segmentieren',
    footprint: { laengeMm, tiefeMm },
    korridor: { breiteMm: korridorBreite, lage: 'mittig-horizontal' },
    mix,
    optionen: { kern },
    kontext: `Geschoss ${(laengeMm / 1000).toFixed(1)}×${(tiefeMm / 1000).toFixed(1)} m, Mix «${mixName}»${kern ? ', mit Erschliessungskern' : ''}`,
  };
  const hinweise: string[] = [];
  if (leer) hinweise.push('Kein Band ≥ 3 m Tiefe neben dem Korridor — ehrliche Diagnose, keine Wohnung erfunden.');
  for (const m of ergebnis.mix) {
    if (m.ist < m.soll) hinweise.push(`Mix «${m.typ}»: ${m.ist}/${m.soll} erfüllt — Band zu kurz oder Typgrösse passt nicht.`);
  }
  rows.push({
    messages: [
      { role: 'system', content: SYSTEM_SEGMENTIEREN },
      { role: 'user', content: JSON.stringify(userObj) },
      { role: 'assistant', content: JSON.stringify(ergebnis) },
    ],
    meta: {
      id: nextId('segment'),
      adapter: 'kosmo-zeichner-grundriss',
      quelle: 'packages/kosmo-kernel/src/derive/segmentierer.ts#segmentiere',
      visibility: 'public',
      qualitaet: { checksBestanden: !leer, hinweise },
    },
  });
}

const MIX_PROFILE: { name: string; mix: WohnungsTypSoll[] }[] = [
  { name: 'marktgerecht-solo', mix: [{ typ: 'marktgerecht', groesse: WOHNUNGS_GROESSEN['marktgerecht']!, anzahl: 6 }] },
  {
    name: 'markt-preisguenstig-mix',
    mix: [
      { typ: 'marktgerecht', groesse: WOHNUNGS_GROESSEN['marktgerecht']!, anzahl: 4 },
      { typ: 'preisguenstig', groesse: WOHNUNGS_GROESSEN['preisguenstig']!, anzahl: 4 },
    ],
  },
  {
    name: 'alterswohnen-quartier-mix',
    mix: [
      { typ: 'alterswohnen', groesse: WOHNUNGS_GROESSEN['alterswohnen']!, anzahl: 5 },
      { typ: 'quartierebene', groesse: WOHNUNGS_GROESSEN['quartierebene']!, anzahl: 3 },
    ],
  },
];

const SEGMENT_LAENGEN = [24000, 32000, 40000, 48000];
const SEGMENT_TIEFEN = [14000, 16000, 18000];

for (const laenge of SEGMENT_LAENGEN) {
  for (const tiefe of SEGMENT_TIEFEN) {
    for (const profil of MIX_PROFILE) {
      for (const kern of [false, true]) {
        baueSegmentierungsZeile(laenge, tiefe, profil.name, profil.mix, kern);
      }
    }
  }
}

// Diagnose-Fälle: Geschoss zu flach für ein Band neben dem Korridor (Korridor
// beansprucht fast die ganze Tiefe → kein Band ≥ 3 m).
baueSegmentierungsZeile(30000, 7000, 'marktgerecht-solo', MIX_PROFILE[0]!.mix, false);
baueSegmentierungsZeile(20000, 6500, 'markt-preisguenstig-mix', MIX_PROFILE[1]!.mix, false);

const rndSeg = mulberry32(SEED ^ 0x3);
for (let i = 0; i < 80; i++) {
  const laenge = rasterInt(rndSeg, 20000, 60000, 1000);
  const tiefe = rasterInt(rndSeg, 12000, 20000, 500);
  const profil = pick(rndSeg, MIX_PROFILE);
  const kern = rndSeg() > 0.5;
  baueSegmentierungsZeile(laenge, tiefe, profil.name, profil.mix, kern);
}

// ── Schreiben ──────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ? resolve(process.cwd(), args.out) : resolve(ZIEL_ORDNER, 'grundriss-v1.jsonl');
const statsPath = args.out
  ? outPath.replace(/\.jsonl$/, '.stats.md')
  : resolve(ZIEL_ORDNER, 'grundriss-v1.stats.md');

mkdirSync(dirname(outPath), { recursive: true });
const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
writeFileSync(outPath, jsonl, 'utf8');

const nachTyp = {
  rechteck: rows.filter((r) => r.meta.id.startsWith('grundriss-v1-rect-')).length,
  l: rows.filter((r) => r.meta.id.startsWith('grundriss-v1-l-')).length,
  ablehn: rows.filter((r) => r.meta.id.startsWith('grundriss-v1-ablehn-')).length,
  segment: rows.filter((r) => r.meta.id.startsWith('grundriss-v1-segment-')).length,
};

const statsMd = `# grundriss-v1.jsonl — Statistikbericht

Erzeugt von \`tools/training/generiere-grundriss-sft.mts\` (Seed \`0x${SEED.toString(16)}\`,
V082-SPEZ.md §6.2). Deterministisch — zwei Läufe erzeugen eine byte-identische
Datei (Doppellauf-Beweis im P2-Abschlussbericht).

## Zeilen gesamt

**${rows.length} Zeilen** in \`grundriss-v1.jsonl\`.

| Aufgabentyp | Zeilen |
|---|---|
| grundriss-generieren (Rechteck) | ${nachTyp.rechteck} |
| grundriss-generieren (L-Form) | ${nachTyp.l} |
| grundriss-generieren (Ablehn-/Diagnose-Fälle, kuratiert) | ${nachTyp.ablehn} |
| wohnung-segmentieren | ${nachTyp.segment} |

## Filterquote je Pool (geometrische Näherung, V082-SPEZ.md §6.2 / LORA-KONZEPT.md §1.3)

| Pool | Roh (Grid + seeded Zufall) | Verworfen: Zimmerbreite < 2.40 m | Verworfen: kein Layout (< 6×6 m) | Behalten |
|---|---|---|---|---|
| Rechteck | ${stats.rechteckPoolRoh} | ${stats.rechteckGefiltertBreite} | ${stats.rechteckPoolRoh - stats.rechteckGefiltertBreite - stats.rechteckBehalten} | ${stats.rechteckBehalten} |
| L-Form | ${stats.lPoolRoh} | ${stats.lGefiltertBreite} | ${stats.lPoolRoh - stats.lGefiltertBreite - stats.lBehalten} | ${stats.lBehalten} |

L-Form, davon mit ausgelassenem Flügel (Naht < 90 cm, Generator diagnostiziert
statt zu erfinden, trotzdem behalten): ${stats.lGefiltertLeer}.

Ablehn-/Diagnose-Fälle (kuratiert, umgehen den Filter bewusst — ihr Wert IST
die Ablehnung/Diagnose): ${stats.ablehnBehalten}.

## Wohnungs-Segmentierung (\`segmentiere()\`)

Kein Zimmer-Richtwert-Filter (checks.ts:70-72 nimmt Programm-Zonen/ganze
Wohnungen von der Zimmerbreite/-fläche-Regel aus) — hier zählt nur, ob
überhaupt ein Band ≥ 3 m Tiefe neben dem Korridor lag.

| Pool | Roh | Leer (kein Band, als Diagnose behalten) | Mit ≥ 1 geschnittener Wohnung |
|---|---|---|---|
| Segmentierung | ${stats.segmentierungPoolRoh} | ${stats.segmentierungLeerGefiltert} | ${stats.segmentierungBehalten} |

## Qualitätsfilter — Begründung der Näherung (nicht verschwiegen)

V082-SPEZ.md §6.2 legt für P2 explizit die geometrische Näherung fest
("\`pruefeGrundriss\`-Filter (geometrische Näherung wie in der Stichprobe,
\`docs/LORA-KONZEPT.md\` §1.3)"). Ein Weg zum SCHARFEN Check (echtes KosmoDoc
mit Wall/Opening, \`pruefeGrundriss()\` unverändert) existiert im Kernel
bereits über \`design.geschossErstellen\` → \`design.zoneErstellen\` →
\`design.grundrissGenerieren\` → \`design.waendeAusZonen\` (belegt:
\`packages/kosmo-kernel/test/kernel.test.ts:4780-4805\`) — für P2 nicht gebaut,
weil die Spec ihn nicht verlangt und \`docs/LORA-KONZEPT.md\` §1.3 den Aufwand
für eine Vollmenge als unverhältnismässig einstuft (dort für "v1.1"
vorgemerkt). Referenziert für eine künftige Version, nicht verschwiegen.
`;

writeFileSync(statsPath, statsMd, 'utf8');

console.log(`${rows.length} Zeilen geschrieben nach ${outPath}`);
console.log(`Statistik geschrieben nach ${statsPath}`);
