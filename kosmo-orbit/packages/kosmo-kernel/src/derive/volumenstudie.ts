import type { Pt } from '../model/units';
import { polygonArea } from '../model/units';
import { offsetPolygon } from '../geometry/clip';
import type { ZonenRegel } from '../model/doc';

/**
 * Volumenstudien-Generator (Q12 + Phase 3.27, Vorform-Essenz) — Extrem-
 * varianten in der Parzelle: Teppich, Riegel, Turm, Zeilen, Winkel,
 * Blockrand. Jede Variante zielt aufs GF-Programm; was Regeln verletzt,
 * wird ehrlich markiert statt versteckt. Entwurfs-Anstoss, kein Ersatz.
 *
 * Owner-Regeln (Wettbewerb Zug):
 * - Geschosshöhen ok–ok: Wohnen 2.80 m; Quartierebene/Gewerbe-EG 4.00 m;
 *   Gewerbe-OG (Vertical Cluster, im Turm) 3.50 m.
 * - Spänner-Tiefen: 14–16 m, max. 18 m; Innenhof nie unter 13 m.
 * - 3h-Sonnen-Kriterium (21. März, Innerschweiz ≈ 47° N): Näherung über
 *   die Mittagsfenster-Schattenlänge — Sonnenhöhe ≥ ~35° während 3 h um
 *   Mittag ⇒ Schatten ≤ 1.43 × Gebäudehöhe. Abstand ≥ 1.43 × h heisst:
 *   die beschattete Südfassade dahinter bekommt ≥ 3 h Sonne. Näherung,
 *   kein Ersatz für die Schattenstudie (☀ im Viewport).
 */

export const SCHATTEN_FAKTOR_3H = 1.43;

