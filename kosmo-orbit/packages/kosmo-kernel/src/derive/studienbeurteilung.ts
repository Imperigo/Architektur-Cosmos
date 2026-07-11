import type { Pt } from '../model/units';
import { polygonArea } from '../model/units';
import type { StudienKoerper, StudienVariante } from './volumenstudie';
import type { ProgrammErfuellung } from './programmerfuellung';

/**
 * Grundlagenstudie-Beurteilung v2 (Owner-Befund K1, `docs/OWNER-BEFUNDE-0.6.2.md`
 * — «Dieser gesamte Teil ist ultra schlecht!»). Der v1-Bericht
 * (`derive/studienbericht.ts`) zeigte nur Footprints + rohe Kennwert-Zeilen;
 * dieses Modul liefert die eigentliche architektonische Urteilsbildung als
 * pure, deterministische Funktionen — reine Ableitungen aus `StudienVariante`
 * + den bereits bestehenden optionalen Kennwertlisten
 * (`besonnungsvergleich.ts`, `programmerfuellung.ts`). Kein Doc-Zugriff, kein
 * `Date.now()`/`Math.random()`, kein neues Sonnenmodell — nur Geometrie
 * (Fläche/Umfang aus den bereits vorhandenen `StudienKoerper.outline`) und
 * eine gewichtete Ranking-Funktion.
 *
 * EHRLICHE GRENZEN dieses Moduls (identisch zur Philosophie der Nachbar-
 * Module `besonnungsvergleich.ts`/`programmerfuellung.ts`):
 * - Der Ranking-Score ist ein RELATIVER Vergleich unter den übergebenen
 *   Varianten derselben Studie, kein absolutes Gütemass — fehlt einer
 *   Variante ein Kennwert (z.B. `besonnung: null`), fliesst dafür ein
 *   neutraler Wert (0) ein, NIE eine erfundene Zahl.
 * - Fehlt die Datengrundlage eines ganzen Kriteriums für ALLE Varianten
 *   (kein `parzelle`-Umriss ⇒ kein Freiflächenanteil berechenbar; kein
 *   `programm` ⇒ keine Programm-Erfüllung), wird das Kriterium mit Gewicht 0
 *   markiert (`RankingGewicht.aktiv === false`) und sein Basis-Gewicht auf
 *   die übrigen, tatsächlich verfügbaren Kriterien umgelegt — die
 *   verbleibenden Gewichte summieren sich weiterhin zu 1. Der Fusstext des
 *   Berichts (`studienbericht.ts`) macht diese Umlage transparent.
 * - Die Kompaktheits-Kennzahl (Fassadenumfang×Höhe / GF) ist ein A/V-PROXY,
 *   keine echte Gebäudehüllflächen-/Volumenrechnung (Dach/Bodenplatte fehlen
 *   bewusst — reine Vergleichszahl zwischen den Studienkörpern derselben
 *   Parzelle, analog zum 3h-Kriterium-Richtwert in `volumenstudie.ts`).
 * - `TYPOLOGIE_MERKMALE` ist städtebauliches Grundwissen (Setzung,
 *   Freiraum-Charakter, Erschliessungslogik, typische Schwäche je
 *   Extremvariante) — JEDER Beurteilungssatz wird mit den ECHTEN Zahlen der
 *   konkreten Variante parametrisiert, das Merkmal liefert nur die
 *   architektonische Einordnung, nie die Zahl selbst.
 */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Deutschschweizer Zahlformat, max. 1 Dezimale — identisch zu `studienbericht.ts` `f1`. */
