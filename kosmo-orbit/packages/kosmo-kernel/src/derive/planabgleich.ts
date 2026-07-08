import type { Pt } from '../model/units';
import { dist, pt } from '../model/units';
import type { PlanGraphic } from './plan';
import type { DxfGraphic } from '../dxf/import';
import { semantikFuerLayer } from '../dxf/import';

/**
 * Plan-Abgleich (V1.6 Block C / C3, Entscheid C-E3 in
 * `docs/SUBMISSION-KONZEPT.md`) — die Diff-Engine Architektenplan ↔
 * Unternehmerplan. Reine Ableitung: kein DOM, kein `KosmoDoc`-Zugriff, keine
 * Mutation der Eingaben. Eingaben sind zwei bereits abgeleitete
 * Geometriemengen — Architektenseite `PlanGraphic` (aus `derivePlan`),
 * Unternehmerseite `DxfGraphic` (aus `dxf/import.ts`) — normalisiert auf
 * Segmentmengen je semantischer Klasse.
 *
 * Ablauf: (1) Normalisierung beider Seiten zu Liniensegmenten mit Klasse,
 * (2) optionale Nullpunkt-Ausrichtung (nur Translation, KEINE Rotation —
 * ehrlich als Hinweis), (3) klassengetrenntes, deterministisches Matching
 * (exakt → verschoben → Rest), (4) Text-Abgleich nach Position.
 *
 * Ehrliche Grenzen: Bögen (Türschwenke, Rundungen) werden NICHT verglichen —
 * weder `plan.arcs` noch `dxf.arcs` fliessen in die Segmentmenge ein (reine
 * Liniengeometrie, wie im Konzept spezifiziert). Rotation wird nie
 * geschätzt — ein gedrehter Unternehmerplan bleibt ein Hinweis auf
 * manuelles Einpassen (2 Referenzpunkte), kein automatischer Fix. Eigene
 * Aussparungssymbole des Architekten (Klasse `symbol`, s.u.) und
 * Unternehmer-Geometrie auf Layern wie `DURCHBRUCH` (Klasse `aussparung`)
 * landen aus Vokabular-Gründen in unterschiedlichen Klassen-Töpfen — eine
 * bereits im Architektenplan vorgesehene Aussparung wird deshalb, selbst
 * wenn sie geometrisch übereinstimmt, als 'neu' markiert statt als
 * unverändert erkannt zu werden. Kosmo markiert das sichtbar (Stufe-2 in
 * C-E4), verschweigt es nicht.
 */

export interface AbgleichBefund {
  art: 'verschoben' | 'neu' | 'entfernt' | 'text-geaendert';
  klasse: string; // semantische Klasse oder 'unklassiert'
  layer?: string; // Unternehmer-Layer (Herkunft), wo vorhanden
  segment?: { a: Pt; b: Pt }; // Ort des Befunds
  delta?: Pt; // nur bei 'verschoben' (Unternehmer − Architekt)
  text?: { alt: string; neu: string; at: Pt }; // nur bei text-geaendert
  konfidenz: number; // 0..1
}

export interface PlanAbgleich {
  befunde: AbgleichBefund[];
  unveraendert: number; // Anzahl gematchter identischer Segmente
  ausrichtung: { dx: number; dy: number; geschaetzt: boolean };
  hinweise: string[]; // ehrliche Grenzen
}

/** Winkeltoleranz für „gleiche Richtung, ungerichtet" — 0.5° in rad. */
const WINKEL_TOL_RAD = (0.5 * Math.PI) / 180;

