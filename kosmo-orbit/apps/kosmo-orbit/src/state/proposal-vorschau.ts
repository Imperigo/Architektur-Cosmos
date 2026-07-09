import {
  execute,
  isSettingsPatch,
  planInnerSvg,
  KosmoDoc,
  type AnyPatch,
  type Entity,
  type EntityKind,
  type Wall,
} from '@kosmo/kernel';

/**
 * Vorschau-Ableitung für Kosmo-Vorschläge (Owner-Befund K8, V0.6.3 Batch B1):
 * «Kosmo-Vorschläge zu klein/banal» → Stufe 1 macht die Diff-Karte visuell
 * statt nur Text. Der Vorschlag kennt Command-ID + Params VOR dem Anwenden
 * (siehe KosmoPanel `onProposal`) — diese Funktion führt genau diesen Command
 * auf einer TIEFEN KOPIE des Docs aus (nie das echte Doc, s.u.) und leitet aus
 * Vorher-/Nachher-Stand ein kompaktes Grundriss-Mini-SVG des betroffenen
 * Geschosses ab (Muster: `variant-archive.ts` `thumbVon()`, `planInnerSvg`
 * aus `@kosmo/kernel`). Diff-Hervorhebung: ein einfacher ID-Vergleich der
 * Patch-Entities reicht für Stufe 1 (neu/geändert farbig, gelöscht gestrichelt
 * im Vorher-Bild) — kein Anspruch auf pixelgenaue Bauteil-Umrisse.
 *
 * Ehrlichkeit vor Politur: Command-Fehler, Doc ohne betroffenes Geschoss oder
 * ein zu grosses Doc liefern `null` — der Aufrufer (KosmoPanel) fällt dann auf
 * die heutige reine Textkarte zurück, kein Hängen, kein Fake-Diff.
 */

type BBox = { minX: number; minY: number; maxX: number; maxY: number };

/** Ein Element-Wechsel zwischen Vorher- und Nachher-Doc. */
export interface ProposalVorschauEintrag {
  id: string;
  kind: EntityKind;
  art: 'neu' | 'geaendert' | 'geloescht';
}

export interface ProposalVorschau {
  /** Betroffenes Geschoss, auf das sich Vorher/Nachher beziehen. */
  storeyId: string;
  /** Eigenständiges SVG-Dokument, aktueller Stand (kein Diff-Ausschnitt). */
  vorherSvg: string;
  /** Eigenständiges SVG-Dokument, Stand nach Anwenden auf der Kopie. */
  nachherSvg: string;
  eintraege: ProposalVorschauEintrag[];
  /**
   * Ehrlicher Hinweis, wenn der Vorschlag mehrere Elemente umfasst (Typologie
   * statt Einzelwand) — `null` bei einem einzelnen betroffenen Element, da
   * dann der normale Kartentext bereits genügt.
   */
  typologieHinweis: string | null;
}

/**
 * Deckel: grosszügiges Vielfaches des R2-Lasttests im Kernel (500 Wände,
 * `deriveAll` ~100 ms lokal, s. `packages/kosmo-kernel/test/kernel.test.ts`).
 * `planInnerSvg` für EIN Geschoss ist günstiger als `deriveAll` fürs ganze
 * Doc — der Deckel schützt die Chat-UI nur vor echten Ausreissern (sehr
 * grosse Projekte), nicht vor normalem Betrieb.
 */
const VORSCHAU_ENTITY_DECKEL = 4000;

/** Plan-Massstab fürs Mini-SVG — wie `variant-archive.ts` `thumbVon()`. */
const VORSCHAU_SCALE = 200;

const FARBE_NEU = '#2f9e44';
const FARBE_GEAENDERT = '#f08c00';
const FARBE_GELOESCHT = '#e03131';

/** [Einzahl, Mehrzahl] — der Typologie-Hinweis zählt oft genau 1 Geschoss o.ä. */
const ARTEN_LABEL: Partial<Record<EntityKind, [string, string]>> = {
  wall: ['Wand', 'Wände'],
  slab: ['Decke', 'Decken'],
  opening: ['Öffnung', 'Öffnungen'],
  zone: ['Zone', 'Zonen'],
  mass: ['Volumenkörper', 'Volumenkörper'],
  boundary: ['Baulinie', 'Baulinien'],
  roof: ['Dach', 'Dächer'],
  stair: ['Treppe', 'Treppen'],
  beam: ['Träger', 'Träger'],
  column: ['Stütze', 'Stützen'],
  furniture: ['Möbel', 'Möbel'],
  grid: ['Achse', 'Achsen'],
  etikett: ['Etikett', 'Etiketten'],
  zonentuer: ['Zonentür', 'Zonentüren'],
  freemesh: ['Freiformkörper', 'Freiformkörper'],
  aussparung: ['Aussparung', 'Aussparungen'],
  terrain: ['Terrainpunkt', 'Terrainpunkte'],
  sheet: ['Blatt', 'Blätter'],
  imageasset: ['Bild', 'Bilder'],
  storey: ['Geschoss', 'Geschosse'],
  assembly: ['Aufbau', 'Aufbauten'],
  visgraph: ['Visgraph', 'Visgraphen'],
  mangel: ['Mangel', 'Mängel'],
};

