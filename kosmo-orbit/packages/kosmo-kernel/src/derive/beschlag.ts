/**
 * Beschlag-Katalog Stufe 1 (v0.7.4 Welle 3, P10): architektonischer
 * Tür-/Fensterbeschlag als reine Katalogdaten — Vorbild strikt
 * `derive/moebel.ts` (`MoebelTyp`/`MOEBEL_KATALOG`/`moebelTyp()`).
 *
 * Abgrenzung zum bestehenden «Beschlag-Katalog S0» (v0.7.3 §D6,
 * `design.beschlagSetzen`, `test/werkplan-beschlag.test.ts`): S0 setzt
 * FELDER an einer Öffnung (Band/Griffseite/Antrieb/Absturzsicherung) und
 * zeichnet deren Symbole im Werkplan. S1 (hier) ist unabhängig davon ein
 * KATALOG konkreter Beschlag-TYPEN (Türdrücker, Scharnier, Schloss, …) mit
 * eigenem Plan-Piktogramm und IFC-Zuordnung — die Datengrundlage für einen
 * künftigen S2 (eigene Entity + Placement-Command + UI, wie `Furniture` es
 * für `MOEBEL_KATALOG` ist). S1 fügt bewusst NUR Daten/Geometrie/Mapping
 * hinzu: keine neue Entity, kein Placement-Command, keine UI, und KEIN
 * bestehender Ableitungspfad (plansvg/ifc-export/…) ruft irgendetwas aus
 * dieser Datei auf — Goldens bleiben dadurch byte-identisch.
 */

export type BeschlagKategorie = 'tuer' | 'fenster' | 'sicherheit';

/**
 * Erlaubte IFC4-Klassen für diesen Katalog. Der bestehende Exporter
 * (`ifc/export.ts`) kennt bislang nur `IFCFURNISHINGELEMENT` (für lose
 * `Furniture`-Objekte, siehe dort `moebelGeometrie`/`moebelTyp`). Da
 * Beschläge in Stufe 1 keine Entity sind, exportiert `ifc/export.ts` sie
 * NICHT — die Zuordnung hier ist die für ein künftiges S2 vorbereitete,
 * schema-korrekte IFC4-Klasse. Es werden bewusst KEINE Klassen erfunden,
 * die es im IFC4-Schema nicht gibt (insbesondere kein „IFCDOORHARDWARE" —
 * das existiert nicht): reale Tür-/Fensterbeschläge sind im IFC4-Schema
 * `IfcDiscreteAccessory` (fest an einem Bauteil montiertes Zubehör/Element-
 * Komponente); `IfcFurnishingElement` bliebe als Alternative reserviert für
 * einen Typ, der eher als eigenständiges Möbelstück denn als Zubehör am
 * Tür-/Fensterelement gilt — bei den 12 Katalogtypen unten trifft das auf
 * keinen zu (alle sind an Tür/Fenster montierte Beschlagteile), daher
 * einheitlich `IFCDISCRETEACCESSORY`.
 */
export type BeschlagIfcTyp = 'IFCDISCRETEACCESSORY' | 'IFCFURNISHINGELEMENT';

export const BESCHLAG_IFC_TYPEN: readonly BeschlagIfcTyp[] = [
  'IFCDISCRETEACCESSORY',
  'IFCFURNISHINGELEMENT',
];

export interface BeschlagTyp {
  key: string;
  name: string;
  kategorie: BeschlagKategorie;
  /** IFC4-Klasse gemäss Begründung oben — siehe `BESCHLAG_IFC_TYPEN`. */
  ifcTyp: BeschlagIfcTyp;
}

/**
 * 12 reale Beschlagtypen (Owner-Vorgabe, wörtliche Liste). Kategorie ist
 * eine plausible fachliche Einordnung: `tuer` = Grundausstattung einer
 * Türblatt-/Zargen-Verbindung, `fenster` = Fenster-/Kippflügel-Beschlag,
 * `sicherheit` = Zugriffs-/Sicherheits-relevante Zusatzbeschläge.
 */
export const BESCHLAG_KATALOG: BeschlagTyp[] = [
  { key: 'tuerdruecker-garnitur', name: 'Türdrücker (Garnitur)', kategorie: 'tuer', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'tuerband-scharnier', name: 'Türband / Scharnier', kategorie: 'tuer', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'einsteckschloss', name: 'Einsteckschloss', kategorie: 'tuer', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'schliessblech', name: 'Schliessblech', kategorie: 'tuer', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'bodentuerschliesser', name: 'Bodentürschliesser', kategorie: 'tuer', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'tuerstopper', name: 'Türstopper', kategorie: 'tuer', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'profilzylinder', name: 'Profilzylinder', kategorie: 'sicherheit', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'panikstange', name: 'Panikstange (Antipanik)', kategorie: 'sicherheit', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'fenstergriff-olive', name: 'Fenstergriff (Olive)', kategorie: 'fenster', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'kippbeschlag', name: 'Kippbeschlag', kategorie: 'fenster', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'tuerspion', name: 'Türspion', kategorie: 'sicherheit', ifcTyp: 'IFCDISCRETEACCESSORY' },
  { key: 'bandseitensicherung', name: 'Bandseitensicherung', kategorie: 'sicherheit', ifcTyp: 'IFCDISCRETEACCESSORY' },
];

