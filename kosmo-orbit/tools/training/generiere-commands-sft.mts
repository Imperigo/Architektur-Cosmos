/**
 * Commands-SFT-Vollmenge v1 (v0.8.3/P4, `docs/V083-SPEZ.md` §7 (E7) + §12
 * C-15/C-16, Playbook `wissen/training/claude/playbooks/
 * zod-zu-command-beispielen.md`).
 *
 * Deterministischer, seeded Generator für den Adapter `kosmo-zeichner-commands`
 * (`wissen/training/REGISTRY.md`). Quelle: `allCommands()` (`@kosmo/kernel`,
 * die eine Command-Registry) + `commandTools()`/`toolNameFor()` (`@kosmo/ai`
 * `tools.ts:22-62`) — LIVE aus dem Code gelesen, kein statischer Snapshot:
 * jedes registrierte Command dieses Repo-Standes taucht automatisch auf,
 * inklusive der Commands, die parallele Pakete (E1 Kommentar, E2 MassKette)
 * gerade erst ergänzt haben.
 *
 * Vorbild `tools/training/generiere-grundriss-sft.mts` (v0.8.2/P2): seeded
 * via mulberry32 (Doppellauf byte-identisch), `SftZeile`-Typ, Statistikbericht,
 * kuratierte Ablehn-/Diagnose-Fälle. Anders als der Grundriss-Generator ruft
 * dieser Generator KEINEN Kernel-Ableitungscode auf — er synthetisiert
 * Tool-Call-Parameter DIREKT aus dem zod-`params`-Schema jedes Commands
 * (generische Introspektion über `schema.def`, s. §SCHEMA unten), dann ein
 * `z.parse()`-Beweis pro Zeile (Playbook-Qualitätskriterium: "Der Tool-Call
 * muss real gegen das Schema validieren").
 *
 * Warum generisch statt 108 Commands von Hand transkribiert: Kein Command-
 * Schema in `design.ts`/`publish.ts`/`vis.ts`/`grundlagen.ts` nutzt `.refine()`/
 * `.superRefine()` (geprüft, kein Treffer) — Cross-Feld-Business-Regeln laufen
 * ausschliesslich in `run()`, NIE im zod-Schema selbst (Kommentar `design.ts:26`:
 * "flach, deutsch beschrieben, ohne verschachtelte Unions"). Ein generischer
 * Schema-Walker (Objekt/Array/Enum/Union/Record/Literal/Optional/Nullable/
 * Default, inkl. min/max-Constraints aus `schema.def.checks`) erzeugt darum
 * für praktisch jedes Command gültige Parameter — reproduzierbar bei jedem
 * neuen Command, ohne dass P4 (oder eine Folgeversion) die Datei von Hand
 * nachführen muss. Eine kleine Zahl dokumentierter Business-Regeln, die NUR in
 * `run()` stehen (z.B. `design.fassadenModulZuweisen`s "genau einer der beiden
 * Wege"), bekommt gezielte Nachbearbeitung (§KORRELATIONEN unten) — deklariert,
 * nicht versteckt.
 *
 * Aufgabentyp: EIN Aufgabentyp ("Nutzerwunsch → Tool-Call"), analog zum
 * Playbook. Für 87-90% der Zeilen ist die Antwort ein valider Tool-Call
 * (`{"tool": "<toolNameFor(commandId)>", "parameters": {...}}`); für 10-15%
 * (Ablehn-/Diagnose-Fälle) lässt der Nutzerwunsch bewusst ein Pflichtfeld weg
 * — Kosmo antwortet ehrlich mit einer Rückfrage statt einen Wert zu erfinden
 * (dieselbe "kein Layout erfunden"-Disziplin wie beim Grundriss-Generator,
 * hier auf Tool-Calling übertragen — und spec-konform zum Playbook-Nie-Regel
 * "mehrdeutige Prompts... werden verworfen, nicht künstlich präzisiert": statt
 * erfundener Mehrdeutigkeit nutzt dieser Generator die einzige Ablehn-Form, die
 * sich aus dem echten Schema selbst ableiten lässt — ein fehlendes Pflichtfeld).
 *
 * Aufruf:
 *   npx tsx tools/training/generiere-commands-sft.mts
 *   npx tsx tools/training/generiere-commands-sft.mts --out=pfad/zu/datei.jsonl
 *
 * Schreibt (relativ zum Skript, IMMER — kein `--out` nötig für den Standardfall):
 *   ../../../wissen/training/sft/kosmo-zeichner-commands/commands-v1.jsonl
 *   ../../../wissen/training/sft/kosmo-zeichner-commands/commands-v1.stats.md
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { allCommands, type Command } from '@kosmo/kernel';
import { commandTools, toolNameFor } from '@kosmo/ai';

// ── Pfade (Konvention identisch zu generiere-grundriss-sft.mts) ───────────

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL_ORDNER = resolve(HIER, '..', '..', '..', 'wissen', 'training', 'sft', 'kosmo-zeichner-commands');

function parseArgs(argv: string[]): { out?: string } {
  for (const a of argv) {
    const m = /^--out=(.+)$/.exec(a);
    if (m?.[1]) return { out: m[1] };
  }
  return {};
}

// ── Seeded RNG (mulberry32) — literaler Seed, deterministisch ──────────────
// Bei gleichem Seed liefert nextFloat() IMMER dieselbe Sequenz (Gate-Beweis:
// Doppellauf byte-identisch). Seed ist ein Literal, keine Zeit-/Zufallsquelle,
// eigenes Literal (nicht der Grundriss-Seed) — 'KCMD' als Bytes gelesen.
const SEED = 0x4b434d44;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function nextFloat(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rasterInt(rnd: () => number, min: number, max: number, step: number): number {
  const n = Math.floor((max - min) / step) + 1;
  const i = Math.floor(rnd() * n);
  return min + Math.min(Math.max(i, 0), n - 1) * step;
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length]!;
}

function pickSubset<T>(rnd: () => number, arr: readonly T[], minN: number, maxN: number): T[] {
  const n = Math.min(arr.length, rasterInt(rnd, minN, Math.max(minN, Math.min(maxN, arr.length)), 1));
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(rnd() * pool.length) % pool.length;
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function chance(rnd: () => number, p: number): boolean {
  return rnd() < p;
}

function shuffled<T>(rnd: () => number, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ── §SCHEMA: generische zod-v4-Introspektion ────────────────────────────────
// zod 4.4.3 exponiert `schema.def` öffentlich (Struktur geprüft per Node-Probe
// gegen die echten Command-Schemas, s. Bauagenten-Bericht). Kein privater API-
// Zugriff, keine Heuristik über `instanceof` — nur `def.type` + `def.checks`.

type ZType = z.ZodType;

interface Unwrapped {
  schema: ZType;
  required: boolean; // false, wenn optional/default/prefault in der Kette liegt
}

/** Entfernt optional/nullable/default/prefault/readonly/catch-Hüllen und meldet,
 * ob das Feld im ELTERN-Objekt ein PFLICHTFELD ist (muss im Input vorkommen —
 * `nullable()` allein macht ein Feld NICHT optional, nur seinen WERT). */
function unwrap(schema: ZType): Unwrapped {
  let s: any = schema;
  let required = true;
  for (;;) {
    const t = s?.def?.type;
    if (t === 'optional' || t === 'default' || t === 'prefault') {
      required = false;
      s = s.def.innerType;
      continue;
    }
    if (t === 'readonly' || t === 'catch') {
      s = s.def.innerType;
      continue;
    }
    break;
  }
  return { schema: s, required };
}

/** Nur die Nullable-Hülle abziehen (für den Leaf-Typ hinter `.nullable()`),
 * unabhängig von required/optional (das regelt `unwrap()` bereits). */
function stripNullable(schema: ZType): { schema: ZType; nullable: boolean } {
  const s: any = schema;
  if (s?.def?.type === 'nullable') return { schema: s.def.innerType, nullable: true };
  return { schema, nullable: false };
}

function isRequiredField(schema: ZType): boolean {
  return unwrap(schema).required;
}

interface NumBounds {
  min?: number;
  minIncl: boolean;
  max?: number;
  maxIncl: boolean;
  isInt: boolean;
}

function numberBounds(schema: ZType): NumBounds {
  const b: NumBounds = { minIncl: true, maxIncl: true, isInt: false };
  const checks = (schema as any)?.def?.checks ?? [];
  for (const c of checks) {
    const d = c?._zod?.def;
    if (!d) continue;
    if (d.check === 'number_format' && (d.format === 'safeint' || d.format === 'int32' || d.format === 'int64')) {
      b.isInt = true;
    }
    if (d.check === 'greater_than') {
      b.min = d.value;
      b.minIncl = d.inclusive;
    }
    if (d.check === 'less_than') {
      b.max = d.value;
      b.maxIncl = d.inclusive;
    }
  }
  return b;
}

