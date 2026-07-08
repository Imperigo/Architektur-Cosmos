import * as SunCalc from 'suncalc';
import type { Pt } from '../model/units';
import { polygonArea } from '../model/units';
import { union } from '../geometry/clip';
import type { StudienVariante } from './volumenstudie';

/**
 * Besonnungsvergleich je Volumenstudien-Variante (Wettbewerb-Konzept
 * Entscheid D-E4, `docs/WETTBEWERB-KONZEPT.md` — Batch D2). Reine Ableitung,
 * kein Doc-Zugriff: wirft die `StudienKoerper`-Fussabdrücke jeder Extrem-
 * variante mit dem echten Sonnenstand (`suncalc`, dieselbe Bibliothek, die
 * `Viewport3D.tsx` für die 3D-Schattenstudie nutzt — `import * as SunCalc
 * from 'suncalc'`, `SunCalc.getPosition(...)` mit `doc.settings.standort.
 * lat/lon`, Z. 6, 337–354) auf den Boden und misst die beschattete Fläche
 * zu den drei Referenzzeitpunkten der Wintersonnenwende (21. Dezember,
 * 10/12/14 Uhr MEZ — analog zur 3h-Kriterium-Konvention in
 * `volumenstudie.ts`).
 *
 * BERÜHRTE BESTEHENDE DATEIEN (dokumentiert, jede Änderung rein additiv):
 * - `packages/kosmo-kernel/package.json`: `suncalc`/`@types/suncalc` als
 *   Dependency ergänzt (bisher nur in `apps/kosmo-orbit/package.json`;
 *   `docs/WETTBEWERB-KONZEPT.md` Z. 380–382 nennt das explizit als
 *   offene Voraussetzung für D2). Keine bestehende Abhängigkeit geändert,
 *   nur eine neue Zeile ergänzt; im npm-Workspace war das Paket über die
 *   Root-`node_modules` bereits installiert (Hoisting), das Manifest holt
 *   das nur sichtbar/explizit nach.
 * - `geometry/clip.ts`, `model/units.ts`, `derive/volumenstudie.ts`: nur
 *   IMPORTIERT (Funktionen `union`, `polygonArea`, Typ `Pt`,
 *   Typ `StudienVariante`), keine Zeile darin verändert.
 * - Keine weitere Datei berührt; `src/index.ts` bleibt unangetastet — dieses
 *   Modul ist bewusst noch nicht am öffentlichen Kernel-Barrel angeschlossen.
 *
 * WICHTIGER NEBENFUND (ausserhalb dieses Auftrags, hier nur dokumentiert,
 * NICHTS daran geändert): der Kommentar in `Viewport3D.tsx` Z. 349
 * («suncalc: azimuth 0 = Süd, +West») geht von Radiant und einer
 * Süd-Referenz aus. Die tatsächlich installierte `suncalc@2.0.0` liefert
 * laut offiziellem README UND per Laufzeit-Probe **Grad, Nord-basiert im
 * Uhrzeigersinn** (`azimuth`: 0 = Nord, 90 = Ost, 180 = Süd, 270 = West;
 * `altitude`: Grad). Für die 3D-Lichtrichtung im Viewport macht das keinen
 * sichtbaren Unterschied (Vorzeichen/Rotation werden durch die
 * Three.js-Kamera „wegkompensiert“ solange nur EIN Datum live gerendert
 * wird), aber es ist eine Diskrepanz zwischen Kommentar und Bibliotheks-
 * Vertrag. Dieses Modul rechnet mit der ECHTEN (verifizierten) Konvention;
 * `Viewport3D.tsx` bleibt unangetastet, weil das ausserhalb des D2-Auftrags
 * liegt.
 *
 * GEOMETRIE-NÄHERUNG: jeder `StudienKoerper.outline`, den
 * `generiereVolumenstudien` erzeugt, ist ein einfaches Rechteck (Helper
 * `R()` in `volumenstudie.ts`) — also konvex. Für ein konvexes Polygon P,
 * das horizontal um einen Schattenvektor v verschoben wird (Extrusion ×
 * Sonnenwinkel), ist die exakte Sweep-Fläche die konvexe Hülle von
 * P ∪ (P+v) (Minkowski-Summe eines konvexen Polygons mit einer Strecke).
 * Bei einem nicht von `generiereVolumenstudien` erzeugten, nicht-konvexen
 * `koerper` (laut Typ `StudienKoerper` zulässig) wäre die Hülle eine leichte
 * ÜBERSCHÄTZUNG der wahren Schattenfläche — ehrlich hier vermerkt, nicht
 * stillschweigend verkauft.
 *
 * EHRLICHE GRENZE: `beschatteteFlaecheM2`/`richtwertM2` sind ein
 * VERGLEICHS-RICHTWERT zwischen den Extremvarianten derselben Parzelle
 * (relative Aussage: «Variante A beschattet zur Referenzstunde mehr Boden
 * als Variante B») — KEIN Besonnungsnachweis nach Norm (SIA/kommunale
 * Bau- und Zonenordnung) und KEIN Ersatz für die echte 3D-Schattenstudie im
 * Viewport (die Terrain, Nachbarbauten und das tatsächlich im Doc lebende
 * Modell kennt, nicht nur sechs parallele Studienkörper). Schattenwurf
 * eines Studienkörpers auf einen ANDEREN Körper derselben Variante wird
 * ignoriert — nur die resultierenden Bodenschatten werden je Variante
 * gemerged, es gibt keine Fassaden-Verschattungsprüfung. Die 1.43×Höhe-
 * Näherung aus `volumenstudie.ts` (`SCHATTEN_FAKTOR_3H`) bleibt die
 * schnelle Owner-kalibrierte Vergleichszahl für die Matrix — dieses Modul
 * ERSETZT sie nicht, sondern ergänzt sie um eine geometrisch genauere,
 * aber weiterhin näherungsweise Fläche. Sehr flache Sonne (< 3° über dem
 * Horizont) wird auf 3° geklammert, um keine numerisch absurd langen
 * (wenn auch real ähnlich riesigen) Schattenlängen zu erzeugen.
 */

