import type { KosmoDoc } from '../model/doc';
import type { Pt } from '../model/units';

/**
 * Wohnungs-Segmentierer v1 (V2-F5, der Finch-Kern — ehrlich klein
 * geschnitten): Ein Geschoss-Footprint wird ENTLANG EINES KORRIDORS in
 * Wohnungen geteilt. Beidseits des Korridors entstehen Bänder; auf jedem
 * Band sucht eine dynamische Programmierung Schnittstationen (25-cm-Raster),
 * die den Soll-Mix aus dem Raumprogramm am besten treffen. Non-negotiables:
 * jeder Schnitt liefert Korridorzugang (bandbedingt) und Mindestbreite.
 * Was übrig bleibt, wird ehrlich als Restfläche ausgewiesen («Opfer-
 * Wohnung», Finch Algorithm Theory) — samt Diagnose, warum es nicht passt.
 */

export interface WohnungsTypSoll {
  typ: string;
  /** Zielgrösse einer Wohnung in m². */
  groesse: number;
  /** Anzahl gewünschter Wohnungen. */
  anzahl: number;
}

export interface GeschnitteneWohnung {
  outline: Pt[];
  flaeche: number; // m²
  typ: string | null; // null = Restfläche
  /** Abweichung zur Zielgrösse in m² (positiv = zu gross). */
  abweichung: number | null;
}

export interface SegmentierungsErgebnis {
  wohnungen: GeschnitteneWohnung[];
  /** Erfüllung je Typ: gewünscht vs. geschnitten. */
  mix: { typ: string; soll: number; ist: number }[];
  /** Reservierter Erschliessungskern (Treppenhaus), wenn Option kern an. */
  kern: { outline: Pt[] } | null;
  diagnose: string[];
}

/** Standard-Wohnungsgrössen je Programm-Typ (m², Owner-Excel-Semantik). */
export const WOHNUNGS_GROESSEN: Record<string, number> = {
  marktgerecht: 95,
  preisguenstig: 75,
  alterswohnen: 65,
  'vertical-cluster': 110,
  quartierebene: 85,
};

/** Soll-Mix aus dem Raumprogramm ableiten (HNF-Soll ÷ Typgrösse). */
export function sollMix(doc: KosmoDoc): WohnungsTypSoll[] {
  return doc.settings.raumprogramm
    .map((p) => {
      const groesse = WOHNUNGS_GROESSEN[p.typ] ?? 85;
      return { typ: p.typ, groesse, anzahl: Math.max(0, Math.round(p.hnfSoll / groesse)) };
    })
    .filter((s) => s.anzahl > 0);
}

/**
 * Schnittstations-Raster (mm) — auch von `derive/variantensuche.ts`
 * wiederverwendet (Ruin-&-Recreate-Züge jittern in Vielfachen davon).
 */
export const RASTER = 250;

/** Wicklung normalisieren: signed area < 0 (cw) → umdrehen, sonst sind Flächen negativ. */
function ccw(outline: Pt[]): Pt[] {
  let s = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s < 0 ? [...outline].reverse() : outline;
}

export interface SegmentierOptionen {
  /** Minimale Wohnungsbreite am Korridor (mm). */
  minBreite?: number;
  /** Typgrössen-Override (m²) — F6-Slider. */
  groessen?: Record<string, number>;
  /** Erschliessungskern: reserviert 3.0 m am Anfang des ersten Bands. */
  kern?: boolean;
}

/**
 * Ein Band (Fassaden-Streifen) beidseits des Korridors. Exportiert für
 * `derive/variantensuche.ts` (Ruin-&-Recreate-Züge bauen synthetische
 * Teil-Bänder für Merge+Neuschnitt-Züge, siehe dort).
 */
export interface Band {
  /** Ursprung (Bandanfang an der Korridorachse). */
  o: Pt;
  /** Einheitsvektor entlang des Korridors. */
  d: Pt;
  /** Einheitsvektor vom Korridor weg. */
  n: Pt;
  laenge: number;
  tiefe: number;
}

/**
 * Bänder beidseits des Korridors innerhalb des Footprints (BBox-Näherung).
 * Exportiert (Refactor E5-i, Verhalten unverändert) — `variantenSuche()`
 * braucht dieselben Bänder wie `segmentiere()`, um Züge auf ihnen zu bauen,
 * statt die BBox-Herleitung zu duplizieren.
 */