interface ArrBounds {
  min?: number;
  max?: number;
}

function arrayBounds(schema: ZType): ArrBounds {
  const b: ArrBounds = {};
  const checks = (schema as any)?.def?.checks ?? [];
  for (const c of checks) {
    const d = c?._zod?.def;
    if (!d) continue;
    if (d.check === 'min_length') b.min = d.minimum;
    if (d.check === 'max_length') b.max = d.maximum;
  }
  return b;
}

/** Regex-Pattern eines `.regex()`-Checks, falls vorhanden (im gesamten Repo
 * genau EIN Vorkommen: `themenPlanSpeichern.regeln[].farbe`, Hex-Farbe). */
function regexPattern(schema: ZType): RegExp | undefined {
  const checks = (schema as any)?.def?.checks ?? [];
  for (const c of checks) {
    const d = c?._zod?.def;
    if (d?.check === 'string_format' && d?.format === 'regex' && d.pattern instanceof RegExp) return d.pattern;
  }
  return undefined;
}

function stringLen(schema: ZType): { min?: number; max?: number } {
  const s: any = schema;
  return { min: s.minLength ?? undefined, max: s.maxLength ?? undefined };
}

function enumOptions(schema: ZType): string[] | undefined {
  const s: any = schema;
  return s?.def?.type === 'enum' ? (s.options as string[]) : undefined;
}

function literalValue(schema: ZType): unknown {
  const s: any = schema;
  return s?.def?.type === 'literal' ? s.def.values?.[0] : undefined;
}

function objectShape(schema: ZType): Record<string, ZType> | undefined {
  const s: any = schema;
  return s?.def?.type === 'object' ? (s.shape as Record<string, ZType>) : undefined;
}

// ── §WORTBÄNKE: plausible, domänenechte Füllwerte (keine "foo"/123-Platzhalter) ──

const RAUM_NAMEN = ['Wohnen', 'Küche', 'Bad', 'Diele', 'Zimmer 1', 'Zimmer 2', 'Schlafen', 'Korridor', 'Reduit', 'Balkon', 'Technik', 'Gewerbefläche'];
const GESCHOSS_NAMEN = ['EG', '1.OG', '2.OG', '3.OG', '1.UG', 'Attika', 'Dachgeschoss'];
const AUFBAU_NAMEN_WAND = ['AW Beton 36', 'AW Backstein 30', 'IW KS 10', 'TW KS 20', 'AW Holzständer 28'];
const AUFBAU_NAMEN_DECKE = ['Decke Beton 250 Nass', 'Flachdach warm', 'Kellerdecke 220'];
const PROJEKT_NAMEN = ['Wohnüberbauung Ergolz', 'Genossenschaft Lindenhof', 'Alterssiedlung Rebberg', 'Ersatzneubau Bahnhofstrasse', 'Quartierentwicklung Weinberg'];
const SET_NAMEN = ['Baugesuch 1:100', 'Fassaden Nord/Süd', 'Werkpläne Rohbau', 'Wettbewerbsplansatz'];
const BLATT_NAMEN = ['Grundrisse 1:100', 'Fassaden 1:100', 'Situationsplan 1:500', 'Schnitte A-A / B-B'];
const GRAPH_NAMEN = ['Wettbewerbsbilder', 'Fassadenrender Süd', 'Innenraum Wohnen', 'Dämmerungsstimmung'];
const VORLAGE_NAMEN = ['Whg 3.5 Standard', 'Whg 4.5 Eck', 'Whg 2.5 Kompakt'];
const THEMENPLAN_NAMEN = ['Brandschutzplan', 'Materialplan', 'Umbauplan'];
const MODUL_NAMEN = ['Fensterband Süd EG', 'Lochfassade Standard', 'Paneel Nord'];
const ZONENREGEL_NAMEN = ['W2b (Richtwert ZG)', 'W3 Kernzone', 'Industrie- und Gewerbezone'];
const MATERIAL_POOL = ['beton', 'kalksandstein', 'holz-bsh', 'stahl', 'backstein', 'daemmung-mw'];
const GEWERK_POOL = ['Baumeister', 'Sanitär/Heizung', 'Elektro', 'Schreiner', 'Maler', 'Bodenleger'];
const PERSON_POOL = ['A. Baumann', 'M. Keller', 'S. Fischer', 'L. Weber'];
const BUERO_NAMEN = ['Baubüro Andrin', 'Atelier Rebberg Architektur', 'Studio Lindenhof AG'];
const ADRESS_POOL = ['Bahnhofstrasse 14, 4410 Liestal', 'Rebgasse 3, 4058 Basel', 'Dorfstrasse 21, 4133 Pratteln'];
const BESCHLAG_KATALOG_KEYS = [
  'tuerdruecker-garnitur', 'tuerband-scharnier', 'einsteckschloss', 'schliessblech', 'bodentuerschliesser',
  'tuerstopper', 'profilzylinder', 'panikstange', 'fenstergriff-olive', 'kippbeschlag', 'tuerspion', 'bandseitensicherung',
];
const PORT_NAMEN = ['prompt', 'material', 'bild', 'szene', 'stil', 'zahl'];
const HEX_FARBEN = ['#cc3322', '#2255aa', '#33aa55', '#aa8822', '#7733aa', '#444444'];
const REGEL_PRESET_IDS = ['ch-wohnbau', 'wettbewerb'];
const MOEBEL_TYPEN = ['bett-doppel', 'bett-einzel', 'kuechenzeile', 'wc', 'lavabo', 'dusche', 'esstisch', 'schrank'];
const DATUMS_POOL = ['12.03.2026', '04.07.2026', '17.07.2026', '22.09.2026', '05.01.2027'];
const KEYNOTE_TEXTE = ['Randabschluss gemäss Fassadendetail', 'Übergang Aussenwand/Terrain, Feuchteschutz', 'Brandschutzabschottung REI 60'];
const KONZEPT_TEXTE = ['Wohnen am Wasser', 'Verdichtung mit Aussicht', 'Ein Ort für drei Generationen'];

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Kurzer, plausibler ID-Anhang (Muster grob an `newId()`, `model/ids.ts`,
 * angelehnt: Präfix + kurzes alphanumerisches Suffix statt einer blossen
 * Zählnummer — sieht wie eine echte Kosmo-Laufzeit-ID aus, ohne den exakten
 * Zeitstempel-Algorithmus nachzubauen, den Trainingsdaten nicht brauchen). */
function idFor(kind: string, rnd: () => number): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ID_ALPHABET[Math.floor(rnd() * ID_ALPHABET.length)];
  return `${kind}-${suffix}`;
}

/** Feldname → ID-Gattung (Präfix + Wortlaut) für die Nutzerwunsch-Formulierung
 * UND für synthetische, plausible ID-Strings. Deckt die auf viele Commands
 * wiederkehrenden Referenzfelder ab; alles andere fällt auf eine generische
 * Ableitung aus dem Feldnamen zurück (`idKindFromKey`). */
const ID_KIND: Record<string, string> = {
  storeyId: 'geschoss', zoneId: 'zone', wallId: 'wand', entityId: 'element', massId: 'volumen',
  openingId: 'oeffnung', sheetId: 'blatt', setId: 'set', graphId: 'graph', nodeId: 'node',
  assemblyId: 'aufbau', hostId: 'wand', targetId: 'wand', placementId: 'ansicht', bildId: 'slot',
  textId: 'text', wolkeId: 'wolke', mangelId: 'mangel', kommentarId: 'kommentar', massKetteId: 'masskette',
  edgeId: 'kante', from: 'node', to: 'node', mangelIdRef: 'mangel',
};

function idKindFromKey(key: string): string {
  if (ID_KIND[key]) return ID_KIND[key]!;
  const stem = key.replace(/Id$/, '');
  return stem.length > 0 ? stem.toLowerCase() : 'element';
}

// ── Ganzzahl-/Fliesskomma-Wertebereiche je Feldname (nur genutzt, wenn das
// zod-Schema selbst KEINE min/max-Constraints trägt — s. `sampleNumber`) ──
const RANGE_MM_KLEIN: [number, number] = [80, 400]; // Dicken/Rahmen
const RANGE_MM_MITTEL: [number, number] = [600, 4000]; // Öffnungen, Möbel-Masse
const RANGE_MM_GROSS: [number, number] = [2000, 25000]; // Wand-/Raumlängen
const RANGE_GRAD: [number, number] = [0, 350];
const RANGE_ANTEIL: [number, number] = [0.05, 0.95];

