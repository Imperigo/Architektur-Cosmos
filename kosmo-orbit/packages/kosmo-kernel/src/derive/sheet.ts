import type { KosmoDoc } from '../model/doc';
import type { Sheet, SheetFormat, SheetPlacement } from '../model/entities';
import { axoInnerSvg, escapeXml, planInnerSvg, sectionInnerSvg, type InnerSvg } from './plansvg';

/**
 * Blatt-Komposition (KosmoPublish) — ein Sheet-Entity wird zum druckfähigen
 * SVG: Rahmen, platzierte Ansichten massstabstreu (1 SVG-Einheit = 1 mm
 * Papier), Titel je Ansicht, Plankopf. PDF/Plansatz entsteht daraus via
 * svg2pdf, DXF direkt aus der Plan-Derivation.
 */

const ISO_LANG: Record<SheetFormat, { width: number; height: number }> = {
  A0: { width: 1189, height: 841 },
  A1: { width: 841, height: 594 },
  A2: { width: 594, height: 420 },
  A3: { width: 420, height: 297 },
  A4: { width: 297, height: 210 },
};

export function sheetPaperSize(sheet: Pick<Sheet, 'format' | 'orientation'>): {
  width: number;
  height: number;
} {
  const s = ISO_LANG[sheet.format];
  return sheet.orientation === 'quer' ? { ...s } : { width: s.height, height: s.width };
}

function placementInner(doc: KosmoDoc, pl: SheetPlacement): InnerSvg {
  if (pl.view === 'grundriss' && pl.storeyId) {
    return planInnerSvg(doc, pl.storeyId, pl.scale);
  }
  if (pl.view === 'axo') {
    return axoInnerSvg(doc, {}, pl.scale);
  }
  if (pl.view === 'schnitt' && pl.section) {
    return sectionInnerSvg(doc, pl.section, pl.scale);
  }
  return { inner: '', bounds: null };
}

/** Papier-Bounds einer Platzierung (für Auswahl/Drag im Blatteditor). */
export function placementPaperBounds(
  doc: KosmoDoc,
  pl: SheetPlacement,
): { x: number; y: number; width: number; height: number } {
  const { bounds } = placementInner(doc, pl);
  if (!bounds) return { x: pl.x - 20, y: pl.y - 20, width: 40, height: 40 };
  const f = 1 / pl.scale;
  const w = (bounds.maxX - bounds.minX) * f;
  const h = (bounds.maxY - bounds.minY) * f;
  return { x: pl.x - w / 2, y: pl.y - h / 2, width: w, height: h };
}

export interface SheetSvgOptions {
  projectName: string;
  date?: string;
  /** Papier-Hintergrund zeichnen (Editor: true; PDF-Seite füllt selbst). */
  paperFill?: string;
}

export function sheetToSvg(doc: KosmoDoc, sheetId: string, opts: SheetSvgOptions): string {
  const sheet = doc.get<Sheet>(sheetId);
  if (!sheet || sheet.kind !== 'sheet') return '<svg xmlns="http://www.w3.org/2000/svg"/>';
  const paper = sheetPaperSize(sheet);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}mm" height="${paper.height}mm" viewBox="0 0 ${paper.width} ${paper.height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${paper.width}" height="${paper.height}" fill="${opts.paperFill ?? 'white'}"/>`,
    // Blattrahmen (10 mm Rand, SIA-üblich)
    `<rect x="10" y="10" width="${paper.width - 20}" height="${paper.height - 20}" fill="none" stroke="black" stroke-width="0.35"/>`,
  );

  const scales = new Set<number>();
  for (const pl of sheet.placements) {
    const { inner, bounds } = placementInner(doc, pl);
    if (!bounds) continue;
    scales.add(pl.scale);
    const f = 1 / pl.scale;
    const tx = pl.x - ((bounds.minX + bounds.maxX) / 2) * f;
    const ty = pl.y - ((bounds.minY + bounds.maxY) / 2) * f;
    parts.push(
      `<g transform="translate(${tx.toFixed(3)}, ${ty.toFixed(3)}) scale(${f})">`,
      inner,
      '</g>',
    );
    if (pl.title) {
      const labelY = pl.y + ((bounds.maxY - bounds.minY) / 2) * f + 6;
      parts.push(
        `<text x="${pl.x}" y="${labelY.toFixed(2)}" text-anchor="middle" font-size="3.6" font-weight="bold">${escapeXml(pl.title)}  <tspan font-weight="normal" fill="#444">1:${pl.scale}</tspan></text>`,
      );
    }
  }

  // Freie Textblöcke (Plakat-Titel, Konzepttexte)
  for (const t of sheet.texte ?? []) {
    const zeilen = t.text.split('\n');
    const stil = t.titel
      ? `font-weight="bold" letter-spacing="${(t.size * 0.02).toFixed(2)}" font-family="'Archivo Narrow', 'Arial Narrow', Helvetica, sans-serif"`
      : '';
    parts.push(
      `<text x="${t.x}" y="${t.y}" font-size="${t.size}" ${stil}>` +
        zeilen
          .map((z, i) => `<tspan x="${t.x}" dy="${i === 0 ? 0 : (t.size * 1.35).toFixed(2)}">${escapeXml(z)}</tspan>`)
          .join('') +
        `</text>`,
    );
  }

  // Plankopf unten rechts (SIA-angelehnt)
  const kw = 120;
  const kh = 26;
  const kx = paper.width - 10 - kw;
  const ky = paper.height - 10 - kh;
  const scaleText = [...scales].sort((a, b) => a - b).map((s) => `1:${s}`).join(' · ') || '—';
  parts.push(
    `<g font-size="3">`,
    `<rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" fill="white" stroke="black" stroke-width="0.35"/>`,
    `<line x1="${kx}" y1="${ky + 9}" x2="${kx + kw}" y2="${ky + 9}" stroke="black" stroke-width="0.18"/>`,
    `<text x="${kx + 3}" y="${ky + 6}" font-weight="bold" font-size="4">${escapeXml(opts.projectName)}</text>`,
    `<text x="${kx + 3}" y="${ky + 15}">${escapeXml(sheet.name)}</text>`,
    `<text x="${kx + 3}" y="${ky + 22}" fill="#444">${escapeXml(opts.date ?? new Date().toLocaleDateString('de-CH'))} · KosmoOrbit V1</text>`,
    `<text x="${kx + kw - 3}" y="${ky + 15}" text-anchor="end">${scaleText}</text>`,
    `<text x="${kx + kw - 3}" y="${ky + 22}" text-anchor="end" fill="#444">Blatt ${sheet.index + 1} · ${sheet.format}</text>`,
    `</g>`,
    '</svg>',
  );
  return parts.join('\n');
}
