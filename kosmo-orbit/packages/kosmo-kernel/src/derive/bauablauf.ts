import type { KosmoDoc } from '../model/doc';
import { defaultBauablaufKennwerte, type BauablaufKennwerte } from '../model/doc';
import type { Assembly, Opening, Roof, Slab, Storey, Wall } from '../model/entities';
import { assemblyThickness } from '../geometry/wall';
import { areaOf } from './sia416';
import { deriveMengen } from './mengen';
import { deriveBerechnungsliste } from './berechnungsliste';

/**
 * Bauablaufplan-Grundgerüst (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 4, Owner-Hauptaufgabe K22) — ein **abgeleiteter
 * Grob-Terminplan**, gebaut nach demselben Muster wie
 * `derive/kostenschaetzung.ts`: reine Funktion (kein `Date.now()`/
 * `Math.random()`), gleiche Eingaben liefern exakt dasselbe Ergebnis
 * (Golden-Test-fähig für den SVG-Export in `derive/bauablaufblatt.ts`).
 *
 * AUSDRÜCKLICH ein Richtwert: `BAUABLAUF_HINWEIS` — «Abgeleiteter
 * Grob-Terminplan, ersetzt keine Bauleitung.» Wochen sind relativ (Woche
 * 1..n), KEIN Kalenderbezug — die App entscheidet, ob/wie sie ein Startdatum
 * daraufsetzt, der Kernel selbst rechnet nie mit echten Daten.
 *
 * Feste Schweizer Gewerke-Reihenfolge:
 *   Aushub → Fundament/Bodenplatte → Rohbau Geschoss für Geschoss (aus der
 *   Storey-Anzahl!) → Dach → Fenster/Hülle dicht → Innenausbau-Gewerke
 *   (überlappen parallel) → Umgebung → Abnahme.
 *
 * Dauern sind eine Funktion ECHTER Mengen aus der Geometrie (m³ Wand-/
 * Deckenvolumen, m² Dach-/Fensterfläche, m² Geschossfläche) geteilt durch
 * konfigurierbare Leistungswerte (`BauablaufKennwerte`, additives
 * Settings-Feld analog `kvKennwerte` — jeder Wert eine Annahme
 * Owner-Guideline, kein verbindlicher Wert). Fundament/Rohbau nutzen dieselbe
 * Wand-/Deckenformel wie `derive/mengen.ts` (Achslänge×Höhe−Öffnungen für
 * Wände, Fläche×Dicke für Decken), hier je Geschoss statt über das ganze
 * Projekt aggregiert, weil `deriveMengen` bewusst nach Aufbau/Material
 * gruppiert und keine Geschoss-Zuordnung führt. Dach/Fenster-Hülle nutzen die
 * Fensterflächen-Position direkt aus `deriveMengen`.
 */

const M3 = 1_000_000_000;

/** Der eine Ehrlichkeitssatz, der überall erscheinen muss, wo der Terminplan sichtbar wird (Panel, Blatt). */
export const BAUABLAUF_HINWEIS = 'Abgeleiteter Grob-Terminplan, ersetzt keine Bauleitung.';

/**
 * Gewerke-Vorschlagsliste fürs Mangel-Erfassungsformular (v0.6.3, Lücken-
 * Batch 5) — dieselbe Schweizer Gewerke-Reihenfolge wie oben, generisch ohne
 * Geschossbezug («Rohbau» statt «Rohbau EG»). NUR ein Vorschlag: `gewerk` auf
 * `Mangel` bleibt ein freies Feld, jeder Text ist gültig (s. Kommentar bei
 * `Mangel` in `model/entities.ts`). Bestimmt zugleich die Gruppen-Reihenfolge
 * im Abnahmeprotokoll (`derive/abnahmeprotokoll.ts`) — unbekannte Gewerke
 * landen dort alphabetisch nach dieser Liste.
 */
export const MANGEL_GEWERK_VORSCHLAEGE: readonly string[] = [
  'Aushub',
  'Fundament/Bodenplatte',
  'Rohbau',
  'Dach',
  'Fenster/Hülle',
  'Elektro',
  'Sanitär/Heizung',
  'Trockenbau/Gipser',
  'Bodenbeläge',
  'Maler',
  'Umgebung',
];

