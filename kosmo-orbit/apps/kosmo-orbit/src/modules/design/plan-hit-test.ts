import {
  assemblyThickness,
  columnOutline,
  wallOutline,
  type Assembly,
  type Aussparung,
  type Column,
  type KosmoDoc,
  type Opening,
  type Pt,
  type Stair,
  type Wall,
} from '@kosmo/kernel';

/**
 * Grundriss-Trefferzonen (ArchiCAD-Gefühl): reine Geometrie, unabhängig von
 * derivePlan/den Poché-Regionen (die dürfen für Auswahl/Ziehen NICHT
 * angefasst werden — das wäre eine Golden-Test-Änderung). Auswahl-Highlight
 * und Zieh-Vorschau im Plan greifen auf dieselben Funktionen zu.
 */

/** Punkt-in-Polygon (Ray-Casting), Welt-mm. */
export function pointInPolygon(poly: readonly Pt[], p: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Kürzeste Distanz Punkt→Segment (für Linienelemente: Wand, Treppe). */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return Math.hypot(p.x - qx, p.y - qy);
}

/** mm Toleranz zusätzlich zur halben Bauteildicke — grosszügig genug für Maus/Touch. */
const TOLERANZ = 120;

/** mm Toleranz fürs enge Aussparungs-Kästchen — bewusst klein, sonst gewinnt sie vor der Wand. */
const AUSSPARUNG_TOLERANZ = 40;

/** mm Toleranz fürs enge Öffnungs-Rechteck (Fenster/Tür) — dieselbe Grössen-
 * ordnung wie AUSSPARUNG_TOLERANZ: die Öffnung sitzt auf ihrer Wirtswand und
 * darf sie quer zur Achse nur knapp über die Wanddicke hinaus verdecken,
 * sonst wäre die Wand neben dem Fenster kaum noch greifbar. */
const OEFFNUNG_TOLERANZ = 40;

/**
 * Weltposition einer Aussparung am Wirt: Wand → Mitte auf der Achse a→b
 * (`center` mm ab a), Decke → `at` direkt. Fehlt der Wirt oder das nötige
 * Feld (kein Geometrieschnitt im Modell, siehe kosmo-kernel/model/entities.ts),
 * liefert die Funktion null statt zu raten.
 */
export function aussparungWeltpos(doc: KosmoDoc, a: Aussparung): Pt | null {
  const host = doc.get(a.hostId);
  if (!host) return null;
  if (host.kind === 'wall' && a.center !== undefined) {
    const dx = host.b.x - host.a.x;
    const dy = host.b.y - host.a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: host.a.x + (dx / len) * a.center, y: host.a.y + (dy / len) * a.center };
  }
  if (host.kind === 'slab' && a.at) return a.at;
  return null;
}