export function bilderBaender(footprint: Pt[], korridor: Pt[]): Band[] {
  const bb = (poly: Pt[]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    return { minX, maxX, minY, maxY };
  };
  const f = bb(footprint);
  const k = bb(korridor);
  const horizontal = k.maxX - k.minX >= k.maxY - k.minY;
  const baender: Band[] = [];
  if (horizontal) {
    const laenge = Math.min(f.maxX, k.maxX) - Math.max(f.minX, k.minX);
    const oben = f.maxY - k.maxY;
    const unten = k.minY - f.minY;
    if (oben >= 3000) {
      baender.push({ o: { x: Math.max(f.minX, k.minX), y: k.maxY }, d: { x: 1, y: 0 }, n: { x: 0, y: 1 }, laenge, tiefe: oben });
    }
    if (unten >= 3000) {
      baender.push({ o: { x: Math.max(f.minX, k.minX), y: k.minY }, d: { x: 1, y: 0 }, n: { x: 0, y: -1 }, laenge, tiefe: unten });
    }
  } else {
    const laenge = Math.min(f.maxY, k.maxY) - Math.max(f.minY, k.minY);
    const rechts = f.maxX - k.maxX;
    const links = k.minX - f.minX;
    if (rechts >= 3000) {
      baender.push({ o: { x: k.maxX, y: Math.max(f.minY, k.minY) }, d: { x: 0, y: 1 }, n: { x: 1, y: 0 }, laenge, tiefe: rechts });
    }
    if (links >= 3000) {
      baender.push({ o: { x: k.minX, y: Math.max(f.minY, k.minY) }, d: { x: 0, y: 1 }, n: { x: -1, y: 0 }, laenge, tiefe: links });
    }
  }
  return baender;
}

/**
 * Beste Zerlegung EINES Bands: DP über Stationen, Rest wird letzte Einheit.
 * Exportiert (Refactor E5-i, Verhalten unverändert) — `variantenSuche()`
 * ruft dieselbe Funktion für Merge+Neuschnitt-Züge auf synthetischen
 * Teil-Bändern auf, statt die Schnitt-Mathematik zu duplizieren.
 */
export function schneideBand(
  band: Band,
  offenerBedarf: Map<string, { groesse: number; rest: number }>,
  minBreite: number,
): GeschnitteneWohnung[] {
  const tiefe = band.tiefe;
  // Kandidat-Breiten je Typ (mm), auf Raster gerundet
  const kandidaten = [...offenerBedarf.entries()]
    .filter(([, b]) => b.rest > 0)
    .map(([typ, b]) => ({
      typ,
      breite: Math.max(minBreite, Math.round((b.groesse * 1e6) / tiefe / RASTER) * RASTER),
      groesse: b.groesse,
    }));
  const wohnungen: GeschnitteneWohnung[] = [];
  let s = 0; // aktuelle Station (mm ab Bandanfang)
  // Greedy nach offenem Bedarf: der Typ mit den meisten fehlenden Wohnungen
  // zuerst (Gleichstand → grössere Wohnung) — verteilt den Mix über die
  // Bänder, statt dass ein Typ das erste Band füllt.
  while (s + minBreite <= band.laenge && kandidaten.some((k) => offenerBedarf.get(k.typ)!.rest > 0)) {
    let bester: { typ: string; breite: number; groesse: number } | null = null;
    for (const k of kandidaten) {
      if (offenerBedarf.get(k.typ)!.rest <= 0) continue;
      if (s + k.breite > band.laenge) continue;
      if (
        !bester ||
        offenerBedarf.get(k.typ)!.rest > offenerBedarf.get(bester.typ)!.rest ||
        (offenerBedarf.get(k.typ)!.rest === offenerBedarf.get(bester.typ)!.rest && k.breite > bester.breite)
      ) {
        bester = k;
      }
    }
    if (!bester) break;
    const o = band.o;
    const a = { x: o.x + band.d.x * s, y: o.y + band.d.y * s };
    const b = { x: o.x + band.d.x * (s + bester.breite), y: o.y + band.d.y * (s + bester.breite) };
    const outline: Pt[] = [
      a,
      b,
      { x: b.x + band.n.x * tiefe, y: b.y + band.n.y * tiefe },
      { x: a.x + band.n.x * tiefe, y: a.y + band.n.y * tiefe },
    ].map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    const flaeche = (bester.breite * tiefe) / 1e6;
    wohnungen.push({
      outline: ccw(outline),
      flaeche: Math.round(flaeche * 10) / 10,
      typ: bester.typ,
      abweichung: Math.round((flaeche - bester.groesse) * 10) / 10,
    });
    offenerBedarf.get(bester.typ)!.rest--;
    s += bester.breite;
  }
  // Restfläche ehrlich ausweisen (≥ 2 m Breite)
  if (band.laenge - s >= 2000) {
    const o = band.o;
    const a = { x: o.x + band.d.x * s, y: o.y + band.d.y * s };
    const b = { x: o.x + band.d.x * band.laenge, y: o.y + band.d.y * band.laenge };
    const outline: Pt[] = [
      a,
      b,
      { x: b.x + band.n.x * tiefe, y: b.y + band.n.y * tiefe },
      { x: a.x + band.n.x * tiefe, y: a.y + band.n.y * tiefe },
    ].map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    wohnungen.push({
      outline: ccw(outline),
      flaeche: Math.round(((band.laenge - s) * tiefe) / 1e5) / 10,
      typ: null,
      abweichung: null,
    });
  }
  return wohnungen;
}

