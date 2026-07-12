#!/usr/bin/env node
/**
 * D4-pdffonts-Stichprobe (v0.7.3 «Zwei Stimmen») — erzeugt EIN Blatt-PDF via
 * jsPDF (läuft auch in Node, kein Browser nötig), das exakt dieselbe
 * addFileToVFS/addFont-Einbettung nutzt wie `apps/kosmo-orbit/src/modules/
 * design/export-plan.ts` / `modules/publish/export-sheets.ts` — dieselben
 * drei TTF-Dateien aus `apps/kosmo-orbit/public/fonts/pdf/`, dieselben
 * Font-Namen ('Lato' / 'IBM Plex Mono'), dieselbe VFS-Datei-Namensgebung.
 *
 * Aufruf:
 *   node docs/rundgang/d4-pdffonts-stichprobe.mjs
 *
 * Erwartung: `pdffonts <pdf>` zeigt BEIDE Familien als "embedded" (subset).
 */
import { jsPDF } from 'jspdf';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(HIER, '..', '..', 'apps', 'kosmo-orbit', 'public', 'fonts', 'pdf');
const OUT_PDF = join(HIER, 'd4-pdffonts-stichprobe.pdf');

const PDF_FONTS = [
  { datei: 'lato-900-latin-pdf.ttf', vfs: 'Lato-900.ttf', familie: 'Lato', stil: 'bold' },
  { datei: 'lato-400-latin-pdf.ttf', vfs: 'Lato-400.ttf', familie: 'Lato', stil: 'normal' }, // v0.7.5 A3
  { datei: 'ibm-plex-mono-400-latin-pdf.ttf', vfs: 'IBMPlexMono-400.ttf', familie: 'IBM Plex Mono', stil: 'normal' },
  { datei: 'ibm-plex-mono-600-latin-pdf.ttf', vfs: 'IBMPlexMono-600.ttf', familie: 'IBM Plex Mono', stil: 'bold' },
];

const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

for (const f of PDF_FONTS) {
  const buf = readFileSync(join(FONTS_DIR, f.datei));
  const b64 = buf.toString('base64');
  pdf.addFileToVFS(f.vfs, b64);
  pdf.addFont(f.vfs, f.familie, f.stil);
  console.log(`registriert: ${f.familie} (${f.stil}) ← ${f.datei} (${buf.length} Bytes)`);
}

// Titel-Stimme (Lato 900/bold, versal — wie sheet.ts/titelAttr)
pdf.setFont('Lato', 'bold');
pdf.setFontSize(16);
pdf.text('BAUEINGABE SÜD', 15, 20);

// Messbar-Stimme (IBM Plex Mono, normal + bold — wie messbarAttr)
pdf.setFont('IBM Plex Mono', 'normal');
pdf.setFontSize(11);
pdf.text('1:100 · MASSE IN CM/M · 361⁵ · 402² · 128³', 15, 32);
pdf.setFont('IBM Plex Mono', 'bold');
pdf.text('TOTAL GF: 144 M²', 15, 40);

// `pdf.save()` nutzt Browser-spezifisches FileSaver-Verhalten (Download) —
// in Node schreiben wir den rohen Puffer selbst.
const buf = Buffer.from(pdf.output('arraybuffer'));
writeFileSync(OUT_PDF, buf);
console.log(`\nPDF geschrieben: ${OUT_PDF} (${buf.length} Bytes)`);
