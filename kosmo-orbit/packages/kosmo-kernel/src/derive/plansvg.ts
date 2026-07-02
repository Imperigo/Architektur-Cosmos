import type { KosmoDoc } from '../model/doc';
import type { Storey } from '../model/entities';
import { derivePlan, regionToPath } from './plan';
import { deriveDimensions, dimensionLabel } from './dimensions';

/**
 * Plansatz-SVG — eigenständiges, druckfähiges SVG eines Grundrisses mit
 * SIA-Stiften und Plankopf. Masstabstreu: 1 SVG-Einheit = 1 mm Papier.
 * (KosmoPublish-Grundstein; Blattlayouts folgen.)
 */

export interface PlanSheetOptions {
  /** Massstab, z.B. 100 für 1:100. */
  scale: number;
  /** Papierformat in mm. */
  paper: { width: number; height: number };
  projectName: string;
  planTitle: string;
  date?: string;
}

export const A4_QUER = { width: 297, height: 210 };
export const A3_QUER = { width: 420, height: 297 };

export function planToSvg(doc: KosmoDoc, storeyId: string, opts: PlanSheetOptions): string {
  const storey = doc.get<Storey>(storeyId);
  const plan = derivePlan(doc, storeyId);
  const { scale, paper } = opts;
  const f = 1 / scale; // mm Welt → mm Papier

  const parts: string[] = [];
  const b = plan.bounds;
  // Zeichnung zentriert aufs Blatt (Plankopf-Streifen unten 18 mm)
  const contentH = paper.height - 22;
  let tx = paper.width / 2;
  let ty = contentH / 2;
  if (b) {
    tx -= ((b.minX + b.maxX) / 2) * f;
    ty += ((b.minY + b.maxY) / 2) * f;
  }

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}mm" height="${paper.height}mm" viewBox="0 0 ${paper.width} ${paper.height}" font-family="Helvetica, Arial, sans-serif">`,
    `<defs>
      <pattern id="pbeton" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
        <rect width="3" height="3" fill="white"/><line x1="0" y1="0" x2="0" y2="3" stroke="black" stroke-width="0.5"/>
      </pattern>
      <pattern id="pdaemmung" patternUnits="userSpaceOnUse" width="4.4" height="4.4" patternTransform="rotate(-45)">
        <rect width="4.4" height="4.4" fill="white"/><line x1="0" y1="1.1" x2="4.4" y2="1.1" stroke="#777" stroke-width="0.3"/><line x1="0" y1="3.3" x2="4.4" y2="3.3" stroke="#777" stroke-width="0.3"/>
      </pattern>
    </defs>`,
    `<rect width="${paper.width}" height="${paper.height}" fill="white"/>`,
    `<g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${f})">`,
  );

  for (const r of plan.regions) {
    const isCore = r.classes.includes('tragend');
    const isDaemmung = r.classes.includes('daemmung');
    const isProjection = r.classes.includes('projection');
    const fill = isCore ? 'url(#pbeton)' : isDaemmung ? 'url(#pdaemmung)' : isProjection ? 'none' : 'white';
    // Stiftstärken in Papier-mm → Welt-mm skaliert (0.5 / 0.35 / 0.18)
    const sw = (isProjection ? 0.18 : isCore ? 0.5 : 0.35) * scale;
    const dash = r.classes.includes('volumen') ? ` stroke-dasharray="${2 * scale} ${scale}"` : '';
    parts.push(
      `<path d="${regionToPath(r)}" fill-rule="evenodd" fill="${fill}" stroke="black" stroke-width="${sw}"${dash}/>`,
    );
  }
  for (const l of plan.lines) {
    const sw = (l.classes.includes('fenster') ? 0.18 : 0.25) * scale;
    parts.push(
      `<line x1="${l.a.x}" y1="${-l.a.y}" x2="${l.b.x}" y2="${-l.b.y}" stroke="black" stroke-width="${sw}"/>`,
    );
  }
  for (const a of plan.arcs) {
    const sx = a.center.x + a.radius * Math.cos(a.startAngle);
    const sy = a.center.y + a.radius * Math.sin(a.startAngle);
    const ex = a.center.x + a.radius * Math.cos(a.endAngle);
    const ey = a.center.y + a.radius * Math.sin(a.endAngle);
    parts.push(
      `<path d="M ${sx} ${-sy} A ${a.radius} ${a.radius} 0 0 0 ${ex} ${-ey}" fill="none" stroke="#555" stroke-width="${0.18 * scale}" stroke-dasharray="${scale} ${0.7 * scale}"/>`,
    );
  }
  // Aussenbemassung (zwei Ketten pro Seite)
  const dims = deriveDimensions(doc, storeyId);
  for (const c of dims.chains) {
    const sw = 0.18 * scale;
    const tickHalf = 0.8 * scale;
    const fs = 2.6 * scale;
    const t0 = c.ticks[0]!;
    const t1 = c.ticks[c.ticks.length - 1]!;
    parts.push('<g stroke="black" fill="black">');
    if (c.axis === 'x') {
      parts.push(`<line x1="${t0}" y1="${-c.offset}" x2="${t1}" y2="${-c.offset}" stroke-width="${sw}"/>`);
      for (const t of c.ticks) {
        parts.push(`<line x1="${t - tickHalf}" y1="${-c.offset + tickHalf}" x2="${t + tickHalf}" y2="${-c.offset - tickHalf}" stroke-width="${sw * 1.6}"/>`);
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        parts.push(`<text x="${mid}" y="${-c.offset - 1.2 * scale}" text-anchor="middle" font-size="${fs}" stroke="none">${dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!)}</text>`);
      }
    } else {
      parts.push(`<line x1="${c.offset}" y1="${-t0}" x2="${c.offset}" y2="${-t1}" stroke-width="${sw}"/>`);
      for (const t of c.ticks) {
        parts.push(`<line x1="${c.offset - tickHalf}" y1="${-t - tickHalf}" x2="${c.offset + tickHalf}" y2="${-t + tickHalf}" stroke-width="${sw * 1.6}"/>`);
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        parts.push(`<text x="${c.offset - 1.2 * scale}" y="${-mid}" text-anchor="middle" font-size="${fs}" stroke="none" transform="rotate(-90 ${c.offset - 1.2 * scale} ${-mid})">${dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!)}</text>`);
      }
    }
    parts.push('</g>');
  }
  parts.push('</g>');

  // Plankopf (SIA-angelehnt, schlicht)
  const y0 = paper.height - 18;
  parts.push(
    `<g font-size="3.2">`,
    `<line x1="10" y1="${y0}" x2="${paper.width - 10}" y2="${y0}" stroke="black" stroke-width="0.35"/>`,
    `<text x="10" y="${y0 + 6}" font-weight="bold" font-size="4.2">${escapeXml(opts.projectName)}</text>`,
    `<text x="10" y="${y0 + 11.5}">${escapeXml(opts.planTitle)} · ${escapeXml(storey?.name ?? '')}</text>`,
    `<text x="${paper.width - 10}" y="${y0 + 6}" text-anchor="end">1:${scale}</text>`,
    `<text x="${paper.width - 10}" y="${y0 + 11.5}" text-anchor="end">${escapeXml(opts.date ?? new Date().toLocaleDateString('de-CH'))} · KosmoOrbit V1</text>`,
    `</g>`,
    '</svg>',
  );
  return parts.join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