const NUMBER_RANGE_BY_KEY: Record<string, [number, number]> = {
  breite: RANGE_MM_GROSS, laenge: RANGE_MM_GROSS, hoehe: RANGE_MM_MITTEL, tiefe: RANGE_MM_MITTEL,
  dicke: RANGE_MM_KLEIN, thickness: RANGE_MM_KLEIN, width: RANGE_MM_MITTEL, height: RANGE_MM_MITTEL,
  breiteMm: RANGE_MM_GROSS, laengeMm: RANGE_MM_GROSS, hoeheMm: RANGE_MM_MITTEL,
  center: RANGE_MM_MITTEL, sill: [0, 1100], overhang: [200, 1200], rotationGrad: RANGE_GRAD,
  achsmass: [3000, 12000], querAchsmass: [3000, 12000], wohnraster: [500, 1500],
  rahmenbreite: RANGE_MM_KLEIN, pfostenraster: [900, 2400], riegelraster: [900, 2400],
  bruestung: [0, 900], sturz: [100, 400], anteilRohbau: RANGE_ANTEIL, anteilAusbau: RANGE_ANTEIL,
  anteilTechnik: RANGE_ANTEIL, zuschlagUmgebung: [0.02, 0.2], zuschlagBaunebenkosten: [0.05, 0.25], reserve: [0.05, 0.2],
  chfProM2Gf: [1400, 2600], grenzabstand: [3000, 8000], mehrHoehenAb: [8000, 16000], mehrHoehenAnteil: [0.2, 1],
  m2AushubProWoche: [200, 900], m3RohbauProWoche: [80, 400], m2DachProWoche: [80, 400], m2HuelleProWoche: [80, 400],
  m2ElektroProWoche: [80, 400], m2SanitaerHeizungProWoche: [80, 400], m2TrockenbauProWoche: [80, 400],
  m2BodenbelaegeProWoche: [80, 400], m2MalerProWoche: [80, 400], m2UmgebungProWoche: [80, 400],
  abnahmeWochen: [1, 4], minDauerWochen: [1, 6], pitch: [15, 45], w: [40, 700], h: [40, 400],
  scale: [50, 500], size: [3, 12], anzahl: [1, 6], teilungN: [1, 4], teilungM: [1, 3],
  parzellenFlaeche: [400, 4000], az: [0.3, 1.6], maxHoehe: [8000, 22000], maxVollgeschosse: [2, 8],
  grenzabstandKlein: [3000, 5000], grenzabstandGross: [4000, 8000], zielGf: [400, 3000],
  varianteIndex: [0, 3], wert: [10, 5000], hnfSoll: [40, 400], groesse: [35, 140],
  hoeheM: [280, 620], lat: [46, 47.6], lon: [6, 10.4], e: [2550000, 2680000], n: [1180000, 1280000],
};

/** Command-spezifische Ausnahmen vom generellen Feldnamen-Wertebereich —
 * derselbe Feldname bedeutet je Command eine andere Grössenordnung (`height`
 * ist bei einer Fenster-Öffnung 1500–3000 mm, bei einem Wettbewerbs-
 * Volumenkörper 3000–24000 mm). */
const NUMBER_RANGE_BY_COMMAND_KEY: Record<string, [number, number]> = {
  'design.volumenErstellen:height': [3000, 24000],
};

function numDefaultRange(key: string, isInt: boolean, cmdId: string): [number, number] {
  return NUMBER_RANGE_BY_COMMAND_KEY[`${cmdId}:${key}`] ?? NUMBER_RANGE_BY_KEY[key] ?? (isInt ? [10, 3000] : [1, 100]);
}

function sampleNumber(rnd: () => number, schema: ZType, key: string, cmdId: string): number {
  const b = numberBounds(schema);
  let [lo, hi] = numDefaultRange(key, b.isInt, cmdId);
  // Zod-Constraints SCHNEIDEN den kuratierten Wertebereich, statt ihn zu
  // ersetzen — eine lockere `.positive()`-Schranke (min 0) soll NICHT den
  // engeren, architektonisch plausiblen Default (z.B. `height`: 600–4000 mm)
  // auf 0…hi aufweichen; nur wenn der zod-Wert den kuratierten Bereich
  // TATSÄCHLICH enger fasst (oder ihn ausserhalb liegt), gewinnt er.
  if (b.min !== undefined) lo = Math.max(lo, b.min);
  if (b.max !== undefined) hi = Math.min(hi, b.max);
  if (hi < lo) hi = b.max !== undefined ? b.max : lo; // zod enger als kuratiert: zod gewinnt vollständig
  if (b.min !== undefined && lo < b.min) lo = b.min;
  if (b.min !== undefined && !b.minIncl && lo <= b.min) lo = b.isInt ? b.min + 1 : b.min + Math.max((hi - lo) * 0.02, 0.01);
  if (b.max !== undefined && !b.maxIncl && hi >= b.max) hi = b.isInt ? b.max - 1 : b.max - Math.max((hi - lo) * 0.02, 0.01);
  if (hi < lo) hi = lo;
  const isInt = b.isInt;
  if (isInt) {
    const step = hi - lo > 400 ? 10 : hi - lo > 40 ? 5 : 1;
    return rasterInt(rnd, Math.round(lo), Math.round(hi), step);
  }
  const v = lo + rnd() * (hi - lo);
  return Math.round(v * 100) / 100;
}

// ── String-/Boolean-/Enum-Synthese ──────────────────────────────────────────

/** Feldname → kuratierter Pool (kontextfrei, für viele Commands gleich). */
const STRING_POOL_BY_KEY: Record<string, readonly string[]> = {
  material: MATERIAL_POOL, gewerk: GEWERK_POOL, autor: PERSON_POOL, verfasser: PERSON_POOL,
  gezeichnet: PERSON_POOL, geprueft: PERSON_POOL, bauherr: PERSON_POOL, adresse: ADRESS_POOL,
  disziplin: ['Architektur', 'Bauingenieur', 'HLKS'], namensregel: ['P-{nr}_{blatt}_{massstab}', '{projekt}_{blatt}'],
  datum: DATUMS_POOL, erfasstAm: DATUMS_POOL, behobenAm: DATUMS_POOL, erstelltAm: DATUMS_POOL, erledigtAm: DATUMS_POOL,
  frist: DATUMS_POOL, geschossCode: GESCHOSS_NAMEN, planNummer: ['A-101', 'A-102', 'A-201', 'B-010'],
  inhalt: ['Grundriss EG', 'Fassade Süd', 'Schnitt A-A'], keynote: ['K1', 'K2', 'K3'],
  parzelleNr: ['1044', '2287', '556'], projektCode: ['BG-2026-014', 'BG-2026-031'],
  label: PROJEKT_NAMEN, ort: ['Bad 2.OG', 'Treppenhaus EG', 'Küche 1.OG', 'Balkon 3.OG'],
  beschreibung: ['Fliese lose, Fuge undicht', 'Kratzer im Parkett', 'Tür klemmt beim Schliessen'],
  text: KONZEPT_TEXTE, modul: MODUL_NAMEN, thema: THEMENPLAN_NAMEN,
  title: ['Grundriss EG', 'Fassade Süd', 'Schnitt A-A', 'Render Wettbewerb'],
  titel: ['Grundriss EG', 'Fassade Süd', 'Schnitt A-A'],
  revision: ['A', 'B', 'C', 'D'], fromPort: PORT_NAMEN, toPort: PORT_NAMEN,
};

const NAME_POOL_BY_COMMAND: Record<string, readonly string[]> = {
  'design.geschossErstellen': GESCHOSS_NAMEN,
  'design.aufbauErstellen': [...AUFBAU_NAMEN_WAND, ...AUFBAU_NAMEN_DECKE],
  'design.zoneErstellen': RAUM_NAMEN,
  'design.themenPlanSpeichern': THEMENPLAN_NAMEN,
  'design.themenPlanEntfernen': THEMENPLAN_NAMEN,
  'design.modulSpeichern': MODUL_NAMEN,
  'design.vorlageSpeichern': VORLAGE_NAMEN,
  'design.zonenRegelSetzen': ZONENREGEL_NAMEN,
  'design.baugrenzeSetzen': ['Baugrenze', 'Baulinie Strasse', 'Baugrenze Nord'],
  'publish.setSpeichern': SET_NAMEN,
  'publish.setEntfernen': SET_NAMEN,
  'publish.blattErstellen': BLATT_NAMEN,
  'vis.graphErstellen': GRAPH_NAMEN,
  'design.projektNameSetzen': PROJEKT_NAMEN,
  'publish.bueroSetzen': BUERO_NAMEN,
};