export function f1(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 1 });
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Gemeinsame BBox über beliebig viele Umrisse (Parzelle + Footprints) — fürs Situations-Diagramm. */
export function bboxVonPunkte(outlines: Pt[][]): BBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const outline of outlines) {
    for (const p of outline) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function perimeterMm(outline: Pt[]): number {
  let s = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}

/**
 * Projiziert einen Umriss (Kern-mm) in ein rechteckiges Zielfenster (`boxX/
 * boxY/boxSize` bzw. eine flächige `off`-Ecke + `scale`) — Nord bleibt oben
 * (y gespiegelt), zentriert über `bb`. Gemeinsame Quelle für `situationSvg`
 * (hier) UND `derive/schwarzplan.ts` (v0.7.0 E4, Situationsplan/Schwarzplan)
 * — beide brauchen exakt dieselbe Parzelle/Footprint-Projektion, nur mit
 * unterschiedlicher Zielgrösse (Report-Karte vs. massstabstreues Blatt).
 */
export function projiziereUmriss(
  outline: Pt[],
  bb: BBox,
  scale: number,
  offX: number,
  offY: number,
): string {
  return outline
    .map((p) => {
      const x = offX + (p.x - bb.minX) * scale;
      const y = offY + (bb.maxY - p.y) * scale;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Situations-Diagramm einer Variante: Parzellen-Umriss (gestrichelt, sofern
 * übergeben) MIT dem Footprint darin platziert — Owner-Befund K1 verlangt
 * genau das (v1 zeigte nur den Footprint allein, «sagt gar nichts» über den
 * Bezug zur Parzelle). Gemeinsame `bb`/`scale` über ALLE Varianten der
 * Studie (Vergleichbarkeit), analog zu `footprintSvg` in `studienbericht.ts`.
 */
export function situationSvg(
  parzelle: Pt[] | undefined,
  koerper: StudienKoerper[],
  bb: BBox,
  scale: number,
  boxX: number,
  boxY: number,
  boxSize: number,
): string {
  const vW = (bb.maxX - bb.minX) * scale;
  const vH = (bb.maxY - bb.minY) * scale;
  const offX = boxX + (boxSize - vW) / 2;
  const offY = boxY + (boxSize - vH) / 2;
  const punkteZu = (outline: Pt[]): string => projiziereUmriss(outline, bb, scale, offX, offY);
  const teile: string[] = [];
  if (parzelle && parzelle.length >= 3) {
    teile.push(
      `<polygon points="${punkteZu(parzelle)}" fill="none" stroke="#888888" stroke-width="1" stroke-dasharray="3,2"/>`,
    );
  }
  for (const k of koerper) {
    teile.push(`<polygon points="${punkteZu(k.outline)}" fill="#e4e4e4" stroke="#333333" stroke-width="1"/>`);
  }
  return teile.join('');
}

export interface FlaechenKennwert {
  /** Summe der Footprint-Flächen aller `StudienKoerper` der Variante (m²). */
  footprintM2: number;
  /** Parzellenfläche (m²); `null` ohne `parzelle`-Umriss. */
  parzelleM2: number | null;
  /** footprintM2 / parzelleM2 × 100 (%); `null` ohne Parzellenbezug. */
  ueberbauungProzent: number | null;
  /** 100 − ueberbauungProzent (%); `null` ohne Parzellenbezug. */
  freiflaecheProzent: number | null;
}

/** Überbauungsgrad/Freiflächenanteil — NUR mit `parzelle`-Umriss berechenbar (K1: «Freiflächenanteil der Parzelle»). */
export function flaechenKennwert(v: StudienVariante, parzelle: Pt[] | undefined): FlaechenKennwert {
  const footprintM2 = v.koerper.reduce((s, k) => s + Math.abs(polygonArea(k.outline)), 0) / 1e6;
  if (!parzelle || parzelle.length < 3) {
    return { footprintM2: round1(footprintM2), parzelleM2: null, ueberbauungProzent: null, freiflaecheProzent: null };
  }
  const parzelleM2 = Math.abs(polygonArea(parzelle)) / 1e6;
  const ueberbauungProzent = parzelleM2 > 0 ? round1((footprintM2 / parzelleM2) * 100) : null;
  const freiflaecheProzent = ueberbauungProzent !== null ? round1(100 - ueberbauungProzent) : null;
  return {
    footprintM2: round1(footprintM2),
    parzelleM2: parzelleM2 > 0 ? round1(parzelleM2) : null,
    ueberbauungProzent,
    freiflaecheProzent,
  };
}

/**
 * A/V-Proxy «Kompaktheit» (K1): Fassadenumfang×Höhe (≈ laterale Hüllfläche,
 * m²) je m² GF — kleiner heisst kompakter/effizienter. `null` nur wenn die
 * Variante keine GF hat (kann laut `generiereVolumenstudien` nicht
 * vorkommen, hier defensiv statt einer Division durch 0).
 */
export function kompaktheitsProxy(v: StudienVariante): number | null {
  if (v.gf <= 0) return null;
  const fassadeM2 = v.koerper.reduce((s, k) => s + (perimeterMm(k.outline) * k.height) / 1e6, 0);
  return round1(fassadeM2 / v.gf);
}

/**
 * Regelkonformitäts-Rohwert (grösser = besser), fürs Ranking UND fürs
 * «beste Zelle»-Highlighting der Vergleichstabelle.
 *
 * WICHTIG (Erkenntnis aus `generiereVolumenstudien`, `volumenstudie.ts`
 * Z.154): `v.geschosse` ist IMMER auf `maxGeschosse` gekappt, darum ist
 * `v.hoehe` bei JEDER Variante ≤ `maxHoeheMm` — auch bei `passt === false`.
 * `passt === false` heisst NICHT «Höhe überschritten», sondern «selbst mit
 * den maximal zulässigen Geschossen reicht der Fussabdruck nicht fürs
 * GF-Ziel». Eine reine Höhendifferenz (`maxHoeheMm − v.hoehe`) wäre darum
 * für sprengende Varianten NICHT automatisch negativ/schlechter — genau der
 * Fehler, den diese Funktion vermeidet: `passt` ist die PRIMÄRE, strikt
 * trennende Bedingung (grosser Offset), die Höhenreserve dient nur als
 * Tie-Breaker INNERHALB derselben passt/passt-nicht-Gruppe.
 */
export function regelGoodness(v: StudienVariante, maxHoeheMm: number | null | undefined): number {
  const reserveM = maxHoeheMm != null ? (maxHoeheMm - v.hoehe) / 1000 : 0;
  return v.passt ? 1000 + reserveM : -1000 + reserveM;
}

export type RankingKriteriumKey = 'programm' | 'regelkonformitaet' | 'besonnung' | 'freiflaeche' | 'kompaktheit';

export interface RankingGewicht {
  key: RankingKriteriumKey;
  label: string;
  /** Renormiertes Gewicht dieses Berichts (0..1); summiert über alle `aktiv`-Kriterien zu 1. */
  gewicht: number;
  /** false = Datengrundlage fehlt für ALLE Varianten (kein `parzelle`/`programm` übergeben) — Gewicht 0, Basis auf die übrigen umgelegt. */
  aktiv: boolean;
}

export interface RankingZeile {
  varianteId: string;
  varianteName: string;
  /** Gewichtete Summe der normierten (0..1) Einzelkriterien, gerundet auf 3 Dezimalen. */
  score: number;
  /** Normierte (0..1) Einzelwerte je AKTIVEM Kriterium (fehlende/inaktive Kriterien tragen keinen Eintrag). */
  kriterienScores: Partial<Record<RankingKriteriumKey, number>>;
}

export interface StudienRanking {
  gewichte: RankingGewicht[];
  /** Gleiche Reihenfolge wie die übergebenen `varianten` — NICHT nach Score sortiert. */
  zeilen: RankingZeile[];
  /** Variante mit dem höchsten Score; bei Gleichstand die erste in Eingabe-Reihenfolge. `null` nur bei `varianten: []`. */
  topId: string | null;
}

const GEWICHTE_BASIS: { key: RankingKriteriumKey; label: string; basis: number }[] = [
  { key: 'programm', label: 'Programm-Erfüllung (±100%)', basis: 0.3 },
  { key: 'regelkonformitaet', label: 'Regelkonformität (passt/Höhenreserve)', basis: 0.25 },
  { key: 'besonnung', label: 'Besonnung (Grenzabstand 3h)', basis: 0.15 },
  { key: 'freiflaeche', label: 'Freiflächenanteil der Parzelle', basis: 0.15 },
  { key: 'kompaktheit', label: 'Kompaktheit (Fassade/GF-Proxy)', basis: 0.15 },
];

/** Min-Max-Normierung auf 0..1; `null`-Rohwerte bleiben `null`; alle Werte gleich ⇒ alle 1 (neutral, ändert das Ranking nicht). */
function normalisieren(rohwerte: (number | null)[]): (number | null)[] {
  const vorhanden = rohwerte.filter((w): w is number => w !== null);
  if (vorhanden.length === 0) return rohwerte.map(() => null);
  const min = Math.min(...vorhanden);
  const max = Math.max(...vorhanden);
  if (max === min) return rohwerte.map((w) => (w === null ? null : 1));
  return rohwerte.map((w) => (w === null ? null : (w - min) / (max - min)));
}

export interface StudienRankingKontext {
  /** Parzellen-Umriss fürs Freiflächenanteil-Kriterium; `undefined` deaktiviert dieses Kriterium ehrlich. */
  parzelle: Pt[] | undefined;
  /** Max. Gebäudehöhe der Zonenregel (mm); `undefined`/`null` schwächt die Regelkonformitäts-Wertung auf ein reines passt/sprengt. */
  maxHoeheMm: number | null | undefined;
  /** Programm-Erfüllung je Variante; `undefined`/`[]` deaktiviert das Programm-Kriterium ehrlich. */
  programm: ProgrammErfuellung[] | undefined;
  /** GF-Ziel (m²) — NUR für die «sprengt Höhe um X m»-Textbildung gebraucht (`empfehlungssaetze`/`beurteilungssaetze`), nicht fürs Ranking selbst. `undefined`/`null` lässt den Satz ohne erfundene Zahl. */
  zielGf?: number | null;
}

/**
 * Ehrliche Höhen-Überschreitung einer NICHT passenden Variante: `v.geschosse`
 * ist laut `generiereVolumenstudien` immer auf `maxGeschosse` gekappt, darum
 * ist `v.hoehe` NIE grösser als `maxHoeheMm` (auch bei `passt === false`) —
 * eine simple `v.hoehe − maxHoeheMm`-Differenz wäre hier IMMER ≤ 0, also
 * falsch. Diese Funktion rechnet stattdessen aus, wie viele Geschosse (und
 * damit wie viel Höhe) der tatsächliche Fussabdruck bräuchte, um `zielGf`
 * OHNE die Geschosse-Kappung zu erreichen — die Differenz zu `maxHoeheMm`
 * ist die reale Überschreitung. `null`, wenn `maxHoeheMm`/`zielGf` fehlen
 * oder der Fussabdruck 0 ist (keine erfundene Zahl statt einer echten).
 */
function benoetigteHoehenUeberschreitungM(
  v: StudienVariante,
  maxHoeheMm: number | null | undefined,
  zielGf: number | null | undefined,
): number | null {
  if (maxHoeheMm == null || zielGf == null) return null;
  const footprintM2 = flaechenKennwert(v, undefined).footprintM2;
  if (footprintM2 <= 0) return null;
  const benoetigteGeschosse = Math.max(Math.ceil(zielGf / footprintM2), 1);
  const benoetigteHoeheMm = v.hoehen.eg + Math.max(benoetigteGeschosse - 1, 0) * v.hoehen.og;
  const overshootM = round1((benoetigteHoeheMm - maxHoeheMm) / 1000);
  return overshootM > 0 ? overshootM : null;
}

/**
 * Gewichtetes Ranking der Volumenstudien-Varianten (K1: «Ranking-Funktion:
 * gewichtete Kriterien Programm-Erfüllung ±100%, Regelkonformität
 * (passt/Höhenreserve), Besonnung, Freiflächenanteil der Parzelle,
 * Kompaktheit als A/V-Proxy»). Deterministisch: reine Funktion von
 * `varianten`/`kontext`, keine Zeit-/Zufalls-/Doc-Abhängigkeit.
 */
export function studienRanking(varianten: StudienVariante[], kontext: StudienRankingKontext): StudienRanking {
  if (varianten.length === 0) {
    return {
      gewichte: GEWICHTE_BASIS.map((g) => ({ key: g.key, label: g.label, gewicht: 0, aktiv: false })),
      zeilen: [],
      topId: null,
    };
  }

  const programmVerfuegbar = (kontext.programm?.length ?? 0) === varianten.length && varianten.length > 0;
  const freiflaecheVerfuegbar = !!kontext.parzelle && kontext.parzelle.length >= 3;

  const programmRaw = varianten.map((v) => {
    if (!programmVerfuegbar) return null;
    const p = kontext.programm!.find((x) => x.varianteId === v.id);
    return p && p.erfuellungProzent !== null ? -Math.abs(100 - p.erfuellungProzent) : null;
  });
  const regelRaw = varianten.map((v) => regelGoodness(v, kontext.maxHoeheMm));
  const besonnungRaw = varianten.map((v) => (v.besonnung ? v.besonnung.ist - v.besonnung.noetig : 0));
  const freiflaecheRaw = varianten.map((v) =>
    freiflaecheVerfuegbar ? flaechenKennwert(v, kontext.parzelle).freiflaecheProzent : null,
  );
  const kompaktheitRaw = varianten.map((v) => {
    const k = kompaktheitsProxy(v);
    return k === null ? null : -k; // kleiner Proxy = besser ⇒ negieren fürs "höher = besser"-Schema
  });

  const rohwerteByKey: Record<RankingKriteriumKey, (number | null)[]> = {
    programm: programmRaw,
    regelkonformitaet: regelRaw,
    besonnung: besonnungRaw,
    freiflaeche: freiflaecheRaw,
    kompaktheit: kompaktheitRaw,
  };
  const aktivByKey: Record<RankingKriteriumKey, boolean> = {
    programm: programmVerfuegbar,
    regelkonformitaet: true,
    besonnung: true,
    freiflaeche: freiflaecheVerfuegbar,
    kompaktheit: true,
  };

  const summeBasisAktiv = GEWICHTE_BASIS.filter((g) => aktivByKey[g.key]).reduce((s, g) => s + g.basis, 0);
  const gewichte: RankingGewicht[] = GEWICHTE_BASIS.map((g) => ({
    key: g.key,
    label: g.label,
    gewicht: aktivByKey[g.key] && summeBasisAktiv > 0 ? Math.round((g.basis / summeBasisAktiv) * 1000) / 1000 : 0,
    aktiv: aktivByKey[g.key],
  }));

  const normalisiertByKey: Record<RankingKriteriumKey, (number | null)[]> = {
    programm: normalisieren(rohwerteByKey.programm),
    regelkonformitaet: normalisieren(rohwerteByKey.regelkonformitaet),
    besonnung: normalisieren(rohwerteByKey.besonnung),
    freiflaeche: normalisieren(rohwerteByKey.freiflaeche),
    kompaktheit: normalisieren(rohwerteByKey.kompaktheit),
  };

  const zeilen: RankingZeile[] = varianten.map((v, i) => {
    let score = 0;
    const kriterienScores: RankingZeile['kriterienScores'] = {};
    for (const g of gewichte) {
      if (!g.aktiv) continue;
      const n = normalisiertByKey[g.key][i]!;
      if (n === null) continue;
      kriterienScores[g.key] = Math.round(n * 1000) / 1000;
      score += g.gewicht * n;
    }
    return { varianteId: v.id, varianteName: v.name, score: Math.round(score * 1000) / 1000, kriterienScores };
  });

  let topId: string | null = null;
  let topScore = -Infinity;
  for (const z of zeilen) {
    if (z.score > topScore) {
      topScore = z.score;
      topId = z.varianteId;
    }
  }

  return { gewichte, zeilen, topId };
}

/**
 * Empfehlungs-Absatz (K1: «EIN Satz Empfehlung + 2–3 Sätze Begründung —
 * regelbasiert aus den echten Zahlen hergeleitet»). `saetze[0]` ist die
 * Empfehlung, `saetze.slice(1)` die Begründung (2–3 Sätze) — JEDER Satz
 * enthält reale Zahlen aus `varianten`/`ranking`, nie eine generische
 * Floskel ohne Zahlenbezug.
 */
export function empfehlungssaetze(
  varianten: StudienVariante[],
  ranking: StudienRanking,
  kontext: StudienRankingKontext,
): string[] {
  if (varianten.length === 0 || ranking.topId === null) {
    return ['Empfehlung: —', 'Keine Varianten vorhanden — zuerst eine Parzelle als Zone zeichnen.'];
  }
  const top = varianten.find((v) => v.id === ranking.topId)!;
  const topZeile = ranking.zeilen.find((z) => z.varianteId === top.id)!;
  const saetze: string[] = [`Empfehlung: ${top.name}.`];

  const teile: string[] = [];
  const programmEintrag = kontext.programm?.find((p) => p.varianteId === top.id);
  if (programmEintrag && programmEintrag.erfuellungProzent !== null) {
    teile.push(`erfüllt das Programm zu ${f1(programmEintrag.erfuellungProzent)} %`);
  }
  if (top.passt) {
    teile.push(
      kontext.maxHoeheMm != null
        ? `hält die Höhe mit ${f1(round1((kontext.maxHoeheMm - top.hoehe) / 1000))} m Reserve ein`
        : 'hält die Zonenregel ein',
    );
  } else {
    const overshoot = benoetigteHoehenUeberschreitungM(top, kontext.maxHoeheMm, kontext.zielGf);
    teile.push(overshoot !== null ? `sprengt die zulässige Höhe um ${f1(overshoot)} m` : 'sprengt die zulässige Höhe');
  }
  saetze.push(`Sie ${teile.join(' und ')}.`);

  const flaeche = flaechenKennwert(top, kontext.parzelle);
  if (flaeche.freiflaecheProzent !== null && flaeche.ueberbauungProzent !== null) {
    saetze.push(
      `Mit ${f1(flaeche.freiflaecheProzent)} % Freifläche bei ${f1(flaeche.ueberbauungProzent)} % Überbauung bleibt die Parzelle vergleichsweise offen.`,
    );
  } else if (top.besonnung) {
    saetze.push(
      `Der Grenzabstand ${top.besonnung.ok ? 'erfüllt' : 'unterschreitet'} das 3h-Kriterium (${f1(top.besonnung.ist / 1000)} / ${f1(top.besonnung.noetig / 1000)} m).`,
    );
  }

  const zweitBeste = ranking.zeilen
    .filter((z) => z.varianteId !== top.id)
    .reduce<RankingZeile | null>((best, z) => (best === null || z.score > best.score ? z : best), null);
  if (zweitBeste && saetze.length < 4) {
    saetze.push(
      `Im Ranking liegt sie mit einem Score von ${f1(topZeile.score * 100)} vor «${zweitBeste.varianteName}» (${f1(zweitBeste.score * 100)}).`,
    );
  }

  return saetze.slice(0, 4);
}

export interface TypologieMerkmal {
  /** Städtebauliche Setzung — wie der Baukörper die Parzelle besetzt. */
  setzung: string;
  /** Charakter des verbleibenden Freiraums. */
  freiraum: string;
  /** Erschliessungslogik der Typologie. */
  erschliessung: string;
  /** Typische städtebauliche/typologische Schwäche (generisch, ohne Zahlen). */
  schwaeche: string;
}

/**
 * Typologie-Wissensbausteine (K1) — städtebauliches Grundwissen je
 * Extremvariante aus `generiereVolumenstudien` (`teppich`/`riegel`/`turm`/
 * `zeilen`/`winkel`/`blockrand`). Liefert NUR die architektonische
 * Einordnung; `beurteilungssaetze` parametrisiert jeden Satz mit den echten
 * Zahlen der jeweiligen Variante — dieser Baustein selbst enthält keine
 * erfundenen Kennzahlen.
 */
export const TYPOLOGIE_MERKMALE: Record<string, TypologieMerkmal> = {
  teppich: {
    setzung:
      'flächendeckende, niedrige Bebauung ohne Adressbildung — der «Mat-Building»-Ansatz der Teppichsiedlung',
    freiraum: 'der Freiraum verteilt sich in vielen kleinen Zwischenräumen statt in einem grossen Aussenraum',
    erschliessung: 'kurze, ebenerdige Wege zu jeder Einheit, aber viele parallele Zugänge statt eines Rückgrats',
    schwaeche: 'braucht den grössten Fussabdruck der Parzelle, was den Freiflächenanteil strukturell drückt',
  },
  riegel: {
    setzung:
      'ein langgestreckter Baukörper entlang einer Achse — klassischer Zeilenbau/Riegel mit klarer Adresse',
    freiraum: 'der Freiraum bleibt als ein grosses, zusammenhängendes Vorfeld erhalten statt in Restflächen zu zerfallen',
    erschliessung: 'ein durchgehendes Treppenhaus-/Laubengang-Rückgrat erschliesst alle Geschosse geradlinig',
    schwaeche: 'die einseitige Ausrichtung benachteiligt eine der beiden Fassaden bei Besonnung/Aussicht',
  },
  turm: {
    setzung: 'kompakter Solitär mit maximaler Höhe — Hochpunkt/Landmarke, die den Boden weitgehend freigibt',
    freiraum: 'lässt anteilig den grössten Freiraum der Parzelle frei, dafür wirkt der Schattenwurf punktuell stark',
    erschliessung: 'ein zentraler Kern (Treppe/Lift) bedient alle Geschosse — kurze Wege, aber eine einzige Vertikalerschliessung',
    schwaeche: 'die fürs Programm nötige Geschosszahl stösst am ehesten an die zulässige Gebäudehöhe',
  },
  zeilen: {
    setzung: 'zwei parallele Zeilen mit besonnter Gasse — serielle Zeilenbebauung nach Siedlungslogik der Moderne',
    freiraum: 'der Freiraum bündelt sich in der Gasse zwischen den Zeilen statt am Rand',
    erschliessung: 'je Zeile ein eigenes Erschliessungsband, gut für Durchwohnungen, aber zwei getrennte Adressen',
    schwaeche: 'die Gassenbreite entscheidet direkt über die Besonnung der Nordzeile',
  },
  winkel: {
    setzung: 'L-Form an zwei Parzellenkanten — fasst einen Hof und schirmt eine Seite ab',
    freiraum: 'der gefasste Hof ist introvertiert und windgeschützt, aber kleiner als ein durchgehendes Vorfeld',
    erschliessung: 'der Knick erzwingt einen zusätzlichen Erschliessungspunkt im Eck, sonst werden die Wege lang',
    schwaeche: 'die Gebäudetiefe im Winkel unter- oder überschreitet häufig das Spänner-Mass (14–18 m)',
  },
  blockrand: {
    setzung: 'umlaufendes Band mit Innenhof — geschlossene Blockrandbebauung, städtische Kante zu allen Seiten',
    freiraum: 'der Innenhof ist vollständig gefasst und ruhig, aber vom Aussenraum der Parzelle abgeschnitten',
    erschliessung: 'mehrere Treppenhäuser verteilt entlang des Rands, kurze Wege, aber viele Adressen zu koordinieren',
    schwaeche: 'die Randbreite konkurriert gleichzeitig mit dem Hofmindestmass (nie unter 13 m) und dem Spänner-Mass',
  },
};

export interface BeurteilungKontext {
  parzelle: Pt[] | undefined;
  maxHoeheMm: number | null | undefined;
  /** Programm-Erfüllung DIESER Variante (nicht die ganze Liste). */
  programm: ProgrammErfuellung | undefined;
  /** GF-Ziel (m²) — NUR fürs ehrliche «sprengt Höhe um X m» (s. `benoetigteHoehenUeberschreitungM`). */
  zielGf?: number | null;
}

/**
 * Beurteilung je Variante (K1: «je 3–4 Sätze, NICHT generisch … jeder Satz
 * muss durch Variante-Daten parametrisiert sein»). Komponiert aus
 * `TYPOLOGIE_MERKMALE[v.id]` (Einordnung) + den echten Zahlen der Variante
 * (Setzung/Freiraum/Schwäche werden mit Geschossen/Höhe/GF/Freifläche/
 * Regel-Überschreitung parametrisiert). Fehlt `TYPOLOGIE_MERKMALE[v.id]`
 * (unbekannte/zukünftige Typologie-ID), fällt der Satz auf die reinen
 * Kennzahlen zurück — keine erfundene Einordnung.
 */
export function beurteilungssaetze(v: StudienVariante, kontext: BeurteilungKontext): string[] {
  const merkmal = TYPOLOGIE_MERKMALE[v.id];
  const flaeche = flaechenKennwert(v, kontext.parzelle);
  const saetze: string[] = [];

  if (merkmal) {
    saetze.push(
      `${v.name}: ${merkmal.setzung} — ${f1(v.geschosse)} Geschosse, ${f1(v.hoehe / 1000)} m Höhe, ${f1(v.gf)} m² GF.`,
    );
    saetze.push(
      flaeche.freiflaecheProzent !== null && flaeche.ueberbauungProzent !== null
        ? `${merkmal.freiraum.charAt(0).toUpperCase()}${merkmal.freiraum.slice(1)} (${f1(flaeche.freiflaecheProzent)} % Freifläche bei ${f1(flaeche.ueberbauungProzent)} % Überbauung).`
        : `${merkmal.freiraum.charAt(0).toUpperCase()}${merkmal.freiraum.slice(1)}.`,
    );
    saetze.push(`${merkmal.erschliessung.charAt(0).toUpperCase()}${merkmal.erschliessung.slice(1)}.`);
  } else {
    saetze.push(`${v.name}: ${f1(v.geschosse)} Geschosse, ${f1(v.hoehe / 1000)} m Höhe, ${f1(v.gf)} m² GF.`);
  }

  const schwaechen: string[] = [];
  if (!v.passt) {
    const overshoot = benoetigteHoehenUeberschreitungM(v, kontext.maxHoeheMm, kontext.zielGf);
    schwaechen.push(
      overshoot !== null
        ? `Sprengt die zulässige Höhe um ${f1(overshoot)} m, um das Programm zu fassen.`
        : 'Sprengt die zulässige Höhe, um das Programm zu fassen.',
    );
  }
  if (v.tiefeOk === false && v.tiefe !== null) {
    schwaechen.push(`Gebäudetiefe ${f1(v.tiefe / 1000)} m liegt ausserhalb des Spänner-Masses (14–18 m).`);
  }
  if (v.besonnung && !v.besonnung.ok) {
    schwaechen.push(
      `Grenzabstand ${f1(v.besonnung.ist / 1000)} m unterschreitet die nötigen ${f1(v.besonnung.noetig / 1000)} m fürs 3h-Kriterium.`,
    );
  }
  if (kontext.programm && kontext.programm.erfuellungProzent !== null && Math.abs(100 - kontext.programm.erfuellungProzent) > 15) {
    schwaechen.push(
      kontext.programm.erfuellungProzent > 100
        ? `Übererfüllt das Programm um ${f1(round1(kontext.programm.erfuellungProzent - 100))} Prozentpunkte.`
        : `Erfüllt das Programm nur zu ${f1(kontext.programm.erfuellungProzent)} %.`,
    );
  }
  if (schwaechen.length === 0 && merkmal) {
    schwaechen.push(`${merkmal.schwaeche.charAt(0).toUpperCase()}${merkmal.schwaeche.slice(1)}.`);
  }

  saetze.push(...schwaechen.slice(0, 2));
  return saetze.slice(0, 4);
}
