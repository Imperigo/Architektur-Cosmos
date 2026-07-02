/**
 * Stützenraster-Assistent (Phase 3.26) — die Owner-Herleitung
 * «Stützenraster Holzbau / Tiefgarage» als Rechenwerk:
 *
 * 90°-Parkierung nach VSS 40 291 (Vernehmlassungsentwurf → Entwurfsreferenz,
 * KEIN verbindlicher Normnachweis). Robuste Arbeitswerte:
 * Parkfeld 2.50 m ↔ Fahrgasse 6.50 m · 2.55 ↔ 6.25 · 2.60 ↔ 6.00.
 *
 * Achsmass = Anzahl Parkfelder × Parkfeldbreite + 2 × (halbe Stütze + Abstand)
 * (Beton-UG-Stütze 30 cm auf der Achse → 15 cm, + 10 cm zur Parkfeldkante
 * = 25 cm je Seite = 0.50 m). Wohnraster = Achsmass / Wohnachsen; lichte
 * Zimmerbreite 3.00 m + Strukturzone ≈ 0.25–0.30 m → Minimum 3.25 m,
 * gute Wohnqualität 3.40–3.65 m. Primärachsen über 12 m sind im Holzbau
 * deutlich anspruchsvoller (Unterzüge/Deckensysteme).
 */

export interface VssArbeitswert {
  feldbreite: number; // m
  fahrgasse: number; // m
}

export const VSS_ARBEITSWERTE: VssArbeitswert[] = [
  { feldbreite: 2.5, fahrgasse: 6.5 },
  { feldbreite: 2.55, fahrgasse: 6.25 },
  { feldbreite: 2.6, fahrgasse: 6.0 },
];

export type RasterBewertung = 'zu-eng' | 'knapp' | 'ausgewogen' | 'grosszuegig';

export interface RasterVariante {
  parkfelder: number;
  feldbreite: number;
  fahrgasse: number;
  /** Achsmass der Primärtragachsen in m. */
  achsmass: number;
  wohnachsen: number;
  /** Wohnraster (Achsmass / Wohnachsen) in m. */
  wohnraster: number;
  bewertung: RasterBewertung;
  /** Primärachse > 12 m: im Holzbau anspruchsvoll (stärkere Unterzüge etc.). */
  holzbauKritisch: boolean;
  hinweis: string;
}

export interface RasterOptionen {
  /** UG-Stützenbreite in m (Standard 0.30, Beton). */
  stuetze?: number;
  /** Abstand Stützenkante→Parkfeld in m (Standard 0.10). */
  abstand?: number;
  /** Minimales Wohn-Achsmass in m (Standard 3.25 = 3.00 licht + Struktur). */
  minWohnachse?: number;
  /** Gute Wohnqualität von/bis in m (Standard 3.40–3.65). */
  gutVon?: number;
  gutBis?: number;
  /** Ab dieser Primärachse gilt Holzbau als anspruchsvoll (Standard 12 m). */
  holzbauGrenze?: number;
}

export function generiereStuetzenraster(opts: RasterOptionen = {}): RasterVariante[] {
  const stuetze = opts.stuetze ?? 0.3;
  const abstand = opts.abstand ?? 0.1;
  const minW = opts.minWohnachse ?? 3.25;
  const gutVon = opts.gutVon ?? 3.4;
  const gutBis = opts.gutBis ?? 3.65;
  const holzGrenze = opts.holzbauGrenze ?? 12;
  const zuschlag = 2 * (stuetze / 2 + abstand);

  const out: RasterVariante[] = [];
  for (const felder of [2, 3, 4, 5]) {
    for (const { feldbreite, fahrgasse } of VSS_ARBEITSWERTE) {
      const achsmass = felder * feldbreite + zuschlag;
      // Sinnvolle Teilungen: alle Wohnachsen-Zahlen, die nicht unter das
      // Minimum fallen — plus die knappste darunter (um das «zu eng»
      // ehrlich zu zeigen, wie in der Owner-Excel).
      const maxAchsen = Math.max(1, Math.floor(achsmass / minW));
      for (const wohnachsen of [maxAchsen, maxAchsen + 1]) {
        if (wohnachsen < 1 || wohnachsen > felder) continue;
        const wohnraster = achsmass / wohnachsen;
        const holzbauKritisch = achsmass > holzGrenze;
        let bewertung: RasterBewertung;
        if (wohnraster < minW) bewertung = 'zu-eng';
        else if (wohnraster < gutVon) bewertung = 'knapp';
        else if (wohnraster <= gutBis) bewertung = 'ausgewogen';
        else bewertung = 'grosszuegig';
        const hinweis =
          bewertung === 'zu-eng'
            ? `Wohnachse ${wohnraster.toFixed(2)} m unter dem Minimum von ${minW.toFixed(2)} m`
            : bewertung === 'grosszuegig'
              ? 'für Maisonettes/Wohnräume sinnvoll, als Regelraster flächenineffizient'
              : holzbauKritisch
                ? `Primärachse ${achsmass.toFixed(2)} m: im Holzbau anspruchsvoll (Unterzüge/Deckensystem)`
                : bewertung === 'knapp'
                  ? 'trifft das Minimum — Möblierung/Flexibilität prüfen'
                  : 'effizient unten, hochwertiges Wohnraster oben';
        out.push({
          parkfelder: felder,
          feldbreite,
          fahrgasse,
          achsmass,
          wohnachsen,
          wohnraster,
          bewertung,
          holzbauKritisch,
          hinweis,
        });
      }
    }
  }
  // Beste zuerst: ausgewogen und unkritisch nach oben, dann knapp, dann Rest
  const rang = (v: RasterVariante) =>
    (v.bewertung === 'ausgewogen' ? 0 : v.bewertung === 'knapp' ? 2 : v.bewertung === 'grosszuegig' ? 3 : 4) +
    (v.holzbauKritisch ? 1 : 0);
  return out.sort((a, b) => rang(a) - rang(b) || a.achsmass - b.achsmass);
}