const VIS_NODE_TYPEN = ['modell', 'material', 'prompt', 'stimmung', 'kombinierer', 'zahl', 'render', 'kamera', 'vergleich', 'blatt', 'referenz', 'aufnahme'];

/** Command-spezifische Pools für Felder, deren Bedeutung sich NICHT allein
 * aus dem Feldnamen ableiten lässt (derselbe Feldname trägt je Command eine
 * andere Bedeutung — `typ` z.B. Wohnungstyp-Schlüssel vs. VisNode-Typ). */
const REVISION_AENDERUNGS_TEXTE = ['Fenster Küche 1.20 → 1.40', 'Wanddurchbruch Bad ergänzt', 'Treppenlauf auf 1200 mm verbreitert', 'Grundriss EG an Statik angepasst'];

const FIELD_POOL_BY_COMMAND: Record<string, readonly string[]> = {
  'vis.nodeSetzen:typ': VIS_NODE_TYPEN,
  'publish.revisionErfassen:text': REVISION_AENDERUNGS_TEXTE,
};

function isIdLikeKey(key: string): boolean {
  return key.endsWith('Id') || key === 'from' || key === 'to';
}

/** `dataUrl`/`logoDataUrl` (publish.ts) sind base64-Bild-Payloads — ein
 * ECHTER Wert wäre entweder ein Fantasie-Blob (irreführend) oder ein reales
 * langes Base64-Datum (Nie-ins-Git-Muster, `validiere-sft.mjs` §Binär-Blob-
 * Check). Ehrlich statt erfunden: ein kurzer, erkennbarer Platzhalter, KEIN
 * echtes Bild — s. Hinweis in `meta.qualitaet.hinweise` (nicht verschwiegen).
 */
const DATA_URL_PLATZHALTER = 'data:image/svg+xml;base64,PLATZHALTER_SFT_KEIN_ECHTES_BILD';

function synthString(rnd: () => number, schema: ZType, key: string, cmdId: string): string {
  if (key === 'dataUrl' || key === 'logoDataUrl') return DATA_URL_PLATZHALTER;
  const rx = regexPattern(schema);
  if (rx) {
    // Repo-weit die einzige Regex ist die Hex-Farbe (`themenPlanSpeichern`);
    // ein kuratierter, garantiert passender Pool ersetzt Trial-and-Error.
    return pick(rnd, HEX_FARBEN);
  }
  if (isIdLikeKey(key)) return idFor(idKindFromKey(key), rnd);
  const perCmdPool = FIELD_POOL_BY_COMMAND[`${cmdId}:${key}`];
  const namePool = key === 'name' ? NAME_POOL_BY_COMMAND[cmdId] : undefined;
  const pool = perCmdPool ?? namePool ?? STRING_POOL_BY_KEY[key];
  if (pool) return pick(rnd, pool);
  const { min, max } = stringLen(schema);
  const fallbackPool = ['Ost', 'West', 'Achse 3', 'Kernzone', 'Fassadenseite Nord', 'Detailpunkt 4', 'Variante B'];
  let v = pick(rnd, fallbackPool);
  if (min !== undefined && v.length < min) v = v.padEnd(min, ' A');
  if (max !== undefined && v.length > max) v = v.slice(0, max);
  return v;
}

// ── §GENERISCHER SYNTHESIZER ─────────────────────────────────────────────

interface Ctx {
  rnd: () => number;
  cmdId: string;
  key: string;
  /** true = wir befinden uns nicht im obersten params-Objekt (für die
   * "nicht-leeres verschachteltes Objekt"-Regel unten). */
  nested: boolean;
}

function ptValue(rnd: () => number): { x: number; y: number } {
  return { x: rasterInt(rnd, 0, 24000, 100), y: rasterInt(rnd, 0, 24000, 100) };
}

/** Canvas- (KosmoVis) bzw. Papier-mm-Koordinaten (Publish) statt Welt-mm —
 * je nach Namensraum des Commands, s. `numericXY`. */
function xyRangeFor(cmdId: string): [number, number] {
  if (cmdId.startsWith('vis.')) return [-200, 1200];
  if (cmdId.startsWith('publish.')) return [0, 820];
  return [0, 24000];
}

function synthValue(schema: ZType, ctx: Ctx): unknown {
  const { rnd, key, cmdId } = ctx;
  // WICHTIG: `schema` kann hier noch in `.optional()`/`.default()`/`.prefault()`
  // gehüllt sein (synthObject reicht das ROHE Feld-Schema durch, `unwrap()`
  // wird dort nur für die required-Prüfung genutzt) — ohne diesen Schritt
  // bliebe `leaf.def.type` bei 'optional'/'default' hängen, der `switch`
  // unten träfe NIE einen Fall und läge in `default: return undefined`.
  const { schema: unwrapped } = unwrap(schema);
  const { schema: leaf0, nullable } = stripNullable(unwrapped);
  // Nullable-Feld: meistens einen echten Wert liefern, gelegentlich (25%)
  // bewusst null — beides ist beim Playbook-Beispiel plausibel («leer räumt
  // das Feld», s. z.B. `design.zonenRegelSetzen`/`design.fassadenModulZuweisen`).
  if (nullable && chance(rnd, 0.25)) return null;
  const leaf = leaf0 as any;
  const t = leaf?.def?.type;

  switch (t) {
    case 'string':
      return synthString(rnd, leaf, key, cmdId);
    case 'number':
      if (key === 'x' || key === 'y') {
        const [lo, hi] = xyRangeFor(cmdId);
        const b = numberBounds(leaf);
        const isInt = b.isInt;
        return isInt ? rasterInt(rnd, lo, hi, 10) : Math.round((lo + rnd() * (hi - lo)) * 10) / 10;
      }
      return sampleNumber(rnd, leaf, key, cmdId);
    case 'boolean':
      return chance(rnd, 0.5);
    case 'literal':
      return literalValue(leaf);
    case 'enum': {
      const opts = enumOptions(leaf)!;
      return pick(rnd, opts);
    }
    case 'object': {
      // PtSchema-artige {x,y}-Objekte (Welt-mm) erkennen wir generisch am
      // Shape (genau x/y bzw. x/y/z, beide/alle number) statt an einem
      // Klassennamen — `PtSchema` ist in design.ts/publish.ts je eine eigene
      // lokale Konstante, kein exportierter, gemeinsam identifizierbarer Typ.
      const shape = objectShape(leaf)!;
      const keys = Object.keys(shape);
      if ((keys.length === 2 && keys.includes('x') && keys.includes('y')) ||
          (keys.length === 3 && keys.includes('x') && keys.includes('y') && keys.includes('z'))) {
        const p = ptValue(rnd);
        if (keys.includes('z')) return { ...p, z: rasterInt(rnd, -3000, 15000, 100) };
        return p;
      }
      return synthObject(leaf, { ...ctx, nested: true });
    }
    case 'array': {
      const el = (leaf.def as any).element as ZType;
      const b = arrayBounds(leaf);
      const min = b.min ?? 0;
      const max = Math.max(min, Math.min(b.max ?? min + 3, min + 3));
      // z.array(z.unknown()) (design.katalogImportieren: vorlagen/fassadenModule/
      // kennzahlFormeln) bleibt ehrlich leer — der Generator erfindet keine
      // beliebig geformten Fremd-Objekte für einen Typ, den zod selbst nicht
      // beschreibt.
      const elType = (el as any)?.def?.type;
      if (elType === 'unknown' || elType === 'any') return [];
      const n = Math.max(min, rasterInt(rnd, min, max, 1));
      const out: unknown[] = [];
      for (let i = 0; i < n; i++) out.push(synthValue(el, { ...ctx, nested: true }));
      return out;
    }
    case 'record': {
      const valueType = (leaf.def as any).valueType as ZType;
      const n = rasterInt(rnd, 1, 2, 1);
      const out: Record<string, unknown> = {};
      const keyPool = key === 'materialPrioritaeten' ? MATERIAL_POOL : PORT_NAMEN;
      for (const k of pickSubset(rnd, keyPool, n, n)) out[k] = synthValue(valueType, { ...ctx, nested: true, key: k });
      return out;
    }
    case 'union': {
      const options = (leaf.def as any).options as ZType[];
      // `wert: z.union([z.string(), z.number()])` (design.eigenschaftSetzen)
      // wird per Nachbearbeitung (§KORRELATIONEN) an `feld` angepasst — hier
      // reicht eine plausible Grundauswahl.
      return synthValue(pick(rnd, options), ctx);
    }
    case 'unknown':
    case 'any':
      return {};
    default:
      return undefined;
  }
}

