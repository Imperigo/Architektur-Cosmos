import type { KosmoDoc, PublikationsSet } from '../model/doc';
import type { Sheet } from '../model/entities';
import { sheetPaperSize } from './sheet';

/**
 * Publikations-Sets (RE-ARCHICAD A4) — die Publisher-Essenz ohne
 * Baum-Bürokratie: ein benanntes Set nennt seine Blätter und eine
 * Namensregel; der Export benennt jede Datei daraus. Abgabe-Tage werden
 * ein Klick («publiziere den Wettbewerbssatz»).
 */

export const NAMENSREGEL_DEFAULT = 'P-{nr}_{blatt}_{massstab}';

/** Dateiname (ohne Endung) nach der Namensregel — Platzhalter {nr}/{blatt}/
 * {projekt}/{massstab}/{format}; fehlt ein Wert, verschwindet der Platzhalter
 * samt angrenzendem Trenner. Pfad-unsichere Zeichen und Leerraum werden
 * ersetzt («P-01_Grundriss_EG_1-50»). */
export function setDateiname(
  regel: string | undefined,
  ctx: { nr: number; blatt: string; projekt: string; massstab?: number | null; format?: string },
): string {
  let s = (regel?.trim() || NAMENSREGEL_DEFAULT)
    .replaceAll('{nr}', String(ctx.nr).padStart(2, '0'))
    .replaceAll('{blatt}', ctx.blatt)
    .replaceAll('{projekt}', ctx.projekt)
    .replaceAll('{massstab}', ctx.massstab ? `1-${ctx.massstab}` : '')
    .replaceAll('{format}', ctx.format ?? '');
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
 */
export function transmittalCsv(doc: KosmoDoc, set?: PublikationsSet): string {
  const feld = (s: string) => (/[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  const sheets = set
    ? setBlaetter(doc, set)
    : doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  const zeilen = sheets.map((s, i) => {
    const paper = sheetPaperSize(s);
    const massstaebe = [...new Set(s.placements.map((p) => p.scale))]
      .sort((a, b) => a - b)
      .map((m) => `1:${m}`)
      .join(' · ');
    const rev = (s.revisionen ?? [])[s.revisionen ? s.revisionen.length - 1 : 0];
    return [
      String(i + 1),
      feld(s.name),
      `${s.format} ${s.orientation} (${paper.width}×${paper.height})`,
      feld(massstaebe || '—'),
      rev ? feld(`${rev.index} · ${rev.datum}`) : '—',
    ].join(';');
  });
  return ['Nr;Blatt;Format;Massstab;Revision', ...zeilen].join('\n');
}