/**
 * Semantische Klassen-Priorität der Architektenseite, aus der
 * LAYER_REGELN-Semantik von `dxf/export.ts` abgeleitet (Reihenfolge =
 * Priorität, erste passende Klasse in `classes` gewinnt). `bemassung` wird
 * — wie im Export (`layerFuer`) — VOR dieser Liste geprüft und gewinnt
 * immer.
 *
 * Bewusst KEIN eigener `aussparung`-Eintrag: `plan.ts` markiert eigene
 * Aussparungssymbole mit `['symbol', 'aussparung']`, aber `layerFuer`
 * (Export) kennt `aussparung` nicht als Treffer — solche Linien landen auf
 * Layer SYMBOLE und kommen beim Re-Import als Klasse `symbol` zurück. Ein
 * eigener Eintrag hier würde die Architektenseite in einen Topf sortieren,
 * den ihr eigener Export-Roundtrip nie erreicht (falscher 'entfernt'-Befund
 * bei Identität). Unternehmer-Layer `DURCHBRUCH`/`AUSSPARUNG`
 * (`semantikFuerLayer` → 'aussparung') bleiben deshalb strukturell ohne
 * Architekten-Gegenstück — eine ehrliche Lücke, siehe Modul-Kommentar unten.
 */
const KLASSEN_REIHENFOLGE: readonly string[] = [
  'tragend',
  'stuetze',
  'daemmung',
  'renovation-neu',
  'renovation-abbruch',
  'fenster',
  'tuer',
  'treppe',
  'bruchlinie',
  'projection',
  'cut',
  'symbol',
];

function klasseVonClasses(classes: readonly string[]): string {
  if (classes.includes('bemassung')) return 'bemassung';
  for (const k of KLASSEN_REIHENFOLGE) {
    if (classes.includes(k)) return k;
  }
  return 'symbol';
}

/** Klassen, deren fehlender Unternehmer-Zwilling NICHT als 'entfernt'
 * gemeldet wird — der Unternehmer zeichnet Symbole/Masse üblicherweise
 * anders; das wäre Rauschen. Stattdessen ein Sammelhinweis (siehe unten). */
function istRauschKlasse(klasse: string): boolean {
  return klasse === 'symbol' || klasse === 'bemassung';
}

interface Segment {
  a: Pt;
  b: Pt;
  klasse: string;
  layer?: string;
}

interface TextEintrag {
  at: Pt;
  text: string;
  klasse: string;
  layer?: string;
}

function architektSegmente(plan: PlanGraphic): Segment[] {
  const segs: Segment[] = [];
  for (const l of plan.lines) {
    segs.push({ a: l.a, b: l.b, klasse: klasseVonClasses(l.classes) });
  }
  for (const r of plan.regions) {
    const klasse = klasseVonClasses(r.classes);
    for (const ring of r.rings) {
      if (ring.length < 3) continue; // entartet — kein echter Ring
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % ring.length]!;
        segs.push({ a, b, klasse });
      }
    }
  }
  return segs;
}

function architektTexte(plan: PlanGraphic): TextEintrag[] {
  return plan.texte.map((t) => ({ at: t.at, text: t.text, klasse: klasseVonClasses(t.classes) }));
}

/**
 * Wendet die geschätzte Ausrichtung auf einen Unternehmer-Punkt an. Die
 * Ausrichtung ist als `Mittelpunkt(U) − Mittelpunkt(A)` definiert (gleiche
 * Konvention wie das `delta`-Feld von 'verschoben'-Befunden) — die
 * Unternehmer-Koordinaten liegen also `versatz` VOR dem Architektenplan;
 * zum Ausrichten wird `versatz` deshalb ABGEZOGEN, nicht addiert.
 */
function verschobenerPunkt(p: Pt, versatz: Pt): Pt {
  return versatz.x === 0 && versatz.y === 0 ? p : { x: p.x - versatz.x, y: p.y - versatz.y };
}

function unternehmerSegmente(dxf: DxfGraphic, versatz: Pt): Segment[] {
  const segs: Segment[] = [];
  for (const l of dxf.lines) {
    segs.push({
      a: verschobenerPunkt(l.a, versatz),
      b: verschobenerPunkt(l.b, versatz),
      klasse: semantikFuerLayer(l.layer) ?? 'unklassiert',
      layer: l.layer,
    });
  }
  for (const r of dxf.regions) {
    const klasse = semantikFuerLayer(r.layer) ?? 'unklassiert';
    const ring = r.ring;
    if (ring.length < 3) continue;
    for (let i = 0; i < ring.length; i++) {
      segs.push({
        a: verschobenerPunkt(ring[i]!, versatz),
        b: verschobenerPunkt(ring[(i + 1) % ring.length]!, versatz),
        klasse,
        layer: r.layer,
      });
    }
  }
  return segs;
}