/** Füllt ein Objekt-Schema: Pflichtfelder immer, optionale Felder mit
 * variabler Wahrscheinlichkeit (mehr Varianz über die drei Beispiele pro
 * Command) — UND eine generische "kein leeres Unter-Objekt"-Regel: hat ein
 * (verschachteltes ODER Top-Level-)Objekt AUSSCHLIESSLICH optionale Felder,
 * wird mindestens eines trotzdem gesetzt (sonst wäre der Tool-Call oft ein
 * reiner Leerlauf-Aufruf ohne Trainingswert — z.B. `publish.plankopfSetzen`s
 * `patch`, das selbst nur optionale Unterfelder trägt). */
/** Optionale Felder, die NIE über den Wahrscheinlichkeits-Einschluss gesetzt
 * werden — `dataUrl`/`logoDataUrl` bleiben im leeren "kein Bild"-Zustand
 * (§Playbook: keine erfundenen Binärdaten), s. `DATA_URL_PLATZHALTER`. */
const NIE_OPTIONAL_EINSCHLIESSEN = new Set(['dataUrl', 'logoDataUrl']);

function synthObject(schema: ZType, ctx: Ctx): Record<string, unknown> {
  const shape = objectShape(schema)!;
  const out: Record<string, unknown> = {};
  const optionalKeys: string[] = [];
  const pInclude = 0.55 + ctx.rnd() * 0.3; // 0.55–0.85, variiert je Objekt-Instanz
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const required = isRequiredField(fieldSchema);
    if (!required) optionalKeys.push(key);
    if (required) {
      out[key] = synthValue(fieldSchema, { ...ctx, key });
    } else if (!NIE_OPTIONAL_EINSCHLIESSEN.has(key) && chance(ctx.rnd, pInclude)) {
      out[key] = synthValue(fieldSchema, { ...ctx, key });
    }
  }
  const erzwingbar = optionalKeys.filter((k) => !NIE_OPTIONAL_EINSCHLIESSEN.has(k));
  if (Object.keys(out).length === 0 && erzwingbar.length > 0) {
    const k = pick(ctx.rnd, erzwingbar);
    out[k] = synthValue(shape[k]!, { ...ctx, key: k });
  }
  return out;
}

// ── §KORRELATIONEN: die wenigen Business-Regeln, die NUR in `run()` stehen ──
// (kein `.refine()`/`.superRefine()` im ganzen Schema-Bestand, s. Kopfkommentar)
// — Nachbearbeitung NACH der generischen Synthese, VOR dem z.parse()-Beweis.

const POST_PROCESS: Record<string, (obj: Record<string, unknown>, rnd: () => number) => Record<string, unknown>> = {
  // "ZWEI Wege ... Genau einer der beiden Wege pro Aufruf" (design.ts:1748).
  'design.fassadenModulZuweisen': (o, rnd) => {
    if (chance(rnd, 0.5)) {
      delete o['storeyId'];
      delete o['richtung'];
      o['massId'] = idFor('volumen', rnd);
      o['kante'] = rasterInt(rnd, 1, 6, 1);
    } else {
      delete o['massId'];
      delete o['kante'];
      o['storeyId'] = idFor('geschoss', rnd);
      o['richtung'] = pick(rnd, ['sued', 'nord', 'west', 'ost']);
    }
    return o;
  },
  // "form «l» braucht den Eckpunkt «ecke»" (design.ts:1186).
  'design.treppeErstellen': (o, rnd) => {
    if (o['form'] === 'l') o['ecke'] = ptValue(rnd);
    else delete o['ecke'];
    return o;
  },
  // "Status «behoben» braucht ein Datum (behobenAm)" (design.ts:3082).
  'design.mangelStatusSetzen': (o, rnd) => {
    if (o['status'] === 'behoben') o['behobenAm'] = pick(rnd, DATUMS_POOL);
    else delete o['behobenAm'];
    return o;
  },
  // Dieselbe Regel für Kommentare (design.ts:3157).
  'design.kommentarStatusSetzen': (o, rnd) => {
    if (o['status'] === 'erledigt') o['erledigtAm'] = pick(rnd, DATUMS_POOL);
    else delete o['erledigtAm'];
    return o;
  },
  // "Ein Fensterband hat keinen Öffnungsflügel — swing ist nur bei
  // einfluegel/zweifluegel erlaubt" (design.ts:1464).
  'design.fensterParametrieren': (o) => {
    if (o['fensterTyp'] === 'fensterband') delete o['swing'];
    return o;
  },
  // Reale Katalog-Keys statt generischer Strings (derive/beschlag.ts).
  'design.beschlaegeSetzen': (o, rnd) => {
    o['beschlaege'] = pickSubset(rnd, BESCHLAG_KATALOG_KEYS, 1, 3);
    return o;
  },
  // `feld`/`wert` gehören zusammen — `wert` bekommt einen zum gewählten
  // `feld` passenden Typ/Wert statt eines beliebigen String-oder-Zahl-Wurfs.
  'design.eigenschaftSetzen': (o, rnd) => {
    const numerisch = new Set(['pitch', 'overhang', 'height', 'thickness', 'center', 'width', 'sill', 'anschlag']);
    const feld = o['feld'] as string;
    if (numerisch.has(feld)) {
      o['wert'] = feld === 'pitch' ? rasterInt(rnd, 15, 45, 1) : rasterInt(rnd, 80, 3000, 10);
    } else if (feld === 'sia') {
      o['wert'] = pick(rnd, ['HNF', 'NNF', 'VF', 'FF', 'KF']);
    } else if (feld === 'alignment') {
      o['wert'] = pick(rnd, ['zentrum', 'kern-aussen', 'kern-innen']);
    } else if (feld === 'fluegelTyp') {
      o['wert'] = pick(rnd, ['dreh', 'kipp', 'drehkipp', 'schiebe', 'fest']);
    } else if (feld === 'openingType') {
      o['wert'] = pick(rnd, ['fenster', 'tuer']);
    } else if (feld === 'swing') {
      o['wert'] = pick(rnd, ['links', 'rechts']);
    } else if (feld === 'name') {
      o['wert'] = pick(rnd, RAUM_NAMEN);
    } else if (feld === 'assemblyId') {
      o['wert'] = idFor('aufbau', rnd);
    } else {
      o['wert'] = pick(rnd, MATERIAL_POOL);
    }
    return o;
  },
  // z.unknown()-Arrays bleiben ehrlich leer (s. §GENERISCHER SYNTHESIZER) —
  // hier zusätzlich sichergestellt, falls die Felder überhaupt gewählt wurden.
  'design.katalogImportieren': (o) => {
    for (const k of ['vorlagen', 'fassadenModule', 'kennzahlFormeln']) {
      if (o[k]) o[k] = [];
    }
    return o;
  },
  // "mindestens eines" von neuerTyp/zielgroesseM2 (design.ts:3591) — die
  // generische "kein leeres Unter-Objekt"-Regel deckt das bereits ab
  // (`aenderung` hat nur optionale Felder), hier nur die Typ-Konsistenz.
  'design.einheitTypAktualisieren': (o) => o,
};

// ── §VERB-/SATZBAU: generischer Nutzerwunsch aus Titel + Feldern ───────────

interface VerbInfo {
  imperativ: string; // "Setze", "Erstelle", … — für die Imperativ-Vorlage (T1/T2)
  infinitiv: string; // "setzen", "erstellen", … — als GANZES Wort satzfinal (T3/T4);
  // bei trennbaren Verben steckt das Präfix schon im Infinitiv ("zuweisen"),
  // bei der Imperativ-Form wandert es ans Satzende (`objectTail`).
  objectTail?: string;
}