function labelFuer(kind: EntityKind, anzahl: number): string {
  const paar = ARTEN_LABEL[kind];
  if (!paar) return kind;
  return anzahl === 1 ? paar[0] : paar[1];
}

interface Aenderung {
  id: string;
  kind: EntityKind;
  art: 'neu' | 'geaendert' | 'geloescht';
  /** Nachher-Entity bei neu/geändert, Vorher-Entity bei gelöscht. */
  entity: Entity;
}

function aenderungenVon(patches: readonly AnyPatch[]): Aenderung[] {
  const raus: Aenderung[] = [];
  for (const p of patches) {
    if (isSettingsPatch(p)) continue;
    if (p.before === null && p.after !== null) {
      raus.push({ id: p.id, kind: p.after.kind, art: 'neu', entity: p.after });
    } else if (p.before !== null && p.after === null) {
      raus.push({ id: p.id, kind: p.before.kind, art: 'geloescht', entity: p.before });
    } else if (p.before !== null && p.after !== null) {
      raus.push({ id: p.id, kind: p.after.kind, art: 'geaendert', entity: p.after });
    }
  }
  return raus;
}

/** Geschoss eines Elements — Öffnungen hängen an der Wand, nicht direkt am Geschoss. */
function storeyIdVon(e: Entity, referenzDoc: KosmoDoc): string | null {
  if ('storeyId' in e) return e.storeyId;
  if (e.kind === 'opening') {
    const wand = referenzDoc.get<Wall>(e.wallId);
    return wand && wand.kind === 'wall' ? wand.storeyId : null;
  }
  return null;
}

/** Mehrheitsentscheid übers betroffene Geschoss (meist eh nur eines). */
function ermittleStoreyId(aenderungen: Aenderung[], doc: KosmoDoc, clone: KosmoDoc): string | null {
  const zaehler = new Map<string, number>();
  for (const a of aenderungen) {
    const referenz = a.art === 'geloescht' ? doc : clone;
    const sid = storeyIdVon(a.entity, referenz);
    if (sid) zaehler.set(sid, (zaehler.get(sid) ?? 0) + 1);
  }
  let beste: string | null = null;
  let besteN = 0;
  for (const [id, n] of zaehler) {
    if (n > besteN) {
      besteN = n;
      beste = id;
    }
  }
  return beste;
}

function bboxVonPunkten(pts: { x: number; y: number }[], polster = 0): BBox | null {
  if (pts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - polster, minY: minY - polster, maxX: maxX + polster, maxY: maxY + polster };
}

/** Grobe Bounding-Box je Entity-Art — genügt für ein Hervorhebungs-Rechteck. */
function bboxVonEntity(referenzDoc: KosmoDoc, e: Entity): BBox | null {
  switch (e.kind) {
    case 'wall':
    case 'beam':
    case 'stair':
    case 'grid':
      return bboxVonPunkten([e.a, e.b], 150);
    case 'slab':
    case 'zone':
    case 'boundary':
    case 'mass':
    case 'roof':
      return bboxVonPunkten(e.outline);
    case 'column':
    case 'furniture':
    case 'etikett':
    case 'zonentuer':
      return bboxVonPunkten([e.at], 300);
    case 'freemesh': {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i + 1 < e.positions.length; i += 3) {
        pts.push({ x: e.positions[i]!, y: e.positions[i + 1]! });
      }
      return bboxVonPunkten(pts);
    }
    case 'opening': {
      const wand = referenzDoc.get<Wall>(e.wallId);
      if (!wand || wand.kind !== 'wall') return null;
      const laenge = Math.hypot(wand.b.x - wand.a.x, wand.b.y - wand.a.y) || 1;
      const dx = (wand.b.x - wand.a.x) / laenge;
      const dy = (wand.b.y - wand.a.y) / laenge;
      const mx = wand.a.x + dx * e.center;
      const my = wand.a.y + dy * e.center;
      const halb = e.width / 2;
      return bboxVonPunkten(
        [
          { x: mx - dx * halb, y: my - dy * halb },
          { x: mx + dx * halb, y: my + dy * halb },
        ],
        150,
      );
    }
    default:
      return null;
  }
}

