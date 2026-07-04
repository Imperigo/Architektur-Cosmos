import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { A3_QUER, exportIfc, planToSvg, type BauPhase } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/** SIA-Massstabsempfehlung je Phase (B5, PLAN-DETAILLIERUNG Fig. 4) —
 * Vorschlag, kein Zwang: der Blatt-Editor (KosmoPublish) wählt frei. */
export const PHASEN_MASSSTAB: Record<BauPhase, number> = {
  vorprojekt: 200,
  bauprojekt: 100,
  werkplan: 50,
};

/** Grundriss des aktiven Geschosses als Vektor-PDF (A3 quer, Massstab folgt der Phase). */
export async function exportPlanPdf(): Promise<void> {
  const { doc, activeStoreyId } = useProject.getState();
  if (!activeStoreyId) return;
  const svgMarkup = planToSvg(doc, activeStoreyId, {
    scale: PHASEN_MASSSTAB[doc.settings.phase],
    paper: A3_QUER,
    projectName: doc.settings.projectName,
    planTitle: 'Grundriss',
  });
  const holder = document.createElement('div');
  holder.innerHTML = svgMarkup;
  const svgEl = holder.querySelector('svg')!;
  document.body.appendChild(svgEl);
  try {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    await svg2pdf(svgEl, pdf, { x: 0, y: 0, width: A3_QUER.width, height: A3_QUER.height });
    pdf.save(`${doc.settings.projectName.replace(/\s+/g, '-')}-Grundriss.pdf`);
  } finally {
    svgEl.remove();
  }
}

/** Grundriss als eigenständiges SVG (für KosmoPublish/Weiterbearbeitung). */
export function exportPlanSvg(): void {
  const { doc, activeStoreyId } = useProject.getState();
  if (!activeStoreyId) return;
  const svgMarkup = planToSvg(doc, activeStoreyId, {
    scale: PHASEN_MASSSTAB[doc.settings.phase],
    paper: A3_QUER,
    projectName: doc.settings.projectName,
    planTitle: 'Grundriss',
  });
  const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-Grundriss.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Modell als IFC4 (eigener SPF-Writer; via ifcopenshell verifiziert). */
export function exportIfcFile(): void {
  const { doc } = useProject.getState();
  const ifc = exportIfc(doc);
  const url = URL.createObjectURL(new Blob([ifc], { type: 'application/x-step' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}.ifc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
