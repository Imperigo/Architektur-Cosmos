import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { sheetPaperSize, sheetToSvg, type Sheet } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/** Ganzer Plansatz als mehrseitiges Vektor-PDF — jede Seite im Blattformat. */
export async function exportSheetSetPdf(): Promise<void> {
  const { doc } = useProject.getState();
  const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  if (sheets.length === 0) return;

  let pdf: jsPDF | null = null;
  for (const sheet of sheets) {
    const paper = sheetPaperSize(sheet);
    const orientation = paper.width >= paper.height ? 'landscape' : 'portrait';
    const format: [number, number] = [paper.width, paper.height];
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format });
    } else {
      pdf.addPage(format, orientation);
    }
    const markup = sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName });
    const holder = document.createElement('div');
    holder.innerHTML = markup;
    const svgEl = holder.querySelector('svg')!;
    document.body.appendChild(svgEl);
    try {
      await svg2pdf(svgEl, pdf, { x: 0, y: 0, width: paper.width, height: paper.height });
    } finally {
      svgEl.remove();
    }
  }
  pdf!.save(`${doc.settings.projectName.replace(/\s+/g, '-')}-Plansatz.pdf`);
}