/** Achsrichtung des Wirts als Einheitsvektor (Wand: a→b; Decke: Welt-x — keine Vorzugsrichtung). */
function aussparungAchse(doc: KosmoDoc, a: Aussparung): Pt {
  const host = doc.get(a.hostId);
  if (host && host.kind === 'wall') {
    const dx = host.b.x - host.a.x;
    const dy = host.b.y - host.a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
  return { x: 1, y: 0 };
}

/** Symbol-Rechteck breite×hoehe um die Weltposition, an der Wirt-Achse ausgerichtet. */
function aussparungRect(doc: KosmoDoc, a: Aussparung, pos: Pt): Pt[] {
  const dir = aussparungAchse(doc, a);
  const nx = -dir.y;
  const ny = dir.x;
  const hb = a.breite / 2;
  const hh = a.hoehe / 2;
  return [
    { x: pos.x - dir.x * hb - nx * hh, y: pos.y - dir.y * hb - ny * hh },
    { x: pos.x + dir.x * hb - nx * hh, y: pos.y + dir.y * hb - ny * hh },
    { x: pos.x + dir.x * hb + nx * hh, y: pos.y + dir.y * hb + ny * hh },
    { x: pos.x - dir.x * hb + nx * hh, y: pos.y - dir.y * hb + ny * hh },
  ];
}

/**
 * Trifft der Klickpunkt die Aussparung? Enges, achsparalleles Kästchen um die
 * Weltposition (halbe grösste Kante + kleine Toleranz) — bewusst NICHT die
 * grosse Wand-Toleranz, sonst verdeckt jede Aussparung ihre Wand grossflächig.
 */
export function aussparungTreffer(doc: KosmoDoc, a: Aussparung, p: Pt): boolean {
  const pos = aussparungWeltpos(doc, a);
  if (!pos) return false;
  const half = Math.max(a.breite, a.hoehe) / 2 + AUSSPARUNG_TOLERANZ;
  return Math.abs(p.x - pos.x) <= half && Math.abs(p.y - pos.y) <= half;
}

/** Wirtswand einer Öffnung — null statt raten, falls sie fehlt (verwaiste Öffnung). */
function oeffnungWand(doc: KosmoDoc, o: Opening): Wall | null {
  const wall = doc.get(o.wallId);
  return wall && wall.kind === 'wall' ? wall : null;
}

/** Weltposition der Öffnungsmitte auf der Wandachse (a→b, `center` mm ab a). */
export function oeffnungWeltpos(doc: KosmoDoc, o: Opening): Pt | null {
  const wall = oeffnungWand(doc, o);
  if (!wall) return null;
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: wall.a.x + (dx / len) * o.center, y: wall.a.y + (dy / len) * o.center };
}

/**
 * Trifft der Klickpunkt die Öffnung (Fenster/Tür, inkl. parametrischer
 * Fenster)? Enges Rechteck AN der Wandachse: längs `center ± width/2`, quer
 * halbe Wanddicke — beides plus die kleine OEFFNUNG_TOLERANZ. Analog zum
 * Aussparungs-Kästchen bewusst NICHT die grosse Wand-Toleranz, damit die
 * Wirtswand daneben (und knapp quer zur Achse) gut greifbar bleibt.
 */
export function oeffnungTreffer(doc: KosmoDoc, o: Opening, p: Pt): boolean {
  const wall = oeffnungWand(doc, o);
  if (!wall) return false;
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const rx = p.x - wall.a.x;
  const ry = p.y - wall.a.y;
  const laengs = rx * ux + ry * uy;
  const quer = Math.abs(rx * -uy + ry * ux);
  const asm = doc.get<Assembly>(wall.assemblyId);
  const halbeDicke = asm && asm.kind === 'assembly' ? assemblyThickness(asm) / 2 : 150;
  return (
    Math.abs(laengs - o.center) <= o.width / 2 + OEFFNUNG_TOLERANZ &&
    quer <= halbeDicke + OEFFNUNG_TOLERANZ
  );
}

/** Symbol-Rechteck der Öffnung (width × Wanddicke), an der Wandachse ausgerichtet. */
function oeffnungRect(doc: KosmoDoc, o: Opening, pos: Pt): Pt[] | null {
  const wall = oeffnungWand(doc, o);
  if (!wall) return null;
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / len, y: dy / len };
  const nx = -dir.y;
  const ny = dir.x;
  const asm = doc.get<Assembly>(wall.assemblyId);
  const hb = o.width / 2;
  const hh = (asm && asm.kind === 'assembly' ? assemblyThickness(asm) : 300) / 2;
  return [
    { x: pos.x - dir.x * hb - nx * hh, y: pos.y - dir.y * hb - ny * hh },
    { x: pos.x + dir.x * hb - nx * hh, y: pos.y + dir.y * hb - ny * hh },
    { x: pos.x + dir.x * hb + nx * hh, y: pos.y + dir.y * hb + ny * hh },
    { x: pos.x - dir.x * hb + nx * hh, y: pos.y - dir.y * hb + ny * hh },
  ];
}