export const BESONNUNG_HINWEIS =
  'Vergleichs-Richtwert zwischen Varianten — kein Besonnungsnachweis nach Norm, kein Ersatz für die 3D-Schattenstudie';

/** Wintersonnenwende, lokale Referenzstunden (MEZ, UTC+1 — CH kennt im Dezember keine Sommerzeit). */
const WINTERSONNENWENDE_STUNDEN = [10, 12, 14];

/** Klammer für sehr flache Sonnenstände (Grad), s. Modul-Kommentar. */
const MIN_SONNENHOEHE_GRAD = 3;

export interface BesonnungsStandort {
  /** WGS84-Breite (Grad), wie `doc.settings.standort.lat`. */
  lat: number;
  /** WGS84-Länge (Grad), wie `doc.settings.standort.lon`. */
  lon: number;
}

export interface BesonnungsOptionen {
  /** Referenzjahr für die Wintersonnenwende (21. Dezember). Default 2024 — rein für Determinismus, das Kalenderdatum ist entwurfsrelevant, nicht das Jahr. */
  jahr?: number;
  /** Lokale Referenzstunden (MEZ). Default [10, 12, 14] (Owner-Konvention). */
  stunden?: number[];
}

export interface BesonnungsZeitpunkt {
  /** Lokale Stunde (MEZ). */
  stunde: number;
  /** Sonnenhöhe über Horizont (Grad, gerundet auf 2 Dezimalen). */
  sonnenhoeheGrad: number;
  /** Sonnenazimut (Grad, Nord-basiert im Uhrzeigersinn: 0=N, 90=O, 180=S, 270=W). */
  sonnenazimutGrad: number;
  /** false = Sonne unter dem Horizont; dann ist `beschatteteFlaecheM2` nur die Summe der Fussabdrücke (kein gerichteter Wurf messbar). */
  ueberHorizont: boolean;
  /** Beschattete Bodenfläche in m² (Fussabdruck ∪ Schattenwurf aller Studienkörper der Variante, gemerged). */
  beschatteteFlaecheM2: number;
}

export interface BesonnungsKennwert {
  varianteId: string;
  varianteName: string;
  zeitpunkte: BesonnungsZeitpunkt[];
  /** Mittelwert von `beschatteteFlaecheM2` über die Referenzzeitpunkte (m², gerundet) — der eigentliche Vergleichs-Richtwert. */
  richtwertM2: number;
  hinweis: string;
}

