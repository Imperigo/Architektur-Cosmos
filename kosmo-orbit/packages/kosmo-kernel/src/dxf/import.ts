import type { Pt } from '../model/units';

/**
 * DXF-Import (V1.6 Block C / C2, Entscheide C-E1/C-E2 in
 * `docs/SUBMISSION-KONZEPT.md`) — das Gegenstück zu `dxf/export.ts`:
 * liest den Unternehmer-Plansatz als reine Geometrie zurück.
 *
 * Gelesen wird das R12-Subset, das der eigene Export schreibt (`LINE`,
 * `POLYLINE`/`VERTEX`/`SEQEND`, `ARC`, `TEXT`), plus die übliche
 * CAD-Praxis tolerant: `LWPOLYLINE` (R2000), `MTEXT` (Text-Praxis).
 * `INSERT` (Block-Referenzen) wird NICHT still verworfen, sondern ehrlich
 * im Bericht gezählt («Block nicht aufgelöst») — ebenso jeder unbekannte
 * Entity-Typ. Reine Funktion: kein DOM, kein Doc-Zugriff.
 *
 * Koordinaten: exakte Umkehr des Exports — `weltY = -dxfY` (der Export
 * spiegelt y für «Norden oben»), Bogen-Winkel werden zurückgespiegelt
 * (Export: `deg50 = −endAngle`, `deg51 = −startAngle`).
 *
 * Ehrlich (C-E2): Layer→Semantik ist eine DATEN-Tabelle (Export-Regeln
 * invertiert + Fremd-CAD-Heuristik). Unbekannte Layer bleiben
 * «unklassiert» und stehen namentlich im Bericht — nie geraten.
 */

export interface DxfLinie {
  a: Pt;
  b: Pt;
  layer: string;
}

/** Geschlossene Polylinie (ein Ring) — z.B. die Wand-Poché des Exports. */
export interface DxfRegion {
  ring: Pt[];
  layer: string;
}

export interface DxfBogen {
  center: Pt;
  radius: number;
  /** Welt-Winkel in rad, gleiche Konvention wie PlanArc (y-nach-unten). */
  startAngle: number;
  endAngle: number;
  layer: string;
}

export interface DxfText {
  at: Pt;
  text: string;
  layer: string;
}

/** Ehrlicher Import-Bericht — was gelesen wurde und was NICHT. */
export interface DxfImportBericht {
  /** Alle im ENTITIES-Abschnitt vorkommenden Layer. */
  layerBenutzt: string[];
  /** Layer ohne Semantik-Zuordnung — namentlich, nie verschwiegen. */
  layerUnklassiert: string[];
  /** INSERT-Vorkommen: Block-Referenzen werden in v1.6 nicht aufgelöst. */
  bloeckeNichtAufgeloest: number;
  /** Übersprungene Entity-Typen mit Zählung (z.B. SPLINE, HATCH). */
  unbekannteEntities: Record<string, number>;
}

/** Struktureller PlanGraphic-Spiegel mit Layer statt Klassen (C-E1). */
export interface DxfGraphic {
  regions: DxfRegion[];
  lines: DxfLinie[];
  arcs: DxfBogen[];
  texte: DxfText[];
  bericht: DxfImportBericht;
}

/**
 * Layer → semantische Plan-Klasse (C-E2). Erste Spalte: die eigenen
 * Export-Layer (LAYER_REGELN invertiert). Danach verbreitete
 * Fremd-CAD-Konventionen (AIA `A-WALL`, deutsche Praxis). Erweiterbar als
 * Daten — bewusst KEIN Ratealgorithmus.
 */
const LAYER_SEMANTIK: [RegExp, string][] = [
  // Eigene Export-Layer (dxf/export.ts) — exakte Namen.
  [/^TRAGEND$/i, 'tragend'],
  [/^STUETZEN$/i, 'stuetze'],
  [/^DAEMMUNG$/i, 'daemmung'],
  [/^NEUBAU$/i, 'renovation-neu'],
  [/^ABBRUCH$/i, 'renovation-abbruch'],
  [/^FENSTER$/i, 'fenster'],
  [/^TUEREN$/i, 'tuer'],
  [/^TREPPE$/i, 'treppe'],
  [/^BRUCHLINIE$/i, 'bruchlinie'],
  [/^PROJEKTION$/i, 'projection'],
  [/^SCHNITT$/i, 'cut'],
  [/^SYMBOLE$/i, 'symbol'],
  [/^ACHSEN$/i, 'achse'],
  [/^BEMASSUNG$/i, 'bemassung'],
  [/^TEXT$/i, 'text'],
  // Verbreitete Fremd-Konventionen (AIA / deutschsprachige Praxis).
  [/^A-?WALL/i, 'tragend'],
  [/^(WAND|WAENDE|MAUERWERK|MW[-_]|BETON)/i, 'tragend'],
  [/^A-?DOOR/i, 'tuer'],
  [/^(TUER|TÜR)/i, 'tuer'],
  [/^A-?GLAZ/i, 'fenster'],
  [/^FENSTER/i, 'fenster'],
  [/^A-?COLS?/i, 'stuetze'],
  [/^(STUETZE|STÜTZE)/i, 'stuetze'],
  [/^(DURCHBRUCH|AUSSPARUNG|D-?B[-_ ])/i, 'aussparung'],
  [/^A-?ANNO/i, 'text'],
];