/**
 * Trefferzone am Klickpunkt: Aussparungen und Öffnungen zuerst (enge Zonen —
 * sie sitzen auf ihrem Wirt und würden sonst nie gewählt), dann Linien-/
 * Punktelemente (Wand, Stütze, Treppe — Achse ± halbe Dicke + Toleranz), dann
 * flächige Elemente (Punkt-in-Polygon). Liefert die erste passende Entity-Id,
 * sonst null.
 */
export function pickEntityAt(doc: KosmoDoc, storeyId: string, p: Pt): string | null {
  for (const a of doc.byKind<Aussparung>('aussparung')) {
    if (a.storeyId !== storeyId) continue;
    if (aussparungTreffer(doc, a, p)) return a.id;
  }
  // Öffnungen (Fenster/Tür, inkl. parametrischer Fenster) VOR der Wirtswand —
  // sonst gewinnt immer die Wand und die Öffnung wäre im Plan nie wählbar.
  // Leibungen bleiben aussen vor (reines Werkplan-Detail am Fensteranschlag,
  // kein eigenständig wählbares Symbol im Grundriss).
  for (const o of doc.byKind<Opening>('opening')) {
    if (o.openingType !== 'fenster' && o.openingType !== 'tuer') continue;
    const wall = oeffnungWand(doc, o);
    if (!wall || wall.storeyId !== storeyId) continue;
    if (oeffnungTreffer(doc, o, p)) return o.id;
  }
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const asm = doc.get<Assembly>(w.assemblyId);
    const half = asm && asm.kind === 'assembly' ? assemblyThickness(asm) / 2 : 150;
    if (distToSegment(p, w.a, w.b) <= half + TOLERANZ) return w.id;
  }
  for (const c of doc.byKind<Column>('column')) {
    if (c.storeyId !== storeyId) continue;
    if (pointInPolygon(columnOutline(c), p)) return c.id;
  }
  for (const s of doc.byKind<Stair>('stair')) {
    if (s.storeyId !== storeyId) continue;
    if (distToSegment(p, s.a, s.b) <= s.width / 2 + TOLERANZ) return s.id;
  }
  for (const e of doc.inStorey(storeyId)) {
    if (
      (e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'slab') &&
      pointInPolygon(e.outline, p)
    ) {
      return e.id;
    }
  }
  return null;
}

/** Grobes Treppen-Rechteck (Lauflinie a→b, Breite width) — nur Anzeige/Trefferzone. */
function stairRect(s: Stair): Pt[] {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (s.width / 2);
  const ny = (dx / len) * (s.width / 2);
  return [
    { x: s.a.x + nx, y: s.a.y + ny },
    { x: s.b.x + nx, y: s.b.y + ny },
    { x: s.b.x - nx, y: s.b.y - ny },
    { x: s.a.x - nx, y: s.a.y - ny },
  ];
}

/**
 * Umriss eines Elements für Auswahl-Highlight/Zieh-Vorschau — reine
 * Bildschirmdarstellung, nie Planinhalt (der kommt weiter aus derivePlan).
 */
export function outlineOf(doc: KosmoDoc, id: string): Pt[] | null {
  const e = doc.get(id);
  if (!e) return null;
  switch (e.kind) {
    case 'wall': {
      const asm = doc.get<Assembly>(e.assemblyId);
      return asm && asm.kind === 'assembly' ? wallOutline(e, asm) : null;
    }
    case 'zone':
    case 'mass':
    case 'roof':
    case 'slab':
      return e.outline;
    case 'column':
      return columnOutline(e);
    case 'stair':
      return stairRect(e);
    case 'aussparung': {
      const pos = aussparungWeltpos(doc, e);
      return pos ? aussparungRect(doc, e, pos) : null;
    }
    case 'opening': {
      const pos = oeffnungWeltpos(doc, e);
      return pos ? oeffnungRect(doc, e, pos) : null;
    }
    default:
      return null;
  }
}

