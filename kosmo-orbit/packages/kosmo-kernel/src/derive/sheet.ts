import { phaseLabel, type KosmoDoc } from '../model/doc';
import type { ImageAsset, Sheet, SheetFormat, SheetImage, SheetPlacement } from '../model/entities';
import { axoInnerSvg, escapeXml, planInnerSvg, sectionInnerSvg, type InnerSvg } from './plansvg';
import { docFuerUmbau, UMBAU_LABEL } from './umbau';
import { schwarzplanGeometrie } from './schwarzplan';
import type { Pt } from '../model/units';

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
  // Umbau-Filter je Platzierung (A2): gefilterte Sicht, dieselbe Ableitung
  const sicht = docFuerUmbau(doc, pl.umbau);
  if (pl.view === 'grundriss' && pl.storeyId) {
    // Themenplan (A5): Regeln aus settings.themen tönen die Platzierung
    const thema = pl.thema ? (doc.settings.themen ?? []).find((t) => t.name === pl.thema) : undefined;
    return planInnerSvg(sicht, pl.storeyId, pl.scale, thema ? { thema } : undefined);
  }
  if (pl.view === 'axo') {
    return axoInnerSvg(sicht, {}, pl.scale);
  }
  if (pl.view === 'schnitt' && pl.section) {
    return sectionInnerSvg(sicht, pl.section, pl.scale);
  }
  if (pl.view === 'situationsplan') {
    return situationsplanInnerSvg(sicht, pl.scale);
  }
  return { inner: '', bounds: null };
}

/**
 * Situationsplan-Inhalt in Welt-mm — additive Vorbereitung des neuen
 * Blatt-Typs «Situationsplan» (v0.7.0 E4, `docs/V070-KONZEPT.md`): dieselbe
 * `{inner, bounds}`-Form wie `planInnerSvg`/`axoInnerSvg`/`sectionInnerSvg`
 * oben — Parzellengrenze strichpunktiert + Gebäude-Footprints schwarz
 * gefüllt, Geometrie/Guard aus `schwarzplanGeometrie()` (`derive/
 * schwarzplan.ts`, «gemeinsame Quelle» statt doppelter Entitäts-Erkennung).
 *
 * Verdrahtet (Stream 3A, K10): `SheetPlacement.view` (`model/entities.ts`)
 * führt additiv `'situationsplan'`, `placementInner()` oben ruft
 * `situationsplanInnerSvg` darüber, `publish.ansichtPlatzieren` UND die
 * Auto-Befüllung (`blattfuellung.ts`) kennen den neuen Wert. Absichtlich OHNE
 * Nordpfeil/Massstabsbalken-Chrome (die trägt das eigenständige
 * `schwarzplanSvg`-Blatt bereits vollständig) — die Sheet-Platzierung bleibt
 * bewusst schlank, analog zu Grundriss/Schnitt/Axo ohne eigenen Rahmen.
 * `scale` (Massstab-Nenner, wie bei den Geschwistern oben)
 * skaliert die Stiftstärke papierkonstant vor — dieselbe Regel wie
 * `plansvg.ts`s Kommentar «Stiftstärken in Papier-mm → Welt-mm skaliert»,
 * weil `sheetToSvg` `inner` erst NACH dieser Funktion mit `scale(1/scale)`
 * verkleinert (ein roher Papier-mm-Wert von 0.35 würde sonst unsichtbar dünn).
 */