function vereinigeBounds(a: BBox | null, b: BBox | null): BBox | null {
  if (!a) return b;
  if (!b) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Rechteck in SVG-Koordinaten (Y gespiegelt wie `planInnerSvg`s Grundriss). */
function hervorhebung(bb: BBox, farbe: string, gestrichelt: boolean): string {
  const x = bb.minX;
  const y = -bb.maxY;
  const w = Math.max(1, bb.maxX - bb.minX);
  const h = Math.max(1, bb.maxY - bb.minY);
  const dash = gestrichelt ? ' stroke-dasharray="220 160"' : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${farbe}" fill-opacity="0.25" stroke="${farbe}" stroke-width="70"${dash}/>`;
}

function typologieHinweisVon(aenderungen: Aenderung[]): string | null {
  if (aenderungen.length < 2) return null;
  const zaehler = new Map<EntityKind, number>();
  for (const a of aenderungen) zaehler.set(a.kind, (zaehler.get(a.kind) ?? 0) + 1);
  const teile = [...zaehler.entries()].map(([kind, n]) => `${n} ${labelFuer(kind, n)}`);
  return `Typologie-Vorschlag: ${teile.join(', ')}`;
}

/**
 * Führt `commandId`/`params` auf einer TIEFEN KOPIE von `doc` aus und liefert
 * ein Vorher/Nachher-Mini-SVG des betroffenen Geschosses — oder `null`, wenn
 * keine ehrliche Vorschau möglich ist (Command-Fehler, kein Geschoss
 * betroffen, leeres Ergebnis, Doc über dem Deckel). `doc` wird dabei NIE
 * mutiert: die Kopie entsteht über den etablierten `KosmoDoc.fromJSON(
 * structuredClone(doc.toJSON()))`-Weg (Muster aus den Kernel-Härtetests).
 */
export function vorschauFuerProposal(doc: KosmoDoc, commandId: string, params: unknown): ProposalVorschau | null {
  if (doc.entities.size > VORSCHAU_ENTITY_DECKEL) return null;

  let clone: KosmoDoc;
  let patches: AnyPatch[];
  try {
    clone = KosmoDoc.fromJSON(structuredClone(doc.toJSON()));
    const ergebnis = execute(clone, commandId, params);
    patches = ergebnis.patches;
  } catch {
    return null;
  }

  const aenderungen = aenderungenVon(patches);
  if (aenderungen.length === 0) return null;

  const storeyId = ermittleStoreyId(aenderungen, doc, clone);
  if (!storeyId) return null;

  let vorher;
  let nachher;
  try {
    vorher = planInnerSvg(doc, storeyId, VORSCHAU_SCALE);
    nachher = planInnerSvg(clone, storeyId, VORSCHAU_SCALE);
  } catch {
    return null;
  }

  const bounds = vereinigeBounds(vorher.bounds, nachher.bounds);
  if (!bounds) return null;
  const pad = 800;
  const vb = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + 2 * pad} ${bounds.maxY - bounds.minY + 2 * pad}`;

  const vorherHervorhebungen: string[] = [];
  const nachherHervorhebungen: string[] = [];
  for (const a of aenderungen) {
    if (a.art === 'geloescht') {
      const bb = bboxVonEntity(doc, a.entity);
      if (bb) vorherHervorhebungen.push(hervorhebung(bb, FARBE_GELOESCHT, true));
    } else {
      const bb = bboxVonEntity(clone, a.entity);
      if (bb) nachherHervorhebungen.push(hervorhebung(bb, a.art === 'neu' ? FARBE_NEU : FARBE_GEAENDERT, false));
    }
  }

  const svgHuelle = (inner: string, hervorhebungen: string[]): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}${hervorhebungen.join('')}</svg>`;

  return {
    storeyId,
    vorherSvg: svgHuelle(vorher.inner, vorherHervorhebungen),
    nachherSvg: svgHuelle(nachher.inner, nachherHervorhebungen),
    eintraege: aenderungen.map((a) => ({ id: a.id, kind: a.kind, art: a.art })),
    typologieHinweis: typologieHinweisVon(aenderungen),
  };
}
