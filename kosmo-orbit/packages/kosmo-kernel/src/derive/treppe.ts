import type { Stair } from '../model/entities';
import type { Pt } from '../model/units';


/**
 * Treppen-Geometrie (V2-A2) — EINE Zerlegung für 3D, Plansymbol und Checks:
 * jede Treppenform wird zu geraden LÄUFEN (mit Steigungsanteil) und flachen
 * PODESTEN. Formen: gerade · podest (Zwischenpodest im Lauf) · u (zwei
 * parallele Läufe, Wendepodest) · l (gewendelt über Eckpodest, freier Winkel).
 */

export interface TreppenLauf {
  a: Pt;
  b: Pt;
  z0: number;
  /** Anzahl Steigungen in diesem Lauf. */
  steigungen: number;
  riser: number;
  going: number;
}

export interface TreppenPodest {
  outline: Pt[];
  /** Oberkante des Podests. */
  z: number;
}

export interface TreppenTeile {
  laeufe: TreppenLauf[];
  podeste: TreppenPodest[];
  gesamtLauflaenge: number;
  spec: ReturnType<typeof stairSpec>;
}

/** Steigungsrechnung: n Steigungen à s (Ideal ~175, 2s+a≈630), Auftritte a. */
export function stairSpec(runLength: number, floorHeight: number) {
  const n = Math.max(3, Math.round(floorHeight / 175));
  const riser = floorHeight / n;
  const going = runLength / (n - 1); // Austritt liegt auf OK — letzter Tritt = Decke
  const minRun = (Math.max(3, Math.ceil(floorHeight / 200)) - 1) * 230;
  return { steps: n, riser, going, comfort: 2 * riser + going, minRun };
}

const dir = (a: Pt, b: Pt) => {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
};
const links = (d: { x: number; y: number }) => ({ x: -d.y, y: d.x });
const plus = (p: Pt, d: { x: number; y: number }, s: number): Pt => ({
  x: Math.round(p.x + d.x * s),
  y: Math.round(p.y + d.y * s),
});

/** Konvexe Hülle (Andrew) — fürs Eckpodest des L-Laufs bei freiem Winkel. */
function hull(pts: Pt[]): Pt[] {
  const s = [...pts].sort((p, q) => p.x - q.x || p.y - q.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of [...s].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function treppenTeile(stair: Stair, floorHeight: number, elevation: number): TreppenTeile {
  const form = stair.form ?? 'gerade';
  const w = stair.width;
  const z0 = elevation;

  if (form === 'gerade') {
    const len = Math.hypot(stair.b.x - stair.a.x, stair.b.y - stair.a.y);
    const spec = stairSpec(len, floorHeight);
    return {
      laeufe: [{ a: stair.a, b: stair.b, z0, steigungen: spec.steps, riser: spec.riser, going: spec.going }],
      podeste: [],
      gesamtLauflaenge: len,
      spec,
    };
  }

  if (form === 'podest') {
    // Zwischenpodest in Laufmitte: Podesttiefe ≥ Laufbreite (SIA-Lesart)
    const d = dir(stair.a, stair.b);
    const nl = links(d);
    const len = Math.hypot(stair.b.x - stair.a.x, stair.b.y - stair.a.y);
    const tiefe = Math.max(w, 1000);
    const laufLen = Math.max(1, (len - tiefe) / 2);
    const spec = stairSpec(laufLen * 2, floorHeight);
    const n1 = Math.max(1, Math.round(spec.steps / 2));
    const n2 = Math.max(1, spec.steps - n1);
    const m1 = plus(stair.a, d, laufLen);
    const m2 = plus(m1, d, tiefe);
    const zMid = z0 + n1 * spec.riser;
    return {
      laeufe: [
        { a: stair.a, b: m1, z0, steigungen: n1, riser: spec.riser, going: laufLen / n1 },
        { a: m2, b: stair.b, z0: zMid, steigungen: n2, riser: spec.riser, going: laufLen / n2 },
      ],
      podeste: [
        { outline: [plus(m1, nl, w / 2), plus(m2, nl, w / 2), plus(m2, nl, -w / 2), plus(m1, nl, -w / 2)], z: zMid },
      ],
      gesamtLauflaenge: laufLen * 2,
      spec,
    };
  }

  if (form === 'u') {
    // Zwei parallele Läufe, Wendepodest hinter b; Austritt neben dem Antritt
    const d = dir(stair.a, stair.b);
    const nl = links(d);
    const len = Math.hypot(stair.b.x - stair.a.x, stair.b.y - stair.a.y);
    const tiefe = Math.max(w, 1000);
    const spec = stairSpec(len * 2, floorHeight);
    const n1 = Math.max(1, Math.round(spec.steps / 2));
    const n2 = Math.max(1, spec.steps - n1);
    const zMid = z0 + n1 * spec.riser;
    const a2 = plus(stair.a, nl, w);
    const b2 = plus(stair.b, nl, w);
    return {
      laeufe: [
        { a: stair.a, b: stair.b, z0, steigungen: n1, riser: spec.riser, going: len / n1 },
        { a: b2, b: a2, z0: zMid, steigungen: n2, riser: spec.riser, going: len / n2 },
      ],
      podeste: [
        {
          outline: [
            plus(stair.b, nl, -w / 2),
            plus(plus(stair.b, nl, -w / 2), d, tiefe),
            plus(plus(b2, nl, w / 2), d, tiefe),
            plus(b2, nl, w / 2),
          ],
          z: zMid,
        },
      ],
      gesamtLauflaenge: len * 2,
      spec,
    };
  }

  // l — gewendelt über Eckpodest (freier Winkel); ohne ecke: gerade Rückfallebene
  const ecke = stair.ecke ?? stair.b;
  const d1 = dir(stair.a, ecke);
  const d2 = dir(ecke, stair.b);
  const m1 = plus(ecke, d1, -w / 2);
  const m2 = plus(ecke, d2, w / 2);
  const len1 = Math.max(1, Math.hypot(m1.x - stair.a.x, m1.y - stair.a.y));
  const len2 = Math.max(1, Math.hypot(stair.b.x - m2.x, stair.b.y - m2.y));
  const spec = stairSpec(len1 + len2, floorHeight);
  const n1 = Math.max(1, Math.round((spec.steps * len1) / (len1 + len2)));
  const n2 = Math.max(1, spec.steps - n1);
  const zMid = z0 + n1 * spec.riser;
  const nl1 = links(d1);
  const nl2 = links(d2);
  return {
    laeufe: [
      { a: stair.a, b: m1, z0, steigungen: n1, riser: spec.riser, going: len1 / n1 },
      { a: m2, b: stair.b, z0: zMid, steigungen: n2, riser: spec.riser, going: len2 / n2 },
    ],
    podeste: [
      {
        outline: hull([
          plus(m1, nl1, w / 2),
          plus(m1, nl1, -w / 2),
          plus(m2, nl2, w / 2),
          plus(m2, nl2, -w / 2),
        ]),
        z: zMid,
      },
    ],
    gesamtLauflaenge: len1 + len2,
    spec,
  };
}