/** Semantische Klasse eines Layers — oder null (ehrlich unklassiert). */
export function semantikFuerLayer(layer: string): string | null {
  for (const [muster, klasse] of LAYER_SEMANTIK) {
    if (muster.test(layer)) return klasse;
  }
  return null;
}

/** Ein (Gruppencode, Wert)-Paar des DXF-Formats. */
type Paar = { code: number; wert: string };

/**
 * Tokenizer: DXF ist eine Folge von Zeilenpaaren (Code, Wert). Tolerant
 * gegen \r\n und Leerraum um den Code; eine unlesbare Code-Zeile bricht
 * den Import ehrlich mit Fehler ab (halbe Geometrie wäre gefährlicher).
 */
function tokenisiere(dxf: string): Paar[] {
  const zeilen = dxf.split(/\r?\n/);
  const paare: Paar[] = [];
  // Letzte Zeile darf ein leerer Rest nach dem finalen \n sein.
  const n = zeilen.length % 2 === 1 && zeilen[zeilen.length - 1]!.trim() === '' ? zeilen.length - 1 : zeilen.length;
  for (let i = 0; i + 1 < n; i += 2) {
    const code = Number(zeilen[i]!.trim());
    if (!Number.isInteger(code)) {
      throw new Error(`DXF unlesbar: Gruppencode erwartet in Zeile ${i + 1}, gefunden «${zeilen[i]!.slice(0, 40)}»`);
    }
    paare.push({ code, wert: zeilen[i + 1]! });
  }
  return paare;
}

/** DXF-Zahl lesen (Punkt-Dezimal); NaN → 0 wäre stilles Raten → Fehler. */
function zahl(wert: string, kontext: string): number {
  const v = Number(wert.trim());
  if (!Number.isFinite(v)) throw new Error(`DXF unlesbar: Zahl erwartet für ${kontext}, gefunden «${wert.slice(0, 40)}»`);
  return v;
}

/** DXF-Grad (gespiegelter Winkelsinn des Exports) → Welt-rad. */
function weltWinkel(dxfGrad: number): number {
  const rad = (-dxfGrad * Math.PI) / 180;
  const zweiPi = 2 * Math.PI;
  return ((rad % zweiPi) + zweiPi) % zweiPi;
}

/**
 * Parst einen DXF-Text (R12-Kern + tolerante Erweiterungen) zu einem
 * `DxfGraphic`. Wirft bei strukturell unlesbarem DXF; alles semantisch
 * Unbekannte landet gezählt im Bericht statt still zu verschwinden.
 */