/**
 * Erschliessungskern reservieren: erste 3.0 m des ersten Bands (mutiert
 * `baender[0]` in place — o/laenge rücken um KERN vor — exakt wie bisher
 * inline in `segmentiere()`). Extrahiert (Refactor E5-i, Verhalten
 * unverändert), damit `variantenSuche()` dieselbe Kern-Reservierung nutzt,
 * statt sie zu duplizieren.
 */
export function reserviereKern(
  baender: Band[],
  opts: Pick<SegmentierOptionen, 'kern'>,
): { kern: { outline: Pt[] } | null; diagnose: string[] } {
  const diagnose: string[] = [];
  let kern: { outline: Pt[] } | null = null;
  if (opts.kern && baender.length > 0) {
    const b0 = baender[0]!;
    const KERN = 3000;
    if (b0.laenge > KERN + 4500) {
      const o = b0.o;
      const p1 = { x: o.x, y: o.y };
      const p2 = { x: o.x + b0.d.x * KERN, y: o.y + b0.d.y * KERN };
      kern = {
        outline: ccw([
          p1, p2,
          { x: p2.x + b0.n.x * b0.tiefe, y: p2.y + b0.n.y * b0.tiefe },
          { x: p1.x + b0.n.x * b0.tiefe, y: p1.y + b0.n.y * b0.tiefe },
        ].map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))),
      };
      b0.o = { x: o.x + b0.d.x * KERN, y: o.y + b0.d.y * KERN };
      b0.laenge -= KERN;
      diagnose.push('Erschliessungskern 3.0 m am Bandanfang reserviert (Treppenhaus).');
    } else {
      diagnose.push('Band zu kurz für den Kern — ohne Treppenhaus geschnitten.');
    }
  }
  return { kern, diagnose };
}

/**
 * Mix-Erfüllung + Diagnose aus einer fertigen Wohnungsliste ableiten (Ist
 * je Typ zählen, Verfehlungen und Restfläche als Diagnosezeilen). Extrahiert
 * (Refactor E5-i, Verhalten unverändert) aus dem Schwanz von `segmentiere()`
 * — `variantenSuche()` braucht dieselbe Auswertung nach jedem Ruin-&-
 * Recreate-Zug, statt sie zu duplizieren.
 */
export function ergebnisAusWohnungen(
  wohnungen: GeschnitteneWohnung[],
  mix: WohnungsTypSoll[],
): { mix: { typ: string; soll: number; ist: number }[]; diagnose: string[] } {
  const diagnose: string[] = [];
  const ist = new Map<string, number>();
  for (const w of wohnungen) {
    if (w.typ) ist.set(w.typ, (ist.get(w.typ) ?? 0) + 1);
  }
  const mixErfuellung = mix.map((m) => ({ typ: m.typ, soll: m.anzahl, ist: ist.get(m.typ) ?? 0 }));
  for (const m of mixErfuellung) {
    if (m.ist < m.soll) {
      diagnose.push(`${m.typ}: ${m.ist}/${m.soll} — Band zu kurz oder Typgrösse passt nicht zur Tiefe.`);
    }
  }
  const rest = wohnungen.filter((w) => w.typ === null);
  if (rest.length > 0) {
    diagnose.push(
      `Restfläche ${rest.reduce((s2, w) => s2 + w.flaeche, 0).toFixed(1)} m² — als «Opfer-Wohnung» zusammenfassen oder Schnitt verschieben.`,
    );
  }
  return { mix: mixErfuellung, diagnose };
}

/**
 * Segmentierung: grösste Zone = Footprint-Referenz? Nein — explizit:
 * footprint-Zone (Parzelle/Geschossfläche) und Korridor werden übergeben.
 */
export function segmentiere(
  footprint: Pt[],
  korridor: Pt[],
  mix: WohnungsTypSoll[],
  opts: SegmentierOptionen = {},
): SegmentierungsErgebnis {
  const minBreite = opts.minBreite ?? 4500;
  if (opts.groessen) {
    mix = mix.map((m) => (opts.groessen![m.typ] ? { ...m, groesse: opts.groessen![m.typ]! } : m));
  }
  const diagnose: string[] = [];
  const baender = bilderBaender(footprint, korridor);
  if (baender.length === 0) {
    diagnose.push('Kein Band ≥ 3 m Tiefe neben dem Korridor — Korridorlage prüfen.');
    return { wohnungen: [], mix: mix.map((m) => ({ typ: m.typ, soll: m.anzahl, ist: 0 })), kern: null, diagnose };
  }
  const { kern, diagnose: kernDiagnose } = reserviereKern(baender, opts);
  diagnose.push(...kernDiagnose);
  const bedarf = new Map(mix.map((m) => [m.typ, { groesse: m.groesse, rest: m.anzahl }]));
  const wohnungen: GeschnitteneWohnung[] = [];
  for (const band of baender) {
    wohnungen.push(...schneideBand(band, bedarf, minBreite));
  }
  const { mix: mixErfuellung, diagnose: ergDiagnose } = ergebnisAusWohnungen(wohnungen, mix);
  diagnose.push(...ergDiagnose);
  return { wohnungen, mix: mixErfuellung, kern, diagnose };
}