/** Kinds, die `design.verschieben` unterstützt (siehe packages/kosmo-kernel/src/commands/design.ts).
 * `freemesh` seit Block 3 / E3 (design.ts hat einen eigenen freemesh-Zweig). */
export const VERSCHIEBBAR = new Set(['wall', 'slab', 'mass', 'zone', 'column', 'stair', 'roof', 'freemesh']);

/**
 * v0.8.9 E2 (PA2, `docs/V089-SPEZ.md` §3 E2, §7 C-3) — ist ein Element
 * gesperrt (`meta.locked`)? Reine Prüf-Funktion, NICHT Teil der
 * Trefferzonen-Logik oben: ein gesperrtes Element bleibt über
 * `pickEntityAt` unverändert FINDBAR (Sanktion 3 — die Sperre entfernt
 * nichts aus der Trefferliste, sie blockt nur den Interaktions-Pfad, der
 * es tatsächlich bewegt/löscht).
 *
 * **Cluster-B-Übergabepunkt an Fable** (PA2-Dateikreis erlaubt keinen
 * Eingriff in `DesignWorkspace.tsx`/`PlanView.tsx`, Betriebsregel 3/
 * Sanktion 6 — recherchiert, nicht angefasst): die drei Stellen, die
 * `istGesperrt(doc, id)` tatsächlich als Guard bräuchten, damit Sperren
 * auch am Canvas wirkt, sind
 * - `DesignWorkspace.tsx` `onMoveStart` (:1103–1113): vor
 *   `setDragEntity(...)`/`return true` early-return `false` (wie beim
 *   `beweglich`-Guard direkt daneben), wenn `istGesperrt(doc, id)`.
 * - `DesignWorkspace.tsx` `onGriffStart` (:1192–1213): analog, vor
 *   `setGriffDrag(...)`/`return true` early-return `false`.
 * - `DesignWorkspace.tsx`s Delete/Backspace-Keydown-Handler (:908–933):
 *   die Auswahl vor der `for (const id of selection)`-Schleife um
 *   gesperrte Ids filtern (`selection.filter((id) => !istGesperrt(doc,
 *   id))`), statt jede Id blind an `design.loeschen` zu reichen.
 * Diese drei Guards sind im PA2-Abschlussbericht (Punkt 3) noch einmal
 * wörtlich benannt.
 */
export function istGesperrt(doc: KosmoDoc, id: string): boolean {
  return doc.get(id)?.meta?.locked === true;
}

/**
 * Wand-Treffer für den Öffnung-Klickmodus (v0.8.3 E3, §3.2 `docs/V083-
 * SPEZ.md`) — «Treffertest analog zum bestehenden Wand-Hit-Test»: dieselbe
 * Achse-±-halbe-Dicke-+-Toleranz-Geometrie wie `pickEntityAt`s Wand-Schleife
 * oben, zusätzlich mit der longitudinalen Projektion (`center`, mm ab
 * Wandanfang `a`) für `design.oeffnungSetzen`. Liefert die NÄCHSTE Wand
 * (kleinste Distanz) im Geschoss, oder `null` ohne Treffer.
 */
export function wandTreffer(doc: KosmoDoc, storeyId: string, p: Pt): { wallId: string; center: number } | null {
  let beste: { wallId: string; center: number; dist: number } | null = null;
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const asm = doc.get<Assembly>(w.assemblyId);
    const half = asm && asm.kind === 'assembly' ? assemblyThickness(asm) / 2 : 150;
    const d = distToSegment(p, w.a, w.b);
    if (d > half + TOLERANZ) continue;
    if (beste && d >= beste.dist) continue;
    const dx = w.b.x - w.a.x;
    const dy = w.b.y - w.a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const center = Math.round((p.x - w.a.x) * ux + (p.y - w.a.y) * uy);
    beste = { wallId: w.id, center, dist: d };
  }
  return beste ? { wallId: beste.wallId, center: beste.center } : null;
}
