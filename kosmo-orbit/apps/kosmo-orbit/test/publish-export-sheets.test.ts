import { describe, expect, it } from 'vitest';
import { execute, KosmoDoc, type Sheet } from '@kosmo/kernel';
import { pdfBlattDateiname, pdfSetDateiname } from '../src/modules/publish/export-sheets';

/**
 * v0.8.1 P7 (`docs/V081-SPEZ.md` §6.1/§7(e), C-25 «Einzelblatt-PDF mit
 * Plancode-Namen») — reiner Namens-Test für `pdfBlattDateiname()` (kein DOM,
 * kein jsPDF/svg2pdf: der eigentliche PDF-Rendering-Weg bleibt e2e-getestet,
 * s. `e2e/export-pdf-haertung.spec.ts`, dieselbe Arbeitsteilung wie
 * `unternehmerplan-pdf.test.ts`). Zwei Kernpunkte:
 *   1. Ohne volle Plancode-Stammdaten (Daten-Guard `sheetPlancode()`) bleibt
 *      der Name die bewährte `NAMENSREGEL_DEFAULT`-Form — byte-gleich zur
 *      bisherigen Vorschau, kein neuer Name ohne Daten.
 *   2. MIT vollen Stammdaten trägt der Name den Plancode — UND
 *      `pdfSetDateiname()` (Bündel-PDF) bleibt dabei bewusst UNVERÄNDERT
 *      (ROADMAP 378: «Bündel-PDF bewusst ohne Einzel-Plancode» — nur der
 *      Einzelblatt-Export bekommt den Plancode im Namen).
 */

function neuesBlatt(): { doc: KosmoDoc; sheetId: string } {
  const doc = new KosmoDoc();
  const r = execute(doc, 'publish.blattErstellen', { name: 'Grundriss EG', format: 'A1', orientation: 'quer' });
  const sheetId = (r.patches[0] as { id: string }).id;
  return { doc, sheetId };
}

describe('pdfBlattDateiname — Einzelblatt-PDF-Name (v0.8.1 P7, C-25)', () => {
  it('ohne Stammdaten: bleibt bei der Alt-Namensregel (Daten-Guard, byte-gleich)', () => {
    const { doc, sheetId } = neuesBlatt();
    const sheet = doc.get<Sheet>(sheetId)!;
    expect(pdfBlattDateiname(doc, sheet)).toBe('P-01_Grundriss_EG');
  });

  it('mit vollen Stammdaten: der Name trägt den Plancode', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.bueroSetzen', { kuerzel: 'MAA' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'SEE' });
    execute(doc, 'publish.plankopfSetzen', {
      sheetId,
      patch: { planNummer: '101', disziplin: 'A', geschossCode: 'EG' },
    });
    const sheet = doc.get<Sheet>(sheetId)!;
    expect(pdfBlattDateiname(doc, sheet)).toMatch(/^MAA-SEE-[A-Z]{2}-A-EG-101_Grundriss_EG$/);
  });

  it('teilweise Stammdaten (fehlende Plan-Nummer): bleibt ehrlich beim Alt-Namen', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.bueroSetzen', { kuerzel: 'MAA' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'SEE' });
    const sheet = doc.get<Sheet>(sheetId)!;
    expect(pdfBlattDateiname(doc, sheet)).toBe('P-01_Grundriss_EG');
  });

  it('Bündel-PDF-Name (pdfSetDateiname) bleibt unverändert, auch mit vollen Plancode-Stammdaten (ROADMAP 378)', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.bueroSetzen', { kuerzel: 'MAA' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'SEE' });
    execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { planNummer: '101' } });
    // Kein Plancode-Fragment im Bündel-Namen — nur Projektname (+ Set-Name).
    expect(pdfSetDateiname(doc)).toBe(`${doc.settings.projectName.replace(/\s+/g, '-')}-Plansatz`);
    expect(pdfSetDateiname(doc)).not.toMatch(/MAA-SEE/);
  });
});
