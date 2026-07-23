import type { Rampe } from '../model/entities';
import { dist, type Mm, type Pt } from '../model/units';

/**
 * Rampen-Zerlegung (v0.9.1 P-A2, `docs/V091-SPEZ.md` §P-A2) — EINE Wahrheit
 * für das Steigungs-Gate (`commands/design.ts`), die 3D-Extrusion
 * (`derive/scene.ts`) und die künftigen Plan-Bausteine (P-B3): die Steigung
 * wird NIE gespeichert, immer aus den Rohwerten der Entity neu gerechnet —
 * dasselbe Muster wie `derive/treppe.ts` (`stairSpec`/`treppenTeile`). Die
 * Plan-Bausteine (`plan`) sind reine DATEN — dieses Paket hängt sie
 * bewusst NICHT in `derive/plan.ts` ein (das macht P-B3).
 */

/** Geneigte Platte fürs 3D: a liegt auf Geschossniveau (z0), b auf z0+hoehenDelta. */
export interface RampenPlatte {
  a: Pt;
  b: Pt;
  width: Mm;
  z0: number;
  z1: number;
}

/** Grundriss-Bausteine — reine Daten, noch ohne Plan-Einbau (P-B3 macht die SVG-Seite). */
export interface RampenPlanBausteine {
  /** Kontur a→b × width als Rechteck, CCW (Analogie zu `columnOutline`). */
  kontur: [Pt, Pt, Pt, Pt];
  /** Lauflinie (Mittelachse) a→b. */
  lauflinie: { a: Pt; b: Pt };
  /** Steigungspfeil: Schaft am Fuss (a), Spitze am Kopf (b, zeigt bergauf), plus %-Text. */
  pfeil: { schaft: Pt; spitze: Pt; text: string };
  /** Querlinie am Übergang Lauf→Podest (v0.9.2 P-G, `docs/V092-SPEZ.md`
   * §P-G) — NUR vorhanden, wenn `r.podestLaenge` gesetzt UND > 0 ist
   * (Daten-Guard, Sanktion 5: ohne gesetztes Feld exakt Bestandsverhalten,
   * das Golden-Fixture `gelaender-rampe-plan.svg` trägt kein Podest und
   * bleibt so byte-still). Liegt am Übergangspunkt (Abstand `lauflaenge`
   * ab `a`, also `laenge - podestLaenge` — dieselbe Reststrecke wie
   * `rampSteigungProzent`), quer über die volle `width`. Reines Daten-
   * Feld — der Plan-Einbau (App-Overlay) ist P-D/Fable-Sache, NICHT
   * dieses Pakets (`derive/plan.ts` bleibt unangetastet). */
  podestTrennlinie?: { a: Pt; b: Pt };
}

export interface RampenTeile {
  /** Steigung in Prozent (hoehenDelta/Lauflänge × 100, Podest abgezogen). */
  steigungProzent: number;
  platte: RampenPlatte;
  plan: RampenPlanBausteine;
}

/**
 * Steigung in Prozent aus Höhendifferenz und Lauflänge. Ein optionales
 * Podest (ebenes Zwischenstück am Kopfende, `podestLaenge`) zählt NICHT zur
 * Steigungsstrecke ab — die Rampe muss die volle Höhendifferenz auf der
 * kürzeren Reststrecke schaffen, das ist die strengere (ehrliche) Annahme
 * statt einer geschönten Durchschnittssteigung über die Gesamtlänge.
 * `Math.max(1, …)` verhindert nur die Division durch 0 bei einem Podest ≥
 * Lauflänge — die Steigung wird dann bewusst sehr hoch und lässt das
 * Command-Gate greifen, statt still geklemmt zu werden (Sanktion 4).
 */
export function rampSteigungProzent(a: Pt, b: Pt, hoehenDelta: Mm, podestLaenge?: Mm): number {
  const laenge = dist(a, b);
  const lauflaenge = Math.max(1, laenge - (podestLaenge ?? 0));
  return (hoehenDelta / lauflaenge) * 100;
}

/**
 * EINE Zerlegungsfunktion für die ganze Rampe: `elevation` (OK Boden des
 * Geschosses, mm) kommt wie bei `treppenTeile` von aussen, weil die Platte
 * eine absolute Z-Lage braucht — die Entity selbst kennt nur `hoehenDelta`
 * relativ zu ihrem Fusspunkt.
 */
export function rampenTeile(r: Rampe, elevation: number): RampenTeile {
  const laenge = dist(r.a, r.b);
  const steigungProzent = rampSteigungProzent(r.a, r.b, r.hoehenDelta, r.podestLaenge);
  const d = laenge > 0 ? { x: (r.b.x - r.a.x) / laenge, y: (r.b.y - r.a.y) / laenge } : { x: 1, y: 0 };
  const n = { x: -d.y, y: d.x };
  const half = r.width / 2;
  const kontur: [Pt, Pt, Pt, Pt] = [
    { x: r.a.x + n.x * half, y: r.a.y + n.y * half },
    { x: r.b.x + n.x * half, y: r.b.y + n.y * half },
    { x: r.b.x - n.x * half, y: r.b.y - n.y * half },
    { x: r.a.x - n.x * half, y: r.a.y - n.y * half },
  ];
  return {
    steigungProzent,
    platte: { a: r.a, b: r.b, width: r.width, z0: elevation, z1: elevation + r.hoehenDelta },
    plan: {
      kontur,
      lauflinie: { a: r.a, b: r.b },
      pfeil: { schaft: r.a, spitze: r.b, text: `${steigungProzent.toFixed(1)} %` },
      // v0.9.2 P-G: nur bei gesetztem UND positivem podestLaenge — 0/undefined
      // lässt das Feld ganz weg (exactOptionalPropertyTypes, Sanktion 5).
      ...(r.podestLaenge !== undefined && r.podestLaenge > 0
        ? {
            podestTrennlinie: (() => {
              const lauflaenge = Math.max(0, laenge - r.podestLaenge);
              const m: Pt = { x: r.a.x + d.x * lauflaenge, y: r.a.y + d.y * lauflaenge };
              return {
                a: { x: m.x + n.x * half, y: m.y + n.y * half },
                b: { x: m.x - n.x * half, y: m.y - n.y * half },
              };
            })(),
          }
        : {}),
    },
  };
}
