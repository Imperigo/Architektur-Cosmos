import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { deriveEntity } from '../src/derive/scene';
import type { GeometryArtifact } from '../src/derive/mesh';

/**
 * P-F7 «Geometrie-Grundaudit 3D» — Owner-Befund 23.07. («auch das
 * volumenwerkzeug hat den textur bug und ist innen hohl … ich glaub das ist
 * ein grundproblem deiner werkzeuge») nach dem bewiesenen Rampen-Normalen-Bug
 * (ROADMAP 634, P-F5): dieser Harnisch baut JEDE 3D-Zerlegung aus
 * `derive/scene.ts` über eine kleine Fixture und prüft drei geometrische
 * Invarianten, unabhängig vom Bild — ein Beweis, kein Screenshot:
 *
 * (a) WICKLUNGS-KONSISTENZ — das Kreuzprodukt der ersten beiden Kanten jedes
 *     Dreiecks (die Normale, die three.js für Front-Face/Beleuchtung
 *     TATSÄCHLICH benutzt) zeigt in dieselbe Halbrichtung wie die im
 *     `normals`-Array gespeicherte Normale (Skalarprodukt > 0). Muster:
 *     P-F5-Regressionstest, `test/rampe.test.ts` «Lauffläche-Normale
 *     wicklungskonsistent».
 * (b) AUSWÄRTS-RICHTUNG — Normale · (Flächenmitte − Teilkörper-Schwerpunkt)
 *     > 0. «Teilkörper» statt ganze Entity, weil zusammengesetzte Entities
 *     (Geländer: viele Pfosten: Treppe: Läufe+Podeste) aus mehreren, räumlich
 *     getrennten geschlossenen Volumen bestehen — ein globaler Schwerpunkt
 *     über alle Pfosten hinweg wäre für keinen einzelnen Pfosten "innen".
 *     Die Teilkörper-Zerlegung (`teilkoerper()`) gruppiert Dreiecke NUR über
 *     tatsächlich geteilte Kanten (Union-Find) — ein Kunstgriff, keine
 *     Aufweichung der Invariante selbst.
 * (c) GESCHLOSSENHEIT — jede Kante eines Teilkörpers gehört zu GENAU zwei
 *     Dreiecken. «innen hohl» ist genau das: eine fehlende Deckel-/Bodenfläche
 *     bei einseitigem Rendering zeigt sich hier als Kante mit Zähler 1.
 *
 * Bewusst offene Formen (Dach: reine Schale ohne Traufe-Abschluss/Unterseite)
 * werden NICHT stillschweigend durchgewunken — ihre Ausnahme ist unten je
 * Zerlegung explizit dokumentiert (Begründung + welche Invariante betroffen
 * ist), nicht pauschal aufgeweicht.
 */

// ---------------------------------------------------------------------------
// Vektor-Hilfen
// ---------------------------------------------------------------------------

type V3 = readonly [number, number, number];
const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const scale = (p: V3, s: number): V3 => [p[0] * s, p[1] * s, p[2] * s];
const cross = (u: V3, v: V3): V3 => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
];
const dot = (u: V3, v: V3): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const len = (u: V3): number => Math.hypot(u[0], u[1], u[2]);

function pos(a: GeometryArtifact, i: number): V3 {
  return [a.positions[i * 3]!, a.positions[i * 3 + 1]!, a.positions[i * 3 + 2]!];
}
function nrm(a: GeometryArtifact, i: number): V3 {
  return [a.normals[i * 3]!, a.normals[i * 3 + 1]!, a.normals[i * 3 + 2]!];
}

interface Tri {
  a: number;
  b: number;
  c: number;
}
function trianglesOf(artifact: GeometryArtifact): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < artifact.indices.length; i += 3) {
    out.push({ a: artifact.indices[i]!, b: artifact.indices[i + 1]!, c: artifact.indices[i + 2]! });
  }
  return out;
}

// ---------------------------------------------------------------------------
// (a) Wicklungs-Konsistenz — Muster P-F5 (test/rampe.test.ts)
// ---------------------------------------------------------------------------

/** Dreieck-Indizes, deren Wicklungsnormale der gespeicherten Normalen
 * widerspricht (Skalarprodukt ≤ 0). Degenerierte Dreiecke (Nullfläche —
 * z.B. eine Wange, die am Rampenfuss zur Nulllinie kollabiert) tragen keine
 * gerichtete Information und werden übersprungen. */
