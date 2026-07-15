/**
 * Plankopf-Renderer (v0.8.0 P3, `docs/V080-PLANKOPF-SPEZ.md` §1.5–§1.7, §2,
 * §3) — reine Ableitungen, keine Seiteneffekte: die 6-stufige Phasen-Matrix
 * (`PHASEN_MATRIX`), die 8→6-Abbildung `siaZuMatrixStufe()`, die
 * Plancode-Komposition `plancode()` und die drei SVG-Fragment-Renderer
 * `plankopfSvg()` (die feste 180×55-mm-Gruppe), `wasserzeichenSvg()` und
 * `afFreigabeStempelSvg()` (beide über der Zeichenfläche, nicht Teil der
 * Plankopf-Gruppe selbst — der Aufrufer platziert sie, s. Funktionskommentare
 * unten).
 *
 * **px/mm-Entscheid (P3-Implementierungsentscheid, Spez §1.6 lässt das
 * ausdrücklich offen):** dieses Modul rechnet durchgehend in Papier-mm, EINE
 * SVG-Einheit = EIN mm — identisch zur bestehenden Konvention von
 * `derive/sheet.ts` (Kopfkommentar dort: «1 SVG-Einheit = 1 mm Papier») und
 * `derive/plansvg.ts` (`planToSvg`: `width="${paper.width}mm"`, `viewBox="0 0
 * ${paper.width} ${paper.height}"`). Keine eigene px-Skala, kein `ppm`-Faktor
 * (das bleibt eine reine Vorschau-Angelegenheit der Vorlage/des Prototyps,
 * s. Spez §1.6/§1.7 Pixel-Klarstellung) — `plankopfSvg()` liefert Koordinaten
 * und `font-size`-Werte, die der Aufrufer 1:1 in ein bestehendes,
 * mm-basiertes Blatt-SVG einbetten kann, ohne Umrechnung.
 *
 * Geometrie-Quelle ist ausschliesslich `derive/blattlayout.ts`
 * (`PLANKOPF_MM`, `plankopfRect()`) — keine eigenen Format-/Randkonstanten.
 * Typografie-Quelle ist `derive/stilblatt.ts` (`PLANKOPF_TYPO_MM`,
 * `PHASEN_AKZENTE`) — keine neuen Grössen-/Farbkonstanten hier.
 *
 * **Textkürzung (härteste Nebenbedingung, D4-Präzedenz «Titel-Overflow»):**
 * jedes Textfeld läuft durch `kuerzeMitEllipse()` — eine Zeichenzahl-Schätzung
 * (Faktor 0.62 × Schriftgrösse als mittlere Zeichenbreite, bewusst
 * grosszügig statt exakt, weil der svg-qa-Rasterizer ohne installierte
 * Lato/IBM Plex Mono auf Systemmetriken zurückfällt, s. `stilblatt.ts`-
 * Kopfkommentar) statt eines Umbruchs — Ellipse («…») statt Überlauf.
 */
import type { SiaPhase } from '../model/doc';
import { plankopfRect, type BlattRect } from './blattlayout';
import { escapeXml } from './plansvg';
import {
  BLATT,
  messbarAttr,
  PHASEN_AKZENTE,
  PLANKOPF_TYPO_MM,
  SCHRIFT_TITEL,
  titelAttr,
  versal,
} from './stilblatt';

// ───────────────────────────────────────────────────────────────────────────
// Phasen-Matrix (Spez §2.1) — wörtlich aus der Spez-Tabelle übernommen.
// ───────────────────────────────────────────────────────────────────────────

/** Die 6 Plankopf-Matrix-Stufen (Spez §2, NICHT identisch mit `BauPhase` —
 * der Plan-Darstellungsgrad bleibt entkoppelt, Owner-Entscheid 1). */
export type MatrixStufe = 'VS' | 'VP' | 'BP' | 'BW' | 'AS' | 'AF';

/** Reihenfolge VS→AF, wie in der Spez-Tabelle — für Iteration (Tests, Golden). */
export const MATRIX_STUFEN: readonly MatrixStufe[] = ['VS', 'VP', 'BP', 'BW', 'AS', 'AF'];

export interface PhasenMatrixEintrag {
  /** Klartext-Name der Stufe (Spez-Spalte «Name»). */
  name: string;
  /** Klassische SIA-102-Leistungsphasennummer der Vorlage (Spez-Spalte
   * «SIA-Nr.») — NICHT identisch mit den Zitaten in `siaPhaseLabel()`
   * (`doc.ts`), s. Spez-Fussnote §2.1. Nur für die Plankopf-Anzeige «Phase
   * (Code · SIA)». */
  siaNr: string;
  /** Rollenfarben-Token (Spez-Spalte «Akzent-Token»), Schlüssel in
   * `PHASEN_AKZENTE`. */
  akzentToken: keyof typeof PHASEN_AKZENTE;
  /** Aufgelöste Hex-Farbe — identisch zu `PHASEN_AKZENTE[akzentToken]`, hier
   * redundant geführt, damit Aufrufer nicht zusätzlich in `PHASEN_AKZENTE`
   * nachschlagen müssen. */
  farbe: string;
  /** Wörtliche Anzeige der Massstabsempfehlung (Spez-Spalte «Massstäbe»),
   * z.B. «1:500–1:200» oder «1:50 / 1:20 / 1:10». Reine Empfehlung, keine
   * harte Sperre (Spez §2.3). */
  massstaebeLabel: string;
  /** Dieselbe Empfehlung als Zahlen (Nenner), für Massstab-Chip-Logik. Bei
   * einer Spanne («1:500–1:200») die zwei Endpunkte, bei Einzelwerten die
   * jeweiligen Nenner. */
  massstaebe: number[];
  /** Wasserzeichen-Text (Spez §1.7/§2.1) — `null` NUR bei `AF` (dort gibt es
   * kein Wasserzeichen, s. `stempelText`). */
  wasserzeichenText: string | null;
  /** AF-Freigabestempel-Text — `null` bei allen Stufen ausser `AF` (das
   * Wasserzeichen und der Stempel schliessen sich gegenseitig aus). */
  stempelText: string | null;
  /** Empfänger-Label der Freigabe/des Exemplars (Spez-Spalte
   * «Freigabe-Empfänger»). */
  freigabeEmpfaenger: string;
  /** Revisions-Index-Buchstabe der Stufe (Spez-Spalte «Index», a–e) — `null`
   * für `VS` («–» in der Spez-Tabelle, keine Stufe vor dem ersten Index).
   * Dies ist der PHASEN-eigene Default-Index (angezeigt, solange das Blatt
   * noch keine eigene `SheetRevision` trägt) — NICHT identisch mit dem
   * Revisionsverzeichnis-Index (`SheetRevision.index`, Grossbuchstaben A/B/C…,
   * `sheet.revisionen`), der ihn nach der ersten echten Revision ablöst. */
  index: string | null;
}

