import type { KosmoDoc, PublikationsSet } from '../model/doc';
import type { Sheet } from '../model/entities';

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
