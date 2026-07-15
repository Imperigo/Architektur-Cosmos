import type { KosmoDoc, PublikationsSet } from '../model/doc';
import type { Sheet } from '../model/entities';
import { plancode, siaZuMatrixStufe } from './plankopf';
import { sheetPaperSize } from './sheet';

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