function wicklungsVerletzungen(artifact: GeometryArtifact): number[] {
  const verletzungen: number[] = [];
  trianglesOf(artifact).forEach((t, i) => {
    const p0 = pos(artifact, t.a);
    const p1 = pos(artifact, t.b);
    const p2 = pos(artifact, t.c);
    const wicklung = cross(sub(p1, p0), sub(p2, p0));
    if (len(wicklung) < 1e-6) return;
    const gespeichert = nrm(artifact, t.a);
    if (dot(wicklung, gespeichert) <= 0) verletzungen.push(i);
  });
  return verletzungen;
}

// ---------------------------------------------------------------------------
// Teilkörper — Union-Find über gemeinsame (quantisierte) Kantenpositionen.
// ---------------------------------------------------------------------------

function quant(p: V3): string {
  // 1/100 mm Auflösung — reichlich Reserve gegenüber Rundungsdreck aus
  // trigonometrischen Ableitungen (Rampe/Dach), grob genug um KEINE echten
  // Nachbarkanten zu trennen.
  return `${Math.round(p[0] * 100)}:${Math.round(p[1] * 100)}:${Math.round(p[2] * 100)}`;
}
function edgeKey(p: V3, q: V3): string {
  const a = quant(p);
  const b = quant(q);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]!]!;
      x = this.parent[x]!;
    }
    return x;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

interface Teilkoerper {
  dreiecke: number[];
  kanten: Map<string, number>;
}

function teilkoerper(artifact: GeometryArtifact): Teilkoerper[] {
  const tris = trianglesOf(artifact);
  const uf = new UnionFind(tris.length);
  const kantenZuDreieck = new Map<string, number[]>();
  const kantenEinesTri = (t: Tri): [V3, V3][] => {
    const p0 = pos(artifact, t.a);
    const p1 = pos(artifact, t.b);
    const p2 = pos(artifact, t.c);
    return [
      [p0, p1],
      [p1, p2],
      [p2, p0],
    ];
  };
  tris.forEach((t, i) => {
    for (const [x, y] of kantenEinesTri(t)) {
      const k = edgeKey(x, y);
      const arr = kantenZuDreieck.get(k) ?? [];
      arr.push(i);
      kantenZuDreieck.set(k, arr);
    }
  });
  for (const arr of kantenZuDreieck.values()) {
    for (let i = 1; i < arr.length; i++) uf.union(arr[0]!, arr[i]!);
  }
  const gruppen = new Map<number, number[]>();
  tris.forEach((_, i) => {
    const r = uf.find(i);
    const g = gruppen.get(r) ?? [];
    g.push(i);
    gruppen.set(r, g);
  });
  const out: Teilkoerper[] = [];
  for (const dreiecke of gruppen.values()) {
    const kanten = new Map<string, number>();
    for (const i of dreiecke) {
      const t = tris[i]!;
      for (const [x, y] of kantenEinesTri(t)) {
        const k = edgeKey(x, y);
        kanten.set(k, (kanten.get(k) ?? 0) + 1);
      }
    }
    out.push({ dreiecke, kanten });
  }
  return out;
}

/** (b) Auswärts-Richtung je Teilkörper: Normale · (Flächenmitte − Schwerpunkt)
 * muss (als Kosinus, tolerant gegen Rundung) klar positiv sein. */
function auswaertsVerletzungen(artifact: GeometryArtifact, tk: Teilkoerper): number[] {
  const verletzungen: number[] = [];
  const tris = trianglesOf(artifact);
  let schwerpunkt: V3 = [0, 0, 0];
  for (const i of tk.dreiecke) {
    const t = tris[i]!;
    const mitte = scale(add(add(pos(artifact, t.a), pos(artifact, t.b)), pos(artifact, t.c)), 1 / 3);
    schwerpunkt = add(schwerpunkt, mitte);
  }
  schwerpunkt = scale(schwerpunkt, 1 / tk.dreiecke.length);
  for (const i of tk.dreiecke) {
    const t = tris[i]!;
    const p0 = pos(artifact, t.a);
    const p1 = pos(artifact, t.b);
    const p2 = pos(artifact, t.c);
    const mitte = scale(add(add(p0, p1), p2), 1 / 3);
    const richtung = sub(mitte, schwerpunkt);
    const rl = len(richtung);
    if (rl < 1e-6) continue; // Flächenmitte == Schwerpunkt (Sonderfall winziger Teilkörper)
    const n = nrm(artifact, t.a);
    const nl = len(n) || 1;
    const kosinus = dot(n, richtung) / (nl * rl);
    if (kosinus <= 0.01) verletzungen.push(i);
  }
  return verletzungen;
}

