import type { MassBody, Sia416Class, Storey, Zone } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { polygonArea } from '../model/units';

/**
 * SIA-416-Flächenmathematik + Owner-Methodik der Volumenstudien.
 *
 * Aus dem Owner-Wissen (Notion, Wettbewerb Zug):
 * - aGF-Ziel = HNF × Faktor (Büro-einstellbar: 1.28 bzw. 1.22)
 * - GF für Volumenstudien = aGF × Fassadenfaktor (Skelettbau ~1.10, Massiv ~1.12+)
 * - Volumenkörper zählen als GF über abgeleitete Geschosszahl
 */

export interface StoreyAreas {
  storeyId: string;
  storeyName: string;
  byClass: Record<Sia416Class, number>; // m²
  ngf: number; // Summe aller Zonen (m²)
}

export interface AreaReport {
  storeys: StoreyAreas[];
  total: Record<Sia416Class, number>;
  totalNgf: number;
  /** aGF-Ziel = HNF × agfFactor (m²) */
  agfZiel: number;
  /** GF-Schätzung fürs Volumen: aGF-Ziel × Fassadenfaktor (m²) */
  gfSchaetzung: number;
  /** GF aus Volumenkörpern (Massenstudien, m²) */
  gfVolumen: number;
  /** Geschossfläche der Volumenkörper pro Nutzung */
  gfVolumenNachProgramm: Record<string, number>;
}

const MM2_PER_M2 = 1_000_000;

function emptyByClass(): Record<Sia416Class, number> {
  return { HNF: 0, NNF: 0, VF: 0, FF: 0, KF: 0 };
}

export function areaOf(outline: readonly { x: number; y: number }[]): number {
  return Math.abs(polygonArea(outline)) / MM2_PER_M2;
}

/** Geschosszahl eines Volumenkörpers: explizit oder aus Höhe (~2.8m wohnlich). */
export function massFloors(mass: MassBody, defaultFloorHeight = 2800): number {
  return Math.max(1, Math.round(mass.height / defaultFloorHeight));
}

export function areaReport(doc: KosmoDoc): AreaReport {
  const storeys = doc.storeysOrdered() as Storey[];
  const zones = doc.byKind<Zone>('zone');
  const masses = doc.byKind<MassBody>('mass');
  const { agfFactor, facadeFactor } = doc.settings;

  const perStorey: StoreyAreas[] = storeys.map((s) => {
    const byClass = emptyByClass();
    for (const z of zones) {
      if (z.storeyId !== s.id) continue;
      byClass[z.sia] += areaOf(z.outline);
    }
    const ngf = Object.values(byClass).reduce((a, b) => a + b, 0);
    return { storeyId: s.id, storeyName: s.name, byClass, ngf };
  });

  const total = emptyByClass();
  for (const s of perStorey) {
    for (const k of Object.keys(total) as Sia416Class[]) total[k] += s.byClass[k];
  }
  const totalNgf = Object.values(total).reduce((a, b) => a + b, 0);
  const agfZiel = total.HNF * agfFactor;
  const gfSchaetzung = agfZiel * facadeFactor;

  let gfVolumen = 0;
  const gfVolumenNachProgramm: Record<string, number> = {};
  for (const m of masses) {
    const gf = areaOf(m.outline) * massFloors(m);
    gfVolumen += gf;
    const key = m.program ?? 'ohne Nutzung';
    gfVolumenNachProgramm[key] = (gfVolumenNachProgramm[key] ?? 0) + gf;
  }

  return {
    storeys: perStorey,
    total,
    totalNgf,
    agfZiel,
    gfSchaetzung,
    gfVolumen,
    gfVolumenNachProgramm,
  };
}


/** Custom-Kennzahlen (V2-F9): Formeln gegen den AreaReport auswerten. */
export interface KennzahlErgebnis {
  name: string;
  betrag: number;
  einheit: string;
  /** Basiswert in m², für Transparenz («3200 CHF/m² × 480 m² aGF»). */
  basisFlaeche: number;
  basis: string;
}

export function kennzahlenAuswerten(doc: KosmoDoc, report?: AreaReport): KennzahlErgebnis[] {
  const r = report ?? areaReport(doc);
  const basisWert = (basis: string): number => {
    switch (basis) {
      case 'gf':
        return r.gfVolumen > 0.5 ? r.gfVolumen : r.gfSchaetzung;
      case 'agf':
        return r.agfZiel;
      case 'hnf':
        return r.total.HNF ?? 0;
      case 'ngf':
        return r.totalNgf;
      default:
        return 0;
    }
  };
  return doc.settings.kennzahlFormeln.map((f) => {
    const flaeche = basisWert(f.basis);
    return {
      name: f.name,
      betrag: Math.round(f.wert * flaeche),
      einheit: f.einheit,
      basisFlaeche: Math.round(flaeche * 10) / 10,
      basis: f.basis.toUpperCase(),
    };
  });
}