const VERB_TABLE: Record<string, VerbInfo> = {
  erstellen: { imperativ: 'Erstelle', infinitiv: 'erstellen' },
  zeichnen: { imperativ: 'Zeichne', infinitiv: 'zeichnen' },
  setzen: { imperativ: 'Setze', infinitiv: 'setzen' },
  ändern: { imperativ: 'Ändere', infinitiv: 'ändern' },
  entfernen: { imperativ: 'Entferne', infinitiv: 'entfernen' },
  löschen: { imperativ: 'Lösche', infinitiv: 'löschen' },
  speichern: { imperativ: 'Speichere', infinitiv: 'speichern' },
  importieren: { imperativ: 'Importiere', infinitiv: 'importieren' },
  stapeln: { imperativ: 'Staple', infinitiv: 'stapeln' },
  stanzen: { imperativ: 'Stanze', infinitiv: 'stanzen' },
  parametrieren: { imperativ: 'Parametriere', infinitiv: 'parametrieren' },
  bauen: { imperativ: 'Baue', infinitiv: 'bauen' },
  zuweisen: { imperativ: 'Weise', objectTail: 'zu', infinitiv: 'zuweisen' },
  segmentieren: { imperativ: 'Segmentiere', infinitiv: 'segmentieren' },
  generieren: { imperativ: 'Generiere', infinitiv: 'generieren' },
  umbenennen: { imperativ: 'Benenne', objectTail: 'um', infinitiv: 'umbenennen' },
  übernehmen: { imperativ: 'Übernimm', infinitiv: 'übernehmen' },
  absetzen: { imperativ: 'Setze', objectTail: 'ab', infinitiv: 'absetzen' },
  erfassen: { imperativ: 'Erfasse', infinitiv: 'erfassen' },
  platzieren: { imperativ: 'Platziere', infinitiv: 'platzieren' },
  aktualisieren: { imperativ: 'Aktualisiere', infinitiv: 'aktualisieren' },
  erzeugen: { imperativ: 'Erzeuge', infinitiv: 'erzeugen' },
  schieben: { imperativ: 'Schiebe', infinitiv: 'schieben' },
  extrudieren: { imperativ: 'Extrudiere', infinitiv: 'extrudieren' },
  verschieben: { imperativ: 'Verschiebe', infinitiv: 'verschieben' },
  verbinden: { imperativ: 'Verbinde', infinitiv: 'verbinden' },
  trennen: { imperativ: 'Trenne', infinitiv: 'trennen' },
  füllen: { imperativ: 'Fülle', infinitiv: 'füllen' },
  anpassen: { imperativ: 'Passe', objectTail: 'an', infinitiv: 'anpassen' },
};

function verbFor(title: string, rnd: () => number): VerbInfo {
  const clean = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (/ein-\/ausklappen$/.test(clean)) {
    return chance(rnd, 0.5)
      ? { imperativ: 'Klappe', objectTail: 'ein', infinitiv: 'einklappen' }
      : { imperativ: 'Klappe', objectTail: 'aus', infinitiv: 'ausklappen' };
  }
  const words = clean.split(/\s|\//).filter(Boolean);
  const last = words[words.length - 1]!.toLowerCase();
  if (VERB_TABLE[last]) return VERB_TABLE[last]!;
  return { imperativ: 'Führe', infinitiv: 'ausführen' };
}

function objectPhraseOf(title: string): string {
  const clean = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const words = clean.split(' ').filter(Boolean);
  const last = words[words.length - 1]!.toLowerCase();
  if (VERB_TABLE[last]) return words.slice(0, -1).join(' ');
  return clean; // "Kompliance-Fixes" — kein Trenn-Verb erkannt
}

// ── Feldnamen → menschenlesbares Label (Fallback: aus dem Feldnamen ableiten) ──

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

function renderCoarse(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'ja' : 'nein';
  if (typeof value === 'string') return `«${value}»`;
  if (value === null) return 'entfernt';
  if (Array.isArray(value)) return `${value.length} Eintr${value.length === 1 ? 'ag' : 'äge'}`;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('x' in v && 'y' in v) return `(${v['x']}/${v['y']})`;
    return `${Object.keys(v).length} Feld(er)`;
  }
  return String(value);
}

/** Kuratierte, natürlichere Formulierung je Feldname (überschreibt den
 * generischen Fallback für die häufigsten, wiederkehrenden Felder). `undefined`
 * bedeutet: Fallback nutzen. */
/** true, wenn `value` ein {x,y}-artiges Punktobjekt ist (statt z.B. einer
 * blossen Zahl — dasselbe Feldnamen-Kollisionsproblem wie im echten Schema:
 * `b` ist bei `design.wandZeichnen` ein Punkt, bei `design.stuetzeSetzen`
 * eine Zahl (Breite/Durchmesser mm) — Typprüfung statt Namens-Zauberei). */
function isPt(value: unknown): value is { x: number; y: number } {
  return typeof value === 'object' && value !== null && 'x' in (value as object) && 'y' in (value as object);
}

function fieldPhrase(key: string, value: unknown, cmdId: string): string {
  if (key.endsWith('Id') && ID_KIND[key] !== undefined) {
    return `${ID_KIND[key]} ${value}`;
  }
  if ((key === 'a' || key === 'b' || key === 'at' || key === 'ecke') && isPt(value)) {
    const p = value;
    if (key === 'a') return `von (${p.x}/${p.y})`;
    if (key === 'b') return `nach (${p.x}/${p.y})`;
    if (key === 'ecke') return `Eckpunkt (${p.x}/${p.y})`;
    return `bei (${p.x}/${p.y})`;
  }
  switch (key) {
    case 'storeyId': return `Geschoss ${value}`;
    case 'zoneId': return `Zone ${value}`;
    case 'wallId': return `Wand ${value}`;
    case 'entityId': return `Element ${value}`;
    case 'massId': return `Volumenkörper ${value}`;
    case 'openingId': return `Öffnung ${value}`;
    case 'sheetId': return `Blatt ${value}`;
    case 'graphId': return `Graph ${value}`;
    case 'nodeId': return `Node ${value}`;
    case 'outline': return `Umriss mit ${(value as unknown[]).length} Punkten`;
    case 'punkte': return `${(value as unknown[]).length} Stützpunkten`;
    case 'breite': case 'breiteMm': return `Breite ${value} mm`;
    case 'laenge': case 'laengeMm': return `Länge ${value} mm`;
    case 'hoehe': case 'hoeheMm': case 'height': return `Höhe ${value} mm`;
    case 'tiefe': return `Tiefe ${value} mm`;
    case 'dicke': case 'thickness': return `Dicke ${value} mm`;
    case 'width': return `Breite ${value} mm`;
    case 'center': return `Mitte bei ${value} mm`;
    case 'sill': return `Brüstung ${value} mm`;
    case 'pitch': return `Neigung ${value}°`;
    case 'overhang': return `Überstand ${value} mm`;
    case 'rotationGrad': return `Drehung ${value}°`;
    case 'name': return `namens «${value}»`;
    case 'typ': return `Typ «${value}»`;
    case 'material': return `Material «${value}»`;
    case 'status': return `Status «${value}»`;
    case 'text': return `Text «${value}»`;
    case 'x': return `X ${value}`;
    case 'y': return `Y ${value}`;
    case 'scale': return `Massstab 1:${value}`;
    case 'format': return `Format ${value}`;
    case 'anzahl': return `${value}×`;
    default:
      return `${humanizeKey(key)}: ${renderCoarse(value)}`;
  }
}

const SENTENCE_TEMPLATES: ((v: VerbInfo, obj: string, details: string) => string)[] = [
  (v, obj, details) => `${v.imperativ} ${obj}${details ? `, ${details}` : ''}${v.objectTail ? ` ${v.objectTail}` : ''}.`,
  (v, obj, details) => `Bitte ${v.imperativ.toLowerCase()} ${obj}${details ? `, ${details}` : ''}${v.objectTail ? ` ${v.objectTail}` : ''}.`,
  (v, obj, details) => `Kannst du ${obj}${details ? ` (${details})` : ''} ${v.infinitiv}?`,
  (v, obj, details) => `Ich möchte ${obj}${details ? `, ${details}` : ''} ${v.infinitiv}.`,
];

/** Generischer Nutzerwunsch aus Titel + gewählten Feldwerten. `omit` lässt ein
 * Pflichtfeld bewusst unerwähnt (Ablehn-/Diagnose-Zeilen, s. §ABLEHN). */
function buildGenericUserWish(cmd: Command<unknown>, params: Record<string, unknown>, rnd: () => number, omit: string[] = []): string {
  const verb = verbFor(cmd.title, rnd);
  const obj = objectPhraseOf(cmd.title).toLowerCase();
  const shape = objectShape(cmd.params as ZType) ?? {};
  const details = Object.keys(shape)
    .filter((k) => !omit.includes(k) && params[k] !== undefined)
    .map((k) => fieldPhrase(k, params[k], cmd.id))
    .join(', ');
  const tpl = pick(rnd, SENTENCE_TEMPLATES);
  const satz = tpl(verb, obj, details);
  return satz.charAt(0).toUpperCase() + satz.slice(1);
}

// ── §FLAGGSCHIFF-VORLAGEN: handformulierte, besonders natürliche Sätze für
// die am häufigsten genutzten Commands (Playbook: "Ein Nutzerwunsch, ein
// eindeutiges Ziel-Command" — je konkreter das Werkzeug im Alltag, desto mehr
// lohnt sich eine eigene Formulierung statt der generischen Feldliste). ──

type FlagshipFn = (p: Record<string, unknown>, rnd: () => number) => string;
const mm = (v: unknown) => `${v} mm`;
const m2 = (v: unknown) => `${((v as number) / 1000).toFixed(1)} m`;
const xy = (v: unknown) => { const p = v as { x: number; y: number }; return `${p.x}/${p.y}`; };