/** (c) Geschlossenheit je Teilkörper: jede Kante genau zweimal. */
function geschlossenheitsVerletzungen(tk: Teilkoerper): Array<{ kante: string; anzahl: number }> {
  const out: Array<{ kante: string; anzahl: number }> = [];
  for (const [kante, anzahl] of tk.kanten) {
    if (anzahl !== 2) out.push({ kante, anzahl });
  }
  return out;
}

/** Erwartungshaltung je Zerlegung — bewusste Ausnahmen sind hier sichtbar,
 * nicht in der Prüf-Logik versteckt. */
interface Erwartung {
  wicklung?: 'ok' | { ausnahme: string };
  auswaerts?: 'ok' | { ausnahme: string };
  /** `erlaubteAnzahlen` grenzt die Ausnahme auf das TATSÄCHLICH belegte
   * Muster ein (z.B. Treppe: nur `anzahl===4`, das kantenweise Berühren
   * zweier für sich geschlossener Stufen-Quader) — ein `anzahl===1`
   * (ein echtes Loch) würde die Ausnahme trotzdem durchfallen lassen. */
  geschlossenheit?: 'ok' | { ausnahme: string; erlaubteAnzahlen: number[] };
}

function pruefeInvarianten(name: string, artifact: GeometryArtifact, erw: Erwartung): void {
  const tks = teilkoerper(artifact);

  const wv = wicklungsVerletzungen(artifact);
  if (!erw.wicklung || erw.wicklung === 'ok') {
    expect(wv, `${name}: Wicklungs-Konsistenz — Dreiecke ${wv.join(',')} widersprechen ihrer Normale`).toEqual([]);
  } else {
    // dokumentierte Ausnahme — trotzdem sichtbar machen, ob sie noch nötig ist
    if (wv.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`${name}: Wicklungs-Ausnahme "${erw.wicklung.ausnahme}" greift nicht mehr (0 Verletzungen)`);
    }
  }

  const av = tks.flatMap((tk) => auswaertsVerletzungen(artifact, tk));
  if (!erw.auswaerts || erw.auswaerts === 'ok') {
    expect(av, `${name}: Auswärts-Richtung — Dreiecke ${av.join(',')} zeigen nicht nach aussen`).toEqual([]);
  } else if (av.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(`${name}: Auswärts-Ausnahme "${erw.auswaerts.ausnahme}" greift nicht mehr (0 Verletzungen)`);
  }

  const gv = tks.flatMap((tk) => geschlossenheitsVerletzungen(tk));
  if (!erw.geschlossenheit || erw.geschlossenheit === 'ok') {
    expect(
      gv,
      `${name}: Geschlossenheit — Kanten mit ≠2 Flächen: ${gv.map((v) => `${v.kante}=${v.anzahl}`).join(', ')}`,
    ).toEqual([]);
  } else {
    if (gv.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`${name}: Geschlossenheit-Ausnahme "${erw.geschlossenheit.ausnahme}" greift nicht mehr (0 Verletzungen)`);
    }
    // Die Ausnahme deckt NUR das dokumentierte Muster — jede andere Anzahl
    // (allen voran `1`, ein echtes Loch) lässt die Prüfung durchfallen.
    const unerwartet = gv.filter((v) => !erw.geschlossenheit || erw.geschlossenheit === 'ok' || !(erw.geschlossenheit.erlaubteAnzahlen as number[]).includes(v.anzahl));
    expect(
      unerwartet,
      `${name}: Geschlossenheit — Kanten ausserhalb der dokumentierten Ausnahme "${(erw.geschlossenheit as { ausnahme: string }).ausnahme}": ${unerwartet.map((v) => `${v.kante}=${v.anzahl}`).join(', ')}`,
    ).toEqual([]);
  }
}

// ---------------------------------------------------------------------------
// Fixtures — je eine kleine, deterministische Doc-Aufbau-Funktion.
// ---------------------------------------------------------------------------

function grund(): { doc: KosmoDoc; storeyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

function aufbau(doc: KosmoDoc): string {
  const r = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  return (r.patches[0] as { id: string }).id;
}

const CCW_RECHTECK = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 3000 },
  { x: 0, y: 3000 },
];
const CW_RECHTECK = [...CCW_RECHTECK].reverse();

