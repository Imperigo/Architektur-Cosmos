import type { KosmoDoc, PublikationsSet } from '../model/doc';
import type { Etikett, Sheet } from '../model/entities';
import { plancode, siaZuMatrixStufe } from './plankopf';
import { sheetPaperSize } from './sheet';
import { BLATT, BLATT_TYPO_MM, escapeXml, messbarAttr, titelAttr, versal } from './stilblatt';

/**
 * Publikations-Sets (RE-ARCHICAD A4) — die Publisher-Essenz ohne
 * Baum-Bürokratie: ein benanntes Set nennt seine Blätter und eine
 * Namensregel; der Export benennt jede Datei daraus. Abgabe-Tage werden
 * ein Klick («publiziere den Wettbewerbssatz»).
 */

export const NAMENSREGEL_DEFAULT = 'P-{nr}_{blatt}_{massstab}';

/**
 * Plancode-basierte Standardregel (v0.8.0 P5, `docs/V080-PLANKOPF-SPEZ.md`
 * §4.4/V-K4) — greift automatisch anstelle von `NAMENSREGEL_DEFAULT`, wenn
 * `ctx.plancode` gesetzt ist UND keine eigene `regel` übergeben wurde
 * (Daten-Guard, s. `setDateiname`-Kommentar). Kein zusätzliches `P-{nr}`-
 * Präfix: der Plancode trägt mit `SheetPlankopf.planNummer` bereits eine
 * eigene, offizielle laufende Nummer — ein `nr`-Präfix (die SET-Position,
 * eine andere, rein exportinterne Zahl) wäre eine verwirrende
 * Doppelnummerierung.
 */
export const NAMENSREGEL_PLANCODE = '{plancode}_{blatt}_{massstab}';

/**
 * Plancode für ein Blatt (`plancode()` aus P3, `derive/plankopf.ts`), wenn
 * genügend Stammdaten vorhanden sind — sonst `undefined` (Daten-Guard, Spez
 * §4.4: «Plancode-basierte Dateinamensregel, wenn `SheetPlankopf.planNummer`
 * gesetzt ist»). Verlangt zusätzlich Büro-Kürzel und Projekt-Code, weil ein
 * Plancode ohne diese beiden Anker (`{büro}`/`{projekt}`) kaum mehr als
 * `—-—-…` wäre — kein sinnvoller Exportname. Die Phase kommt immer über
 * `siaZuMatrixStufe(settings.siaPhase)` (Pflichtfeld, nie fehlend);
 * Disziplin/Geschoss sind optional — fehlen sie, setzt `plancode()` selbst
 * den ehrlichen `—`-Platzhalter (Spez §3.1), diese Funktion dupliziert das
 * nicht.
 */
export function sheetPlancode(doc: KosmoDoc, sheet: Sheet): string | undefined {
  const buero = doc.settings.buero?.kuerzel;
  const projekt = doc.settings.projekt?.projektCode;
  const nr = sheet.plankopf?.planNummer;
  if (!buero || !projekt || !nr) return undefined;
  const disziplin = sheet.plankopf?.disziplin;
  const geschoss = sheet.plankopf?.geschossCode;
  return plancode({
    buero,
    projekt,
    phase: siaZuMatrixStufe(doc.settings.siaPhase),
    ...(disziplin !== undefined ? { disziplin } : {}),
    ...(geschoss !== undefined ? { geschoss } : {}),
    nr,
  });
}

/** Dateiname (ohne Endung) nach der Namensregel — Platzhalter {nr}/{blatt}/
 * {projekt}/{massstab}/{format}/{plancode}; fehlt ein Wert, verschwindet der
 * Platzhalter samt angrenzendem Trenner. Pfad-unsichere Zeichen und Leerraum
 * werden ersetzt («P-01_Grundriss_EG_1-50»).
 *
 * **Daten-Guard (v0.8.0 P5):** Ist `ctx.plancode` gesetzt UND `regel` NICHT
 * übergeben, greift automatisch `NAMENSREGEL_PLANCODE` statt
 * `NAMENSREGEL_DEFAULT` — der Plancode wird Teil des Exportnamens. Ohne
 * `ctx.plancode` (der Normalfall bei fehlenden Büro-/Projekt-/Plankopf-Daten,
 * s. `sheetPlancode`) oder mit einer eigenen `regel` bleibt der Name exakt
 * wie zuvor, byte-gleich — bestehende Aufrufer/Goldens bewegen sich nicht. */