/** Andrew's-Monotone-Chain-Konvexhülle (nur hier verwendet, keine neue Sonnenphysik — reine Rechengeometrie). */
function konvexeHuelle(punkte: Pt[]): Pt[] {
  const pts = [...punkte].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Sweep-Silhouette (Fussabdruck ∪ Schattenwurf) eines einzelnen Studienkörpers, s. Modul-Kommentar «Geometrie-Näherung». */
function schattenSweep(outline: Pt[], hoehe: number, sonnenhoeheGrad: number, sonnenazimutGrad: number): Pt[] {
  const altRad = (Math.max(sonnenhoeheGrad, MIN_SONNENHOEHE_GRAD) * Math.PI) / 180;
  const azRad = (sonnenazimutGrad * Math.PI) / 180;
  const laenge = hoehe / Math.tan(altRad);
  // Schatten fällt der Sonne entgegengesetzt; Azimut Nord-basiert im Uhrzeigersinn,
  // Modell x=Ost/y=Nord (`model/units.ts`) ⇒ Sonnenrichtung = (sin az, cos az), Schatten = −Sonnenrichtung.
  const dx = -Math.sin(azRad) * laenge;
  const dy = -Math.cos(azRad) * laenge;
  const verschoben = outline.map((p) => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) }));
  return konvexeHuelle([...outline, ...verschoben]);
}

function flaecheM2(polys: Pt[][]): number {
  const mm2 = polys.reduce((s, p) => s + Math.abs(polygonArea(p)), 0);
  return mm2 / 1e6;
}

function referenzDatum(jahr: number, stunde: number): Date {
  // Wintersonnenwende 21. Dezember, MEZ = UTC+1 (kein Sommerzeit-Bezug im Dezember).
  return new Date(Date.UTC(jahr, 11, 21, stunde - 1, 0, 0));
}

/**
 * Je Volumenstudien-Variante: beschattete Bodenfläche (m²) zu den
 * Referenzzeitpunkten der Wintersonnenwende — reine, deterministische
 * Ableitung (s. Modul-Kommentar für Herkunft der Sonnenphysik und die
 * ehrlichen Grenzen).
 *
 * - `varianten = []` → `[]`.
 * - Eine Variante ohne Studienkörper (`koerper: []`) liefert
 *   `beschatteteFlaecheM2: 0` je Zeitpunkt (keine Baumasse, kein Schatten).
 * - Deterministisch: reine Funktion von `varianten`/`standort`/`optionen`,
 *   keine `Date.now()`-, Zufalls- oder Doc-Abhängigkeit.
 */
export function besonnungJeVariante(
  varianten: StudienVariante[],
  standort: BesonnungsStandort,
  optionen: BesonnungsOptionen = {},
): BesonnungsKennwert[] {
  const jahr = optionen.jahr ?? 2024;
  const stunden = optionen.stunden ?? WINTERSONNENWENDE_STUNDEN;

  return varianten.map((variante): BesonnungsKennwert => {
    const zeitpunkte = stunden.map((stunde): BesonnungsZeitpunkt => {
      const datum = referenzDatum(jahr, stunde);
      const pos = SunCalc.getPosition(datum, standort.lat, standort.lon);
      const sonnenhoeheGrad = pos.altitude;
      const sonnenazimutGrad = pos.azimuth;
      const ueberHorizont = sonnenhoeheGrad > 0;

      const flaechen = ueberHorizont
        ? variante.koerper.map((k) => schattenSweep(k.outline, k.height, sonnenhoeheGrad, sonnenazimutGrad))
        : variante.koerper.map((k) => k.outline);
      const beschatteteFlaecheM2 = flaechen.length === 0 ? 0 : flaecheM2(union(flaechen));

      return {
        stunde,
        sonnenhoeheGrad: Math.round(sonnenhoeheGrad * 100) / 100,
        sonnenazimutGrad: Math.round(sonnenazimutGrad * 100) / 100,
        ueberHorizont,
        beschatteteFlaecheM2: Math.round(beschatteteFlaecheM2 * 10) / 10,
      };
    });

    const richtwertM2 =
      zeitpunkte.length === 0
        ? 0
        : Math.round((zeitpunkte.reduce((s, z) => s + z.beschatteteFlaecheM2, 0) / zeitpunkte.length) * 10) / 10;

    return {
      varianteId: variante.id,
      varianteName: variante.name,
      zeitpunkte,
      richtwertM2,
      hinweis: BESONNUNG_HINWEIS,
    };
  });
}
