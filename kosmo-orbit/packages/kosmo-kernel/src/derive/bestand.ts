import type { Pt } from '../model/units';

/**
 * Bestand-Erkennung (V2-A4) — aus tessellierten IFC-Meshes werden editierbare
 * Entities. Rein geometrisch und web-ifc-frei: die App liefert Vertex-Tripel
 * bereits in Kernel-Koordinaten (mm, z-oben), hier wird daraus je Element eine
 * Wand- oder Decken-Spezifikation abgeleitet — oder ehrlich `null`, wenn die
 * Form nicht quaderartig ist (dann bleibt das Element Kontext-Layer).
 */

export interface ErkannteWand {
  a: Pt;
  b: Pt;
  /** Wandstärke in mm (kurze Rechteckseite). */
  dicke: number;
  hoehe: number;
  /** Unterkante absolut (mm, Weltsystem). */
  z0: number;
}

export interface ErkannteDecke {
  outline: Pt[];
  dicke: number;
  /** Oberkante absolut (mm). */
  zOben: number;
}

interface MinRechteck {
  richtung: Pt; // Einheitsvektor lange Seite
  zentrum: Pt;
  laenge: number;
  breite: number;
  flaeche: number;
}

/** Konvexe Hülle (monotone chain), Eingabe unsortiert. */
export function konvexeHuelle(punkte: Pt[]): Pt[] {
  const pts = [...punkte].sort((p, q) => p.x - q.x || p.y - q.y);
  if (pts.length < 3) return pts;
  const kreuz = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const unten: Pt[] = [];
  for (const p of pts) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2]!, unten[unten.length - 1]!, p) <= 0) unten.pop();
    unten.push(p);
  }
  const oben: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (oben.length >= 2 && kreuz(oben[oben.length - 2]!, oben[oben.length - 1]!, p) <= 0) oben.pop();
    oben.push(p);
  }
  unten.pop();
  oben.pop();
  return [...unten, ...oben];
}

function polygonFlaeche(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}

/** Minimales umschliessendes Rechteck (rotating calipers über Hüllkanten). */
export function minimalesRechteck(punkte: Pt[]): MinRechteck | null {
  const huelle = konvexeHuelle(punkte);
  if (huelle.length < 3) return null;
  let bestes: MinRechteck | null = null;
  for (let i = 0; i < huelle.length; i++) {
    const p = huelle[i]!;
    const q = huelle[(i + 1) % huelle.length]!;
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 1e-9) continue;
    const d = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    const n = { x: -d.y, y: d.x };
    let minS = Infinity, maxS = -Infinity, minT = Infinity, maxT = -Infinity;
    for (const h of huelle) {
      const s = h.x * d.x + h.y * d.y;
      const t = h.x * n.x + h.y * n.y;
      if (s < minS) minS = s;
      if (s > maxS) maxS = s;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    const la = maxS - minS;
    const br = maxT - minT;
    const flaeche = la * br;
    if (!bestes || flaeche < bestes.flaeche) {
      const sMitte = (minS + maxS) / 2;
      const tMitte = (minT + maxT) / 2;
      const zentrum = { x: d.x * sMitte + n.x * tMitte, y: d.y * sMitte + n.y * tMitte };
      // lange Seite = Achse
      bestes =
        la >= br
          ? { richtung: d, zentrum, laenge: la, breite: br, flaeche }
          : { richtung: n, zentrum, laenge: br, breite: la, flaeche };
    }
  }
  return bestes;
}

/** Vertex-Tripel (mm, z-oben) → Grundriss-Punkte + z-Ausdehnung. */
function zerlege(positions: ArrayLike<number>): { xy: Pt[]; z0: number; z1: number } {
  const xy: Pt[] = [];
  let z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i + 2 < positions.length; i += 3) {
    xy.push({ x: positions[i]!, y: positions[i + 1]! });
    const z = positions[i + 2]!;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  }
  return { xy, z0, z1 };
}

/**
 * Wand-Erkennung: quaderartiges Element → Achse a–b, Dicke, Höhe.
 * `null`, wenn Masse oder Form nicht nach Wand aussehen (bleibt Kontext).
 */
export function erkenneWand(positions: ArrayLike<number>): ErkannteWand | null {
  const { xy, z0, z1 } = zerlege(positions);
  if (xy.length < 4) return null;
  const hoehe = z1 - z0;
  if (hoehe < 800 || hoehe > 12000) return null;
  const rect = minimalesRechteck(xy);
  if (!rect) return null;
  const { richtung, zentrum, laenge, breite } = rect;
  if (breite < 50 || breite > 1000) return null;
  if (laenge < 500 || laenge < breite * 2) return null;
  // Füllgrad: L-/T-förmige Footprints sind keine einzelne Wandachse
  const fuellung = polygonFlaeche(konvexeHuelle(xy)) / rect.flaeche;
  if (fuellung < 0.55) return null;
  const halb = laenge / 2;
  const r = (v: number) => Math.round(v);
  return {
    a: { x: r(zentrum.x - richtung.x * halb), y: r(zentrum.y - richtung.y * halb) },
    b: { x: r(zentrum.x + richtung.x * halb), y: r(zentrum.y + richtung.y * halb) },
    dicke: r(breite),
    hoehe: r(hoehe),
    z0: r(z0),
  };
}

/**
 * Decken-Erkennung: flaches, grossflächiges Element → Umriss (konvexe Hülle),
 * Dicke, Oberkante. `null` für alles, was nicht wie eine Platte aussieht.
 */
export function erkenneDecke(positions: ArrayLike<number>): ErkannteDecke | null {
  const { xy, z0, z1 } = zerlege(positions);
  if (xy.length < 4) return null;
  const dicke = z1 - z0;
  if (dicke < 60 || dicke > 700) return null;
  const huelle = konvexeHuelle(xy);
  if (huelle.length < 3) return null;
  const flaeche = polygonFlaeche(huelle);
  if (flaeche < 1_000_000) return null; // < 1 m² ist keine Geschossdecke
  const rect = minimalesRechteck(xy);
  if (rect && rect.breite < dicke * 3) return null; // hochkant → eher Wand/Balken
  const r = (v: number) => Math.round(v);
  return {
    outline: huelle.map((p) => ({ x: r(p.x), y: r(p.y) })),
    dicke: r(dicke),
    zOben: r(z1),
  };
}

export interface ErkanntesGeschoss {
  name: string;
  elevation: number;
}

/** Nächstliegendes Geschoss zu einer Unterkante (Toleranz mm), sonst -1. */
export function geschossZu(elevationen: number[], z: number, toleranz = 600): number {
  let best = -1;
  let dist = toleranz;
  elevationen.forEach((e, i) => {
    const d = Math.abs(e - z);
    if (d <= dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}