export function setDateiname(
  regel: string | undefined,
  ctx: { nr: number; blatt: string; projekt: string; massstab?: number | null; format?: string; plancode?: string },
): string {
  const eigeneRegel = regel?.trim();
  const aktivRegel = eigeneRegel || (ctx.plancode ? NAMENSREGEL_PLANCODE : NAMENSREGEL_DEFAULT);
  let s = aktivRegel
    .replaceAll('{nr}', String(ctx.nr).padStart(2, '0'))
    .replaceAll('{blatt}', ctx.blatt)
    .replaceAll('{projekt}', ctx.projekt)
    .replaceAll('{massstab}', ctx.massstab ? `1-${ctx.massstab}` : '')
    .replaceAll('{format}', ctx.format ?? '')
    .replaceAll('{plancode}', ctx.plancode ?? '');
  s = s
    .replace(/\s+/g, '_')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[_-]{2,}/g, (m) => m[0]!) // leere Platzhalter hinterlassen keine Doppel-Trenner
    .replace(/^[_-]+|[_-]+$/g, '');
  return s || 'Blatt';
}

/** Blätter eines Sets in Set-Reihenfolge — verschwundene Blätter fallen
 * ehrlich raus (gelöschte Blätter brechen den Export nicht). */
export function setBlaetter(doc: KosmoDoc, set: PublikationsSet): Sheet[] {
  const out: Sheet[] = [];
  for (const id of set.sheetIds) {
    const s = doc.get<Sheet>(id);
    if (s && s.kind === 'sheet') out.push(s);
  }
  return out;
}

/**
 * Transmittal-Liste (RE-ARCHICAD A7): je Blatt eine Zeile mit Format,
 * Massstäben und letztem Revisions-Stand — die Begleitliste zum Planversand
 * an Unternehmer. Semikolon/Excel-CH, RFC-4180-gequotet. Ohne Set = alle
 * Blätter in Plansatz-Reihenfolge.
 *
 * **Plancode-Spalte (v0.8.0 P5, Spez §4.4, Daten-Guard):** die Spalte
 * erscheint NUR, wenn sich für MINDESTENS EIN Blatt ein Plancode bilden
 * lässt (`sheetPlancode()`) — fehlt Büro-Kürzel/Projekt-Code/Plan-Nummer bei
 * jedem Blatt (der heutige Bestand ohne v0.8.0-Stammdaten), bleiben Kopf-
 * und Datenzeilen exakt wie bisher, byte-gleich. Ist die Spalte da, bleibt
 * sie bei einzelnen Blättern ohne Plancode ehrlich leer (kein Platzhalter —
 * anders als im Plancode-Feld selbst, s. `plancode()`-Kommentar: dort steht
 * ein `—` für einen fehlenden TEIL eines vorhandenen Codes, hier fehlt der
 * ganze Code für dieses eine Blatt).
 */