function unternehmerTexte(dxf: DxfGraphic, versatz: Pt): TextEintrag[] {
  return dxf.texte.map((t) => ({
    at: verschobenerPunkt(t.at, versatz),
    text: t.text,
    klasse: semantikFuerLayer(t.layer) ?? 'unklassiert',
    layer: t.layer,
  }));
}

function segLaenge(s: { a: Pt; b: Pt }): number {
  return dist(s.a, s.b);
}

function segMitte(s: { a: Pt; b: Pt }): Pt {
  return { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
}

/** Richtung ungerichtet (mod π), Winkel in [0, π). */
function segWinkel(s: { a: Pt; b: Pt }): number {
  let w = Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
  if (w < 0) w += Math.PI;
  if (w >= Math.PI) w -= Math.PI;
  return w;
}

/** Kleinster Winkelabstand zweier ungerichteter Richtungen (Periode π). */
function winkelAbstand(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, Math.PI - d);
}

function endpunkteGleich(a: Pt, b: Pt, tol: number): boolean {
  return dist(a, b) <= tol;
}

/** Endpunkte ungerichtet gleich (a→b entspricht b→a). */
function segmenteExaktGleich(s: Segment, t: Segment, tol: number): boolean {
  return (
    (endpunkteGleich(s.a, t.a, tol) && endpunkteGleich(s.b, t.b, tol)) ||
    (endpunkteGleich(s.a, t.b, tol) && endpunkteGleich(s.b, t.a, tol))
  );
}

function segmenteAehnlich(s: Segment, t: Segment, tol: number): boolean {
  if (Math.abs(segLaenge(s) - segLaenge(t)) > tol) return false;
  return winkelAbstand(segWinkel(s), segWinkel(t)) <= WINKEL_TOL_RAD;
}

/** Deterministischer Sortierschlüssel: kleinerer Endpunkt zuerst
 * (lexikografisch x,y), damit ein Segment unabhängig von a/b-Reihenfolge
 * denselben Schlüssel trägt («sortiere Eingaben vor dem Greedy»). */
function segSortSchluessel(s: Segment): [number, number, number, number] {
  const aErst = s.a.x < s.b.x || (s.a.x === s.b.x && s.a.y <= s.b.y);
  const p1 = aErst ? s.a : s.b;
  const p2 = aErst ? s.b : s.a;
  return [p1.x, p1.y, p2.x, p2.y];
}

function vergleicheSegmente(s1: Segment, s2: Segment): number {
  const k1 = segSortSchluessel(s1);
  const k2 = segSortSchluessel(s2);
  for (let i = 0; i < 4; i++) {
    if (k1[i] !== k2[i]) return k1[i]! - k2[i]!;
  }
  return 0;
}

function vergleicheTexte(t1: TextEintrag, t2: TextEintrag): number {
  return t1.at.x - t2.at.x || t1.at.y - t2.at.y || t1.text.localeCompare(t2.text);
}

interface GruppenErgebnis {
  befunde: AbgleichBefund[];
  unveraendert: number;
  entferntSymbolCount: number;
}

/**
 * Klassengetrenntes, deterministisches Matching (Schritt 1 exakt, Schritt 2
 * verschoben, Schritt 3 Rest → neu/entfernt). `unklassiert` auf der
 * Unternehmerseite matcht gegen die UNION aller noch nicht verbrauchten
 * Architekten-Segmente (bekannte Klassen werden zuerst verarbeitet, das
 * Restpolster geht danach an `unklassiert`).
 */