export function situationsplanInnerSvg(doc: KosmoDoc, scale: number): InnerSvg {
  const geo = schwarzplanGeometrie(doc);
  if (!geo) return { inner: '', bounds: null };
  const { parzelle, footprints, bounds } = geo;
  const punkte = (o: Pt[]) => o.map((p) => `${p.x},${-p.y}`).join(' ');
  const parts: string[] = [
    `<polygon points="${punkte(parzelle)}" fill="none" stroke="black" stroke-width="${(0.35 * scale).toFixed(3)}" stroke-dasharray="${(3 * scale).toFixed(2)} ${(0.9 * scale).toFixed(2)} ${(0.6 * scale).toFixed(2)} ${(0.9 * scale).toFixed(2)}"/>`,
  ];
  for (const fp of footprints) {
    parts.push(`<polygon points="${punkte(fp)}" fill="#1a1a1a" stroke="none"/>`);
  }
  return { inner: parts.join('\n'), bounds };
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

/** Papier-Bounds eines Bild-Slots — Höhe folgt dem Bild-Seitenverhältnis (leer 3:2). */
export function imagePaperBounds(
  doc: KosmoDoc,
  bild: SheetImage,
): { x: number; y: number; width: number; height: number } {
  const asset = bild.assetId ? doc.get<ImageAsset>(bild.assetId) : undefined;
  const ratio = asset?.width && asset?.height ? asset.width / asset.height : 1.5;
  return { x: bild.x, y: bild.y, width: bild.w, height: bild.w / ratio };
}

export interface SheetSvgOptions {
  projectName: string;
  date?: string;
  /** Papier-Hintergrund zeichnen (Editor: true; PDF-Seite füllt selbst). */
  paperFill?: string;
  /**
   * Rasterbilder NICHT ins SVG einbetten (PDF-Export: svg2pdf rendert
   * <image> unzuverlässig — die Bilder setzt jsPDF.addImage danach exakt).
   */
  ohneRaster?: boolean;
}

/** Bogenkette einer Änderungswolke ums Rechteck (Papier-mm, «revision cloud»). */
function wolkenPfad(x: number, y: number, w: number, h: number): string {
  const r = 3;
  const seg: string[] = [`M ${x} ${y}`];
  const bogen = (tx: number, ty: number) => seg.push(`A ${r} ${r} 0 0 1 ${tx.toFixed(2)} ${ty.toFixed(2)}`);
  const kante = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / (2 * r)));
    for (let i = 1; i <= n; i++) bogen(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  };
  kante(x, y, x + w, y);
  kante(x + w, y, x + w, y + h);
  kante(x + w, y + h, x, y + h);
  kante(x, y + h, x, y);
  return seg.join(' ');
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
      const umbauZusatz = pl.umbau ? ` · ${UMBAU_LABEL[pl.umbau]}` : '';
      const themaZusatz = pl.thema ? ` · ${pl.thema}` : '';
      parts.push(
        `<text x="${pl.x}" y="${labelY.toFixed(2)}" text-anchor="middle" font-size="3.6" font-weight="bold">${escapeXml(pl.title)}  <tspan font-weight="normal" fill="#444">1:${pl.scale}${umbauZusatz}${escapeXml(themaZusatz)}</tspan></text>`,
      );
      // Themenplan-Legende (A5): Farbkästchen + Label unter dem Titel
      const thema = pl.thema ? (doc.settings.themen ?? []).find((t) => t.name === pl.thema) : undefined;
      let legendeY = labelY + 6;
      if (thema) {
        let lx = pl.x - ((bounds.maxX - bounds.minX) / 2) * f;
        for (const r of thema.regeln) {
          const label = r.label ?? r.wert;
          parts.push(
            `<rect x="${lx.toFixed(2)}" y="${(legendeY - 3).toFixed(2)}" width="4" height="3" fill="${r.farbe}" stroke="black" stroke-width="0.18"/>`,
            `<text x="${(lx + 5.5).toFixed(2)}" y="${legendeY.toFixed(2)}" font-size="2.8">${escapeXml(label)}</text>`,
          );
          lx += 5.5 + label.length * 1.7 + 6;
        }
        legendeY += 5;
      }
      // Keynote-Legende (A6): verwendete Nummern des Geschosses ausschreiben
      if (pl.view === 'grundriss' && pl.storeyId) {
        const nrs = [
          ...new Set(
            doc
              .byKind<import('../model/entities').Etikett>('etikett')
              .filter((e) => e.storeyId === pl.storeyId && e.inhalt === 'keynote' && e.keynote)
              .map((e) => e.keynote!),
          ),
        ].sort((a, b) => a.localeCompare(b, 'de-CH', { numeric: true }));
        const lx = pl.x - ((bounds.maxX - bounds.minX) / 2) * f;
        for (const nr of nrs) {
          const eintrag = (doc.settings.keynotes ?? []).find((k) => k.nr === nr);
          if (!eintrag) continue;
          parts.push(
            `<text x="${lx.toFixed(2)}" y="${legendeY.toFixed(2)}" font-size="2.8"><tspan font-weight="bold">${escapeXml(nr)}</tspan>  ${escapeXml(eintrag.text)}</text>`,
          );
          legendeY += 4;
        }
      }
    }
  }

  // Bild-Slots (Renders aufs Plakat); leere Slots als Messrahmen-Platzhalter
  for (const b of sheet.bilder ?? []) {
    const r = imagePaperBounds(doc, b);
    const asset = b.assetId ? doc.get<ImageAsset>(b.assetId) : undefined;
    if (asset && !opts.ohneRaster) {
      parts.push(
        `<image x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" href="data:${asset.mime};base64,${asset.data}" preserveAspectRatio="xMidYMid slice"/>`,
      );
    }
    if (asset) {
      parts.push(
        `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="black" stroke-width="0.25"/>`,
      );
    } else {
      parts.push(
        `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="#666" stroke-width="0.25" stroke-dasharray="2.5 1.4"/>`,
        `<line x1="${r.x}" y1="${r.y}" x2="${r.x + r.width}" y2="${r.y + r.height}" stroke="#bbb" stroke-width="0.18"/>`,
        `<line x1="${r.x + r.width}" y1="${r.y}" x2="${r.x}" y2="${r.y + r.height}" stroke="#bbb" stroke-width="0.18"/>`,
        `<text x="${r.x + r.width / 2}" y="${r.y + r.height / 2}" text-anchor="middle" font-size="3.2" fill="#666">Render folgt — HomeStation</text>`,
      );
    }
    if (b.title) {
      parts.push(
        `<text x="${r.x + r.width / 2}" y="${(r.y + r.height + 5).toFixed(2)}" text-anchor="middle" font-size="3.6" font-weight="bold">${escapeXml(b.title)}</text>`,
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

  // Änderungswolken (A7): Bogenkette ums Rechteck + Revisions-Marker
  for (const wo of sheet.wolken ?? []) {
    parts.push(
      `<path d="${wolkenPfad(wo.x, wo.y, wo.w, wo.h)}" fill="none" stroke="#b3261e" stroke-width="0.35"/>`,
      `<circle cx="${wo.x + wo.w}" cy="${wo.y}" r="3" fill="white" stroke="#b3261e" stroke-width="0.35"/>`,
      `<text x="${wo.x + wo.w}" y="${wo.y + 1.1}" text-anchor="middle" font-size="3" fill="#b3261e" font-weight="bold">${escapeXml(wo.revision)}</text>`,
    );
  }

  // Plankopf unten rechts (SIA-angelehnt)
  const kw = 120;
  const kh = 26;
  const kx = paper.width - 10 - kw;
  const ky = paper.height - 10 - kh;

  // Revisionsverzeichnis (A7): Tabelle über dem Plankopf, neueste zuoberst —
  // nur wenn Revisionen erfasst sind (Goldens bleiben unverändert)
  if ((sheet.revisionen ?? []).length > 0) {
    const rows = [...sheet.revisionen!].reverse();
    const rh = 4.5;
    const th = rows.length * rh + 5;
    const ty = ky - 2 - th;
    parts.push(
      `<g font-size="2.8" data-teil="revisionen">`,
      `<rect x="${kx}" y="${ty}" width="${kw}" height="${th}" fill="white" stroke="black" stroke-width="0.25"/>`,
      `<text x="${kx + 3}" y="${ty + 4}" font-weight="bold">Revisionen</text>`,
    );
    rows.forEach((r, i) => {
      const yy = ty + 5 + (i + 1) * rh - 1.2;
      parts.push(
        `<text x="${kx + 3}" y="${yy}" font-weight="bold">${escapeXml(r.index)}</text>`,
        `<text x="${kx + 10}" y="${yy}" fill="#444">${escapeXml(r.datum)}</text>`,
        `<text x="${kx + 28}" y="${yy}">${escapeXml(r.text)}</text>`,
      );
    });
    parts.push('</g>');
  }
  const scaleText = [...scales].sort((a, b) => a - b).map((s) => `1:${s}`).join(' · ') || '—';
  parts.push(
    `<g font-size="3">`,
    `<rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" fill="white" stroke="black" stroke-width="0.35"/>`,
    `<line x1="${kx}" y1="${ky + 9}" x2="${kx + kw}" y2="${ky + 9}" stroke="black" stroke-width="0.18"/>`,
    `<text x="${kx + 3}" y="${ky + 6}" font-weight="bold" font-size="4">${escapeXml(opts.projectName)}</text>`,
    `<text x="${kx + 3}" y="${ky + 15}">${escapeXml(sheet.name)}</text>`,
    `<text x="${kx + 3}" y="${ky + 22}" fill="#444">${escapeXml(opts.date ?? new Date().toLocaleDateString('de-CH'))} · ${escapeXml(phaseLabel(doc.settings.phase))}</text>`,
    `<text x="${kx + kw - 3}" y="${ky + 15}" text-anchor="end">${scaleText}</text>`,
    `<text x="${kx + kw - 3}" y="${ky + 22}" text-anchor="end" fill="#444">Blatt ${sheet.index + 1} · ${sheet.format}</text>`,
    `</g>`,
    '</svg>',
  );
  return parts.join('\n');
}
