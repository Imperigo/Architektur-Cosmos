import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { A3_QUER, exportIfc, planToDxf, planToSvg, type BauPhase } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/**
 * PDF-Font-Einbettung (v0.7.3 D4 «Zwei Stimmen»): jsPDF kann kein woff2 —
 * latin-subsettete TTF unter `public/fonts/pdf/` (s. deren README für
 * Herkunft/Lizenz/den 700-vs-900-Entscheid), per `addFileToVFS`/`addFont`
 * unter denselben Namen registriert, die die Kernel-Goldens als
 * `font-family` ausgeben (`'Lato'` / `'IBM Plex Mono'`, s. `derive/
 * stilblatt.ts`s `SCHRIFT_TITEL`/`SCHRIFT_MESSBAR`) — svg2pdf löst die
 * `font-family`-Kette im SVG gegen jsPDFs Font-Registry auf. Schlägt das
 * Laden fehl (Netzwerk, 404), bleibt der Font schlicht unregistriert:
 * jsPDF/svg2pdf fallen dann auf die eingebaute Helvetica zurück — kein
 * Absturz, nur `console.warn` (Ehrlichkeit vor Politur: kein PDF ohne Text,
 * lieber Helvetica statt Fehlschlag).
 */
const PDF_FONTS = [
  { url: '/fonts/pdf/lato-900-latin-pdf.ttf', datei: 'Lato-900.ttf', familie: 'Lato', stil: 'bold' },
  // v0.7.5 A3: Lato 400 (normal) — schliesst die 0.7.4-Lücke, dass die
  // Plankopf-Regular-Nebenzeile (Untertitel + Nordpfeil-«N», `plansvg.ts`,
  // SCHRIFT_TITEL ohne font-weight) im PDF auf Helvetica fiel. Jetzt löst
  // svg2pdf ('Lato','normal') gegen diesen Schnitt auf.
  { url: '/fonts/pdf/lato-400-latin-pdf.ttf', datei: 'Lato-400.ttf', familie: 'Lato', stil: 'normal' },
  { url: '/fonts/pdf/ibm-plex-mono-400-latin-pdf.ttf', datei: 'IBMPlexMono-400.ttf', familie: 'IBM Plex Mono', stil: 'normal' },
  { url: '/fonts/pdf/ibm-plex-mono-600-latin-pdf.ttf', datei: 'IBMPlexMono-600.ttf', familie: 'IBM Plex Mono', stil: 'bold' },
] as const;

/** ArrayBuffer → base64 ohne `Buffer` (läuft im Browser); `null` bei Fehler. */
async function ladePdfFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binaer = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binaer += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binaer);
  } catch (e) {
    console.warn(`D4-PDF-Font konnte nicht geladen werden (${url}) — Fallback Helvetica.`, e);
    return null;
  }
}

/** Betten die D4-Fonts (Titel Lato 900, Messbar IBM Plex Mono 400/600) ins
 * jsPDF-Dokument ein — VOR `svg2pdf`, damit die Font-Registry beim Rendern
 * schon steht. Bewusst best-effort: einzelne fehlende Fonts blockieren den
 * Export nicht (Fallback Helvetica je Font, nicht ganzes PDF). */
export async function betteD4PdfFontsEin(pdf: jsPDF): Promise<void> {
  for (const f of PDF_FONTS) {
    const b64 = await ladePdfFontBase64(f.url);
    if (!b64) continue;
    pdf.addFileToVFS(f.datei, b64);
    pdf.addFont(f.datei, f.familie, f.stil);
  }
}

/** SIA-Massstabsempfehlung je Phase (B5, PLAN-DETAILLIERUNG Fig. 4) —
 * Vorschlag, kein Zwang: der Blatt-Editor (KosmoPublish) wählt frei. */
export const PHASEN_MASSSTAB: Record<BauPhase, number> = {
  wettbewerb: 200,
  vorprojekt: 200,
  bauprojekt: 100,
  baueingabe: 100,
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
    await betteD4PdfFontsEin(pdf);
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

/**
 * Grundriss des aktiven Geschosses als DXF (R2000/AC1015, mm) — die 2D-Brücke
 * zu AutoCAD/Rhino/Vectorworks. Dieselbe Geometrie wie der SVG/PDF-Plan,
 * Linien/Polylinien/Text auf semantischen Layern (V1.6 Block G).
 */
export function exportPlanDxf(): void {
  const { doc, activeStoreyId } = useProject.getState();
  if (!activeStoreyId) return;
  const dxf = planToDxf(doc, activeStoreyId);
  const url = URL.createObjectURL(new Blob([dxf], { type: 'application/dxf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-Grundriss.dxf`;
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