function vergleicheGruppen(
  architektSegs: Segment[],
  unternehmerSegs: Segment[],
  tol: number,
  maxVerschiebung: number,
): GruppenErgebnis {
  const aSort = [...architektSegs].sort(vergleicheSegmente);
  const aVerbraucht = new Array<boolean>(aSort.length).fill(false);

  const uNachKlasse = new Map<string, Segment[]>();
  for (const s of unternehmerSegs) {
    const arr = uNachKlasse.get(s.klasse) ?? [];
    arr.push(s);
    uNachKlasse.set(s.klasse, arr);
  }
  for (const arr of uNachKlasse.values()) arr.sort(vergleicheSegmente);

  const reihenfolge = [...uNachKlasse.keys()].filter((k) => k !== 'unklassiert').sort();
  if (uNachKlasse.has('unklassiert')) reihenfolge.push('unklassiert');

  const befunde: AbgleichBefund[] = [];
  let unveraendert = 0;
  const uUebrig: Segment[] = [];
  const sicherer = Math.max(maxVerschiebung, 1); // Divisionsschutz bei maxVerschiebung=0

  for (const klasse of reihenfolge) {
    const uListe = uNachKlasse.get(klasse)!;
    const aIndizes: number[] = [];
    for (let i = 0; i < aSort.length; i++) {
      if (aVerbraucht[i]) continue;
      if (klasse === 'unklassiert' || aSort[i]!.klasse === klasse) aIndizes.push(i);
    }

    const exaktGematcht = new Array<boolean>(uListe.length).fill(false);
    // Schritt 1: exakt — beide Endpunkte ungerichtet ±tol.
    for (let ui = 0; ui < uListe.length; ui++) {
      const u = uListe[ui]!;
      for (const ai of aIndizes) {
        if (aVerbraucht[ai]) continue;
        const a = aSort[ai]!;
        if (segmenteExaktGleich(a, u, tol)) {
          aVerbraucht[ai] = true;
          exaktGematcht[ui] = true;
          unveraendert += 1;
          break;
        }
      }
    }

    const verschobenGematcht = new Array<boolean>(uListe.length).fill(false);
    // Schritt 2: verschoben — gleiche Länge/Richtung, Mittelpunktabstand ≤ maxVerschiebung.
    for (let ui = 0; ui < uListe.length; ui++) {
      if (exaktGematcht[ui]) continue;
      const u = uListe[ui]!;
      for (const ai of aIndizes) {
        if (aVerbraucht[ai]) continue;
        const a = aSort[ai]!;
        if (!segmenteAehnlich(a, u, tol)) continue;
        const midA = segMitte(a);
        const midU = segMitte(u);
        const abstand = dist(midA, midU);
        if (abstand > maxVerschiebung) continue;
        aVerbraucht[ai] = true;
        verschobenGematcht[ui] = true;
        befunde.push({
          art: 'verschoben',
          klasse: u.klasse,
          ...(u.layer !== undefined ? { layer: u.layer } : {}),
          segment: { a: u.a, b: u.b },
          delta: pt(midU.x - midA.x, midU.y - midA.y),
          konfidenz: 1 - (abstand / sicherer) * 0.5,
        });
        break;
      }
    }

    for (let ui = 0; ui < uListe.length; ui++) {
      if (!exaktGematcht[ui] && !verschobenGematcht[ui]) uUebrig.push(uListe[ui]!);
    }
  }

  // Rest Architektenseite → 'entfernt' (Symbol-/Bemassungsrauschen ausgenommen).
  let entferntSymbolCount = 0;
  for (let ai = 0; ai < aSort.length; ai++) {
    if (aVerbraucht[ai]) continue;
    const a = aSort[ai]!;
    if (istRauschKlasse(a.klasse)) {
      entferntSymbolCount += 1;
      continue;
    }
    befunde.push({ art: 'entfernt', klasse: a.klasse, segment: { a: a.a, b: a.b }, konfidenz: 0.9 });
  }

  // Rest Unternehmerseite → 'neu'.
  for (const u of uUebrig) {
    befunde.push({
      art: 'neu',
      klasse: u.klasse,
      ...(u.layer !== undefined ? { layer: u.layer } : {}),
      segment: { a: u.a, b: u.b },
      konfidenz: u.klasse === 'unklassiert' ? 0.5 : 0.9,
    });
  }

  return { befunde, unveraendert, entferntSymbolCount };
}

