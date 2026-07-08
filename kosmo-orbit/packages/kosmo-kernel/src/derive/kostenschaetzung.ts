import type { KosmoDoc } from '../model/doc';
import { defaultKvKennwerte, type KvKennwerte } from '../model/doc';
import { deriveBerechnungsliste } from './berechnungsliste';

/**
 * KV-Grobschätzung (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 3, Owner-Hauptaufgabe K22) — Kostenvoranschlag als ehrlicher
 * **Richtwert**: CHF/m²-GF-Kennwerte × abgeleitete GF aus der
 * Berechnungsliste (`derive/berechnungsliste.ts`, Decken + Volumenkörper).
 *
 * AUSDRÜCKLICH: **Richtwert, kein Devis.** Keine CRB/NPK-Positionen, keine
 * eBKP-Feingliederung — Devisierung selbst ist laut `SUBMISSION-KONZEPT.md`
 * §5.1 bewusst ausserhalb (CRB-lizenzpflichtig, Owner-Entscheid). Was hier
 * entsteht, ist BKP-2-Stellen-Niveau: Gebäude BKP 2 (unterteilt in
 * Rohbau/Ausbau/Technik als %-Anteile eines CHF/m²-GF-Basiswerts), Umgebung
 * BKP 4 und Baunebenkosten BKP 5 als %-Zuschläge auf die BKP-2-Summe, plus
 * eine Reserve als %-Zuschlag auf die Zwischensumme.
 *
 * Pure Funktion: keine `Date.now()`/`Math.random()`-Abhängigkeit, gleiche
 * Eingaben liefern exakt dieselbe `Kostenschaetzung` (Basis für den
 * deterministischen SVG-Export, `derive/kvblatt.ts`).
 */

export interface KvPosition {
  /** BKP-Kennung auf 2-Stellen-Niveau, z.B. «BKP 2.1»/«BKP 4»/«BKP 5»/«Reserve». */
  bkp: string;
  bezeichnung: string;
  /** Betrag in CHF, gerundet auf ganze Franken. */
  betrag: number;
}

export interface Kostenschaetzung {
  /** GF-Basis in m² (aus `deriveBerechnungsliste(doc).totalGf`), gerundet auf 1 Dezimale. */
  flaecheGf: number;
  /** Die tatsächlich verwendeten Kennwerte (nach Overrides). */
  kennwerte: KvKennwerte;
  /** Leer, wenn `flaecheGf` 0 ist (keine Geometrie) — ehrliche Leermeldung statt einer erfundenen 0-Zeile. */
  positionen: KvPosition[];
  /** Summe BKP 2 (Rohbau+Ausbau+Technik), CHF gerundet. */
  summeBkp2: number;
  /** BKP 4 (Umgebung), CHF gerundet. */
  summeBkp4: number;
  /** BKP 5 (Baunebenkosten), CHF gerundet. */
  summeBkp5: number;
  /** Reserve, CHF gerundet. */
  reserveBetrag: number;
  /** Total (BKP 2 + 4 + 5 + Reserve), CHF gerundet. */
  total: number;
}

/** Der eine Ehrlichkeitssatz, der überall erscheinen muss, wo diese Schätzung sichtbar wird (Panel, Blatt). */
export const KV_HINWEIS = 'Richtwert auf GF-Basis — kein Devis, keine NPK-Positionen.';

/**
 * Berechnet die KV-Grobschätzung aus dem Doc. `overrides` ersetzt einzelne
 * Kennwerte für EINEN Aufruf (z.B. Live-Vorschau im Panel, bevor der Owner
 * über den Command bestätigt) — ändert `doc.settings` selbst nicht.
 */
export function deriveKostenschaetzung(doc: KosmoDoc, overrides?: Partial<KvKennwerte>): Kostenschaetzung {
  const basis: KvKennwerte = doc.settings.kvKennwerte ?? defaultKvKennwerte;
  const kennwerte: KvKennwerte = { ...basis, ...overrides };

  const { totalGf } = deriveBerechnungsliste(doc);
  const flaecheGf = Math.round(totalGf * 10) / 10;

  const bkp2Basis = totalGf * kennwerte.chfProM2Gf;
  const rohbau = bkp2Basis * kennwerte.anteilRohbau;
  const ausbau = bkp2Basis * kennwerte.anteilAusbau;
  const technik = bkp2Basis * kennwerte.anteilTechnik;
  const summeBkp2 = rohbau + ausbau + technik;
  const summeBkp4 = summeBkp2 * kennwerte.zuschlagUmgebung;
  const summeBkp5 = summeBkp2 * kennwerte.zuschlagBaunebenkosten;
  const zwischensumme = summeBkp2 + summeBkp4 + summeBkp5;
  const reserveBetrag = zwischensumme * kennwerte.reserve;
  const total = zwischensumme + reserveBetrag;

  const positionen: KvPosition[] =
    totalGf > 0
      ? [
          { bkp: 'BKP 2.1', bezeichnung: 'Rohbau', betrag: Math.round(rohbau) },
          { bkp: 'BKP 2.2', bezeichnung: 'Ausbau', betrag: Math.round(ausbau) },
          { bkp: 'BKP 2.3', bezeichnung: 'Gebäudetechnik', betrag: Math.round(technik) },
          { bkp: 'BKP 4', bezeichnung: 'Umgebung', betrag: Math.round(summeBkp4) },
          { bkp: 'BKP 5', bezeichnung: 'Baunebenkosten', betrag: Math.round(summeBkp5) },
          { bkp: 'Reserve', bezeichnung: 'Reserve / Unvorhergesehenes', betrag: Math.round(reserveBetrag) },
        ]
      : [];

  return {
    flaecheGf,
    kennwerte,
    positionen,
    summeBkp2: Math.round(summeBkp2),
    summeBkp4: Math.round(summeBkp4),
    summeBkp5: Math.round(summeBkp5),
    reserveBetrag: Math.round(reserveBetrag),
    total: Math.round(total),
  };
}
