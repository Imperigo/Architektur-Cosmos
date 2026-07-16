import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import {
  imagePaperBounds,
  setBlaetter,
  setDateiname,
  sheetPaperSize,
  sheetPlancode,
  sheetToSvg,
  type ImageAsset,
  type KosmoDoc,
  type PublikationsSet,
  type Sheet,
} from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { baueHerkunft, ermittleEditionId, herkunftKennzeichnung, svgMitHerkunft } from '../../state/herkunft';

/**
 * Dateiname (ohne Endung) des Set-/Plansatz-PDFs — EINE Quelle für die
 * tatsächliche `pdf.save()`-Benennung UND die Vorschau, die der Nutzer VOR
 * dem Export im Set-Panel sieht (v0.8.0 P8, «der Nutzer sieht den
 * Dateinamen vor dem Export»). Bewusst OHNE Plancode: ein Set-PDF bündelt
 * i.d.R. mehrere Blätter mit potenziell unterschiedlichen Plancodes (jedes
 * Blatt trägt seine eigene `planNummer`/`disziplin`/`geschossCode`) — EINEN
 * davon als Dateinamen des ganzen Bündels auszuzeichnen wäre irreführend,
 * kein «Plancode fürs Set». Der Projektname bleibt darum die tragende
 * Namensquelle, wie bisher (byte-gleicher Name ohne jede Änderung). */
export function pdfSetDateiname(doc: KosmoDoc, set?: PublikationsSet): string {
  const stamm = doc.settings.projectName.replace(/\s+/g, '-');
  return `${stamm}-${set ? set.name.replace(/\s+/g, '-') : 'Plansatz'}`;
}

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

/**
 * Rendert EIN Blatt in ein bereits vorbereitetes jsPDF-Dokument (als
 * aktuelle Seite — der Aufrufer entscheidet, ob das die erste Seite ist oder
 * per `pdf.addPage()` eine neue) — gemeinsamer Kern für Bündel-
 * (`exportSheetSetPdf`) UND Einzelblatt-PDF (`exportSheetPdf`, v0.8.1 P7,
 * C-25), damit es nur EINEN svg2pdf-/Rasterbild-Einbettungspfad gibt statt
 * einer zweiten, driftgefährdeten Kopie.
 */
async function renderSheetInPdf(doc: KosmoDoc, sheet: Sheet, pdf: jsPDF): Promise<void> {
  const paper = sheetPaperSize(sheet);
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
    await renderSheetInPdf(doc, sheet, pdf);
  }
  // Herkunftskennung als PDF-Metadaten (Serie I / B5) — dezent, im
  // `keywords`-Feld grep-bar; der Plansatz-Inhalt selbst (svg2pdf-Vektoren
  // oben) bleibt unberührt.
  pdf!.setProperties({ keywords: herkunftKennzeichnung(herkunft) });
  pdf!.save(`${pdfSetDateiname(doc, set)}.pdf`);
}

/**
 * Dateiname (ohne Endung) des Einzelblatt-PDFs (v0.8.1 P7, `docs/V081-
 * SPEZ.md` §6.1/§7(e), C-25 «Einzelblatt-PDF mit Plancode-Namen») — dieselbe
 * `setDateiname()`-Regel wie `exportSetSvgs()`/die «Export-Dateiname
 * (Vorschau)» im `PlankopfPanel` (`export-dateiname`-Testid): GENAU EIN
 * Blatt, darum ist dessen EIGENER Plancode nie irreführend (anders als beim
 * Bündel, `pdfSetDateiname()` oben, das bewusst UNVERÄNDERT bleibt — ROADMAP
 * 378-Entscheid, mehrere Blätter mit potenziell unterschiedlichen Plancodes
 * teilen sich EINEN Bündel-Namen). Ohne volle Stammdaten (Daten-Guard in
 * `setDateiname`/`sheetPlancode` selbst) bleibt der Name die bewährte
 * `NAMENSREGEL_DEFAULT`-Form, byte-gleich zur bisherigen Vorschau.
 */
export function pdfBlattDateiname(doc: KosmoDoc, sheet: Sheet): string {
  const plancode = sheetPlancode(doc, sheet);
  return setDateiname(undefined, {
    nr: 1,
    blatt: sheet.name,
    projekt: doc.settings.projectName,
    massstab: sheet.placements[0]?.scale ?? null,
    format: `${sheet.format}-${sheet.orientation}`,
    ...(plancode !== undefined ? { plancode } : {}),
  });
}

/**
 * Einzelblatt als EIN-Seiten-Vektor-PDF, benannt nach seinem Plancode
 * (v0.8.1 P7, C-25) — die bisher fehlende «kleine Schwester» von
 * `exportSheetSetPdf()`: die trägt IMMER den Projekt-/Set-Namen (Bündel,
 * bleibt unverändert), dieser Export hier ist für den Fall gedacht, in dem
 * genau EIN Blatt versendet/abgelegt wird und der Dateiname selbst schon den
 * Plancode zeigen soll (Ablage/Transmittal-Konvention). Teilt sich mit dem
 * Bündel-Export denselben Font-/svg2pdf-/Rasterbild-Kern
 * (`renderSheetInPdf`) — kein zweiter Rendering-Pfad.
 */
export async function exportSheetPdf(sheetId: string): Promise<void> {
  const { doc } = useProject.getState();
  const sheet = doc.get<Sheet>(sheetId);
  if (!sheet || sheet.kind !== 'sheet') return;

  const herkunft = baueHerkunft({
    json: doc.toJSON(),
    editionId: ermittleEditionId(),
    exportedAt: new Date().toISOString(),
  });

  const paper = sheetPaperSize(sheet);
  const orientation = paper.width >= paper.height ? 'landscape' : 'portrait';
  const format: [number, number] = [paper.width, paper.height];
  const pdf = new jsPDF({ orientation, unit: 'mm', format });
  await betteD4PdfFontsEin(pdf);
  await renderSheetInPdf(doc, sheet, pdf);

  pdf.setProperties({ keywords: herkunftKennzeichnung(herkunft) });
  pdf.save(`${pdfBlattDateiname(doc, sheet)}.pdf`);
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
    // v0.8.0 P8 (Befund): `sheetPlancode()` existierte seit P5 in
    // `derive/publikation.ts`, war aber NIE bis hierher verdrahtet — `ctx.plancode`
    // fehlte, `setDateiname` griff darum immer auf `NAMENSREGEL_DEFAULT` zurück,
    // selbst wenn volle Stammdaten vorlagen. Diese Zeile schliesst die Lücke; ohne
    // Stammdaten bleibt `sheetPlancode()` `undefined` und der Name byte-gleich wie
    // zuvor (Daten-Guard in `setDateiname` selbst, s. dortigen Kommentar).
    const plancode = sheetPlancode(doc, sheet);
    const name = setDateiname(set.namensregel, {
      nr: i + 1,
      blatt: sheet.name,
      projekt: doc.settings.projectName,
      massstab: sheet.placements[0]?.scale ?? null,
      format: `${sheet.format}-${sheet.orientation}`,
      ...(plancode !== undefined ? { plancode } : {}),
    });
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
