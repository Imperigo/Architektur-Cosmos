import type { RefEntry } from '@kosmo/data';

/**
 * Epochenbänder für die Datenstationen-Fläche (v0.7.6 Welle 2 Stream D).
 *
 * HERKUNFT / EHRLICHKEIT: `RefEntry` (`packages/kosmo-data/src/reference.ts`)
 * kennt KEIN `epoch`-Feld — nur `year_start`/`year_end`. Das Soll-Bild
 * (`Kosmo Viz Datenstationen.dc.html`, Design-Referenz, nicht Laufzeit-Code)
 * zeigt eine Epochen-Facette; hier wird sie ehrlich AUS `year_start`
 * ABGELEITET, mit gängigen architektur-/kulturhistorischen Bandgrenzen
 * (grob europäisch/CH orientiert). Das ist ein grobes Einordnungsraster für
 * die Facette, kein fachliches Urteil über einzelne Bauwerke — wo zwei
 * Zäsuren plausibel wären, entscheidet die gebräuchlichere (z. B. 1918
 * Kriegsende statt Stilwechsel, 1945 statt eines Baujahrs).
 *
 * Die neun Bänder sind gegen den realen Seed (`kosmodata-seed.json`,
 * Jahresspanne -9000 bis 2023 über 112 Einträge) geprüft — jedes Band trifft
 * mindestens einen Eintrag, keines ist ein leeres Gerüst.
 */
export interface EpochenBand {
  id: string;
  label: string;
  /** Erstes Jahr, das in dieses Band fällt (inklusiv). */
  vonJahr: number;
}

export const EPOCHEN_BAENDER: EpochenBand[] = [
  { id: 'urgeschichte', label: 'Urgeschichte', vonJahr: -Infinity },
  { id: 'antike', label: 'Antike', vonJahr: -3000 },
  { id: 'mittelalter', label: 'Mittelalter', vonJahr: 500 },
  { id: 'vormoderne', label: 'Vormoderne', vonJahr: 1400 },
  { id: 'industrialisierung', label: 'Industrialisierung', vonJahr: 1750 },
  { id: 'zwischenkriegszeit', label: 'Zwischenkriegszeit', vonJahr: 1918 },
  { id: 'nachkriegsmoderne', label: 'Nachkriegsmoderne', vonJahr: 1945 },
  { id: 'spaetmoderne', label: 'Spätmoderne', vonJahr: 1975 },
  { id: 'gegenwart', label: 'Gegenwart', vonJahr: 2000 },
];

/** Findet das Band, in das `year` fällt — `EPOCHEN_BAENDER` ist aufsteigend
 *  sortiert, das letzte Band mit `vonJahr <= year` gewinnt. `null` ohne Jahr
 *  (im realen Seed kommt das nicht vor, `year_start` ist bei allen 112
 *  Einträgen gesetzt — trotzdem kein Absturz bei künftigen Lücken). */
export function epocheVon(year: number | null | undefined): EpochenBand | null {
  if (year == null || Number.isNaN(year)) return null;
  let treffer: EpochenBand | null = null;
  for (const band of EPOCHEN_BAENDER) {
    if (year >= band.vonJahr) treffer = band;
    else break;
  }
  return treffer;
}

export function epocheVonEntry(e: Pick<RefEntry, 'year_start'>): EpochenBand | null {
  return epocheVon(e.year_start ?? null);
}