/**
 * Phasen-Matrix VS–AF (Spez §2.1, wörtlich übernommen). Steuert
 * AUSSCHLIESSLICH Akzentfarbe, empfohlene Massstäbe, Wasserzeichen-/
 * Freigabestempel-Text, Freigabe-Empfänger-Label und Revisions-Index-
 * Buchstabe — NICHT den Plan-Darstellungsgrad (`BauPhase` bleibt
 * eigenständig, s. `siaZuMatrixStufe`-Kommentar).
 */
export const PHASEN_MATRIX: Record<MatrixStufe, PhasenMatrixEintrag> = {
  VS: {
    name: 'Vorstudien',
    siaNr: 'SIA 21',
    akzentToken: 'database',
    farbe: PHASEN_AKZENTE.database,
    massstaebeLabel: '1:500–1:200',
    massstaebe: [500, 200],
    wasserzeichenText: 'STUDIE — NICHT FÜR AUSFÜHRUNG',
    stempelText: null,
    freigabeEmpfaenger: 'Intern',
    index: null,
  },
  VP: {
    name: 'Vorprojekt',
    siaNr: 'SIA 31',
    akzentToken: 'pn',
    farbe: PHASEN_AKZENTE.pn,
    massstaebeLabel: '1:200–1:100',
    massstaebe: [200, 100],
    wasserzeichenText: 'VORPROJEKT — NICHT FÜR AUSFÜHRUNG',
    stempelText: null,
    freigabeEmpfaenger: 'Bauherrschaft',
    index: 'a',
  },
  BP: {
    name: 'Bauprojekt',
    siaNr: 'SIA 32',
    akzentToken: 'pna',
    farbe: PHASEN_AKZENTE.pna,
    massstaebeLabel: '1:100–1:50',
    massstaebe: [100, 50],
    wasserzeichenText: 'BAUPROJEKT — ZWISCHENSTAND',
    stempelText: null,
    freigabeEmpfaenger: 'Bauherrschaft',
    index: 'b',
  },
  BW: {
    name: 'Bewilligung',
    siaNr: 'SIA 33',
    akzentToken: 'agent',
    farbe: PHASEN_AKZENTE.agent,
    massstaebeLabel: '1:100',
    massstaebe: [100],
    wasserzeichenText: 'BAUEINGABE — BEHÖRDENEXEMPLAR',
    stempelText: null,
    freigabeEmpfaenger: 'Behörde',
    index: 'c',
  },
  AS: {
    name: 'Ausschreibung',
    siaNr: 'SIA 41',
    akzentToken: 'memory',
    farbe: PHASEN_AKZENTE.memory,
    massstaebeLabel: '1:50',
    massstaebe: [50],
    wasserzeichenText: 'AUSSCHREIBUNG — UNTERNEHMEREXEMPLAR',
    stempelText: null,
    freigabeEmpfaenger: 'Unternehmer',
    index: 'd',
  },
  AF: {
    name: 'Realisierung',
    siaNr: 'SIA 51',
    akzentToken: 'system',
    farbe: PHASEN_AKZENTE.system,
    massstaebeLabel: '1:50 / 1:20 / 1:10',
    massstaebe: [50, 20, 10],
    wasserzeichenText: null,
    stempelText: 'FREIGEGEBEN FÜR AUSFÜHRUNG',
    freigabeEmpfaenger: 'Freigegeben',
    index: 'e',
  },
};

/**
 * 8→6-Abbildung (Spez §2.2, Owner-Entscheid 1) — Phasen-Quelle ist
 * `doc.settings.siaPhase` (`SiaPhase`, 8 Werte), NICHT `doc.settings.phase`
 * (`BauPhase`, Plan-Darstellungsgrad, bleibt entkoppelt). Alle 8
 * `SiaPhase`-Enum-Werte geprüft gegen `model/doc.ts` (Stand dieser Runde):
 * `'strategie' | 'wettbewerb' | 'vorprojekt' | 'bauprojekt' | 'bewilligung' |
 * 'ausschreibung' | 'ausfuehrung' | 'abnahme'` — deckungsgleich mit der
 * Spez-Tabelle §2.2, kein Enum-Mismatch, keine geratene Zuordnung nötig.
 *
 * `empfohlenePlanPhase(siaPhase): BauPhase` (`doc.ts`, bestehend) ist eine
 * VERWANDTE, aber eigenständige Funktion (Zeichenstil-Empfehlung) — nicht zu
 * verwechseln mit dieser Funktion (Plankopf-Matrix-Stufe).
 */