const FLAGSHIP: Record<string, FlagshipFn> = {
  'design.wandZeichnen': (p) =>
    `Zieh eine Wand von ${xy(p['a'])} nach ${xy(p['b'])} im Geschoss ${p['storeyId']}, Aufbau ${p['assemblyId']}.`,
  'design.oeffnungSetzen': (p) =>
    `Setz ${p['openingType'] === 'tuer' ? 'eine Tür' : 'ein Fenster'} in Wand ${p['wallId']}, ${p['width']}×${p['height']} mm, ${p['center']} mm ab Wandanfang.`,
  'design.zoneErstellen': (p) =>
    `Zeichne eine Zone «${p['name']}» (${p['sia']}) im Geschoss ${p['storeyId']} mit ${(p['outline'] as unknown[]).length} Eckpunkten.`,
  'design.geschossErstellen': (p) =>
    `Leg ein neues Geschoss «${p['name']}» an, Index ${p['index']}, OK Boden ${mm(p['elevation'])}.`,
  'design.dachErstellen': (p) =>
    `Setz ein ${p['form'] === 'sattel' ? 'Satteldach' : 'Walmdach'} über das Geschoss ${p['storeyId']}, Neigung ${p['pitch']}°.`,
  'design.treppeErstellen': (p) =>
    `Zeichne eine Treppe von ${xy(p['a'])} nach ${xy(p['b'])} im Geschoss ${p['storeyId']}, ${p['width']} mm breit${p['form'] && p['form'] !== 'gerade' ? `, Form ${p['form']}` : ''}.`,
  'design.stuetzeSetzen': (p) =>
    `Setz eine Stütze (${p['profil']}) bei ${xy(p['at'])} im Geschoss ${p['storeyId']}, ${p['material']}.`,
  'design.unterzugZeichnen': (p) =>
    `Zieh einen Unterzug von ${xy(p['a'])} nach ${xy(p['b'])}, ${p['breite']}×${p['hoehe']} mm.`,
  'design.moebelSetzen': (p) =>
    `Stell ein ${p['typ']} bei ${xy(p['at'])} ins Geschoss ${p['storeyId']} auf.`,
  'design.deckeZeichnen': (p) =>
    `Zeichne eine Decke im Geschoss ${p['storeyId']}, Dicke ${mm(p['thickness'])}, ${(p['outline'] as unknown[]).length} Eckpunkte.`,
  'design.volumenErstellen': (p) =>
    `Erstell einen Volumenkörper im Geschoss ${p['storeyId']}, Höhe ${mm(p['height'])}${p['program'] ? `, Nutzung «${p['program']}»` : ''}.`,
  'design.verschieben': (p) =>
    `Verschieb Element ${p['entityId']} um ${p['dx']}/${p['dy']} mm.`,
  'design.loeschen': (p) => `Lösch das Element ${p['entityId']}.`,
  'design.eigenschaftSetzen': (p) => `Ändere bei Element ${p['entityId']} das Feld «${p['feld']}» auf ${p['wert']}.`,
  'design.mangelErfassen': (p) =>
    `Erfasse einen Mangel: ${p['ort']}, «${p['beschreibung']}» (Gewerk ${p['gewerk']}), erfasst am ${p['erfasstAm']}.`,
  'design.kommentarSetzen': (p) =>
    `Setz einen Kommentar von ${p['autor']}: «${p['text']}» bei ${xy(p['at'])}, vom ${p['erstelltAm']}.`,
  'design.massKetteSetzen': (p) =>
    `Miss eine Kette über ${(p['punkte'] as unknown[]).length} Punkte im Geschoss ${p['storeyId']}.`,
  'publish.blattErstellen': (p) =>
    `Leg ein neues Planblatt «${p['name']}» an, Format ${p['format']}, ${p['orientation']}.`,
  'publish.ansichtPlatzieren': (p) =>
    `Platzier ${p['view'] === 'schnitt' ? 'den Schnitt' : p['view'] === 'axo' ? 'die Axonometrie' : p['view'] === 'situationsplan' ? 'den Situationsplan' : 'den Grundriss'} auf Blatt ${p['sheetId']}, Massstab 1:${p['scale']}, bei ${xy({ x: p['x'], y: p['y'] })}.`,
  'publish.textSetzen': (p) =>
    `Setz auf Blatt ${p['sheetId']} den Text «${p['text']}».`,
  'publish.bildPlatzieren': (p) =>
    `Platzier einen Bild-Slot auf Blatt ${p['sheetId']}, Breite ${mm(p['w'])}.`,
  'publish.revisionErfassen': (p) =>
    `Erfasse auf Blatt ${p['sheetId']} eine Revision: «${p['text']}», ${p['datum']}.`,
  'vis.graphErstellen': (p) => `Leg einen neuen Render-Graphen «${p['name']}» an.`,
  'vis.nodeSetzen': (p) => `Setz einen ${p['typ']}-Node in Graph ${p['graphId']} bei (${p['x']}/${p['y']}).`,
  'vis.verbinden': (p) => `Verbinde in Graph ${p['graphId']} den Ausgang «${p['fromPort']}» von ${p['from']} mit dem Eingang «${p['toPort']}» von ${p['to']}.`,
  'design.raumTypSetzen': (p) => `Setz den Raumtyp von Zone ${p['zoneId']} auf «${p['raumTyp']}».`,
  'design.aufbauErstellen': (p) => `Leg einen Aufbau «${p['name']}» an (${p['target']}), ${(p['layers'] as unknown[]).length} Schichten.`,
  // Eigene Vorlage statt generischem Renderer: `collapsed` bestimmt allein
  // ein/aus — der generische Renderer könnte hier über den separablen
  // Titel-Zusatz ("ein-/ausklappen") einen zweiten, unabhängig gewürfelten
  // Zustand einführen, der dem echten `collapsed`-Wert widerspricht.
  'vis.nodeKollabieren': (p) =>
    `Klapp Node ${p['nodeId']} in Graph ${p['graphId']} ${p['collapsed'] ? 'ein' : 'aus'}.`,
};

// ── §ABLEHN: ehrliche Rückfrage bei fehlendem Pflichtfeld ────────────────

function ablehnAntwort(cmd: Command<unknown>, missingKey: string): string {
  const label = fieldPhrase(missingKey, '…', cmd.id).replace(/[:«»]/g, '').replace(/\s*…\s*$/, '').trim();
  const woertlich = humanizeKey(missingKey);
  return (
    `Dafür fehlt mir noch eine Angabe: ${label || woertlich} (Feld «${missingKey}»). ` +
    `Ohne diesen Wert kann ich «${cmd.title}» nicht sauber aufrufen — ich erfinde ihn nicht, sag mir kurz ${woertlich}.`
  );
}

// ── Haupt-Generierung ────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'Du bist Kosmo, die Zeichner-KI von ArchitekturKosmos. Du bedienst die Software über Werkzeugaufrufe.';

interface SftZeile {
  messages: [
    { role: 'system'; content: string },
    { role: 'user'; content: string },
    { role: 'assistant'; content: string },
  ];
  meta: {
    id: string;
    adapter: 'kosmo-zeichner-commands';
    quelle: string;
    visibility: 'public';
    qualitaet: { checksBestanden: boolean; hinweise: string[] };
  };
}

const rnd = mulberry32(SEED);
const cmds = allCommands().slice().sort((a, b) => a.id.localeCompare(b.id));
// Cross-Check: jeder Command hat ein Kosmo-Tool mit demselben, echten
// Namens-Muster (`toolNameFor`) — dieselbe Registry, zwei Aufrufer.
const toolDefs = commandTools();
const toolNames = new Set(toolDefs.map((t) => t.name));

const EXAMPLES_PER_COMMAND = 3;
const rows: SftZeile[] = [];
const idCounter = new Map<string, number>();
function nextRowId(cmdId: string): string {
  const n = (idCounter.get(cmdId) ?? 0) + 1;
  idCounter.set(cmdId, n);
  return `cmdbsp-${cmdId}-${String(n).padStart(2, '0')}`;
}

const stats = {
  gesamt: 0,
  valide: 0,
  ablehn: 0,
  parseVersuche: 0,
  parseFehlschlaege: 0,
  jeNamensraum: new Map<string, number>(),
};

function namensraum(cmdId: string): string {
  return cmdId.split('.')[0] ?? 'sonstige';
}

function zaehleNamensraum(cmdId: string): void {
  const ns = namensraum(cmdId);
  stats.jeNamensraum.set(ns, (stats.jeNamensraum.get(ns) ?? 0) + 1);
}