export interface BauablaufPhase {
  /** Stabile Kennung (z.B. `rohbau:<storeyId>`, `innenausbau:elektro`). */
  id: string;
  /** Anzeigename des Gewerks. */
  gewerk: string;
  /** Start relativ, Woche 1 = Projektbeginn (inklusiv). */
  startWoche: number;
  /** Ende relativ, inklusiv. */
  endWoche: number;
  dauerWochen: number;
  /** true = Innenausbau-Gewerk, läuft parallel zu den anderen (überlappt), statt seriell zu folgen. */
  parallel: boolean;
}

export interface Bauablauf {
  /** Leer, wenn das Doc keine Geschosse hat — ehrliche Leermeldung statt eines erfundenen Plans. */
  phasen: BauablaufPhase[];
  /** Länge des gesamten Plans in Wochen (0, wenn `phasen` leer ist). */
  gesamtWochen: number;
  /** Die tatsächlich verwendeten Kennwerte (nach Overrides). */
  kennwerte: BauablaufKennwerte;
}

function wallHeight(doc: KosmoDoc, w: Wall): number {
  if (w.heightMode === 'fix' && w.height) return w.height;
  const s = doc.get<Storey>(w.storeyId);
  return s ? s.height : 3000;
}

/** Wandvolumen (m³) eines einzelnen Geschosses — gleiche Formel wie `deriveMengen`, hier je Storey statt je Aufbau. */
function wandVolumenJeGeschoss(doc: KosmoDoc, storeyId: string): number {
  let volumen = 0;
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const asm = doc.get<Assembly>(w.assemblyId);
    const dicke = asm && asm.kind === 'assembly' ? assemblyThickness(asm) : 200;
    const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
    const h = wallHeight(doc, w);
    let oeffnungen = 0;
    for (const o of doc.openingsOf(w.id) as Opening[]) oeffnungen += o.width * o.height;
    const flaeche = len * h - oeffnungen;
    volumen += (flaeche * dicke) / M3;
  }
  return volumen;
}

/** Decken eines einzelnen Geschosses — Fläche + Volumen (Fläche × Dicke). */
function deckeJeGeschoss(doc: KosmoDoc, storeyId: string): { flaeche: number; volumen: number } {
  let flaeche = 0;
  let volumen = 0;
  for (const s of doc.byKind<Slab>('slab')) {
    if (s.storeyId !== storeyId) continue;
    const a = areaOf(s.outline);
    flaeche += a;
    volumen += (a * s.thickness) / M3;
  }
  return { flaeche, volumen };
}

/** Wochen aus Menge/Leistungswert, immer mind. `minDauer` (nie ein 0-Wochen-Balken). */
function wochen(menge: number, proWoche: number, minDauer: number): number {
  if (proWoche <= 0) return minDauer;
  return Math.max(minDauer, Math.ceil(menge / proWoche));
}

/**
 * Leitet den Grob-Terminplan aus dem Doc ab. `overrides` ersetzt einzelne
 * Kennwerte für EINEN Aufruf (Live-Vorschau im Panel) — ändert
 * `doc.settings` selbst nicht.
 *
 * Leer (`phasen: []`), wenn das Doc keine Geschosse hat — ohne Storeys gibt
 * es weder «Rohbau Geschoss für Geschoss» noch eine sinnvolle Aushub-/
 * Fundamentfläche.
 */