/**
 * Schätzt eine reine Translation (KEINE Rotation) über Längen-/
 * Richtungs-kongruente Segmentpaare, Stimmenmehrheit auf 1 mm quantisiert.
 * `null`, wenn keine Mehrheit ≥30 % der Unternehmer-Segmente UND ≥3 Stimmen
 * gefunden wird.
 */
function schaetzeAusrichtung(architektSegs: Segment[], unternehmerSegs: Segment[], tol: number): Pt | null {
  if (unternehmerSegs.length === 0) return null;
  const stimmen = new Map<string, number>();
  for (const u of unternehmerSegs) {
    const lenU = segLaenge(u);
    const winU = segWinkel(u);
    const midU = segMitte(u);
    for (const a of architektSegs) {
      if (Math.abs(segLaenge(a) - lenU) > tol) continue;
      if (winkelAbstand(segWinkel(a), winU) > WINKEL_TOL_RAD) continue;
      const midA = segMitte(a);
      const dx = Math.round(midU.x - midA.x);
      const dy = Math.round(midU.y - midA.y);
      const key = `${dx},${dy}`;
      stimmen.set(key, (stimmen.get(key) ?? 0) + 1);
    }
  }
  let bestKey: string | null = null;
  let bestCount = 0;
  for (const [key, count] of stimmen) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  if (bestKey === null) return null;
  const noetig = Math.max(3, unternehmerSegs.length * 0.3);
  if (bestCount < noetig) return null;
  const [dxs, dys] = bestKey.split(',');
  return { x: Number(dxs), y: Number(dys) };
}

interface TextErgebnis {
  befunde: AbgleichBefund[];
  entferntSymbolCount: number;
}

/** Text-Abgleich nach Position (±300 mm), unabhängig von den Segment-Klassen. */
function vergleicheTexteFn(architekt: TextEintrag[], unternehmer: TextEintrag[]): TextErgebnis {
  const TEXT_RADIUS = 300;
  const aSort = [...architekt].sort(vergleicheTexte);
  const uSort = [...unternehmer].sort(vergleicheTexte);
  const aVerbraucht = new Array<boolean>(aSort.length).fill(false);
  const uVerbraucht = new Array<boolean>(uSort.length).fill(false);
  const befunde: AbgleichBefund[] = [];

  for (let ui = 0; ui < uSort.length; ui++) {
    const u = uSort[ui]!;
    for (let ai = 0; ai < aSort.length; ai++) {
      if (aVerbraucht[ai]) continue;
      const a = aSort[ai]!;
      if (dist(a.at, u.at) > TEXT_RADIUS) continue;
      aVerbraucht[ai] = true;
      uVerbraucht[ui] = true;
      if (a.text !== u.text) {
        befunde.push({
          art: 'text-geaendert',
          klasse: u.klasse,
          ...(u.layer !== undefined ? { layer: u.layer } : {}),
          text: { alt: a.text, neu: u.text, at: u.at },
          konfidenz: 0.7,
        });
      }
      break;
    }
  }

  let entferntSymbolCount = 0;
  for (let ai = 0; ai < aSort.length; ai++) {
    if (aVerbraucht[ai]) continue;
    const a = aSort[ai]!;
    if (istRauschKlasse(a.klasse)) {
      entferntSymbolCount += 1;
      continue;
    }
    befunde.push({ art: 'entfernt', klasse: a.klasse, segment: { a: a.at, b: a.at }, konfidenz: 0.6 });
  }
  for (let ui = 0; ui < uSort.length; ui++) {
    if (uVerbraucht[ui]) continue;
    const u = uSort[ui]!;
    befunde.push({
      art: 'neu',
      klasse: u.klasse,
      ...(u.layer !== undefined ? { layer: u.layer } : {}),
      segment: { a: u.at, b: u.at },
      konfidenz: 0.6,
    });
  }
  return { befunde, entferntSymbolCount };
}