/** Erzeugt EINEN validen Parametersatz für `cmd` (generisch synthetisiert +
 * Business-Regel-Nachbearbeitung), mit begrenzten Wiederholversuchen als
 * reines Sicherheitsnetz — die generische Synthese hält sich bereits an jedes
 * min/max/enum/regex-Constraint, ein Fehlschlag wäre ein Zeichen für eine
 * unbekannte Schema-Form und wird dann LAUT gemeldet statt still verworfen. */
function generiereValideParams(cmd: Command<unknown>, seedRnd: () => number): Record<string, unknown> {
  const MAX_VERSUCHE = 20;
  let letzterFehler: unknown;
  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    stats.parseVersuche++;
    let obj = synthObject(cmd.params as ZType, { rnd: seedRnd, cmdId: cmd.id, key: '', nested: false });
    const post = POST_PROCESS[cmd.id];
    if (post) obj = post(obj, seedRnd);
    const parsed = (cmd.params as z.ZodType).safeParse(obj);
    if (parsed.success) return parsed.data as Record<string, unknown>;
    letzterFehler = parsed.error;
    stats.parseFehlschlaege++;
  }
  throw new Error(
    `generiere-commands-sft: konnte für ${cmd.id} nach ${MAX_VERSUCHE} Versuchen keine gültigen Parameter erzeugen: ${String(letzterFehler)}`,
  );
}

for (const cmd of cmds) {
  const toolName = toolNameFor(cmd.id);
  if (!toolNames.has(toolName)) {
    throw new Error(`generiere-commands-sft: ${cmd.id} → ${toolName} fehlt in commandTools() — Registry-Diskrepanz`);
  }
  for (let i = 0; i < EXAMPLES_PER_COMMAND; i++) {
    const params = generiereValideParams(cmd, rnd);
    const flagship = FLAGSHIP[cmd.id];
    const userWish = flagship ? flagship(params, rnd) : buildGenericUserWish(cmd, params, rnd);
    const assistantJson = JSON.stringify({ tool: toolName, parameters: params });
    rows.push({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userWish },
        { role: 'assistant', content: assistantJson },
      ],
      meta: {
        id: nextRowId(cmd.id),
        adapter: 'kosmo-zeichner-commands',
        quelle: `command:${cmd.id}`,
        visibility: 'public',
        qualitaet: { checksBestanden: true, hinweise: [] },
      },
    });
    stats.valide++;
    stats.gesamt++;
    zaehleNamensraum(cmd.id);
  }
  // Ablehn-Kandidaten werden weiter unten (nach der Hauptschleife) über eine
  // deterministische Ziehung ausgewählt, damit die 10–15%-Zielquote über die
  // GESAMTE Datei (nicht pro Command) eingehalten wird — s. §ABLEHN-ZIEHUNG.
}

// ── §ABLEHN-ZIEHUNG: deterministische Auswahl über alle Commands ──────────
// Ziel ~13% der Gesamtzeilen (Vorgabe 10–15%, s. V083-SPEZ §7/§12 C-15).

const validTotal = stats.valide;
const zielAblehn = Math.round((0.13 / (1 - 0.13)) * validTotal);
const eligible = cmds.filter((c) => {
  const shape = objectShape(c.params as ZType) ?? {};
  return Object.values(shape).some((s) => isRequiredField(s));
});
const gezogene = shuffled(rnd, eligible).slice(0, Math.min(zielAblehn, eligible.length));

for (const cmd of gezogene) {
  const shape = objectShape(cmd.params as ZType) ?? {};
  const requiredKeys = Object.entries(shape)
    .filter(([, s]) => isRequiredField(s))
    .map(([k]) => k);
  const missing = pick(rnd, requiredKeys);
  const params = generiereValideParams(cmd, rnd);
  const userWish = buildGenericUserWish(cmd, params, rnd, [missing]);
  const antwort = ablehnAntwort(cmd, missing);
  rows.push({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userWish },
      { role: 'assistant', content: antwort },
    ],
    meta: {
      id: nextRowId(cmd.id),
      adapter: 'kosmo-zeichner-commands',
      quelle: `command:${cmd.id}`,
      visibility: 'public',
      qualitaet: {
        checksBestanden: true,
        hinweise: [`Pflichtfeld «${missing}» fehlt im Nutzerwunsch — ehrliche Rückfrage statt erfundenem Wert.`],
      },
    },
  });
  stats.ablehn++;
  stats.gesamt++;
  zaehleNamensraum(cmd.id);
}

// Zeilen nach meta.id sortieren — deterministisch unabhängig von der
// Ziehungsreihenfolge, gut lesbare Datei (alle Zeilen eines Commands
// hintereinander).
rows.sort((a, b) => a.meta.id.localeCompare(b.meta.id));

// ── Schreiben ──────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ? resolve(process.cwd(), args.out) : resolve(ZIEL_ORDNER, 'commands-v1.jsonl');
const statsPath = args.out ? outPath.replace(/\.jsonl$/, '.stats.md') : resolve(ZIEL_ORDNER, 'commands-v1.stats.md');

mkdirSync(dirname(outPath), { recursive: true });
const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
writeFileSync(outPath, jsonl, 'utf8');

const nachNamensraum = [...stats.jeNamensraum.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const ablehnQuote = ((stats.ablehn / stats.gesamt) * 100).toFixed(1);

const statsMd = `# commands-v1.jsonl — Statistikbericht

Erzeugt von \`tools/training/generiere-commands-sft.mts\` (Seed \`0x${SEED.toString(16)}\`,
\`docs/V083-SPEZ.md\` §7/§12 C-15/C-16). Deterministisch — zwei Läufe erzeugen
eine byte-identische Datei (Doppellauf-Beweis im P4-Abschlussbericht). Quelle:
\`allCommands()\` (\`@kosmo/kernel\`) LIVE zum Bau-Zeitpunkt — **${cmds.length} Commands**
im aktuellen Repo-Stand (inkl. \`design.kommentar*\`/\`design.massKette*\`, E1/E2 aus
parallelen Paketen dieser Version).

## Zeilen gesamt

**${stats.gesamt} Zeilen** in \`commands-v1.jsonl\` — ${stats.valide} valide Tool-Call-Beispiele
(${EXAMPLES_PER_COMMAND} je Command) + ${stats.ablehn} Ablehn-/Diagnose-Zeilen (**${ablehnQuote}%**, Ziel 10–15%).

## Zeilen je Namensraum (Command-Kategorie)

| Namensraum | Zeilen |
|---|---|
${nachNamensraum.map(([ns, n]) => `| \`${ns}.*\` | ${n} |`).join('\n')}

## Ablehn-/Diagnose-Fälle

Jede Ablehn-Zeile lässt GENAU EIN echtes Pflichtfeld eines echten Commands im
Nutzerwunsch unerwähnt; die Assistant-Antwort ist eine ehrliche Rückfrage
(kein Tool-Call-JSON) statt eines erfundenen Werts — dieselbe Disziplin wie
beim Grundriss-Generator ("kein Layout erfunden"), hier aufs Tool-Calling
übertragen. Playbook-Nie-Regel beachtet: keine künstlich mehrdeutigen Prompts
zwischen zwei Commands — die einzige Ablehn-Form ist ein aus dem echten Schema
selbst ableitbares fehlendes Pflichtfeld, tied via \`meta.quelle: command:<id>\`
an genau das Command, das die Rückfrage auslöst.

**${stats.ablehn} von ${stats.gesamt} Zeilen (${ablehnQuote}%).**

## Generische Synthese — Qualitätsbeweis

- **z.parse()-Beweis je valider Zeile**: \`generiereValideParams()\` ruft
  \`cmd.params.safeParse()\` auf dem tatsächlich erzeugten Objekt auf, bevor die
  Zeile in \`rows\` landet — ${stats.parseVersuche} Versuche gesamt,
  ${stats.parseFehlschlaege} Fehlschläge (Sicherheitsnetz-Retries, kein einziger
  Command scheiterte nach ${20} Versuchen endgültig).
- **Keine Schema-Erfindung**: der Synthesizer liest ausschliesslich
  \`schema.def\` (Typ, \`checks\` für min/max/regex, \`enum\`-Optionen, \`shape\`) —
  kein Feld wird "dazu-halluziniert".
- **Reale Tool-Namen**: \`toolNameFor(commandId)\` (Punkt→Unterstrich), gegen
  \`commandTools()\` gegengeprüft — jede Zeile ruft ein Tool auf, das real in
  Kosmos Werkzeug-Registry existiert.
`;

writeFileSync(statsPath, statsMd, 'utf8');

console.log(`${rows.length} Zeilen geschrieben nach ${outPath}`);
console.log(`Statistik geschrieben nach ${statsPath}`);
console.log(`Commands: ${cmds.length}, valide Zeilen: ${stats.valide}, Ablehn-Zeilen: ${stats.ablehn} (${ablehnQuote}%)`);
