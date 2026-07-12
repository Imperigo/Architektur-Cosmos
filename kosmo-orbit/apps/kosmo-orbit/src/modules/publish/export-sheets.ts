import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import {
  imagePaperBounds,
  setBlaetter,
  setDateiname,
  sheetPaperSize,
  sheetToSvg,
  type ImageAsset,
  type PublikationsSet,
  type Sheet,
} from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { baueHerkunft, ermittleEditionId, herkunftKennzeichnung, svgMitHerkunft } from '../../state/herkunft';

/**
 * PDF-Font-Einbettung (v0.7.3 D4 «Zwei Stimmen») — dieselbe Logik wie
 * `modules/design/export-plan.ts`s `betteD4PdfFontsEin` (bewusst dupliziert
 * statt in einer neuen Modul-Datei geteilt, um innerhalb der D4-Besitz-Liste
 * — nur `export-plan.ts`/`export-sheets.ts` — zu bleiben). jsPDF kann kein
 * woff2 — latin-subsettete TTF unter `public/fonts/pdf/`, per
 * `addFileToVFS`/`addFont` unter `'Lato'`/`'IBM Plex Mono'` registriert (den
 * Namen, die `derive/stilblatt.ts`s `SCHRIFT_TITEL`/`SCHRIFT_MESSBAR` in den
 * Kernel-Goldens ausgeben) — svg2pdf löst die `font-family`-Kette dagegen
 * auf. Fehlt ein Font (Netzwerk/404), bleibt er unregistriert: jsPDF/svg2pdf
 * fallen auf die eingebaute Helvetica zurück, `console.warn` statt Absturz.
 */
const PDF_FONTS = [
  { url: '/fonts/pdf/lato-900-latin-pdf.ttf', datei: 'Lato-900.ttf', familie: 'Lato', stil: 'bold' },
  // v0.7.5 A3: Lato 400 (normal) — s. export-plan.ts (dieselbe Ergänzung,
  // Logik bewusst dupliziert). Registriert ('Lato','normal') für den PDF-Pfad.
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

/** Betten die D4-Fonts ins jsPDF-Dokument ein — VOR `svg2pdf` je Blatt/Seite. */
async function betteD4PdfFontsEin(pdf: jsPDF): Promise<void> {
  for (const f of PDF_FONTS) {
    const b64 = await ladePdfFontBase64(f.url);
    if (!b64) continue;
    pdf.addFileToVFS(f.datei, b64);
    pdf.addFont(f.datei, f.familie, f.stil);
  }
}

/** Ganzer Plansatz (oder ein Publikations-Set, A4) als mehrseitiges Vektor-PDF. */
export async function exportSheetSetPdf(set?: PublikationsSet): Promise<void> {
  const { doc } = useProject.getState();
  const sheets = set
    ? setBlaetter(doc, set)
    : doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  if (sheets.length === 0) return;

  // Herkunftskennung (Serie I / B5): NUR PDF-Metadaten dieser Export-Schicht,
  // NIE im `sheetToSvg`/`plansvg.ts`-Golden-Pfad selbst — Nachweis bei einem
  // fahrlässig geleakten PDF, keine Kopierverhinderung (siehe state/herkunft.ts).
  const herkunft = baueHerkunft({
    json: doc.toJSON(),
    editionId: ermittleEditionId(),
    exportedAt: new Date().toISOString(),
  });

  let pdf: jsPDF | null = null;
  for (const sheet of sheets) {
    const paper = sheetPaperSize(sheet);
    const orientation = paper.width >= paper.height ? 'landscape' : 'portrait';
    const format: [number, number] = [paper.width, paper.height];
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format });
      await betteD4PdfFontsEin(pdf); // einmal je Dokument, nicht je Seite
    } else {
      pdf.addPage(format, orientation);
    }
    // Vektoren via svg2pdf; Rasterbilder setzt addImage danach mm-genau
    // (svg2pdf rendert <image> nicht zuverlässig — deshalb ohneRaster).
    const markup = sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName, ohneRaster: true });
    const holder = document.createElement('div');
    holder.innerHTML = markup;
    const svgEl = holder.querySelector('svg')!;
    document.body.appendChild(svgEl);
    try {
      await svg2pdf(svgEl, pdf, { x: 0, y: 0, width: paper.width, height: paper.height });
    } finally {
      svgEl.remove();
    }
    for (const b of sheet.bilder ?? []) {
      const asset = b.assetId ? doc.get<ImageAsset>(b.assetId) : undefined;
      if (!asset) continue;
      const typ = asset.mime === 'image/jpeg' ? 'JPEG' : asset.mime === 'image/webp' ? 'WEBP' : 'PNG';
      const r = imagePaperBounds(doc, b);
      pdf.addImage(`data:${asset.mime};base64,${asset.data}`, typ, r.x, r.y, r.width, r.height);
    }
  }
  // Herkunftskennung als PDF-Metadaten (Serie I / B5) — dezent, im
  // `keywords`-Feld grep-bar; der Plansatz-Inhalt selbst (svg2pdf-Vektoren
  // oben) bleibt unberührt.
  pdf!.setProperties({ keywords: herkunftKennzeichnung(herkunft) });
  const stamm = doc.settings.projectName.replace(/\s+/g, '-');
  pdf!.save(`${stamm}-${set ? set.name.replace(/\s+/g, '-') : 'Plansatz'}.pdf`);
}

/** Publikations-Set als Einzel-SVGs — jede Datei nach der Namensregel
 * benannt («P-01_Grundriss_EG_1-50.svg», RE-ARCHICAD A4). */
export function exportSetSvgs(set: PublikationsSet): void {
  const { doc } = useProject.getState();
  const sheets = setBlaetter(doc, set);
  // Herkunftskennung (Serie I / B5): EIN Hash über den ganzen Export-Lauf
  // (nicht je Blatt neu gebaut) — alle SVGs desselben Exports tragen denselben
  // Doc-Stand/Zeitstempel. Sitzt als `<metadata>` NACH `sheetToSvg` im fertigen
  // Markup, rührt nie an `sheetToSvg`/`plansvg.ts` selbst (Golden-Schutz).
  const herkunft = baueHerkunft({
    json: doc.toJSON(),
    editionId: ermittleEditionId(),
    exportedAt: new Date().toISOString(),
  });
  sheets.forEach((sheet, i) => {
    const markup = svgMitHerkunft(sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName }), herkunft);
    const name = setDateiname(set.namensregel, {
      nr: i + 1,
      blatt: sheet.name,
      projekt: doc.settings.projectName,
      massstab: sheet.placements[0]?.scale ?? null,
      format: `${sheet.format}-${sheet.orientation}`,
    });
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