export function deriveBauablauf(doc: KosmoDoc, overrides?: Partial<BauablaufKennwerte>): Bauablauf {
  const basis = doc.settings.bauablaufKennwerte ?? defaultBauablaufKennwerte;
  const kennwerte: BauablaufKennwerte = { ...basis, ...overrides };

  const storeys = doc.storeysOrdered();
  if (storeys.length === 0) {
    return { phasen: [], gesamtWochen: 0, kennwerte };
  }

  const phasen: BauablaufPhase[] = [];
  let woche = 1;

  function push(id: string, gewerk: string, dauerWochen: number, parallel = false): BauablaufPhase {
    const startWoche = woche;
    const endWoche = startWoche + dauerWochen - 1;
    const phase: BauablaufPhase = { id, gewerk, startWoche, endWoche, dauerWochen, parallel };
    phasen.push(phase);
    if (!parallel) woche = endWoche + 1;
    return phase;
  }

  // 1) Aushub + 2) Fundament/Bodenplatte — Fläche/Volumen der untersten
  // Geschossdecke (die Bodenplatte liegt auf dem untersten Geschoss).
  const grundGeschoss = storeys[0]!;
  const boden = deckeJeGeschoss(doc, grundGeschoss.id);
  push('aushub', 'Aushub', wochen(boden.flaeche, kennwerte.m2AushubProWoche, kennwerte.minDauerWochen));
  push(
    'fundament',
    'Fundament/Bodenplatte',
    wochen(boden.volumen, kennwerte.m3RohbauProWoche, kennwerte.minDauerWochen),
  );

  // 3) Rohbau Geschoss für Geschoss (aus der Storey-Anzahl!) — Wände jedes
  // Geschosses + dessen Decke, AUSSER beim untersten Geschoss (dessen Decke
  // ist bereits die Bodenplatte oben).
  storeys.forEach((s, i) => {
    const wandVolumen = wandVolumenJeGeschoss(doc, s.id);
    const deckenVolumen = i === 0 ? 0 : deckeJeGeschoss(doc, s.id).volumen;
    const volumen = wandVolumen + deckenVolumen;
    push(`rohbau:${s.id}`, `Rohbau ${s.name}`, wochen(volumen, kennwerte.m3RohbauProWoche, kennwerte.minDauerWochen));
  });

  // 4) Dach — Grundrissfläche aller Dach-Entitäten (ohne Abwicklung, wie `deriveMengen`).
  const dachFlaeche = doc.byKind<Roof>('roof').reduce((a, r) => a + areaOf(r.outline), 0);
  push('dach', 'Dach', wochen(dachFlaeche, kennwerte.m2DachProWoche, kennwerte.minDauerWochen));

  // 5) Fenster/Hülle dicht — Fenster-/Türfläche direkt aus `deriveMengen`.
  const mengen = deriveMengen(doc);
  const huelleFlaeche = mengen.positionen
    .filter((p) => p.kind === 'opening:fenster' || p.kind === 'opening:tuer')
    .reduce((a, p) => a + (p.flaeche ?? 0), 0);
  push('huelle', 'Fenster/Hülle dicht', wochen(huelleFlaeche, kennwerte.m2HuelleProWoche, kennwerte.minDauerWochen));

  // 6) Innenausbau-Gewerke — überlappen parallel, Basis: Geschossfläche (GF)
  // aus der Berechnungsliste (dieselbe Fläche, die auch die KV-Grobschätzung
  // nutzt).
  const { totalGf } = deriveBerechnungsliste(doc);
  const innenausbauStart = woche;
  const innenausbauGewerke: readonly [string, string, number][] = [
    ['elektro', 'Elektro', kennwerte.m2ElektroProWoche],
    ['sanitaerHeizung', 'Sanitär/Heizung', kennwerte.m2SanitaerHeizungProWoche],
    ['trockenbau', 'Trockenbau/Gipser', kennwerte.m2TrockenbauProWoche],
    ['bodenbelaege', 'Bodenbeläge', kennwerte.m2BodenbelaegeProWoche],
    ['maler', 'Maler', kennwerte.m2MalerProWoche],
  ];
  let innenausbauEnde = innenausbauStart - 1;
  for (const [id, name, proWoche] of innenausbauGewerke) {
    const dauer = wochen(totalGf, proWoche, kennwerte.minDauerWochen);
    const phase = push(`innenausbau:${id}`, name, dauer, true);
    innenausbauEnde = Math.max(innenausbauEnde, phase.endWoche);
  }
  woche = innenausbauEnde + 1;

  // 7) Umgebung — Parzellenfläche minus Fussabdruck (Näherung: GF/Anzahl
  // Geschosse), sonst der Fussabdruck selbst (Annahme bei unbekannter Parzelle).
  const fussabdruck = totalGf / storeys.length;
  const umgebungFlaeche =
    doc.settings.parzellenFlaeche != null
      ? Math.max(doc.settings.parzellenFlaeche - fussabdruck, 0)
      : fussabdruck;
  push('umgebung', 'Umgebung', wochen(umgebungFlaeche, kennwerte.m2UmgebungProWoche, kennwerte.minDauerWochen));

  // 8) Abnahme — fixe Dauer, kein Mengenbezug (ein Termin, kein Bauvolumen).
  push('abnahme', 'Abnahme', Math.max(kennwerte.minDauerWochen, kennwerte.abnahmeWochen));

  const gesamtWochen = phasen.reduce((a, p) => Math.max(a, p.endWoche), 0);
  return { phasen, kennwerte, gesamtWochen };
}