export function transmittalCsv(doc: KosmoDoc, set?: PublikationsSet): string {
  const feld = (s: string) => (/[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  const sheets = set
    ? setBlaetter(doc, set)
    : doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  const plancodes = sheets.map((s) => sheetPlancode(doc, s));
  const mitPlancodeSpalte = plancodes.some((c) => c !== undefined);
  const zeilen = sheets.map((s, i) => {
    const paper = sheetPaperSize(s);
    const massstaebe = [...new Set(s.placements.map((p) => p.scale))]
      .sort((a, b) => a - b)
      .map((m) => `1:${m}`)
      .join(' · ');
    const rev = (s.revisionen ?? [])[s.revisionen ? s.revisionen.length - 1 : 0];
    const basis = [
      String(i + 1),
      feld(s.name),
      `${s.format} ${s.orientation} (${paper.width}×${paper.height})`,
      feld(massstaebe || '—'),
      rev ? feld(`${rev.index} · ${rev.datum}`) : '—',
    ];
    if (mitPlancodeSpalte) basis.push(feld(plancodes[i] ?? ''));
    return basis.join(';');
  });
  const kopf = mitPlancodeSpalte ? 'Nr;Blatt;Format;Massstab;Revision;Plancode' : 'Nr;Blatt;Format;Massstab;Revision';
  return [kopf, ...zeilen].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Blattverzeichnis + Sammellegende (v0.8.9 E3/PB3,
// `docs/SUBSPEZ-BLATTVERZEICHNIS-089.md`) — die Plan-Inhaltsliste eines
// Publikations-Sets als druckfähiges A4-hoch-Blatt: die eigenständige
// «Blatt»-Bauweise (Muster `derive/kvblatt.ts`/`derive/bauablaufblatt.ts`),
// NICHT `SheetPlacement.view` oder eine Sheet-Entity (Subspez §1
// «Architektur-Entscheid») — null Kontakt mit `sheetToSvg`-Bestandspfaden.
// Sammellegende verallgemeinert die Pro-Blatt-Legende aus `sheet.ts:315-347`
// (Themenplan-Farbkästchen + Keynotes) über ALLE Blätter des Sets.
// ═══════════════════════════════════════════════════════════════════════════

/** Blätter in Verzeichnis-/Legenden-Reihenfolge — mit `set` die Set-Reihenfolge
 * (`setBlaetter`), ohne `set` alle Blätter in Plansatz-Reihenfolge
 * (a.index - b.index) — exakt `transmittalCsv`s Semantik (Subspez §3). Private
 * Hilfsfunktion (kein eigener Export, `transmittalCsv` bleibt unangetastet,
 * Sanktion «kein Umbau von Bestandspfaden» — dies ist additiver Code daneben). */
function sheetsFuerVerzeichnis(doc: KosmoDoc, set: PublikationsSet | undefined): Sheet[] {
  return set ? setBlaetter(doc, set) : doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
}

export interface BlattverzeichnisZeile {
  /** 1-basierte Position (Set- bzw. index-Reihenfolge). */
  nr: number;
  name: string;
  /** «A1 quer (841×594)» — exakt wie `transmittalCsv`. */
  format: string;
  /** «1:50 · 1:100» oder '—'. */
  massstaebe: string;
  /** «B · 12.03.2026» oder '—'. */
  revision: string;
  /** Nur gesetzt, wenn `sheetPlancode()` für DIESES Blatt einen Wert liefert. */
  plancode?: string;
}

/**
 * Zeilen des Blattverzeichnisses — ohne `set` alle Blätter in
 * Plansatz-Reihenfolge (a.index - b.index), exakt die `transmittalCsv`-
 * Semantik (dieselbe Zeilenherleitung, hier strukturiert statt CSV-Text,
 * damit Unit-Tests die Datenebene ohne String-Parsing prüfen können, Subspez
 * §3). Gelöschte Set-Blätter fallen via `setBlaetter()` ehrlich raus.
 */
export function blattverzeichnisZeilen(doc: KosmoDoc, set?: PublikationsSet): BlattverzeichnisZeile[] {
  const sheets = sheetsFuerVerzeichnis(doc, set);
  return sheets.map((s, i) => {
    const paper = sheetPaperSize(s);
    const massstaebe = [...new Set(s.placements.map((p) => p.scale))]
      .sort((a, b) => a - b)
      .map((m) => `1:${m}`)
      .join(' · ');
    const rev = (s.revisionen ?? [])[s.revisionen ? s.revisionen.length - 1 : 0];
    const plancode = sheetPlancode(doc, s);
    return {
      nr: i + 1,
      name: s.name,
      format: `${s.format} ${s.orientation} (${paper.width}×${paper.height})`,
      massstaebe: massstaebe || '—',
      revision: rev ? `${rev.index} · ${rev.datum}` : '—',
      // exactOptionalPropertyTypes: konditionaler Spread statt `plancode ?? undefined`.
      ...(plancode !== undefined ? { plancode } : {}),
    };
  });
}

export interface SammellegendeDaten {
  /** Nur Themen, die auf mindestens einer Platzierung der Verzeichnis-
   *  Blätter vorkommen (`pl.thema` → `doc.settings.themen`-Match), in
   *  Erst-Vorkommens-Reihenfolge; `regeln` in settings-Reihenfolge (das
   *  volle Regel-Set des Themas, nicht auf tatsächlich benutzte Farben
   *  reduziert — dieselbe Grosszügigkeit wie die Pro-Blatt-Legende, die
   *  ebenfalls alle Regeln eines aktivierten Themas zeigt). */
  themen: { name: string; regeln: { label: string; farbe: string }[] }[];
  /** Keynote-Nummern aller platzierten Geschosse der Verzeichnis-Blätter
   *  (Etikett-Filter EXAKT wie `sheet.ts:331-339`: `storeyId` der
   *  Platzierung, `inhalt==='keynote'`, `keynote` gesetzt, Eintrag in
   *  `settings.keynotes` vorhanden), dedupliziert,
   *  `localeCompare('de-CH', {numeric:true})` sortiert. */
  keynotes: { nr: string; text: string }[];
}

/**
 * Sammellegende — die Verallgemeinerung der Pro-Blatt-Legende (`sheet.ts`
 * `sheetToSvg`, Themenplan-Farbkästchen + Keynotes) über ALLE Blätter eines
 * Publikations-Sets: welche Themen-Regeln und welche Keynotes kommen im
 * Satz überhaupt vor (Subspez §1 Ziel 2). Reine Aggregation, kein Zugriff auf
 * Bestandspfade — `sheetToSvg` selbst bleibt unberührt.
 */
export function sammellegende(doc: KosmoDoc, set?: PublikationsSet): SammellegendeDaten {
  const sheets = sheetsFuerVerzeichnis(doc, set);
  const themenKatalog = doc.settings.themen ?? [];
  // Vorfiltern statt je Platzierung neu filtern (dieselbe Grundmenge über
  // alle Blätter/Platzierungen hinweg gebraucht).
  const keynoteEtiketten = doc.byKind<Etikett>('etikett').filter((e) => e.inhalt === 'keynote' && e.keynote);
  const keynoteKatalog = doc.settings.keynotes ?? [];

  const themen: SammellegendeDaten['themen'] = [];
  const themenGesehen = new Set<string>();
  const keynoteNrsGesehen = new Set<string>();

  for (const sheet of sheets) {
    for (const pl of sheet.placements) {
      if (pl.thema && !themenGesehen.has(pl.thema)) {
        themenGesehen.add(pl.thema); // auch bei Nicht-Treffer merken — kein wiederholtes Suchen für dieselbe Lücke
        const thema = themenKatalog.find((t) => t.name === pl.thema);
        if (thema) {
          themen.push({
            name: thema.name,
            regeln: thema.regeln.map((r) => ({ label: r.label ?? r.wert, farbe: r.farbe })),
          });
        }
      }
      // Keynote-Filter EXAKT wie sheet.ts:331-339 (Pro-Blatt-Legende): nur
      // Grundriss-Platzierungen mit storeyId tragen Geschoss-Etiketten.
      if (pl.view === 'grundriss' && pl.storeyId) {
        for (const e of keynoteEtiketten) {
          if (e.storeyId === pl.storeyId) keynoteNrsGesehen.add(e.keynote!);
        }
      }
    }
  }

  const keynotes = [...keynoteNrsGesehen]
    .map((nr) => keynoteKatalog.find((k) => k.nr === nr))
    .filter((k): k is { nr: string; text: string } => k !== undefined)
    .sort((a, b) => a.nr.localeCompare(b.nr, 'de-CH', { numeric: true }));

  return { themen, keynotes };
}

export interface BlattverzeichnisOptionen {
  projectName: string;
  /** Anzeige-Datum — vom Aufrufer übergeben, derive bleibt pur (kein
   *  `new Date()` im Kernel). Fehlt es, entfällt das Datum-Segment im
   *  Untertitel. */
  datum?: string;
  /** Set-Name für den Untertitel; fehlt er: «Alle Blätter». */
  setName?: string;
}

// ── Blatt-Geometrie (Papier-mm, A4 hoch) — Subspez §4, «fixe Rechnung im
// Code, Konstante mit Kommentar» ──────────────────────────────────────────
const BV_SEITE_B = 210;
const BV_SEITE_H = 297;
const BV_RAND = 10; // Rahmen 10 mm rundum (Subspez §3 Signatur-Kommentar)
const BV_INHALT_X = 14; // linker Textanker (deckt sich mit der Nr-Spalte)

const BV_TITEL_Y = 22;
const BV_UNTERTITEL_Y = 28;
const BV_KOPF_TRENNLINIE_Y = 32;

const BV_TABELLE_TOP = 40;
const BV_ZEILE_H = 6; // Subspez §4: «Zeilenhöhe 6 mm»
const BV_KOPFZEILE_H = BV_ZEILE_H;

// Spalten-x-Anker in mm (Subspez §4, eingefroren) — linksbündig ausser Nr
// (rechtsbündig, endet auf dem Blatt-Wert wie eine Stellenzahl).
const BV_SPALTE_NR = 14;
const BV_SPALTE_BLATT = 24;
const BV_SPALTE_FORMAT = 80;
const BV_SPALTE_MASSSTAB = 130;
const BV_SPALTE_REVISION = 158;
const BV_SPALTE_PLANCODE = 182;

// Sammellegende (Subspez §4): Zwischentitel + eine Zeile je Thema (Name +
// Regeln als Farbkästchen/Label-Kette, Muster sheet.ts:315-347) + eine Zeile
// je Keynote.
const BV_LEGENDE_GAP = 6; // Abstand Tabellenende → Legenden-Zwischentitel
const BV_LEGENDE_TITEL_H = 6;
const BV_LEGENDE_THEMA_ZEILE_H = 6;
const BV_LEGENDE_KEYNOTE_ZEILE_H = 4.5;

/** Reservierte Höhe der Sammellegende (0 = keine Legende, Guard Subspez §5.3) —
 * dieselbe Formel positioniert die Legende UND begrenzt die Tabellenzeilen
 * (`maxDatenzeilen` unten), damit beide nie kollidieren. */
function legendenHoehe(daten: SammellegendeDaten): number {
  if (daten.themen.length === 0 && daten.keynotes.length === 0) return 0;
  return (
    BV_LEGENDE_GAP +
    BV_LEGENDE_TITEL_H +
    daten.themen.length * BV_LEGENDE_THEMA_ZEILE_H +
    daten.keynotes.length * BV_LEGENDE_KEYNOTE_ZEILE_H
  );
}

/**
 * Eigenständiges A4-HOCH-Blatt (210×297, `viewBox="0 0 210 297"`) nach dem
 * `kvBlattSvg`-Muster: Stilblatt-Konstanten (`BLATT`, `TITEL_STIL`/
 * `titelAttr`, `versal`, `messbarAttr`, `escapeXml`), Rahmen 10 mm rundum,
 * Titel «BLATTVERZEICHNIS», Untertitel `projectName · setName · datum`. KEIN
 * Plankopf-Framework, KEINE `blattlayout.ts`-Abhängigkeit — das Blatt ist
 * KEIN Sheet-Entity (Subspez §1 «Architektur-Entscheid», Sanktion 7).
 *
 * **Überlauf ehrlich (Subspez §4):** kein Mehrseiten-Support (dokumentiertes
 * Nicht-Ziel) — `maxDatenzeilen` ist die feste Rechnung, wie viele Zeilen
 * zwischen Tabellenkopf und Sammellegende/Blattrand passen; darüber ersetzt
 * die letzte Zeile eine Schlusszeile «… +M weitere Blätter» statt still
 * abzuschneiden.
 */
export function blattverzeichnisSvg(
  doc: KosmoDoc,
  set: PublikationsSet | undefined,
  opts: BlattverzeichnisOptionen,
): string {
  const zeilen = blattverzeichnisZeilen(doc, set);
  const legende = sammellegende(doc, set);
  const legendeHoehe = legendenHoehe(legende);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BV_SEITE_B} ${BV_SEITE_H}">`);
  parts.push(`<rect x="0" y="0" width="${BV_SEITE_B}" height="${BV_SEITE_H}" fill="#ffffff"/>`);
  parts.push(
    `<rect x="${BV_RAND}" y="${BV_RAND}" width="${BV_SEITE_B - 2 * BV_RAND}" height="${BV_SEITE_H - 2 * BV_RAND}" fill="none" stroke="${BLATT.tinte}" stroke-width="${BLATT.rahmenStift}"/>`,
  );

  // ── Kopf ─────────────────────────────────────────────────────────────
  parts.push(
    `<text x="${BV_INHALT_X}" y="${BV_TITEL_Y}" ${titelAttr(BLATT_TYPO_MM.titel)} fill="${BLATT.tinte}">${versal('Blattverzeichnis')}</text>`,
  );
  const untertitelTeile = [opts.projectName, opts.setName ?? 'Alle Blätter'];
  if (opts.datum) untertitelTeile.push(opts.datum);
  parts.push(
    `<text x="${BV_INHALT_X}" y="${BV_UNTERTITEL_Y}" ${messbarAttr(BLATT_TYPO_MM.untertitel)} fill="${BLATT.textSekundaer}">${untertitelTeile.map(escapeXml).join(' · ')}</text>`,
  );
  parts.push(
    `<line x1="${BV_INHALT_X}" y1="${BV_KOPF_TRENNLINIE_Y}" x2="${BV_SEITE_B - BV_RAND}" y2="${BV_KOPF_TRENNLINIE_Y}" stroke="${BLATT.tinte}" stroke-width="${BLATT_TYPO_MM.trennlinie}"/>`,
  );

  // ── Tabelle ──────────────────────────────────────────────────────────
  const mitPlancodeSpalte = zeilen.some((z) => z.plancode !== undefined);
  const kopfY = BV_TABELLE_TOP + BV_KOPFZEILE_H * 0.7;
  parts.push(`<g data-teil="blattverzeichnis-tabelle">`);
  parts.push(
    `<text x="${BV_SPALTE_NR}" y="${kopfY.toFixed(2)}" text-anchor="end" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>Nr</text>`,
    `<text x="${BV_SPALTE_BLATT}" y="${kopfY.toFixed(2)}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>Blatt</text>`,
    `<text x="${BV_SPALTE_FORMAT}" y="${kopfY.toFixed(2)}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>Format</text>`,
    `<text x="${BV_SPALTE_MASSSTAB}" y="${kopfY.toFixed(2)}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>Massstab</text>`,
    `<text x="${BV_SPALTE_REVISION}" y="${kopfY.toFixed(2)}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>Revision</text>`,
  );
  if (mitPlancodeSpalte) {
    parts.push(
      `<text x="${BV_SPALTE_PLANCODE}" y="${kopfY.toFixed(2)}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>Plancode</text>`,
    );
  }
  const kopfTrennY = BV_TABELLE_TOP + BV_KOPFZEILE_H;
  parts.push(
    `<line x1="${BV_INHALT_X}" y1="${kopfTrennY}" x2="${BV_SEITE_B - BV_RAND}" y2="${kopfTrennY}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
  );

  // Überlauf-Grenze: so viele Datenzeilen, wie zwischen Tabellenkopf und
  // Sammellegende/Blattrand passen (Subspez §4) — mindestens 1, sonst würde
  // eine winzige Grenze (extremer legendeHoehe-Ausreisser) die Tabelle ganz
  // verschlucken; ein solcher Fall ist mit den heutigen Konstanten nicht
  // erreichbar, der Boden ist reine Verteidigung.
  const untenGrenze = BV_SEITE_H - BV_RAND - 4 - legendeHoehe;
  const verfuegbareHoehe = untenGrenze - kopfTrennY;
  const maxDatenzeilen = Math.max(1, Math.floor(verfuegbareHoehe / BV_ZEILE_H));

  if (zeilen.length === 0) {
    const y = kopfTrennY + BV_ZEILE_H * 0.7;
    parts.push(`<text x="${BV_INHALT_X}" y="${y.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)} fill="${BLATT.textSekundaer}">Keine Blätter</text>`);
  } else {
    const ueberlauf = zeilen.length > maxDatenzeilen;
    const echteZeilen = ueberlauf ? zeilen.slice(0, maxDatenzeilen - 1) : zeilen;
    echteZeilen.forEach((z, i) => {
      const y = kopfTrennY + (i + 1) * BV_ZEILE_H - BV_ZEILE_H * 0.3;
      parts.push(
        `<text x="${BV_SPALTE_NR}" y="${y.toFixed(2)}" text-anchor="end" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${z.nr}</text>`,
        `<text x="${BV_SPALTE_BLATT}" y="${y.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(z.name)}</text>`,
        `<text x="${BV_SPALTE_FORMAT}" y="${y.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(z.format)}</text>`,
        `<text x="${BV_SPALTE_MASSSTAB}" y="${y.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(z.massstaebe)}</text>`,
        `<text x="${BV_SPALTE_REVISION}" y="${y.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(z.revision)}</text>`,
      );
      if (mitPlancodeSpalte) {
        parts.push(
          `<text x="${BV_SPALTE_PLANCODE}" y="${y.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${z.plancode ? escapeXml(z.plancode) : ''}</text>`,
        );
      }
    });
    if (ueberlauf) {
      const weitere = zeilen.length - echteZeilen.length;
      const y = kopfTrennY + (echteZeilen.length + 1) * BV_ZEILE_H - BV_ZEILE_H * 0.3;
      parts.push(
        `<text x="${BV_SPALTE_BLATT}" y="${y.toFixed(2)}" font-style="italic" ${messbarAttr(BLATT_TYPO_MM.etikett)} fill="${BLATT.textSekundaer}">… +${weitere} weitere Blätter</text>`,
      );
    }
  }
  parts.push('</g>');

  // ── Sammellegende (nur bei Daten, Subspez §5.3) ─────────────────────
  if (legendeHoehe > 0) {
    const zeilenGerendert = zeilen.length === 0 ? 0 : Math.min(zeilen.length, maxDatenzeilen);
    const legendeTop = kopfTrennY + zeilenGerendert * BV_ZEILE_H + BV_LEGENDE_GAP;
    parts.push(`<g data-teil="sammellegende">`);
    parts.push(
      `<text x="${BV_INHALT_X}" y="${legendeTop.toFixed(2)}" ${titelAttr(BLATT_TYPO_MM.untertitel)} fill="${BLATT.tinte}">${versal('Legende')}</text>`,
    );
    let legendeY = legendeTop + BV_LEGENDE_TITEL_H;
    for (const thema of legende.themen) {
      let lx = BV_INHALT_X;
      parts.push(
        `<text x="${lx}" y="${legendeY.toFixed(2)}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(thema.name)}:</text>`,
      );
      // Grobe Zeichenbreiten-Schätzung für die x-Fortschreibung — dasselbe
      // Muster wie die Pro-Blatt-Legende (sheet.ts:326).
      lx += 5 + thema.name.length * 1.7 + 4;
      for (const r of thema.regeln) {
        parts.push(
          `<rect x="${lx.toFixed(2)}" y="${(legendeY - 3).toFixed(2)}" width="4" height="3" fill="${r.farbe}" stroke="${BLATT.tinte}" stroke-width="${BLATT.trennStift}"/>`,
          `<text x="${(lx + 5.5).toFixed(2)}" y="${legendeY.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(r.label)}</text>`,
        );
        lx += 5.5 + r.label.length * 1.7 + 6;
      }
      legendeY += BV_LEGENDE_THEMA_ZEILE_H;
    }
    for (const k of legende.keynotes) {
      parts.push(
        `<text x="${BV_INHALT_X}" y="${legendeY.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}><tspan font-weight="bold">${escapeXml(k.nr)}</tspan>  ${escapeXml(k.text)}</text>`,
      );
      legendeY += BV_LEGENDE_KEYNOTE_ZEILE_H;
    }
    parts.push('</g>');
  }

  parts.push('</svg>');
  return parts.join('');
}