export function parseDxf(dxf: string): DxfGraphic {
  const paare = tokenisiere(dxf);

  const regions: DxfRegion[] = [];
  const lines: DxfLinie[] = [];
  const arcs: DxfBogen[] = [];
  const texte: DxfText[] = [];
  const layerBenutzt = new Set<string>();
  const unbekannt: Record<string, number> = {};
  let bloecke = 0;

  // y zurückspiegeln — exakte Umkehr von export.ts.
  const y = (v: number) => -v;

  // ENTITIES-Abschnitt suchen (alles davor — HEADER/TABLES — überspringen).
  let i = 0;
  let inEntities = false;
  while (i < paare.length) {
    const p = paare[i]!;
    if (p.code === 0 && p.wert === 'SECTION' && paare[i + 1]?.code === 2) {
      inEntities = paare[i + 1]!.wert === 'ENTITIES';
      i += 2;
      continue;
    }
    if (p.code === 0 && (p.wert === 'ENDSEC' || p.wert === 'EOF')) {
      inEntities = false;
      i += 1;
      continue;
    }
    if (!inEntities || p.code !== 0) {
      i += 1;
      continue;
    }

    // p ist ein Entity-Start (Code 0) im ENTITIES-Abschnitt. Attribute bis
    // zum nächsten Code 0 einsammeln (Mehrfach-Codes wie 10/20 als Listen).
    const typ = p.wert;
    const attr = new Map<number, string[]>();
    let j = i + 1;
    while (j < paare.length && paare[j]!.code !== 0) {
      const a = paare[j]!;
      const liste = attr.get(a.code) ?? [];
      liste.push(a.wert);
      attr.set(a.code, liste);
      j += 1;
    }
    const eins = (code: number): string | undefined => attr.get(code)?.[0];
    const layer = (eins(8) ?? '0').trim() || '0';

    switch (typ) {
      case 'LINE': {
        layerBenutzt.add(layer);
        lines.push({
          a: { x: zahl(eins(10) ?? '', 'LINE x1'), y: y(zahl(eins(20) ?? '', 'LINE y1')) },
          b: { x: zahl(eins(11) ?? '', 'LINE x2'), y: y(zahl(eins(21) ?? '', 'LINE y2')) },
          layer,
        });
        i = j;
        break;
      }
      case 'ARC': {
        layerBenutzt.add(layer);
        // Export schrieb deg50 = −endAngle, deg51 = −startAngle → invers.
        arcs.push({
          center: { x: zahl(eins(10) ?? '', 'ARC cx'), y: y(zahl(eins(20) ?? '', 'ARC cy')) },
          radius: zahl(eins(40) ?? '', 'ARC r'),
          startAngle: weltWinkel(zahl(eins(51) ?? '0', 'ARC 51')),
          endAngle: weltWinkel(zahl(eins(50) ?? '0', 'ARC 50')),
          layer,
        });
        i = j;
        break;
      }
      case 'TEXT':
      case 'MTEXT': {
        layerBenutzt.add(layer);
        texte.push({
          at: { x: zahl(eins(10) ?? '', 'TEXT x'), y: y(zahl(eins(20) ?? '', 'TEXT y')) },
          text: eins(1) ?? '',
          layer,
        });
        i = j;
        break;
      }
      case 'LWPOLYLINE': {
        layerBenutzt.add(layer);
        const xs = attr.get(10) ?? [];
        const ys = attr.get(20) ?? [];
        const geschlossen = (Number(eins(70) ?? '0') & 1) === 1;
        const ring: Pt[] = xs.map((xv, k) => ({
          x: zahl(xv, 'LWPOLYLINE x'),
          y: y(zahl(ys[k] ?? '', 'LWPOLYLINE y')),
        }));
        ringAblegen(ring, geschlossen, layer, regions, lines);
        i = j;
        break;
      }
      case 'POLYLINE': {
        layerBenutzt.add(layer);
        const geschlossen = (Number(eins(70) ?? '0') & 1) === 1;
        // VERTEX-Folge bis SEQEND einsammeln (eigene Code-0-Entities).
        const ring: Pt[] = [];
        let k = j;
        while (k < paare.length) {
          const q = paare[k]!;
          if (q.code === 0 && q.wert === 'VERTEX') {
            const vAttr = new Map<number, string>();
            let m = k + 1;
            while (m < paare.length && paare[m]!.code !== 0) {
              if (!vAttr.has(paare[m]!.code)) vAttr.set(paare[m]!.code, paare[m]!.wert);
              m += 1;
            }
            ring.push({
              x: zahl(vAttr.get(10) ?? '', 'VERTEX x'),
              y: y(zahl(vAttr.get(20) ?? '', 'VERTEX y')),
            });
            k = m;
            continue;
          }
          if (q.code === 0 && q.wert === 'SEQEND') {
            // SEQEND-Attribute überspringen.
            let m = k + 1;
            while (m < paare.length && paare[m]!.code !== 0) m += 1;
            k = m;
            break;
          }
          break; // POLYLINE ohne SEQEND — tolerant beenden.
        }
        ringAblegen(ring, geschlossen, layer, regions, lines);
        i = k;
        break;
      }
      case 'INSERT': {
        layerBenutzt.add(layer);
        bloecke += 1; // ehrlich gezählt, nicht aufgelöst (C-E1)
        i = j;
        break;
      }
      default: {
        // Auch der Layer eines übersprungenen Entities gehört in den
        // Bericht — der Architekt soll sehen, WO ungelesener Inhalt liegt.
        layerBenutzt.add(layer);
        unbekannt[typ] = (unbekannt[typ] ?? 0) + 1;
        i = j;
        break;
      }
    }
  }

  const benutzt = [...layerBenutzt].sort();
  return {
    regions,
    lines,
    arcs,
    texte,
    bericht: {
      layerBenutzt: benutzt,
      layerUnklassiert: benutzt.filter((l) => semantikFuerLayer(l) === null),
      bloeckeNichtAufgeloest: bloecke,
      unbekannteEntities: unbekannt,
    },
  };
}

/**
 * Polylinien-Ring einsortieren: geschlossen (≥3 Punkte) → Region; offen →
 * Einzelsegmente als Linien (kein stilles Schliessen offener Ketten).
 */
function ringAblegen(ring: Pt[], geschlossen: boolean, layer: string, regions: DxfRegion[], lines: DxfLinie[]): void {
  if (geschlossen && ring.length >= 3) {
    regions.push({ ring, layer });
    return;
  }
  for (let k = 0; k + 1 < ring.length; k += 1) {
    lines.push({ a: ring[k]!, b: ring[k + 1]!, layer });
  }
}
