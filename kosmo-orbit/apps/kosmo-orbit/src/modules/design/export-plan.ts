import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { A3_QUER, planToSvg } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/** Grundriss des aktiven Geschosses als Vektor-PDF (A3 quer, 1:100). */
export async function exportPlanPdf(): Promise<void> {
  const { doc, activeStoreyId } = useProject.getState();
  if (!activeStoreyId) return;
  const svgMarkup = planToSvg(doc, activeStoreyId, {
    scale: 100,
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
    scale: 100,
    paper: A3_QUER,
    projectName: doc.settings.projectName,
    planTitle: 'Grundriss',
  });
  const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-Grundriss.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