function baueWand(): GeometryArtifact {
  const { doc, storeyId } = grund();
  const assemblyId = aufbau(doc);
  const r = execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 }, assemblyId });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueSlab(outline: { x: number; y: number }[]): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.deckeZeichnen', { storeyId, outline, thickness: 250 });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueVolumen(outline: { x: number; y: number }[]): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.volumenErstellen', { storeyId, outline, height: 3000 });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueDachWalm(outline: { x: number; y: number }[]): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.dachErstellen', { storeyId, outline, pitch: 35, overhang: 300, form: 'walm' });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueDachSattel(outline: { x: number; y: number }[]): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.dachErstellen', {
    storeyId,
    outline,
    pitch: 35,
    overhang: 0,
    form: 'sattel',
    firstrichtung: 'x',
  });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueStuetze(): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 1000, y: 1000 }, profil: 'rechteck', b: 300, t: 400 });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueUnterzug(): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.unterzugZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 }, breite: 300, hoehe: 400 });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueTreppe(form: 'gerade' | 'podest' | 'u' | 'l'): GeometryArtifact {
  const { doc, storeyId } = grund();
  const params: Record<string, unknown> = { storeyId, a: { x: 0, y: 0 }, b: { x: 4500, y: 0 }, width: 1200, form };
  if (form === 'l') params.ecke = { x: 3000, y: 0 };
  if (form === 'podest' || form === 'u') params.b = { x: 6000, y: 0 };
  const r = execute(doc, 'design.treppeErstellen', params);
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueRampe(): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.rampeZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 }, width: 1200, hoehenDelta: 200 });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueGelaender(art: 'handlauf' | 'staketen' | 'voll'): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.gelaenderZeichnen', {
    storeyId,
    punkte: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2000 }],
    hoehe: 1000,
    art,
  });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

function baueFreeMeshQuader(): GeometryArtifact {
  const { doc, storeyId } = grund();
  const r = execute(doc, 'design.meshErstellen', {
    form: 'quader',
    storeyId,
    at: { x: 0, y: 0 },
    breite: 1000,
    laenge: 800,
    hoehe: 600,
  });
  const id = (r.patches[0] as { id: string }).id;
  return deriveEntity(doc, id)!;
}

// ---------------------------------------------------------------------------
// Der Harnisch
// ---------------------------------------------------------------------------