export interface StudienOptionen {
  /** GF-Ziel in m² (z.B. aGF-Ziel aus den Kennzahlen). */
  zielGf: number;
  /** Nutzung: reines Wohnen oder gemischt (Gewerbe-EG 4 m, Turm als Cluster). */
  nutzung?: 'wohnen' | 'gemischt';
  /**
   * Geschosshöhe ok–ok in mm — Owner-Rundgang 0.6.2 (S. 8): die Geschoss-
   * höhe ist PROJEKTSPEZIFISCH (Wettbewerbsvorgabe/Architekt-Entscheid/
   * SIA-Minimum/lichte Raumhöhe), kein universeller Fixwert. Gesetzt,
   * überschreibt sie BEIDE Defaults (Wohnen 2.80 m UND, bei `nutzung:
   * 'gemischt'`, das Gewerbe-EG 4.00 m) — das Turm-Cluster-OG (3.50 m,
   * `eig.turm`) bleibt ein Spezialfall der Vertical-Cluster-Logik und wird
   * hiervon bewusst nicht berührt. Ohne Angabe: unverändert 2800/4000.
   */
  geschosshoehe?: number;
  /**
   * Herkunft der Geschosshöhe (K4, Owner S. 8) — rein beschreibend, geht in
   * KEINE Berechnung ein (siehe `hoehen` im Ergebnis für die tatsächlich
   * gerechneten Werte). Panel-Ebene: erscheint als ehrlicher Beisatz
   * («Geschosshöhe 3.00 m — Wettbewerbsvorgabe») neben dem Eingabefeld.
   */
  geschosshoeheHerkunft?: 'wettbewerb' | 'architekt' | 'sia-minimum' | 'standard';
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
  /** Geschosshöhen-Logik dieser Variante (ok–ok, mm). */
  hoehen: { eg: number; og: number };
  /** false: braucht mehr Höhe als erlaubt, um das Programm zu fassen. */
  passt: boolean;
  /** Gebäudetiefe in mm, wo die Spänner-Regel greift (14–18 m); sonst null. */
  tiefe: number | null;
  tiefeOk: boolean | null;
  /** 3h-Kriterium (Näherung): nötiger vs. vorhandener Abstand (mm); null = frei besonnt. */
  besonnung: { noetig: number; ist: number; ok: boolean } | null;
  hinweise: string[];
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

/**
 * D-E2: leitet aus der aktiven Zonenregel automatisch StudienOptionen ab —
 * die Regel speist die Volumenstudie statt manueller Zahlen-Eingabe. Reine
 * Funktion, kein LLM. Liefert NUR Felder, die die Regel wirklich hergibt:
 * - `maxHoehe` ← `regel.maxHoehe` (mm, direkt übernommen).
 * - `zielGf` ← `regel.az × parzelleFlaecheM2`, nur wenn BEIDE vorhanden sind
 *   (dieselbe Formel wie `design.zonenRegelSetzen` fürs Δ-Max der
 *   Berechnungsliste — az ist bereits aGF/Parzellenfläche, keine
 *   Einheitenumrechnung nötig).
 * - `grenzabstand` ← `regel.grenzabstandKlein` (mm, direkt übernommen —
 *   schrumpft die nutzbare Fläche wie bisher über `offsetPolygon`).
 * Fehlt ein Regel-Feld (null/undefined) oder fehlt `regel`/`parzelleFlaecheM2`
 * für `zielGf`, bleibt das jeweilige Ergebnis-Feld weg — keine erfundenen
 * Defaults, der bisherige UI-/Funktions-Default (`??` in
 * `generiereVolumenstudien`) greift unverändert weiter.
 */
export function studienOptionenAusRegel(
  regel: ZonenRegel | undefined,
  parzelleFlaecheM2: number | null,
): Partial<StudienOptionen> {
  if (!regel) return {};
  const out: Partial<StudienOptionen> = {};
  if (regel.maxHoehe !== null && regel.maxHoehe !== undefined) {
    out.maxHoehe = regel.maxHoehe;
  }
  if (regel.az !== null && regel.az !== undefined && parzelleFlaecheM2 !== null) {
    out.zielGf = regel.az * parzelleFlaecheM2;
  }
  if (regel.grenzabstandKlein !== null && regel.grenzabstandKlein !== undefined) {
    out.grenzabstand = regel.grenzabstandKlein;
  }
  return out;
}

const TIEFE_MIN = 14000;
const TIEFE_MAX = 18000;
const HOF_MIN = 13000;

export function generiereVolumenstudien(parzelle: Pt[], opts: StudienOptionen): StudienVariante[] {
  const wohnOg = opts.geschosshoehe ?? 2800;
  const gemischt = opts.nutzung === 'gemischt';
  const maxH = opts.maxHoehe ?? 25000;
  const abstand = opts.grenzabstand ?? 4000;

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
    eig: { tiefe?: number; abstandFrei?: number; turm?: boolean } = {},
  ): StudienVariante | null => {
    const flaeche = footprints.reduce((s, f) => s + polygonArea(f), 0) / 1e6;
    if (flaeche < 40) return null;
    // Höhenlogik: EG + n×OG (Owner: Wohnen 2.80; gemischt: EG 4.00; Turm-OG 3.50).
    // K4: eine EXPLIZIT gesetzte Geschosshöhe (Wettbewerbsvorgabe/Architekt/
    // SIA-Minimum) überschreibt auch das gemischt-EG — der Standard-Fixwert
    // 4.00 gilt nur, solange niemand projektspezifisch etwas anderes vorgibt.
    const eg = gemischt ? (opts.geschosshoehe ?? 4000) : wohnOg;
    const og = gemischt && eig.turm ? 3500 : wohnOg;
    const maxGeschosse = Math.max(1 + Math.floor((maxH - eg) / og), 1);
    const geschosse = Math.min(Math.max(Math.ceil(opts.zielGf / flaeche), 1), maxGeschosse);
    const hoehe = eg + (geschosse - 1) * og;
    const passt = flaeche * maxGeschosse >= opts.zielGf * 0.98;

    const hinweise: string[] = [];
    const tiefe = eig.tiefe ?? null;
    let tiefeOk: boolean | null = null;
    if (tiefe !== null) {
      tiefeOk = tiefe >= TIEFE_MIN && tiefe <= TIEFE_MAX;
      if (tiefe < TIEFE_MIN) hinweise.push(`Tiefe ${(tiefe / 1000).toFixed(1)} m unter Spänner-Mass (14–18 m)`);
      if (tiefe > TIEFE_MAX) hinweise.push(`Tiefe ${(tiefe / 1000).toFixed(1)} m über Spänner-Mass (max. 18 m)`);
    }
    let besonnung: StudienVariante['besonnung'] = null;
    if (eig.abstandFrei !== undefined) {
      const noetig = Math.round(hoehe * SCHATTEN_FAKTOR_3H);
      besonnung = { noetig, ist: eig.abstandFrei, ok: eig.abstandFrei >= noetig };
      if (!besonnung.ok) {
        hinweise.push(
          `3h-Kriterium (Näherung): Abstand ${(eig.abstandFrei / 1000).toFixed(1)} m < ${(noetig / 1000).toFixed(1)} m — Nordwohnungen wären ein No-go`,
        );
      }
    }
    if (gemischt) hinweise.push(eig.turm ? 'EG 4.00, OG 3.50 (Cluster im Turm)' : 'EG 4.00 (Quartierebene), OG 2.80 Wohnen');

    return {
      id,
      name,
      beschrieb,
      koerper: footprints.map((f) => ({ outline: f, height: hoehe, program: 'studie' })),
      gf: Math.round(flaeche * geschosse),
      geschosse,
      hoehe,
      hoehen: { eg, og },
      passt,
      tiefe,
      tiefeOk,
      besonnung,
      hinweise,
    };
  };

