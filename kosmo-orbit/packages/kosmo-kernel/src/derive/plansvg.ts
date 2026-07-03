import { phaseLabel, type KosmoDoc } from '../model/doc';
import type { Furniture, Storey } from '../model/entities';
import { moebelGeometrie } from './moebel';
import { derivePlan, regionToPath } from './plan';
import { deriveDimensions, dimensionLabel } from './dimensions';
import { deriveSection, type SectionSpec } from './section';
import { schraffurFuer, schraffurLinien } from './schraffur';
import { deriveAxo, type AxoSpec } from './axo';

/**
 * Plansatz-SVG — druckfähige Grundrisse/Schnitte mit SIA-Stiften.
 * Masstabstreu: 1 SVG-Einheit = 1 mm Papier. Die Inner-Renderer liefern
 * Inhalt in Welt-mm (y gespiegelt, Norden oben) — planToSvg und die
 * Blatt-Komposition (KosmoPublish) setzen Transformation und Plankopf.
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

export interface InnerSvg {
  /** SVG-Fragment in Welt-mm (Grundriss: y gespiegelt; Schnitt: (s,−z)). */
  inner: string;
  /** Bounds im Fragment-Koordinatensystem. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

/** Grundriss-Inhalt (Regionen, Symbole, Bemassung) in Welt-mm. */
export function planInnerSvg(doc: KosmoDoc, storeyId: string, scale: number): InnerSvg {
  const plan = derivePlan(doc, storeyId);
  const parts: string[] = [];

  // Umbau-Farbcode (SIA 400 B.8.11): Bestand schwarz/grau, Neubau rot, Abbruch gelb
  const NEU_STIFT = '#b3261e';
  const ABBRUCH_STIFT = '#8a7500';
  for (const r of plan.regions) {
    const isCore = r.classes.includes('tragend');
    const isDaemmung = r.classes.includes('daemmung');
    const isProjection = r.classes.includes('projection');
    const neu = r.classes.includes('renovation-neu');
    const abbruch = r.classes.includes('renovation-abbruch');
    // svg2pdf rendert SVG-Patterns nicht zuverlässig → solides Poché (SIA-Druckkonvention)
    let fill = isCore ? '#c9c9c9' : isDaemmung ? '#efefef' : isProjection ? 'none' : 'white';
    let stroke = 'black';
    if (neu) {
      fill = isProjection ? 'none' : '#e9c8c5';
      stroke = NEU_STIFT;
    } else if (abbruch) {
      fill = '#f3e29b';
      stroke = ABBRUCH_STIFT;
    }
    // Stiftstärken in Papier-mm → Welt-mm skaliert (0.5 / 0.35 / 0.18)
    const sw = (isProjection ? 0.18 : isCore ? 0.5 : 0.35) * scale;
    const dash = r.classes.includes('volumen')
      ? ` stroke-dasharray="${2 * scale} ${scale}"`
      : abbruch
        ? ` stroke-dasharray="${1.5 * scale} ${0.8 * scale}"`
        : '';
    parts.push(
      `<path d="${regionToPath(r)}" fill-rule="evenodd" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`,
    );
  }
  for (const l of plan.lines) {
    const baugrenze = l.classes.includes('baugrenze');
    const neu = l.classes.includes('renovation-neu');
    const abbruch = l.classes.includes('renovation-abbruch');
    const sw = (l.classes.includes('fenster') ? 0.18 : 0.25) * scale;
    const stroke = neu ? NEU_STIFT : abbruch ? ABBRUCH_STIFT : 'black';
    // Baugrenze strichpunktiert auch im Druck (wie am Bildschirm)
    const dash = baugrenze ? ` stroke-dasharray="${3 * scale} ${0.9 * scale} ${0.6 * scale} ${0.9 * scale}"` : '';
    parts.push(
      `<line x1="${l.a.x}" y1="${-l.a.y}" x2="${l.b.x}" y2="${-l.b.y}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`,
    );
  }
  // Stützenraster: Achsen strichpunktiert, Achsköpfe an beiden Enden
  for (const ax of plan.axes) {
    const haupt = ax.typ === 'haupt';
    const dash = haupt
      ? `${3 * scale} ${0.9 * scale} ${0.6 * scale} ${0.9 * scale}`
      : `${1.2 * scale} ${0.9 * scale}`;
    parts.push(
      `<line x1="${ax.a.x}" y1="${-ax.a.y}" x2="${ax.b.x}" y2="${-ax.b.y}" stroke="#555" stroke-width="${0.18 * scale}" stroke-dasharray="${dash}"/>`,
    );
    if (haupt && ax.label) {
      for (const p of [ax.a, ax.b]) {
        parts.push(
          `<circle cx="${p.x}" cy="${-p.y}" r="${2.8 * scale}" fill="white" stroke="black" stroke-width="${0.18 * scale}"/>`,
          `<text x="${p.x}" y="${-p.y + scale}" text-anchor="middle" font-size="${3 * scale}" font-family="monospace">${escapeXml(ax.label)}</text>`,
        );
      }
    }
  }
  // Plan-Beschriftungen (A3: Aussparungs-Koten), feiner Text mittig
  for (const t of plan.texte) {
    parts.push(
      `<text x="${t.at.x}" y="${-t.at.y}" text-anchor="middle" font-size="${2.2 * scale}" font-family="monospace">${escapeXml(t.text)}</text>`,
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
  // Möblierung (V2-F8): nur im Werkplan, feiner Stift 0.18, ohne
  // Bewegungsflächen (die sind Arbeitshilfe am Bildschirm, kein Planinhalt)
  if (doc.settings.phase === 'werkplan') {
    for (const f of doc.byKind<Furniture>('furniture')) {
      if (f.storeyId !== storeyId) continue;
      const g = moebelGeometrie(f);
      if (!g) continue;
      parts.push(
        `<path d="M ${g.korpus.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z" fill="none" stroke="black" stroke-width="${0.18 * scale}"/>`,
      );
    }
  }

  // Assoziative Bemassung: Aussenketten + Innenketten je nach Stil
  const dims = deriveDimensions(doc, storeyId);
  let dimMinX = Infinity;
  let dimMinY = Infinity;
  for (const c of dims.chains) {
    const innen = c.role === 'innen';
    const sw = (innen ? 0.13 : 0.18) * scale;
    const tickHalf = (innen ? 0.6 : 0.8) * scale;
    const fs = (innen ? 2.2 : 2.6) * scale;
    const t0 = c.ticks[0]!;
    const t1 = c.ticks[c.ticks.length - 1]!;
    parts.push('<g stroke="black" fill="black">');
    if (c.axis === 'x') {
      dimMinY = Math.min(dimMinY, c.offset);
      parts.push(`<line x1="${t0}" y1="${-c.offset}" x2="${t1}" y2="${-c.offset}" stroke-width="${sw}"/>`);
      for (const t of c.ticks) {
        parts.push(`<line x1="${t - tickHalf}" y1="${-c.offset + tickHalf}" x2="${t + tickHalf}" y2="${-c.offset - tickHalf}" stroke-width="${sw * 2}"/>`);
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        parts.push(`<text x="${mid}" y="${-c.offset - 1.2 * scale}" text-anchor="middle" font-size="${fs}" stroke="none">${dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!)}</text>`);
      }
    } else {
      dimMinX = Math.min(dimMinX, c.offset);
      parts.push(`<line x1="${c.offset}" y1="${-t0}" x2="${c.offset}" y2="${-t1}" stroke-width="${sw}"/>`);
      for (const t of c.ticks) {
        parts.push(`<line x1="${c.offset - tickHalf}" y1="${-t - tickHalf}" x2="${c.offset + tickHalf}" y2="${-t + tickHalf}" stroke-width="${sw * 2}"/>`);
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        parts.push(`<text x="${c.offset - 1.2 * scale}" y="${-mid}" text-anchor="middle" font-size="${fs}" stroke="none" transform="rotate(-90 ${c.offset - 1.2 * scale} ${-mid})">${dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!)}</text>`);
      }
    }
    parts.push('</g>');
  }

  const b = plan.bounds;
  const bounds = b
    ? {
        minX: Math.min(b.minX, dimMinX === Infinity ? b.minX : dimMinX - 3 * scale),
        minY: -b.maxY,
        maxX: b.maxX,
        maxY: -Math.min(b.minY, dimMinY === Infinity ? b.minY : dimMinY - 3 * scale),
      }
    : null;
  return { inner: parts.join('\n'), bounds };
}

/** Schnitt-Inhalt in (s, −z): Schnittkanal schwer, Projektion fein.
 * Reine Ansichten (kein Schnittkanal) bekommen den mittleren Stift —
 * sonst verschwindet die Fassade auf dem Blatt. */
export function sectionInnerSvg(doc: KosmoDoc, spec: SectionSpec, scale: number): InnerSvg {
  const g = deriveSection(doc, spec);
  const parts: string[] = [];
  // Material-Poché zuerst (unter allen Stiften): Detaillierung nach SIA-Phase —
  // Vorprojekt einheitlich grau, Bauprojekt Material-Tönung, Werkplan + Schraffur
  const phase = doc.settings.phase;
  for (const f of g.faces) {
    const spec2 = schraffurFuer(f.material, f.functionKey);
    const d = f.loops
      .map((loop) => `M ${loop.map((p) => `${p.s} ${-p.z}`).join(' L ')} Z`)
      .join(' ');
    const fill = phase === 'vorprojekt' ? '#d7d4ce' : spec2.tint;
    if (fill) parts.push(`<path d="${d}" fill-rule="evenodd" fill="${fill}" stroke="none"/>`);
    if (phase === 'werkplan') {
      for (const linie of schraffurLinien(f.loops, spec2, scale)) {
        parts.push(
          `<polyline points="${linie.map((p) => `${p.s},${-p.z}`).join(' ')}" fill="none" stroke="#333" stroke-width="${0.18 * scale}"/>`,
        );
      }
    }
  }
  const projStift = (g.cuts.length === 0 ? 0.35 : 0.18) * scale;
  for (const l of g.projections) {
    parts.push(
      `<line x1="${l.a.s}" y1="${-l.a.z}" x2="${l.b.s}" y2="${-l.b.z}" stroke="${g.cuts.length === 0 ? '#111' : '#444'}" stroke-width="${projStift}"/>`,
    );
  }
  for (const l of g.cuts) {
    parts.push(
      `<line x1="${l.a.s}" y1="${-l.a.z}" x2="${l.b.s}" y2="${-l.b.z}" stroke="black" stroke-width="${0.5 * scale}"/>`,
    );
  }
  const b = g.bounds;
  let bounds = b ? { minX: b.minS, minY: -b.maxZ, maxX: b.maxS, maxY: -b.minZ } : null;
  if (bounds) {
    if (g.terrain.length === 0) {
      // Ohne Terrainprofil: flache Linie bei z = 0 (Bestandsverhalten)
      parts.push(
        `<line x1="${bounds.minX - 800}" y1="0" x2="${bounds.maxX + 800}" y2="0" stroke="#777" stroke-width="${0.18 * scale}" stroke-dasharray="${2 * scale} ${1.2 * scale}"/>`,
      );
    } else {
      // Terrainprofile (A2): gewachsen gestrichelt, neu ausgezogen (SIA 400 C.2.1)
      for (const t of g.terrain) {
        const dash = t.typ === 'gewachsen' ? ` stroke-dasharray="${2 * scale} ${1.2 * scale}"` : '';
        const sw = (t.typ === 'neu' ? 0.35 : 0.18) * scale;
        const stroke = t.typ === 'neu' ? '#333' : '#777';
        parts.push(
          `<polyline points="${t.pts.map((p) => `${p.s},${-p.z}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash}/>`,
        );
        for (const p of t.pts) {
          bounds.minX = Math.min(bounds.minX, p.s);
          bounds.maxX = Math.max(bounds.maxX, p.s);
          bounds.minY = Math.min(bounds.minY, -p.z);
          bounds.maxY = Math.max(bounds.maxY, -p.z);
        }
      }
    }
    // Höhenkoten je Geschoss (OK fertig Boden), SIA-Lesart: Dreieck + Meter-Kote
    if (doc.settings.bemassung.hoehenKoten) {
      const s0 = bounds.minX - 800;
      const dreieck = 1.6 * scale;
      for (const st of doc.storeysOrdered()) {
        const z = st.elevation;
        parts.push(
          `<path d="M ${s0} ${-z} l ${-dreieck / 2} ${-dreieck} h ${dreieck} Z" fill="none" stroke="black" stroke-width="${0.18 * scale}"/>`,
          `<text x="${s0 - dreieck}" y="${-z - dreieck * 1.2}" text-anchor="end" font-size="${2.6 * scale}" font-family="monospace">${koteLabel(z)}</text>`,
        );
      }
      bounds = { ...bounds, minX: bounds.minX - 800 - 14 * scale };
    }
  }
  return { inner: parts.join('\n'), bounds };
}

/** Meter-Kote mit Vorzeichen: ±0.00, +3.00, −2.50. */
export function koteLabel(z: number): string {
  if (z === 0) return '±0.00';
  return `${z > 0 ? '+' : '−'}${Math.abs(z / 1000).toFixed(2)}`;
}

export function axoInnerSvg(doc: KosmoDoc, spec: AxoSpec, scale: number): InnerSvg {
  const g = deriveAxo(doc, spec);
  const stift = 0.35 * scale;
  const parts = g.lines.map(
    (l) =>
      `<line x1="${l.a.u}" y1="${-l.a.v}" x2="${l.b.u}" y2="${-l.b.v}" stroke="#111" stroke-width="${stift}"/>`,
  );
  const b = g.bounds;
  const bounds = b ? { minX: b.minU, minY: -b.maxV, maxX: b.maxU, maxY: -b.minV } : null;
  return { inner: parts.join('\n'), bounds };
}

export function planToSvg(doc: KosmoDoc, storeyId: string, opts: PlanSheetOptions): string {
  const storey = doc.get<Storey>(storeyId);
  const { scale, paper } = opts;
  const f = 1 / scale; // mm Welt → mm Papier
  const { inner, bounds: b } = planInnerSvg(doc, storeyId, scale);

  const parts: string[] = [];
  // Zeichnung zentriert aufs Blatt (Plankopf-Streifen unten 18 mm)
  const contentH = paper.height - 22;
  let tx = paper.width / 2;
  let ty = contentH / 2;
  if (b) {
    tx -= ((b.minX + b.maxX) / 2) * f;
    ty -= ((b.minY + b.maxY) / 2) * f;
  }

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}mm" height="${paper.height}mm" viewBox="0 0 ${paper.width} ${paper.height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${paper.width}" height="${paper.height}" fill="white"/>`,
    `<g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${f})">`,
    inner,
    '</g>',
  );

  // Nordpfeil oben rechts (SIA 400 C.2.1: Grundriss mit Nordrichtung)
  const nx = paper.width - 16;
  parts.push(
    `<g stroke="black" fill="none" stroke-width="0.35">`,
    `<circle cx="${nx}" cy="16" r="4"/>`,
    `<path d="M ${nx} 19 L ${nx} 13 M ${nx - 1.4} 14.6 L ${nx} 13 L ${nx + 1.4} 14.6" />`,
    `<text x="${nx}" y="26" text-anchor="middle" font-size="3" stroke="none" fill="black">N</text>`,
    `</g>`,
  );

  // Plankopf (SIA-angelehnt, schlicht)
  const y0 = paper.height - 18;
  parts.push(
    `<g font-size="3.2">`,
    `<line x1="10" y1="${y0}" x2="${paper.width - 10}" y2="${y0}" stroke="black" stroke-width="0.35"/>`,
    `<text x="10" y="${y0 + 6}" font-weight="bold" font-size="4.2">${escapeXml(opts.projectName)}</text>`,
    `<text x="10" y="${y0 + 11.5}">${escapeXml(opts.planTitle)} · ${escapeXml(storey?.name ?? '')}</text>`,
    `<text x="${paper.width - 10}" y="${y0 + 6}" text-anchor="end">1:${scale} \u00b7 Masse in cm/m</text>`,
    `<text x="${paper.width - 10}" y="${y0 + 11.5}" text-anchor="end">${escapeXml(opts.date ?? new Date().toLocaleDateString('de-CH'))} · ${escapeXml(phaseLabel(doc.settings.phase))}</text>`,
    `</g>`,
    '</svg>',
  );
  return parts.join('\n');
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
