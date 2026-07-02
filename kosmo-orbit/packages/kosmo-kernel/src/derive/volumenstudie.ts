import type { Pt } from '../model/units';
import { polygonArea } from '../model/units';
import { offsetPolygon } from '../geometry/clip';

/**
 * Volumenstudien-Generator (Q12, Vorform-Essenz) — Extremvarianten in der
 * Parzelle: Teppich, Riegel, Turm, Zeilen, Winkel. Jede Variante zielt aufs
 * GF-Programm; was die Höhenvorgabe sprengt, wird ehrlich markiert statt
 * versteckt. Entwurfs-Anstoss, kein Entwurfsersatz.
 */

export interface StudienOptionen {
  /** GF-Ziel in m² (z.B. aGF-Ziel aus den Kennzahlen). */
  zielGf: number;
  /** Geschosshöhe mm (Standard 3000). */
  geschosshoehe?: number;
  /** Maximale Gebäudehöhe mm (Zonenrecht), Standard 25 m. */
  maxHoehe?: number;
  /** Grenzabstand mm (Standard 4 m). */
  grenzabstand?: number;
}

export interface StudienKoerper {
  outline: Pt[];
  height: number;
  program: string;
}

export interface StudienVariante {
  id: string;
  name: string;
  beschrieb: string;
  koerper: StudienKoerper[];
  /** Erreichte GF in m² (Fussabdruck × Geschosse). */
  gf: number;
  geschosse: number;
  hoehe: number;
  /** false: braucht mehr Höhe als erlaubt, um das Programm zu fassen. */
  passt: boolean;
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

function bbox(poly: Pt[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

const R = (x: number, y: number, w: number, h: number): Pt[] => [
  { x: Math.round(x), y: Math.round(y) },
  { x: Math.round(x + w), y: Math.round(y) },
  { x: Math.round(x + w), y: Math.round(y + h) },
  { x: Math.round(x), y: Math.round(y + h) },
];

export function generiereVolumenstudien(parzelle: Pt[], opts: StudienOptionen): StudienVariante[] {
  const gh = opts.geschosshoehe ?? 3000;
  const maxH = opts.maxHoehe ?? 25000;
  const abstand = opts.grenzabstand ?? 4000;
  const maxGeschosse = Math.max(Math.floor(maxH / gh), 1);

  const innen = offsetPolygon(parzelle, -abstand)[0];
  if (!innen || innen.length < 3) return [];
  const b = bbox(innen);
  const quer = Math.min(b.w, b.h);
  const laengs = Math.max(b.w, b.h);
  const liegend = b.w >= b.h; // Längsachse Ost-West?

  const variante = (
    id: string,
    name: string,
    beschrieb: string,
    footprints: Pt[][],
  ): StudienVariante | null => {
    const flaeche = footprints.reduce((s, f) => s + polygonArea(f), 0) / 1e6;
    if (flaeche < 40) return null;
    const geschosse = Math.min(Math.max(Math.ceil(opts.zielGf / flaeche), 1), maxGeschosse);
    const passt = flaeche * maxGeschosse >= opts.zielGf * 0.98;
    return {
      id,
      name,
      beschrieb,
      koerper: footprints.map((f) => ({ outline: f, height: geschosse * gh, program: 'studie' })),
      gf: Math.round(flaeche * geschosse),
      geschosse,
      hoehe: geschosse * gh,
      passt,
    };
  };

  const out: (StudienVariante | null)[] = [];

  // 1) Teppich: die ganze nutzbare Parzelle, so flach wie möglich
  out.push(variante('teppich', 'Teppich', 'Maximaler Fussabdruck, minimale Höhe — dichtes Flachnetz.', [innen]));

  // 2) Riegel: ein Balken entlang der Längsachse
  const riegelBreite = Math.min(14000, quer);
  out.push(
    variante(
      'riegel',
      'Riegel',
      'Ein Balken entlang der Längsachse — klare Adresse, viel Freiraum.',
      [
        liegend
          ? R(b.minX, b.minY + (b.h - riegelBreite) / 2, laengs, riegelBreite)
          : R(b.minX + (b.w - riegelBreite) / 2, b.minY, riegelBreite, laengs),
      ],
    ),
  );

  // 3) Turm: kompakter Punkt, maximale Höhe
  const seite = Math.min(quer, 24000);
  out.push(
    variante('turm', 'Turm', 'Kleinster Fussabdruck, maximale Höhe — Fernwirkung, Boden bleibt frei.', [
      R(b.minX + (b.w - seite) / 2, b.minY + (b.h - seite) / 2, seite, seite),
    ]),
  );

  // 4) Zeilen: zwei parallele Balken, wenn die Parzelle es hergibt
  const zeilenBreite = 12000;
  if (quer >= zeilenBreite * 2 + 8000) {
    const gasse = quer - 2 * zeilenBreite;
    out.push(
      variante('zeilen', 'Zeilen', 'Zwei parallele Zeilen mit besonnter Gasse dazwischen.', [
        liegend
          ? R(b.minX, b.minY, laengs, zeilenBreite)
          : R(b.minX, b.minY, zeilenBreite, laengs),
        liegend
          ? R(b.minX, b.minY + zeilenBreite + gasse, laengs, zeilenBreite)
          : R(b.minX + zeilenBreite + gasse, b.minY, zeilenBreite, laengs),
      ]),
    );
  }

  // 5) Winkel: L-Form an Süd- und Westkante — gefasster Hof nach Nordost
  const wb = Math.min(13000, quer / 2);
  if (b.w > wb * 2 && b.h > wb * 2) {
    out.push(
      variante('winkel', 'Winkel', 'L-Form fasst einen geschützten Hof — Rücken zur Grenze.', [
        R(b.minX, b.minY, b.w, wb),
        R(b.minX, b.minY + wb, wb, b.h - wb),
      ]),
    );
  }

  return out.filter((v): v is StudienVariante => v !== null);
}