  const out: (StudienVariante | null)[] = [];

  // 1) Teppich: die ganze nutzbare Parzelle, so flach wie möglich
  out.push(variante('teppich', 'Teppich', 'Maximaler Fussabdruck, minimale Höhe — dichtes Flachnetz.', [innen]));

  // 2) Riegel: ein Balken entlang der Längsachse (Spänner-Tiefe 14 m)
  const riegelBreite = Math.min(TIEFE_MIN, quer);
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
      { tiefe: riegelBreite },
    ),
  );

  // 3) Turm: kompakter Punkt, maximale Höhe (gemischt: Vertical-Cluster)
  const seite = Math.min(quer, 24000);
  out.push(
    variante(
      'turm',
      'Turm',
      'Kleinster Fussabdruck, maximale Höhe — Fernwirkung, Boden bleibt frei.',
      [R(b.minX + (b.w - seite) / 2, b.minY + (b.h - seite) / 2, seite, seite)],
      { turm: true },
    ),
  );

  // 4) Zeilen: zwei parallele Balken; Tiefe nach Spänner-Regel, notfalls
  //    schmaler (ehrlich markiert), Gasse fürs 3h-Kriterium
  const zeilenBreite = Math.max(Math.min(TIEFE_MIN, (quer - 8000) / 2), 10000);
  if (quer >= zeilenBreite * 2 + 8000) {
    const gasse = quer - 2 * zeilenBreite;
    out.push(
      variante(
        'zeilen',
        'Zeilen',
        'Zwei parallele Zeilen mit besonnter Gasse dazwischen.',
        [
          liegend
            ? R(b.minX, b.minY, laengs, zeilenBreite)
            : R(b.minX, b.minY, zeilenBreite, laengs),
          liegend
            ? R(b.minX, b.minY + zeilenBreite + gasse, laengs, zeilenBreite)
            : R(b.minX + zeilenBreite + gasse, b.minY, zeilenBreite, laengs),
        ],
        { tiefe: zeilenBreite, abstandFrei: gasse },
      ),
    );
  }

  // 5) Winkel: L-Form an Süd- und Westkante — gefasster Hof nach Nordost
  const wb = Math.min(13000, quer / 2);
  if (b.w > wb * 2 && b.h > wb * 2) {
    out.push(
      variante(
        'winkel',
        'Winkel',
        'L-Form fasst einen geschützten Hof — Rücken zur Grenze.',
        [R(b.minX, b.minY, b.w, wb), R(b.minX, b.minY + wb, wb, b.h - wb)],
        { tiefe: wb },
      ),
    );
  }

  // 6) Blockrand: umlaufendes Band mit Innenhof (Owner: Hof nie unter 13 m)
  const band = TIEFE_MIN;
  const hofW = b.w - 2 * band;
  const hofH = b.h - 2 * band;
  if (Math.min(hofW, hofH) >= HOF_MIN) {
    out.push(
      variante(
        'blockrand',
        'Blockrand',
        'Geschlossener Rand fasst einen ruhigen Innenhof — städtische Kante.',
        [
          R(b.minX, b.minY, b.w, band),
          R(b.minX, b.maxY - band, b.w, band),
          R(b.minX, b.minY + band, band, b.h - 2 * band),
          R(b.maxX - band, b.minY + band, band, b.h - 2 * band),
        ],
        { tiefe: band, abstandFrei: Math.min(hofW, hofH) },
      ),
    );
  }

  return out.filter((v): v is StudienVariante => v !== null);
}