/**
 * Vergleicht Architekten- (`PlanGraphic`) und Unternehmerplan (`DxfGraphic`)
 * geometrisch. Reine Funktion, deterministisch: gleiche Eingaben liefern
 * byte-identische Ergebnisse (JSON-vergleichbar).
 */
export function vergleichePlaene(
  plan: PlanGraphic,
  dxf: DxfGraphic,
  opts?: { tol?: number; maxVerschiebung?: number },
): PlanAbgleich {
  const tol = opts?.tol ?? 5;
  const maxVerschiebung = opts?.maxVerschiebung ?? 500;

  const architektSegs = architektSegmente(plan);
  const architektTxt = architektTexte(plan);
  const unternehmerSegsRoh = unternehmerSegmente(dxf, { x: 0, y: 0 });
  const unternehmerTxtRoh = unternehmerTexte(dxf, { x: 0, y: 0 });

  const alleLeer =
    architektSegs.length === 0 &&
    architektTxt.length === 0 &&
    unternehmerSegsRoh.length === 0 &&
    unternehmerTxtRoh.length === 0;
  if (alleLeer) {
    return { befunde: [], unveraendert: 0, ausrichtung: { dx: 0, dy: 0, geschaetzt: false }, hinweise: [] };
  }

  // Erster Durchgang bei Nullversatz — liefert bereits das volle Ergebnis,
  // falls die Match-Quote gut genug ist (dann kein zweiter Lauf nötig).
  const versuch = vergleicheGruppen(architektSegs, unternehmerSegsRoh, tol, maxVerschiebung);
  const quote = unternehmerSegsRoh.length > 0 ? versuch.unveraendert / unternehmerSegsRoh.length : 1;
  const brauchtSchaetzung = unternehmerSegsRoh.length > 0 && quote < 0.5;

  const hinweise: string[] = [];
  let versatz: Pt = { x: 0, y: 0 };
  let geschaetzt = false;
  let geometrieErgebnis = versuch;

  if (brauchtSchaetzung) {
    const geschaetzterVersatz = schaetzeAusrichtung(architektSegs, unternehmerSegsRoh, tol);
    if (geschaetzterVersatz) {
      versatz = geschaetzterVersatz;
      geschaetzt = true;
      hinweise.push(`Nullpunkt-Versatz dx/dy geschätzt (dx=${versatz.x} mm, dy=${versatz.y} mm).`);
      const unternehmerSegsVerschoben = unternehmerSegmente(dxf, versatz);
      geometrieErgebnis = vergleicheGruppen(architektSegs, unternehmerSegsVerschoben, tol, maxVerschiebung);
    } else {
      hinweise.push('Ausrichtung nicht schätzbar — manuelles Einpassen nötig.');
    }
    hinweise.push('Rotation wird nicht geschätzt (v1.6).');
  }

  const unternehmerTxt = geschaetzt ? unternehmerTexte(dxf, versatz) : unternehmerTxtRoh;
  const textErgebnis = vergleicheTexteFn(architektTxt, unternehmerTxt);

  if (geometrieErgebnis.entferntSymbolCount > 0) {
    hinweise.push(
      `${geometrieErgebnis.entferntSymbolCount} unveränderte Symbol-/Bemassungssegmente im Architektenplan ohne Unternehmer-Entsprechung — nicht als 'entfernt' gemeldet (Symbol-/Massdarstellung unterscheidet sich üblicherweise vom Unternehmerplan).`,
    );
  }
  if (textErgebnis.entferntSymbolCount > 0) {
    hinweise.push(
      `${textErgebnis.entferntSymbolCount} unveränderte Symbol-/Bemassungstexte im Architektenplan ohne Unternehmer-Entsprechung — nicht als 'entfernt' gemeldet.`,
    );
  }

  return {
    befunde: [...geometrieErgebnis.befunde, ...textErgebnis.befunde],
    unveraendert: geometrieErgebnis.unveraendert,
    ausrichtung: { dx: versatz.x, dy: versatz.y, geschaetzt },
    hinweise,
  };
}