export function beschlagTyp(key: string): BeschlagTyp | undefined {
  return BESCHLAG_KATALOG.find((t) => t.key === key);
}

/** Rundet auf 2 Nachkommastellen — hält die Symbol-Strings kompakt/stabil. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Reine SVG-Element-Geometrie eines Beschlag-Symbols als kleines,
 * quadratisches Plan-Piktogramm (0,0)…(size,size) — Vorbild: wie Möbel-
 * Korpusse (`moebelGeometrie`) und Tür-/Fensterflügel (`derive/plansvg.ts`,
 * Bogen-/Flügelsymbole) gezeichnet werden, nur ohne Weltkoordinaten (ein
 * Beschlag hat in S1 keine Entity/Platzierung). Deterministisch (reine
 * Funktion von `typ`/`size`, keine Zufallszahlen/`Date.now`). Gibt reine
 * `<...>`-Element-Fragmente zurück (kein umschliessendes `<svg>`), damit der
 * Aufrufer Grösse/`viewBox` selbst bestimmt.
 */
export function beschlagSymbol(typ: BeschlagTyp, size: number): string {
  const s = size;
  const mitte = r2(s / 2);
  switch (typ.key) {
    case 'tuerdruecker-garnitur': {
      // Rosette (Kreis) + Drückerstange, klassisches Grundriss-Piktogramm.
      const cx = r2(s * 0.28);
      return [
        `<circle cx="${cx}" cy="${mitte}" r="${r2(s * 0.12)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<line x1="${cx}" y1="${mitte}" x2="${r2(s * 0.82)}" y2="${mitte}" stroke="currentColor" stroke-width="${r2(s * 0.08)}" stroke-linecap="round"/>`,
      ].join('');
    }
    case 'tuerband-scharnier': {
      // Zwei Bandlappen + Stiftachse dazwischen.
      return [
        `<rect x="${r2(s * 0.12)}" y="${r2(s * 0.08)}" width="${r2(s * 0.2)}" height="${r2(s * 0.84)}" rx="${r2(s * 0.03)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<rect x="${r2(s * 0.68)}" y="${r2(s * 0.08)}" width="${r2(s * 0.2)}" height="${r2(s * 0.84)}" rx="${r2(s * 0.03)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<line x1="${mitte}" y1="${r2(s * 0.05)}" x2="${mitte}" y2="${r2(s * 0.95)}" stroke="currentColor" stroke-width="${r2(s * 0.09)}"/>`,
      ].join('');
    }
    case 'einsteckschloss': {
      // Schlosskasten mit Nuss (Kreis) und Falle (kleiner Steg).
      return [
        `<rect x="${r2(s * 0.2)}" y="${r2(s * 0.15)}" width="${r2(s * 0.3)}" height="${r2(s * 0.7)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<circle cx="${r2(s * 0.35)}" cy="${mitte}" r="${r2(s * 0.06)}" fill="currentColor"/>`,
        `<line x1="${r2(s * 0.5)}" y1="${mitte}" x2="${r2(s * 0.78)}" y2="${mitte}" stroke="currentColor" stroke-width="${r2(s * 0.07)}"/>`,
      ].join('');
    }
    case 'schliessblech': {
      // Plättchen mit ausgeschnittenem Fallenschlitz.
      return [
        `<rect x="${r2(s * 0.3)}" y="${r2(s * 0.1)}" width="${r2(s * 0.16)}" height="${r2(s * 0.8)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<rect x="${r2(s * 0.34)}" y="${r2(s * 0.42)}" width="${r2(s * 0.08)}" height="${r2(s * 0.16)}" fill="currentColor"/>`,
      ].join('');
    }
    case 'bodentuerschliesser': {
      // Bodendose (Rechteck) + Spindel (Kreis) + Schliessbogen (Viertelbogen).
      return [
        `<rect x="${r2(s * 0.15)}" y="${r2(s * 0.78)}" width="${r2(s * 0.7)}" height="${r2(s * 0.14)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<circle cx="${mitte}" cy="${r2(s * 0.85)}" r="${r2(s * 0.05)}" fill="currentColor"/>`,
        `<path d="M ${r2(s * 0.15)} ${r2(s * 0.78)} A ${r2(s * 0.65)} ${r2(s * 0.65)} 0 0 1 ${r2(s * 0.8)} ${r2(s * 0.13)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.03)}" stroke-dasharray="${r2(s * 0.04)},${r2(s * 0.04)}"/>`,
      ].join('');
    }
    case 'tuerstopper': {
      // Kegelstumpf-Silhouette am Boden.
      return [
        `<path d="M ${r2(s * 0.35)} ${r2(s * 0.9)} L ${r2(s * 0.42)} ${r2(s * 0.3)} A ${r2(s * 0.08)} ${r2(s * 0.08)} 0 0 1 ${r2(s * 0.58)} ${r2(s * 0.3)} L ${r2(s * 0.65)} ${r2(s * 0.9)} Z" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
      ].join('');
    }
    case 'profilzylinder': {
      // Längliche Profilform mit Kerbe (Schlüsselkanal).
      return [
        `<rect x="${r2(s * 0.1)}" y="${r2(s * 0.38)}" width="${r2(s * 0.8)}" height="${r2(s * 0.24)}" rx="${r2(s * 0.12)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<line x1="${mitte}" y1="${r2(s * 0.4)}" x2="${mitte}" y2="${r2(s * 0.6)}" stroke="currentColor" stroke-width="${r2(s * 0.03)}"/>`,
      ].join('');
    }
    case 'panikstange': {
      // Horizontaler Stangenbalken mit zwei Endhaltern.
      return [
        `<line x1="${r2(s * 0.12)}" y1="${mitte}" x2="${r2(s * 0.88)}" y2="${mitte}" stroke="currentColor" stroke-width="${r2(s * 0.1)}" stroke-linecap="round"/>`,
        `<rect x="${r2(s * 0.08)}" y="${r2(s * 0.35)}" width="${r2(s * 0.1)}" height="${r2(s * 0.3)}" fill="currentColor"/>`,
        `<rect x="${r2(s * 0.82)}" y="${r2(s * 0.35)}" width="${r2(s * 0.1)}" height="${r2(s * 0.3)}" fill="currentColor"/>`,
      ].join('');
    }
    case 'fenstergriff-olive': {
      // Ovale (Olive) mit kurzem Hebel.
      return [
        `<ellipse cx="${mitte}" cy="${mitte}" rx="${r2(s * 0.14)}" ry="${r2(s * 0.28)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<line x1="${mitte}" y1="${mitte}" x2="${r2(s * 0.8)}" y2="${mitte}" stroke="currentColor" stroke-width="${r2(s * 0.06)}" stroke-linecap="round"/>`,
      ].join('');
    }
    case 'kippbeschlag': {
      // Scherenarm-Beschlag: zwei Gelenkstäbe + Drehpunkte.
      return [
        `<line x1="${r2(s * 0.15)}" y1="${r2(s * 0.85)}" x2="${r2(s * 0.55)}" y2="${r2(s * 0.35)}" stroke="currentColor" stroke-width="${r2(s * 0.06)}"/>`,
        `<line x1="${r2(s * 0.55)}" y1="${r2(s * 0.35)}" x2="${r2(s * 0.85)}" y2="${r2(s * 0.55)}" stroke="currentColor" stroke-width="${r2(s * 0.06)}"/>`,
        `<circle cx="${r2(s * 0.55)}" cy="${r2(s * 0.35)}" r="${r2(s * 0.05)}" fill="currentColor"/>`,
      ].join('');
    }
    case 'tuerspion': {
      // Konzentrische Linse.
      return [
        `<circle cx="${mitte}" cy="${mitte}" r="${r2(s * 0.22)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.05)}"/>`,
        `<circle cx="${mitte}" cy="${mitte}" r="${r2(s * 0.08)}" fill="currentColor"/>`,
      ].join('');
    }
    case 'bandseitensicherung': {
      // Hakenform an der Bandseite (Aufhebelschutz).
      return [
        `<path d="M ${r2(s * 0.25)} ${r2(s * 0.15)} L ${r2(s * 0.25)} ${r2(s * 0.75)} A ${r2(s * 0.15)} ${r2(s * 0.15)} 0 0 0 ${r2(s * 0.55)} ${r2(s * 0.75)}" fill="none" stroke="currentColor" stroke-width="${r2(s * 0.07)}" stroke-linecap="round"/>`,
      ].join('');
    }
    default:
      // Unbekannter Typ: leeres, aber gültiges Fragment — kann nicht
      // vorkommen (der Katalog ist geschlossen), TS-Exhaustiveness reicht
      // hier bewusst nicht (string-key), daher dieser defensive Fallback.
      return '';
  }
}