describe('Geometrie-Grundaudit 3D (P-F7) — Invarianten je Zerlegung', () => {
  it.each([
    ['Wand (gerade, 5 m)', baueWand, {} as Erwartung],
    ['Decke/Slab, Umriss CCW', () => baueSlab(CCW_RECHTECK), {} as Erwartung],
    ['Decke/Slab, Umriss CW (Owner-Verdacht)', () => baueSlab(CW_RECHTECK), {} as Erwartung],
    ['Volumen/MassBody, Umriss CCW', () => baueVolumen(CCW_RECHTECK), {} as Erwartung],
    ['Volumen/MassBody, Umriss CW (Owner-Befund «innen hohl»)', () => baueVolumen(CW_RECHTECK), {} as Erwartung],
    ['Dach Walm, Umriss CCW', () => baueDachWalm(CCW_RECHTECK), { geschlossenheit: { ausnahme: 'offene Schale — Traufe ist Rand, keine Fläche (kein Boden-/Fassadenabschluss)', erlaubteAnzahlen: [1] } } as Erwartung],
    ['Dach Walm, Umriss CW', () => baueDachWalm(CW_RECHTECK), { geschlossenheit: { ausnahme: 'offene Schale — Traufe ist Rand, keine Fläche (kein Boden-/Fassadenabschluss)', erlaubteAnzahlen: [1] } } as Erwartung],
    ['Dach Sattel, Umriss CCW', () => baueDachSattel(CCW_RECHTECK), { geschlossenheit: { ausnahme: 'offene Schale — Rand ist keine Fläche (kein Giebel-/Bodenabschluss)', erlaubteAnzahlen: [1] } } as Erwartung],
    ['Dach Sattel, Umriss CW (Owner-Verdacht)', () => baueDachSattel(CW_RECHTECK), { geschlossenheit: { ausnahme: 'offene Schale — Rand ist keine Fläche (kein Giebel-/Bodenabschluss)', erlaubteAnzahlen: [1] } } as Erwartung],
    ['Stütze (Rechteckprofil)', baueStuetze, {} as Erwartung],
    ['Unterzug (Rechteckquerschnitt)', baueUnterzug, {} as Erwartung],
    // Treppen-Ausnahme (Invariante b, NICHT a oder c): eine Treppe ist als
    // Silhouette strukturell NICHT sternförmig um ihren eigenen Schwerpunkt
    // (jede Stufe kragt gegenüber dem globalen Schwerpunkt der ganzen Lauf-
    // Kette aus, das ist keine Verletzung, sondern die Form einer Treppe).
    // Die Teilkörper-Zerlegung verschweisst über gemeinsame Kanten Trittstufe
    // → Setzstufe → Wangen → nächste Stufe zu EINEM langen Teilkörper (siehe
    // `teilkoerper()`) — der globale Schwerpunkt dieses "Schlangen"-Körpers
    // liegt für einzelne, weit entfernte Stufen nicht "innen". Die scharfe
    // Wicklungs-Konsistenz (a) bestand für alle vier Formen VOR jedem Fix
    // (kein Winkelfehler), Geschlossenheit (c) bleibt ungerührt scharf.
    // Geschlossenheit-Ausnahme (NACH dem P-F7-Fix, der Sohle+Rückseite je
    // Stufe ergänzt hat — vorher zählten die Stufenkanten `=1`, echte
    // Löcher): jede Stufe ist für sich ein vollständig geschlossener Quader
    // (6 Flächen). Zwei aufeinanderfolgende Stufen sind dabei um eine
    // Steigung höhenversetzt (Lego-Noppen-Muster) — sie BERÜHREN einander
    // nur entlang EINER Kante (der Stufenvorderkante), nicht entlang einer
    // gemeinsamen Fläche. Die Union-Find-Teilkörperbildung verschweisst
    // beide Quader über genau diese Kante zu einem Teilkörper, worin die
    // Kante folgerichtig 4 Flächen-Inzidenzen zählt (2 vom unteren, 2 vom
    // oberen Quader) statt 2 — ein Kunstartefakt der Kanten-basierten
    // Verschmelzung bei zwei echten, für sich genommen wasserdichten
        // Volumen, KEIN Loch (bestätigt: nach dem Fix bleiben ausschliesslich
    // `=4`-Kanten übrig, alle exakt an den Stufenübergängen — die
    // ursprünglichen `=1`-Kanten, echte fehlende Flächen, sind verschwunden).
    ['Treppe gerade', () => baueTreppe('gerade'), { auswaerts: { ausnahme: 'Treppen-Silhouette ist nicht sternförmig um ihren Schwerpunkt (s.o.)' }, geschlossenheit: { ausnahme: 'Stufen berühren sich nur kantenweise (Lego-Noppen-Muster), s.o.', erlaubteAnzahlen: [4] } } as Erwartung],
    ['Treppe mit Zwischenpodest', () => baueTreppe('podest'), { auswaerts: { ausnahme: 'Treppen-Silhouette ist nicht sternförmig um ihren Schwerpunkt (s.o.)' }, geschlossenheit: { ausnahme: 'Stufen berühren sich nur kantenweise (Lego-Noppen-Muster), s.o.', erlaubteAnzahlen: [4] } } as Erwartung],
    ['Treppe U-Lauf', () => baueTreppe('u'), { auswaerts: { ausnahme: 'Treppen-Silhouette ist nicht sternförmig um ihren Schwerpunkt (s.o.)' }, geschlossenheit: { ausnahme: 'Stufen berühren sich nur kantenweise (Lego-Noppen-Muster), s.o.', erlaubteAnzahlen: [4] } } as Erwartung],
    ['Treppe L-Lauf (Eckpodest)', () => baueTreppe('l'), { auswaerts: { ausnahme: 'Treppen-Silhouette ist nicht sternförmig um ihren Schwerpunkt (s.o.)' }, geschlossenheit: { ausnahme: 'Stufen berühren sich nur kantenweise (Lego-Noppen-Muster), s.o.', erlaubteAnzahlen: [4] } } as Erwartung],
    ['Rampe (P-F5-Fix, Regressions-Gegenprobe)', baueRampe, {} as Erwartung],
    ['Geländer «handlauf»', () => baueGelaender('handlauf'), {} as Erwartung],
    ['Geländer «staketen»', () => baueGelaender('staketen'), {} as Erwartung],
    ['Geländer «voll»', () => baueGelaender('voll'), {} as Erwartung],
    ['FreeMesh Quader', baueFreeMeshQuader, {} as Erwartung],
  ] as const)('%s', (name, bau, erwartung) => {
    const artifact = bau();
    expect(artifact.indices.length).toBeGreaterThan(0);
    pruefeInvarianten(name, artifact, erwartung);
  });
});