export function siaZuMatrixStufe(phase: SiaPhase): MatrixStufe {
  switch (phase) {
    case 'strategie':
    case 'wettbewerb':
      return 'VS';
    case 'vorprojekt':
      return 'VP';
    case 'bauprojekt':
      return 'BP';
    case 'bewilligung':
      return 'BW';
    case 'ausschreibung':
      return 'AS';
    case 'ausfuehrung':
    case 'abnahme':
      return 'AF';
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Plancode (Spez §3.1)
// ───────────────────────────────────────────────────────────────────────────

/** Roh-Teile des Plancodes — der Aufrufer (P4/P6) löst sie aus
 * `DocSettings.buero.kuerzel`, `ProjektInfo.projektCode`,
 * `siaZuMatrixStufe(settings.siaPhase)`, `SheetPlankopf.disziplin`,
 * `SheetPlankopf.geschossCode`, `SheetPlankopf.planNummer` auf — diese
 * Funktion bleibt bewusst doc-/sheet-frei (reine Zeichenketten-Komposition,
 * einzeln testbar ohne Doc-Fixtures). */
export interface PlancodeTeile {
  buero?: string;
  projekt?: string;
  phase?: string;
  disziplin?: string;
  geschoss?: string;
  nr?: string;
}

const PLANCODE_PLATZHALTER = '—';

function plancodeTeil(wert: string | undefined): string {
  return wert && wert.length > 0 ? wert : PLANCODE_PLATZHALTER;
}

/**
 * Plancode `{büro}-{projekt}-{phase}-{disziplin}-{geschoss}-{nr}` (Spez
 * §3.1), z.B. `MAA-SEE-BP-A-EG-101`. Nie gespeichert, nur berechnet. Fehlt
 * ein Teil, erscheint ein ehrlicher `—`-Platzhalter an dessen Stelle (kein
 * stiller Leerstring, kein erfundener Wert) — ANDERS als die übrigen
 * Plankopf-Felder (§3.2: dort bleibt ein fehlendes Feld leer, nur der
 * Plancode bekommt den Platzhalter).
 */
export function plancode(teile: PlancodeTeile): string {
  return [
    plancodeTeil(teile.buero),
    plancodeTeil(teile.projekt),
    plancodeTeil(teile.phase),
    plancodeTeil(teile.disziplin),
    plancodeTeil(teile.geschoss),
    plancodeTeil(teile.nr),
  ].join('-');
}

// ───────────────────────────────────────────────────────────────────────────
// Textkürzung — Ellipse statt Überlauf (härteste svg-qa-Nebenbedingung).
// ───────────────────────────────────────────────────────────────────────────

/** Mittlere Zeichenbreite als Vielfaches der Schriftgrösse — bewusst
 * grosszügig (eher zu früh als zu spät kürzen), s. Datei-Kopfkommentar. */
const ZEICHENBREITE_FAKTOR = 0.62;

function kuerzeAufZeichen(text: string, maxZeichen: number): string {
  if (text.length <= maxZeichen) return text;
  if (maxZeichen <= 1) return '…';
  return `${text.slice(0, maxZeichen - 1)}…`;
}

/** Kürzt `text` mit einer Ellipse («…»), falls er bei `fontSizeMm` schätzungsweise
 * breiter als `maxBreiteMm` würde. Reine, deterministische Schätzfunktion
 * (kein DOM/Canvas nötig) — s. Datei-Kopfkommentar zum Faktor. Leerer Text
 * bleibt leer (kein Platzhaltertext, Guard-Prinzip §3.2). */
export function kuerzeMitEllipse(text: string, maxBreiteMm: number, fontSizeMm: number): string {
  if (!text) return text;
  const zeichenBreite = fontSizeMm * ZEICHENBREITE_FAKTOR;
  if (zeichenBreite <= 0) return text;
  const maxZeichen = Math.max(1, Math.floor(maxBreiteMm / zeichenBreite));
  return kuerzeAufZeichen(text, maxZeichen);
}

// ───────────────────────────────────────────────────────────────────────────
// Plankopf-Gruppe (180×55mm, Spez §1.5)
// ───────────────────────────────────────────────────────────────────────────

/** Büro-Identität im Plankopf (Spez §1.5 `colL`) — Logo als bereits
 * aufgelöste Daten-URL (Asset-Auflösung ist Sache des Aufrufers, P4/P6;
 * dieses Modul bleibt Asset-frei). Ohne `logoDataUrl` erscheint der
 * gestrichelte Platzhalter mit Initialen-Fallback (Spez §1.5). */
export interface PlankopfBueroDaten {
  name?: string;
  adresse?: string;
  kuerzel?: string;
  logoDataUrl?: string;
}

/** Aktuelle Revisions-Index-Zeile (aus `Sheet.revisionen`, neuester Eintrag)
 * — fehlt sie, zeigt die Rev-Zeile nur den phasen-eigenen Default-Index
 * (`PhasenMatrixEintrag.index`) ohne Datum/Text/Kürzel (kein erfundener
 * Wert, Guard-Prinzip). */
export interface PlankopfRevisionDaten {
  index: string;
  datum: string;
  text: string;
  kuerzel: string;
}

/** Alle Inhaltsfelder der Plankopf-Gruppe, bereits aus dem Doc-Modell
 * aufgelöst (Token-Schema-Auflösung, Spez §3.2) — dieses Modul selbst löst
 * keine `{{…}}`-Strings auf, es gibt keine Template-Syntax im
 * Produktionscode. Jedes Feld additiv/optional: fehlend = leeres Feld
 * (Guard-Prinzip §3.2), NICHT der `—`-Platzhalter (der bleibt dem Plancode
 * vorbehalten, s. `plancode()`-Kommentar). */
export interface PlankopfDaten {
  buero?: PlankopfBueroDaten;
  bauherr?: string;
  projektName?: string;
  adresse?: string;
  parzelleNr?: string;
  inhalt?: string;
  massstab?: number;
  format?: string;
  gezeichnet?: string;
  geprueft?: string;
  datum?: string;
  /** Vorab über `plancode()` berechnet — diese Funktion komponiert nicht
   * selbst, s. Datei-Kopfkommentar zu `PlancodeTeile`. */
  plancode?: string;
  revision?: PlankopfRevisionDaten;
}

const SPALTE_L_MM = 48;
const SPALTE_M_MM = 70;
const AKZENTBALKEN_MM = 1.3;
const PAD_MM = 1.5;

function feldLabelAttr(): string {
  return `${messbarAttr(PLANKOPF_TYPO_MM.feldlabel)} letter-spacing="0.1em"`;
}

function messbarWert(sizeMm: number, opts: { bold?: boolean; farbe?: string } = {}): string {
  const bold = opts.bold ? ' font-weight="bold"' : '';
  const farbe = opts.farbe ? ` fill="${opts.farbe}"` : '';
  return `${messbarAttr(sizeMm)}${bold}${farbe}`;
}

/** Titel-Stimme OHNE erzwungenes Bold — für Felder, die die Spez-Tabelle
 * NICHT als «(bold)» kennzeichnet (Projekt, Planinhalt), aber die
 * gleichwohl der Titel- statt der Messbar-Stimme zuzuordnen sind (beides
 * Identitäts-/Titeltext, keine Messgrösse — s. `stilblatt.ts`-Kommentar
 * «Plankopf-Titel» vs. «Plankopf-Meta»). `titelAttr()` selbst ist immer bold
 * (D4-Fixwert `TITEL_STIL`), deshalb hier eine eigene, schlanke Variante. */
function titelPlain(sizeMm: number): string {
  return `font-family="${SCHRIFT_TITEL}" font-size="${sizeMm}"`;
}

function textZeile(
  x: number,
  y: number,
  text: string,
  maxBreiteMm: number,
  fontSizeMm: number,
  attrs: string,
  anchor: 'start' | 'middle' | 'end' = 'start',
): string {
  const gekuerzt = kuerzeMitEllipse(text, maxBreiteMm, fontSizeMm);
  if (!gekuerzt) return '';
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="${anchor}" ${attrs}>${escapeXml(gekuerzt)}</text>`;
}

/** Initialen-Fallback fürs Logo-Feld (Spez §1.5): Büro-Kürzel, sonst die
 * Anfangsbuchstaben der ersten bis zu drei Namensworte, sonst ein ehrlicher
 * «—» (kein erfundener Wert). */
function bueroInitialen(buero: PlankopfBueroDaten | undefined): string {
  if (buero?.kuerzel) return buero.kuerzel;
  const worte = buero?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initialen = worte
    .slice(0, 3)
    .map((w) => w.charAt(0).toLocaleUpperCase('de-CH'))
    .join('');
  return initialen || '—';
}

/**
 * Rendert die feste 180×55-mm-Plankopf-Gruppe (`<g data-teil="plankopf">`)
 * an ihrer Position gemäss `plankopfRect(blattBreite, blattHoehe)` — 3
 * Spalten (48/70/Rest mm, Spez §1.5), Akzentbalken (1.3mm, Phasenfarbe),
 * mm-Typoleiter aus `PLANKOPF_TYPO_MM`, Textkürzung via `kuerzeMitEllipse()`.
 * Reine Funktion: dieselben Eingaben liefern immer dasselbe SVG-Fragment.
 */
export function plankopfSvg(blattBreite: number, blattHoehe: number, matrixStufe: MatrixStufe, daten: PlankopfDaten = {}): string {
  const rect = plankopfRect(blattBreite, blattHoehe);
  const eintrag = PHASEN_MATRIX[matrixStufe];
  const parts: string[] = [];

  parts.push(`<g data-teil="plankopf">`);

  // Aussenrahmen + Akzentbalken (Oberkante, 1.3mm, Phasenfarbe).
  parts.push(
    `<rect x="${rect.x}" y="${rect.y}" width="${rect.breite}" height="${rect.hoehe}" fill="white" stroke="${BLATT.tinte}" stroke-width="${BLATT.rahmenStift}"/>`,
    `<rect x="${rect.x}" y="${rect.y}" width="${rect.breite}" height="${AKZENTBALKEN_MM}" fill="${eintrag.farbe}"/>`,
  );

  const contentY0 = rect.y + AKZENTBALKEN_MM;
  const contentHoehe = rect.hoehe - AKZENTBALKEN_MM;
  const colLx = rect.x;
  const colMx = rect.x + SPALTE_L_MM;
  const colRx = rect.x + SPALTE_L_MM + SPALTE_M_MM;
  const colRBreite = rect.breite - SPALTE_L_MM - SPALTE_M_MM;

  // Spaltentrenner.
  parts.push(
    `<line x1="${colMx}" y1="${contentY0}" x2="${colMx}" y2="${rect.y + rect.hoehe}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
    `<line x1="${colRx}" y1="${contentY0}" x2="${colRx}" y2="${rect.y + rect.hoehe}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
  );

  // ── colL (48mm): Logo-Platzhalter/-Bild, Büroname, Adresse ─────────────
  const colLxInner = colLx + PAD_MM;
  const logoBreite = SPALTE_L_MM - PAD_MM * 2;
  const logoHoehe = 15;
  const logoY = contentY0 + PAD_MM;
  if (daten.buero?.logoDataUrl) {
    parts.push(
      `<image href="${escapeXml(daten.buero.logoDataUrl)}" x="${colLxInner}" y="${logoY}" width="${logoBreite}" height="${logoHoehe}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  } else {
    const initialen = bueroInitialen(daten.buero);
    parts.push(
      `<rect x="${colLxInner}" y="${logoY}" width="${logoBreite}" height="${logoHoehe}" fill="none" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}" stroke-dasharray="1.5 1"/>`,
      textZeile(
        colLxInner + logoBreite / 2,
        logoY + logoHoehe * 0.6,
        initialen,
        logoBreite - 2,
        PLANKOPF_TYPO_MM.logoInitialen,
        messbarWert(PLANKOPF_TYPO_MM.logoInitialen, { bold: true, farbe: eintrag.farbe }),
        'middle',
      ),
      textZeile(
        colLxInner + logoBreite / 2,
        logoY + logoHoehe - 1.5,
        versal('Büro-Logo'),
        logoBreite - 2,
        PLANKOPF_TYPO_MM.feldlabel,
        feldLabelAttr(),
        'middle',
      ),
    );
  }
  let yl = logoY + logoHoehe + PLANKOPF_TYPO_MM.bueroName + 2.0;
  parts.push(textZeile(colLxInner, yl, daten.buero?.name ?? '', logoBreite, PLANKOPF_TYPO_MM.bueroName, titelAttr(PLANKOPF_TYPO_MM.bueroName)));
  yl += PLANKOPF_TYPO_MM.bueroAdresse + 1.6;
  parts.push(textZeile(colLxInner, yl, daten.buero?.adresse ?? '', logoBreite, PLANKOPF_TYPO_MM.bueroAdresse, messbarWert(PLANKOPF_TYPO_MM.bueroAdresse)));

  // ── colM (70mm): Bauherrschaft, Projekt, Standort, Planinhalt (flex-grow) ─
  const colMxInner = colMx + PAD_MM;
  const colMBreite = SPALTE_M_MM - PAD_MM * 2;
  let ym = contentY0 + PAD_MM + PLANKOPF_TYPO_MM.bauherrschaft;
  parts.push(textZeile(colMxInner, ym, daten.bauherr ?? '', colMBreite, PLANKOPF_TYPO_MM.bauherrschaft, messbarWert(PLANKOPF_TYPO_MM.bauherrschaft)));
  ym += PLANKOPF_TYPO_MM.projekt + 1.8;
  parts.push(textZeile(colMxInner, ym, daten.projektName ?? '', colMBreite, PLANKOPF_TYPO_MM.projekt, titelPlain(PLANKOPF_TYPO_MM.projekt)));
  ym += PLANKOPF_TYPO_MM.standort + 1.6;
  const standortText = [daten.adresse, daten.parzelleNr].filter((t): t is string => Boolean(t)).join(' · ');
  parts.push(textZeile(colMxInner, ym, standortText, colMBreite, PLANKOPF_TYPO_MM.standort, messbarWert(PLANKOPF_TYPO_MM.standort)));
  // Planinhalt: «flex-grow» in der Vorlage — hier als eigene Zeile nahe der
  // Spalten-Unterkante platziert (nimmt den verbleibenden Raum optisch ein).
  const planinhaltY = rect.y + rect.hoehe - PAD_MM - 1.0;
  parts.push(textZeile(colMxInner, planinhaltY, daten.inhalt ?? '', colMBreite, PLANKOPF_TYPO_MM.planinhalt, titelPlain(PLANKOPF_TYPO_MM.planinhalt)));

  // ── colR (Rest, i.d.R. 62mm): Halbzellen, Plan-Nr., Rev-Zeile ───────────
  const colRxInner = colRx + PAD_MM;
  const colRInnenBreite = colRBreite - PAD_MM * 2;
  const luecke = 2;
  const halbBreite = (colRInnenBreite - luecke) / 2;
  const rechteHalbX = colRxInner + halbBreite + luecke;
  const halbzellenReiheHoehe = 5.6;

  function halbzelle(labelL: string, wertL: string, labelR: string, wertR: string, rowTop: number): void {
    const labelY = rowTop + PLANKOPF_TYPO_MM.feldlabel;
    const wertY = rowTop + PLANKOPF_TYPO_MM.feldlabel + 1.4 + PLANKOPF_TYPO_MM.halbzelle;
    parts.push(
      textZeile(colRxInner, labelY, versal(labelL), halbBreite, PLANKOPF_TYPO_MM.feldlabel, feldLabelAttr()),
      textZeile(colRxInner, wertY, wertL, halbBreite, PLANKOPF_TYPO_MM.halbzelle, messbarWert(PLANKOPF_TYPO_MM.halbzelle)),
      textZeile(rechteHalbX, labelY, versal(labelR), halbBreite, PLANKOPF_TYPO_MM.feldlabel, feldLabelAttr()),
      textZeile(rechteHalbX, wertY, wertR, halbBreite, PLANKOPF_TYPO_MM.halbzelle, messbarWert(PLANKOPF_TYPO_MM.halbzelle)),
    );
  }

  let rowTop = contentY0 + PAD_MM;
  const massstabText = daten.massstab ? `1:${daten.massstab}` : '';
  halbzelle('Massstab', massstabText, 'Format', daten.format ?? '', rowTop);
  rowTop += halbzellenReiheHoehe;
  const phaseText = `${matrixStufe} · ${eintrag.siaNr}`;
  halbzelle('Phase', phaseText, 'Datum', daten.datum ?? '', rowTop);
  rowTop += halbzellenReiheHoehe;
  halbzelle('Gezeichnet', daten.gezeichnet ?? '', 'Geprüft', daten.geprueft ?? '', rowTop);
  rowTop += halbzellenReiheHoehe + 1.2;

  // Plan-Nr. (mono bold) — voller Plancode (`plancode()`, Spez §3.1/§3.2 `{{plan.code}}`).
  const planNrLabelY = rowTop + PLANKOPF_TYPO_MM.feldlabel;
  const planNrWertY = planNrLabelY + 1.6 + PLANKOPF_TYPO_MM.planNr;
  parts.push(
    textZeile(colRxInner, planNrLabelY, versal('Plan-Nr.'), colRInnenBreite, PLANKOPF_TYPO_MM.feldlabel, feldLabelAttr()),
    textZeile(colRxInner, planNrWertY, daten.plancode ?? '', colRInnenBreite, PLANKOPF_TYPO_MM.planNr, messbarWert(PLANKOPF_TYPO_MM.planNr, { bold: true })),
  );

  // Index/Revisions-Zeile: Rev-Buchstabe (Phasenfarbe) + Datum/Text/Kürzel.
  // Ohne `daten.revision` bleibt nur der phasen-eigene Default-Index sichtbar
  // (kein erfundenes Datum/Text, Guard-Prinzip).
  const revY = planNrWertY + 2.0 + PLANKOPF_TYPO_MM.revBuchstabe;
  const revIndex = daten.revision?.index ?? eintrag.index ?? '';
  const revRest = [daten.revision?.datum, daten.revision?.text, daten.revision?.kuerzel]
    .filter((t): t is string => Boolean(t))
    .join(' · ');
  let revRestX = colRxInner;
  if (revIndex) {
    const revBuchstabeBreite = 4;
    parts.push(
      textZeile(colRxInner, revY, revIndex, revBuchstabeBreite, PLANKOPF_TYPO_MM.revBuchstabe, messbarWert(PLANKOPF_TYPO_MM.revBuchstabe, { farbe: eintrag.farbe })),
    );
    revRestX = colRxInner + revBuchstabeBreite + 0.8;
  }
  parts.push(textZeile(revRestX, revY, revRest, colRxInner + colRInnenBreite - revRestX, PLANKOPF_TYPO_MM.revZeile, messbarWert(PLANKOPF_TYPO_MM.revZeile)));

  parts.push(`</g>`);
  return parts.filter((p) => p.length > 0).join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Wasserzeichen & AF-Freigabestempel (Spez §1.7) — beide liegen über der
// ZEICHENFLÄCHE (nicht über der Plankopf-Gruppe selbst), deshalb als eigene
// Funktionen: der Aufrufer (P4, `derive/sheet.ts`) platziert sie mit der
// Zeichenflächen-Geometrie aus `derive/blattlayout.ts` (`zeichenflaeche()`/
// `rahmenRect()`).
// ───────────────────────────────────────────────────────────────────────────

const WASSERZEICHEN_WINKEL_GRAD = -26;
const WASSERZEICHEN_OPAZITAET = 0.13;
/** Verhältniszahl der Vorlage (≈4.8% der Rahmenbreite, Spez §1.7) — die
 * normative Grösse; der «15px»-Bodenwert der Vorlage ist ein
 * Vorschau-Artefakt (Spez-Klarstellung §1.6/§1.7). */
const WASSERZEICHEN_VERHAELTNIS = 0.048;
/** mm-Bodenwert (P3-Entscheid): verhindert unleserlich kleine Beschriftung
 * auf A4 (0.048 × 267mm ≈ 12.8mm liegt bereits darüber, der Boden greift
 * erst bei sehr kleinen/schmalen Zeichenflächen). */
const WASSERZEICHEN_MIN_MM = 6;

/** Löst die maximale Zeichenzahl eines EINZEILIGEN, um seinen Mittelpunkt um
 * `winkelGrad` rotierten Textblocks (fester Höhe `fontSizeMm`) auf, die
 * innerhalb von `ziel` (minus `marginMm` auf jeder Seite) bleibt — aus der
 * Standard-AABB-Rotationsformel (halbeBreite' = (w/2)|cos| + (h/2)|sin|,
 * analog für die Höhe) nach der Textbreite `w` aufgelöst, danach über die
 * mittlere Zeichenbreite in eine Zeichenzahl umgerechnet. Garantiert
 * Text-Containment auch bei extremen Formaten (A4 klein ↔ A0 riesig), ohne
 * die Schriftgrösse selbst anzutasten. */
function maxZeichenRotiertEinzeilig(fontSizeMm: number, winkelGrad: number, ziel: BlattRect, marginMm: number): number {
  const winkelRad = (Math.abs(winkelGrad) * Math.PI) / 180;
  const cos = Math.cos(winkelRad);
  const sin = Math.sin(winkelRad);
  const halbBreiteMax = Math.max(0, ziel.breite / 2 - marginMm);
  const halbHoeheMax = Math.max(0, ziel.hoehe / 2 - marginMm);
  const ausHoehe = sin > 0.001 ? (2 * (halbHoeheMax - (fontSizeMm / 2) * cos)) / sin : Infinity;
  const ausBreite = cos > 0.001 ? (2 * (halbBreiteMax - (fontSizeMm / 2) * sin)) / cos : Infinity;
  const maxTextBreite = Math.max(0, Math.min(ausHoehe, ausBreite));
  const zeichenBreite = fontSizeMm * ZEICHENBREITE_FAKTOR;
  return Math.max(1, Math.floor(maxTextBreite / zeichenBreite));
}

/**
 * Wasserzeichen über der Zeichenfläche (Spez §1.7): −26° rotiert, Opazität
 * 0.13, Phasen-Akzentfarbe, zentriert. `null` in Phase `AF` (dort gibt es
 * kein Wasserzeichen — s. `afFreigabeStempelSvg`) sowie bei jeder Stufe ohne
 * `wasserzeichenText`. Text wird bei Bedarf per Ellipse gekürzt, damit die
 * Rotation nicht über die Zeichenfläche hinausragt (härteste
 * svg-qa-Nebenbedingung).
 */
export function wasserzeichenSvg(zeichenflaeche: BlattRect, matrixStufe: MatrixStufe): string | null {
  const eintrag = PHASEN_MATRIX[matrixStufe];
  if (eintrag.wasserzeichenText === null) return null;
  const cx = zeichenflaeche.x + zeichenflaeche.breite / 2;
  const cy = zeichenflaeche.y + zeichenflaeche.hoehe / 2;
  const fontSize = Math.max(WASSERZEICHEN_MIN_MM, WASSERZEICHEN_VERHAELTNIS * zeichenflaeche.breite);
  const margin = Math.max(4, 0.02 * Math.min(zeichenflaeche.breite, zeichenflaeche.hoehe));
  const maxZeichen = maxZeichenRotiertEinzeilig(fontSize, WASSERZEICHEN_WINKEL_GRAD, zeichenflaeche, margin);
  const text = versal(kuerzeAufZeichen(eintrag.wasserzeichenText, maxZeichen));
  return [
    `<g data-teil="wasserzeichen" opacity="${WASSERZEICHEN_OPAZITAET}" transform="rotate(${WASSERZEICHEN_WINKEL_GRAD} ${cx.toFixed(2)} ${cy.toFixed(2)})">`,
    `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" ${titelAttr(fontSize)} fill="${eintrag.farbe}">${escapeXml(text)}</text>`,
    `</g>`,
  ].join('\n');
}

const STEMPEL_WINKEL_GRAD = -6;
/** ≈48% der Rahmenbreite (Spez §1.7 «Vorlage: ≈48% der Rahmenbreite»). */
const STEMPEL_BREITE_VERHAELTNIS = 0.48;
/** Seitenverhältnis des Stempel-Rahmens (P3-Entscheid: breiter Banner). */
const STEMPEL_SEITENVERHAELTNIS = 0.24;

/**
 * AF-Freigabestempel (Spez §1.7): ersetzt in Phase `AF` das Wasserzeichen —
 * −6° rotiert, abgerundeter Rahmen in Phasenfarbe, mono bold Text
 * «FREIGEGEBEN FÜR AUSFÜHRUNG» + optionale Datumszeile, positioniert im
 * oberen Bereich der Zeichenfläche. `null` bei jeder Stufe ausser `AF`.
 * Rahmen UND Text werden gemeinsam skaliert, falls die Rotation sonst über
 * die Zeichenfläche hinausragen würde (härteste svg-qa-Nebenbedingung) —
 * anders als beim Wasserzeichen (dort wird nur der Text gekürzt), weil der
 * Stempel-RAHMEN selbst ein Geometrie-Element ist, das ebenfalls im
 * viewBox bleiben muss.
 */
export function afFreigabeStempelSvg(zeichenflaeche: BlattRect, matrixStufe: MatrixStufe, datum?: string): string | null {
  const eintrag = PHASEN_MATRIX[matrixStufe];
  if (eintrag.stempelText === null) return null;

  const margin = Math.max(4, 0.02 * Math.min(zeichenflaeche.breite, zeichenflaeche.hoehe));
  let breite = STEMPEL_BREITE_VERHAELTNIS * zeichenflaeche.breite;
  let hoehe = breite * STEMPEL_SEITENVERHAELTNIS;

  // Gemeinsame Skalierung, falls die um `STEMPEL_WINKEL_GRAD` rotierte Box
  // sonst über die (um `margin` verkleinerte) Zeichenfläche hinausragen würde.
  const winkelRad = (Math.abs(STEMPEL_WINKEL_GRAD) * Math.PI) / 180;
  const cos = Math.cos(winkelRad);
  const sin = Math.sin(winkelRad);
  const halbBreiteMax = Math.max(0.001, zeichenflaeche.breite / 2 - margin);
  const halbHoeheMax = Math.max(0.001, zeichenflaeche.hoehe / 2 - margin);
  const halbBreiteRotiert = (breite / 2) * cos + (hoehe / 2) * sin;
  const halbHoeheRotiert = (breite / 2) * sin + (hoehe / 2) * cos;
  const skala = Math.min(1, halbBreiteMax / halbBreiteRotiert, halbHoeheMax / halbHoeheRotiert);
  breite *= skala;
  hoehe *= skala;

  const cx = zeichenflaeche.x + zeichenflaeche.breite / 2;
  // «Nahe der Oberkante» (Spez §1.7) — Mittelpunkt der Box im oberen Bereich.
  const cy = zeichenflaeche.y + Math.max(hoehe / 2 + margin, 0.14 * zeichenflaeche.hoehe);
  const x = cx - breite / 2;
  const y = cy - hoehe / 2;
  const rx = Math.min(4, hoehe / 4);

  // Schriftgrösse: das Kleinere aus einer Höhen-Quote (0.34×Stempelhöhe) UND
  // der Grösse, bei der der VOLLE (ungekürzte) Stempeltext exakt die
  // verfügbare Breite ausfüllt — für die feststehenden, kurzen Stempeltexte
  // (Spez §2.1, nur `AF` betroffen) verhindert das unnötiges Kürzen auf
  // normal grossen Blättern; erst wenn selbst diese kleinere Grösse noch zu
  // breit wäre (z.B. auf sehr kleinen Formaten), greift die Ellipse.
  const titelFontSizeAusHoehe = hoehe * 0.34;
  const titelFontSizeAusBreite = (breite * 0.86) / (eintrag.stempelText.length * ZEICHENBREITE_FAKTOR);
  const titelFontSize = Math.min(titelFontSizeAusHoehe, titelFontSizeAusBreite);
  const titelMaxZeichen = Math.max(1, Math.floor((breite * 0.86) / (titelFontSize * ZEICHENBREITE_FAKTOR)));
  const titelText = versal(kuerzeAufZeichen(eintrag.stempelText, titelMaxZeichen));

  const parts = [
    `<g data-teil="af-stempel" transform="rotate(${STEMPEL_WINKEL_GRAD} ${cx.toFixed(2)} ${cy.toFixed(2)})">`,
    `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${breite.toFixed(2)}" height="${hoehe.toFixed(2)}" rx="${rx.toFixed(2)}" fill="none" stroke="${eintrag.farbe}" stroke-width="${(hoehe * 0.06).toFixed(2)}"/>`,
    `<text x="${cx.toFixed(2)}" y="${(cy - hoehe * 0.08).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" ${messbarWert(titelFontSize, { bold: true, farbe: eintrag.farbe })}>${escapeXml(titelText)}</text>`,
  ];
  if (datum) {
    const datumFontSize = hoehe * 0.2;
    const datumMaxZeichen = Math.max(1, Math.floor((breite * 0.86) / (datumFontSize * ZEICHENBREITE_FAKTOR)));
    parts.push(
      `<text x="${cx.toFixed(2)}" y="${(cy + hoehe * 0.28).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" ${messbarWert(datumFontSize, { farbe: eintrag.farbe })}>${escapeXml(kuerzeAufZeichen(datum, datumMaxZeichen))}</text>`,
    );
  }
  parts.push(`</g>`);
  return parts.join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Massstabsbalken & Nordpfeil (v0.8.0 P4-Nachtrag, Spez §1.6) — beide liegen
// wie Wasserzeichen/AF-Stempel über der ZEICHENFLÄCHE, nicht über der
// Plankopf-Gruppe selbst: der Aufrufer (`derive/sheet.ts`) platziert sie mit
// der Zeichenflächen-Geometrie aus `derive/blattlayout.ts` — vom Aufrufer
// platzierbare Fragmente nach demselben Muster wie `wasserzeichenSvg()` oben.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Segmentanzahl des Massstabsbalkens (Spez §1.6, wörtlich):
 * `clamp(2, 6, round(45 / (1000 / Massstabszahl)))` — rechnerisch identisch
 * zu `round(0.045 × Massstabszahl)`. Exportiert für den harten Formel-Test
 * über mehrere Massstäbe (P4-Gate) — dieselbe Funktion, die `sheet.ts` für
 * die Balken-Geometrie selbst aufruft (kein Doppelpfad).
 */
export function massstabsbalkenSegmente(massstab: number): number {
  const roh = Math.round(45 / (1000 / massstab));
  return Math.min(6, Math.max(2, roh));
}

/** Balkenhöhe (mm) der Segmentkette. */
const MASSSTABSBALKEN_HOEHE_MM = 2.5;
/** Abstand der Balken-Oberkante zur Plankopf-Oberkante (Spez §1.6: «nahe der
 * Plankopf-Oberkante») — misst vom oberen Rand des Beschriftungstextes. */
const MASSSTABSBALKEN_ABSTAND_PLANKOPF_MM = 3;
const MASSSTABSBALKEN_LABEL_ABSTAND_MM = 1.2;

/**
 * Massstabsbalken (Spez §1.6): unten links in der Zeichenfläche, nahe der
 * Plankopf-Oberkante (`plankopfObenY`, die y-Koordinate der Akzentbalken-
 * Oberkante — s. `plankopfRect(...).y` in `derive/blattlayout.ts`). Meter-
 * Segmente abwechselnd Tinte/Papier gefüllt (`massstabsbalkenSegmente()`),
 * Beschriftung «0» am linken Ende, «{n} m · M 1:{massstab}» am rechten Ende
 * (mono, `PLANKOPF_TYPO_MM.massstabsbalkenLabel`) — eine kompakte
 * Einzeiler-Fassung der Spez-Vorgabe «Beschriftung von 0 bis n m» + «M
 * 1:xx»; die Spez fixiert keine Zwischenbeschriftung je Meter, nur die
 * beiden Enden. Leerstring bei `massstab <= 0`/`NaN` (kein erfundener
 * Balken ohne echten Massstab).
 */
export function massstabsbalkenSvg(zeichenflaeche: BlattRect, plankopfObenY: number, massstab: number): string {
  if (!massstab || massstab <= 0) return '';
  const anzahl = massstabsbalkenSegmente(massstab);
  const segmentBreite = 1000 / massstab; // 1 Meter Welt = so viele mm Papier bei 1:massstab
  const labelSize = PLANKOPF_TYPO_MM.massstabsbalkenLabel;
  const barY = plankopfObenY - MASSSTABSBALKEN_ABSTAND_PLANKOPF_MM - MASSSTABSBALKEN_LABEL_ABSTAND_MM - labelSize - MASSSTABSBALKEN_HOEHE_MM;
  const barX = zeichenflaeche.x + PAD_MM;
  const parts: string[] = [`<g data-teil="massstabsbalken">`];
  for (let i = 0; i < anzahl; i++) {
    const segX = barX + i * segmentBreite;
    const tinte = i % 2 === 0;
    parts.push(
      `<rect x="${segX.toFixed(2)}" y="${barY.toFixed(2)}" width="${segmentBreite.toFixed(2)}" height="${MASSSTABSBALKEN_HOEHE_MM}" fill="${tinte ? BLATT.tinte : 'white'}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
    );
  }
  const barBreite = anzahl * segmentBreite;
  const labelY = barY + MASSSTABSBALKEN_HOEHE_MM + MASSSTABSBALKEN_LABEL_ABSTAND_MM + labelSize;
  parts.push(
    `<text x="${barX.toFixed(2)}" y="${labelY.toFixed(2)}" ${messbarAttr(labelSize)}>0</text>`,
    `<text x="${(barX + barBreite).toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="end" ${messbarAttr(labelSize)}>${anzahl} m · M 1:${massstab}</text>`,
    `</g>`,
  );
  return parts.join('\n');
}

/** Kreisradius des Nordpfeils (Spez §1.6: «r≈4mm», Migrationswert aus
 * `plansvg.ts`). */
const NORDPFEIL_RADIUS_MM = 4;
/** Abstand Kreismittelpunkt zum jeweiligen Zeichenflächen-Rand — Migrations-
 * Ausgangswert aus `plansvg.ts` (`planToSvg`: dort `cy=16` bei 10mm-
 * Rahmenoberkante, `cx=paper.width-16` bei 10mm-Rahmenrechtskante, je
 * `r+2=6mm` Abstand zur jeweiligen Rahmenkante — hier auf die
 * Zeichenflächen-Kanten aus `derive/blattlayout.ts` übersetzt). */
const NORDPFEIL_RANDABSTAND_MM = NORDPFEIL_RADIUS_MM + 2;
/** Label-Grösse (Spez §1.6: «Label-Grösse 3mm», Migrationswert). */
const NORDPFEIL_LABEL_GROESSE_MM = 3;
/** Abstand Label-Baseline zur Kreis-Unterkante (Migrationswert aus
 * `plansvg.ts`: dort `y=26` bei Kreis-Unterkante `16+4=20` → Abstand 6). */
const NORDPFEIL_LABEL_ABSTAND_MM = 6;

/**
 * Nordpfeil (Spez §1.6): oben rechts in der Zeichenfläche — Kreis (r≈4mm),
 * Pfeilspitze (Linie + Doppel-Strich als Spitze), Label «N» (mono bold,
 * 3mm). Migriert die bestehende, bereits mm-echte Implementierung aus
 * `derive/plansvg.ts` (`planToSvg`, Kommentar «Nordpfeil oben rechts») als
 * Ausgangspunkt, übersetzt deren Papier-mm-Proportionen auf die
 * Zeichenflächen-Geometrie aus `derive/blattlayout.ts` — `plansvg.ts` selbst
 * bleibt dabei unverändert (Owner-Entscheid 4, Spez §5.3: der volle
 * Plankopf/das Framework gilt nur für Publish-Blätter).
 */
export function nordpfeilSvg(zeichenflaeche: BlattRect): string {
  const cx = zeichenflaeche.x + zeichenflaeche.breite - NORDPFEIL_RANDABSTAND_MM;
  const cy = zeichenflaeche.y + NORDPFEIL_RANDABSTAND_MM;
  const r = NORDPFEIL_RADIUS_MM;
  const spitzeY = cy - r + 1;
  const fussY = cy + r - 1;
  const fluegelY = spitzeY + 1.6;
  return [
    `<g data-teil="nordpfeil" stroke="${BLATT.tinte}" fill="none" stroke-width="${BLATT.rahmenStift}">`,
    `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r}"/>`,
    `<path d="M ${cx.toFixed(2)} ${fussY.toFixed(2)} L ${cx.toFixed(2)} ${spitzeY.toFixed(2)} M ${(cx - 1.4).toFixed(2)} ${fluegelY.toFixed(2)} L ${cx.toFixed(2)} ${spitzeY.toFixed(2)} L ${(cx + 1.4).toFixed(2)} ${fluegelY.toFixed(2)}"/>`,
    `<text x="${cx.toFixed(2)}" y="${(cy + r + NORDPFEIL_LABEL_ABSTAND_MM).toFixed(2)}" text-anchor="middle" ${messbarWert(NORDPFEIL_LABEL_GROESSE_MM, { bold: true })} stroke="none" fill="${BLATT.tinte}">N</text>`,
    `</g>`,
  ].join('\n');
}
