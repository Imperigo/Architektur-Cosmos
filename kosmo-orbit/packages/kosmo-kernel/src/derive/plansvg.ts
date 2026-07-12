import { phaseLabel, type KosmoDoc } from '../model/doc';
import type { Assembly, Furniture, Slab, Storey } from '../model/entities';
import { moebelGeometrie, moebelTyp } from './moebel';
import { derivePlan, regionToPath } from './plan';
import { deriveDimensions, dimensionLabel } from './dimensions';
import { deriveSection, type SectionSpec } from './section';
import { schraffurFuer, schraffurLinien } from './schraffur';
import { pocheEntscheid } from './poche';
import { fruehePhase } from '../model/doc';
import { deriveAxo, type AxoSpec } from './axo';
import {
  BLATT,
  DASH,
  dashWelt,
  GRAU,
  GRAU_SONDER,
  MASS_STIFT,
  RADIER_WEISS,
  STIFT,
  UMBAU_STIFTE,
  ZONENTUER_LUECKE_STIFT,
} from './stilblatt';

// Stilblatt-Tokens über den Paket-Index verfügbar machen (index.ts führt
// `export * from './derive/plansvg'` — PlanView/SectionView lesen dieselbe
// Tabelle, Grundsatz «Ein Stilblatt, zwei Renderer»).
export * from './stilblatt';

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

/** Grundriss-Inhalt (Regionen, Symbole, Bemassung) in Welt-mm.
 * opts.thema (A5): Themenplan-Regeln tönen passende Regionen — erste
 * Treffer-Regel gewinnt, der Stift bleibt. */
export function planInnerSvg(
  doc: KosmoDoc,
  storeyId: string,
  scale: number,
  opts?: { thema?: import('../model/doc').ThemenPlan },
): InnerSvg {
  const plan = derivePlan(doc, storeyId);
  const parts: string[] = [];
  const themaFuer = (classes: string[]): string | null => {
    for (const r of opts?.thema?.regeln ?? []) {
      const klasse =
        r.kriterium === 'material' ? `material-${r.wert}` : r.kriterium === 'raumTyp' ? `raumtyp-${r.wert}` : r.wert;
      if (classes.includes(klasse)) return r.farbe;
    }
    return null;
  };

  // Umbau-Farbcode (SIA 400 B.8.11): Bestand schwarz/grau, Neubau rot, Abbruch
  // gelb — Werte zentral im Stilblatt (v0.7.3 D1)
  const NEU_STIFT = UMBAU_STIFTE.neu;
  const ABBRUCH_STIFT = UMBAU_STIFTE.abbruch;
  const phase = doc.settings.phase;
  const pocheModus = doc.settings.pocheModus ?? 'phase';
  for (const r of plan.regions) {
    // A3: Stützen sind immer geschnitten → schwerer Stift + Poché wie tragend
    const isCore = r.classes.includes('tragend') || r.classes.includes('stuetze');
    const isDaemmung = r.classes.includes('daemmung');
    const isProjection = r.classes.includes('projection');
    const neu = r.classes.includes('renovation-neu');
    const abbruch = r.classes.includes('renovation-abbruch');
    const bestand = r.classes.includes('renovation-bestand');
    let stroke: string = GRAU.geschnitten;
    if (neu) {
      stroke = NEU_STIFT;
    } else if (abbruch) {
      stroke = ABBRUCH_STIFT;
    } else if (bestand) {
      // K2 (Owner-Rundgang 0.6.2, S. 18): explizit als Bestand markierte
      // Bauteile einheitlich grau über ALLE Schichten (Kern UND
      // Dämmung/Bekleidung) — vorher tönte nur die tragende Schicht grau,
      // die übrigen Schichten blieben weiss ("hälftig grau"). Der Umbau-
      // Status zeigt den Bestand als Ganzes, nicht den Materialaufbau.
      stroke = GRAU.geschnitten;
    }
    // Themenplan (A5): Regel-Farbe übersteuert die Füllung, der Stift bleibt
    const themaFarbe = themaFuer(r.classes);
    // svg2pdf rendert SVG-Patterns nicht zuverlässig → solides Poché
    // (SIA-Druckkonvention). Die Füllfarbe entscheidet EINE Stelle
    // (`derive/poche.ts`, v0.7.0 E2): Themenplan > Umbau > Phasen-Schwarz >
    // heutige Tints/Grau — für `phase === 'werkplan'`/`modus === 'material'`
    // byte-identisch zum Vorher (16 Alt-Goldens).
    const entscheid = pocheEntscheid({
      phase,
      modus: pocheModus,
      klassen: { tragend: isCore, daemmung: isDaemmung, projektion: isProjection },
      kontext: 'grundriss',
      ...(neu ? { umbau: 'neu' as const } : abbruch ? { umbau: 'abbruch' as const } : bestand ? { umbau: 'bestand' as const } : {}),
      ...(themaFarbe ? { themaFarbe } : {}),
    });
    const fill = entscheid.fill ?? 'none';
    // Stiftstärken in Papier-mm → Welt-mm skaliert (Stilblatt-Achse 1)
    const sw = (isProjection ? STIFT.fein : isCore ? STIFT.primaer : STIFT.sekundaer) * scale;
    const dash = r.classes.includes('volumen')
      ? ` stroke-dasharray="${dashWelt(DASH.volumen, scale)}"`
      : abbruch
        ? ` stroke-dasharray="${dashWelt(DASH.abbruch, scale)}"`
        : r.classes.includes('ueber-schnitt')
          ? ` stroke-dasharray="${dashWelt(DASH.ueberSchnitt, scale)}"`
          : '';
    parts.push(
      `<path d="${regionToPath(r)}" fill-rule="evenodd" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`,
    );
  }
  for (const l of plan.lines) {
    const baugrenze = l.classes.includes('baugrenze');
    const neu = l.classes.includes('renovation-neu');
    const abbruch = l.classes.includes('renovation-abbruch');
    // Zonentür-Lücke (A4): radiert die Zonenkontur weiss aus, der Flügel folgt fein
    const luecke = l.classes.includes('zonentuer-luecke');
    const unterzug = l.classes.includes('unterzug');
    // Dach-Linienhierarchie (v0.6.9 Politur, «Werkplan-Härte»): First
    // kräftig wie eine Schnittkante (0.5 — dieselbe Stärke wie `isCore`
    // oben und die Cut-Linien in sectionInnerSvg), Traufe mittel (0.35 —
    // wie eine normale Bauteilkante), Ortgang/Grat fein (0.18 — wie
    // Fenster/Bruchlinien). Vorher fielen alle vier `dach-<art>`-Klassen
    // (derive/plan.ts) unklassifiziert in den 0.25-Standardstrich — First,
    // Traufe, Ortgang und Grat waren im Werkplan nicht unterscheidbar. Das
    // gestrichelte «Geschoss darunter»-Symbol trägt bereits `dach-traufe`
    // (plan.ts) und bekommt dadurch automatisch die mittlere Stärke; sein
    // `ueber-schnitt`-Dasharray (unten) bleibt unverändert.
    const dachStift = l.classes.includes('dach-first')
      ? STIFT.primaer
      : l.classes.includes('dach-traufe')
        ? STIFT.sekundaer
        : l.classes.includes('dach-ortgang') || l.classes.includes('dach-grat')
          ? STIFT.fein
          : null;
    // v0.7.1 E5/4B: Flügeltyp-Symbolik (Doppelstrich Kipp, versetzte
    // Doppellinie Schiebe) ist dieselbe dezente 0.18er-Klasse wie das
    // Fenstersymbol selbst.
    const fluegelSymbol = l.classes.includes('fluegel-kipp') || l.classes.includes('fluegel-schiebe');
    const sw = luecke
      ? ZONENTUER_LUECKE_STIFT
      : (dachStift ?? (l.classes.includes('fenster') || l.classes.includes('bruchlinie') || unterzug || fluegelSymbol ? STIFT.fein : STIFT.kante)) * scale;
    const stroke = luecke ? RADIER_WEISS : neu ? NEU_STIFT : abbruch ? ABBRUCH_STIFT : GRAU.geschnitten;
    // Baugrenze strichpunktiert auch im Druck (wie am Bildschirm); B3: über dem
    // Schnitt liegende Treppenteile strichpunktiert; A3: Unterzüge verdeckt
    // gestrichelt (über der Schnittebene)
    const dash = baugrenze
      ? ` stroke-dasharray="${dashWelt(DASH.strichpunktBestand, scale)}"`
      : l.classes.includes('ueber-schnitt')
        ? ` stroke-dasharray="${dashWelt(DASH.ueberSchnitt, scale)}"`
        : unterzug
          ? ` stroke-dasharray="${dashWelt(DASH.unterzug, scale)}"`
          : '';
    parts.push(
      `<line x1="${l.a.x}" y1="${-l.a.y}" x2="${l.b.x}" y2="${-l.b.y}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`,
    );
  }
  // Stützenraster: Achsen strichpunktiert, Achsköpfe an beiden Enden
  for (const ax of plan.axes) {
    const haupt = ax.typ === 'haupt';
    const dash = haupt
      ? dashWelt(DASH.strichpunktBestand, scale)
      : dashWelt(DASH.achseWohn, scale);
    parts.push(
      `<line x1="${ax.a.x}" y1="${-ax.a.y}" x2="${ax.b.x}" y2="${-ax.b.y}" stroke="${GRAU_SONDER.ideell}" stroke-width="${STIFT.fein * scale}" stroke-dasharray="${dash}"/>`,
    );
    if (haupt && ax.label) {
      for (const p of [ax.a, ax.b]) {
        parts.push(
          `<circle cx="${p.x}" cy="${-p.y}" r="${2.8 * scale}" fill="white" stroke="${GRAU.geschnitten}" stroke-width="${STIFT.fein * scale}"/>`,
          `<text x="${p.x}" y="${-p.y + scale}" text-anchor="middle" font-size="${3 * scale}" font-family="monospace">${escapeXml(ax.label)}</text>`,
        );
      }
    }
  }
  // Plan-Beschriftungen (A3: Aussparungs-Koten, A6: Etiketten), feiner Text
  // mittig; zeile versetzt mehrzeilige Etiketten massstabsgerecht
  for (const t of plan.texte) {
    const y = -t.at.y + (t.zeile ?? 0) * 3 * scale;
    parts.push(
      `<text x="${t.at.x}" y="${y}" text-anchor="middle" font-size="${2.2 * scale}" font-family="monospace">${escapeXml(t.text)}</text>`,
    );
  }
  for (const a of plan.arcs) {
    const sx = a.center.x + a.radius * Math.cos(a.startAngle);
    const sy = a.center.y + a.radius * Math.sin(a.startAngle);
    const ex = a.center.x + a.radius * Math.cos(a.endAngle);
    const ey = a.center.y + a.radius * Math.sin(a.endAngle);
    parts.push(
      `<path d="M ${sx} ${-sy} A ${a.radius} ${a.radius} 0 0 0 ${ex} ${-ey}" fill="none" stroke="${GRAU_SONDER.ideell}" stroke-width="${STIFT.fein * scale}" stroke-dasharray="${dashWelt(DASH.bogen, scale)}"/>`,
    );
  }
  // Möblierung (V2-F8/A4): feste Einbauten (Sanitär/Küche) ab Bauprojekt,
  // lose Möblierung erst im Werkplan — feiner Stift 0.18, ohne
  // Bewegungsflächen (die sind Arbeitshilfe am Bildschirm, kein Planinhalt)
  if (!fruehePhase(doc.settings.phase)) {
    for (const f of doc.byKind<Furniture>('furniture')) {
      if (f.storeyId !== storeyId) continue;
      if (doc.settings.phase === 'bauprojekt' && moebelTyp(f.typ)?.abPhase !== 'bauprojekt') continue;
      const g = moebelGeometrie(f);
      if (!g) continue;
      parts.push(
        `<path d="M ${g.korpus.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z" fill="none" stroke="${GRAU.geschnitten}" stroke-width="${STIFT.fein * scale}"/>`,
      );
    }
  }

  // Assoziative Bemassung: Aussenketten + Innenketten je nach Stil
  const dims = deriveDimensions(doc, storeyId);
  let dimMinX = Infinity;
  let dimMinY = Infinity;
  for (const c of dims.chains) {
    const innen = c.role === 'innen';
    const sw = (innen ? MASS_STIFT.innen : MASS_STIFT.aussen) * scale;
    const tickHalf = (innen ? 0.6 : 0.8) * scale;
    const fs = (innen ? 2.2 : 2.6) * scale;
    const t0 = c.ticks[0]!;
    const t1 = c.ticks[c.ticks.length - 1]!;
    parts.push(`<g stroke="${GRAU.geschnitten}" fill="${GRAU.geschnitten}">`);
    if (c.axis === 'x') {
      dimMinY = Math.min(dimMinY, c.offset);
      parts.push(`<line x1="${t0}" y1="${-c.offset}" x2="${t1}" y2="${-c.offset}" stroke-width="${sw}"/>`);
      for (const t of c.ticks) {
        parts.push(`<line x1="${t - tickHalf}" y1="${-c.offset + tickHalf}" x2="${t + tickHalf}" y2="${-c.offset - tickHalf}" stroke-width="${sw * 2}"/>`);
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        parts.push(`<text x="${mid}" y="${-c.offset - 1.2 * scale}" text-anchor="middle" font-size="${fs}" stroke="none">${dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!)}</text>`);
        // B1: Öffnungs-Höhenmass «h/BH» als Zweitzeile unter der Masslinie
        const z = c.zusatz?.[i];
        if (z) {
          parts.push(`<text x="${mid}" y="${-c.offset + 2.2 * scale}" text-anchor="middle" font-size="${2.0 * scale}" stroke="none">${escapeXml(z)}</text>`);
        }
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
        const z = c.zusatz?.[i];
        if (z) {
          parts.push(`<text x="${c.offset + 2.2 * scale}" y="${-mid}" text-anchor="middle" font-size="${2.0 * scale}" stroke="none" transform="rotate(-90 ${c.offset + 2.2 * scale} ${-mid})">${escapeXml(z)}</text>`);
        }
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
  // Material-Poché zuerst (unter allen Stiften): Detaillierung nach SIA-Phase
  // — die Füllfarbe entscheidet `derive/poche.ts` (v0.7.0 E2): Wettbewerb/
  // Vorprojekt ein schwarzes Poché, Bauprojekt/Baueingabe Schichten
  // schwarz/grau, Werkplan (bzw. modus 'material') Material-Tönung +
  // Schraffur — byte-identisch zum Vorher für `phase === 'werkplan'`.
  const phase = doc.settings.phase;
  const pocheModus = doc.settings.pocheModus ?? 'phase';
  for (const f of g.faces) {
    const spec2 = schraffurFuer(f.material, f.functionKey);
    const d = f.loops
      .map((loop) => `M ${loop.map((p) => `${p.s} ${-p.z}`).join(' L ')} Z`)
      .join(' ');
    const entscheid = pocheEntscheid({
      phase,
      modus: pocheModus,
      material: f.material,
      klassen: {
        tragend: f.functionKey === 'tragend',
        daemmung: f.functionKey === 'daemmung',
        projektion: false,
      },
      kontext: 'schnitt',
    });
    // Material-Stil (art 'tint'/'none'): der lokal berechnete `spec2.tint`
    // kennt den echten `functionKey` (bekleidung/dichtung/hohlraum), den
    // `pocheEntscheid()` über die schmale `klassen`-Signatur nicht 1:1
    // abbilden kann — deshalb hier bevorzugt, garantiert Byte-Identität.
    const fill = entscheid.art === 'tint' || entscheid.art === 'none' ? spec2.tint : entscheid.fill;
    if (fill) parts.push(`<path d="${d}" fill-rule="evenodd" fill="${fill}" stroke="none"/>`);
    if (entscheid.schraffurLinien) {
      for (const linie of schraffurLinien(f.loops, spec2, scale)) {
        parts.push(
          `<polyline points="${linie.map((p) => `${p.s},${-p.z}`).join(' ')}" fill="none" stroke="${GRAU_SONDER.schraffur}" stroke-width="${STIFT.fein * scale}"/>`,
        );
      }
    }
  }
  // B4: Rohboden-Linie — Decken mit Aufbau zeigen die Kante zwischen
  // Bodenaufbau und Rohdecke als feine Linie (Beläge getrennt, ab Bauprojekt)
  if (!fruehePhase(doc.settings.phase)) {
    const len = Math.hypot(spec.b.x - spec.a.x, spec.b.y - spec.a.y) || 1;
    const dRicht = { x: (spec.b.x - spec.a.x) / len, y: (spec.b.y - spec.a.y) / len };
    for (const slab of doc.byKind<import('../model/entities').Slab>('slab')) {
      if (!slab.assemblyId || slab.outline.length < 3) continue;
      const asm = doc.get<Assembly>(slab.assemblyId);
      if (!asm || asm.kind !== 'assembly') continue;
      let delta = 0;
      for (const layer of asm.layers) {
        if (layer.function === 'tragend') break;
        delta += layer.thickness;
      }
      if (delta <= 0) continue;
      const st = doc.get<Storey>(slab.storeyId);
      if (!st || st.kind !== 'storey') continue;
      const z = st.elevation + slab.topOffset - delta;
      // Schnittgerade a + s·d gegen die Polygon-Kanten: s-Paare = innen
      const sWerte: number[] = [];
      for (let i = 0; i < slab.outline.length; i++) {
        const p = slab.outline[i]!;
        const q = slab.outline[(i + 1) % slab.outline.length]!;
        // Kante quer zur Geraden? Löse a + s·d = p + u·(q−p), 0 ≤ u < 1
        const ex = q.x - p.x;
        const ey = q.y - p.y;
        const det = dRicht.x * -ey - dRicht.y * -ex;
        if (Math.abs(det) < 1e-9) continue;
        const rx = p.x - spec.a.x;
        const ry = p.y - spec.a.y;
        const s = (rx * -ey - ry * -ex) / det;
        const u = (dRicht.x * ry - dRicht.y * rx) / det;
        if (u >= 0 && u < 1) sWerte.push(s);
      }
      sWerte.sort((a2, b2) => a2 - b2);
      for (let i = 0; i + 1 < sWerte.length; i += 2) {
        parts.push(
          `<line x1="${Math.round(sWerte[i]!)}" y1="${-z}" x2="${Math.round(sWerte[i + 1]!)}" y2="${-z}" stroke="${GRAU.projiziert}" stroke-width="${STIFT.fein * scale}" class="rohboden"/>`,
        );
      }
    }
  }

  // Reine Ansicht (kein Schnittkanal): die Fassade ist GESEHENE Kante —
  // sekundärer Stift + «gesehen»-Grau. Im Schnitt sind die Kanten hinter der
  // Ebene der feine Projektions-Kanal («projiziert»-Grau). Stilblatt-Achse 2.
  const projStift = (g.cuts.length === 0 ? STIFT.sekundaer : STIFT.fein) * scale;
  for (const l of g.projections) {
    parts.push(
      `<line x1="${l.a.s}" y1="${-l.a.z}" x2="${l.b.s}" y2="${-l.b.z}" stroke="${g.cuts.length === 0 ? GRAU.gesehen : GRAU.projiziert}" stroke-width="${projStift}"/>`,
    );
  }
  for (const l of g.cuts) {
    parts.push(
      `<line x1="${l.a.s}" y1="${-l.a.z}" x2="${l.b.s}" y2="${-l.b.z}" stroke="${GRAU.geschnitten}" stroke-width="${STIFT.primaer * scale}"/>`,
    );
  }
  // SIA-Öffnungssymbolik (v0.7.1 E5/4B): eigener, dünner Stift (0.18er-Klasse
  // wie Fenster-/Bruchlinien im Grundriss) — UNABHÄNGIG vom cuts.length-
  // Umschalter oben, sonst würde die reine Ansicht (kein Schnittkanal) die
  // Symbole mit dem mittleren 0.35er-Projektionsstift zeichnen. Leer, wenn
  // keine Öffnung ein `fluegelTyp` trägt (Byte-Identität, Goldens-Guard).
  for (const l of g.fenstersymbole) {
    parts.push(
      `<line x1="${l.a.s}" y1="${-l.a.z}" x2="${l.b.s}" y2="${-l.b.z}" stroke="${GRAU_SONDER.symbolik}" stroke-width="${STIFT.fein * scale}"/>`,
    );
  }
  const b = g.bounds;
  let bounds = b ? { minX: b.minS, minY: -b.maxZ, maxX: b.maxS, maxY: -b.minZ } : null;
  if (bounds) {
    if (g.terrain.length === 0) {
      // Ohne Terrainprofil: flache Linie bei z = 0 (Bestandsverhalten)
      parts.push(
        `<line x1="${bounds.minX - 800}" y1="0" x2="${bounds.maxX + 800}" y2="0" stroke="${GRAU_SONDER.terrainGewachsen}" stroke-width="${STIFT.fein * scale}" stroke-dasharray="${dashWelt(DASH.terrainGewachsen, scale)}"/>`,
      );
    } else {
      // Terrainprofile (A2): gewachsen gestrichelt, neu ausgezogen (SIA 400 C.2.1)
      for (const t of g.terrain) {
        const dash = t.typ === 'gewachsen' ? ` stroke-dasharray="${dashWelt(DASH.terrainGewachsen, scale)}"` : '';
        const sw = (t.typ === 'neu' ? STIFT.sekundaer : STIFT.fein) * scale;
        const stroke = t.typ === 'neu' ? GRAU_SONDER.terrainNeu : GRAU_SONDER.terrainGewachsen;
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
    // Höhenkoten je Geschoss (B2): OK fertig = GEFÜLLTES Dreieck, OK roh =
    // offenes Dreieck darunter (Delta = Bodenaufbau über der tragenden
    // Schicht des Decken-Aufbaus); EG-Kote trägt den Absolutbezug m ü.M.
    if (doc.settings.bemassung.hoehenKoten) {
      const s0 = bounds.minX - 800;
      const dreieck = 1.6 * scale;
      const absolut = doc.settings.standort?.hoeheM;
      const bodenAufbauVon = (storeyId: string): number => {
        for (const slab of doc.byKind<Slab>('slab')) {
          if (slab.storeyId !== storeyId || !slab.assemblyId) continue;
          const asm = doc.get<Assembly>(slab.assemblyId);
          if (!asm || asm.kind !== 'assembly') continue;
          let sum = 0;
          for (const layer of asm.layers) {
            if (layer.function === 'tragend') return sum;
            sum += layer.thickness;
          }
        }
        return 0;
      };
      for (const st of doc.storeysOrdered()) {
        const z = st.elevation;
        const zusatz = z === 0 && absolut !== undefined ? ` = ${absolut.toFixed(2)} m ü.M.` : '';
        parts.push(
          `<path d="M ${s0} ${-z} l ${-dreieck / 2} ${-dreieck} h ${dreieck} Z" fill="${GRAU.geschnitten}" stroke="${GRAU.geschnitten}" stroke-width="${STIFT.fein * scale}"/>`,
          `<text x="${s0 - dreieck}" y="${-z - dreieck * 1.2}" text-anchor="end" font-size="${2.6 * scale}" font-family="monospace">${koteLabel(z)}${zusatz}</text>`,
        );
        const delta = bodenAufbauVon(st.id);
        if (delta > 0) {
          const zRoh = z - delta;
          parts.push(
            `<path d="M ${s0} ${-zRoh} l ${-dreieck / 2} ${-dreieck} h ${dreieck} Z" fill="none" stroke="${GRAU.geschnitten}" stroke-width="${STIFT.fein * scale}"/>`,
            `<text x="${s0 - dreieck}" y="${-zRoh + dreieck * 1.6}" text-anchor="end" font-size="${2.2 * scale}" font-family="monospace">${koteLabel(zRoh)} roh</text>`,
          );
        }
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
  // Axo-Kanten sind GESEHENE Kanten (Stilblatt-Achse 2, wie die reine Ansicht)
  const stift = STIFT.sekundaer * scale;
  const parts = g.lines.map(
    (l) =>
      `<line x1="${l.a.u}" y1="${-l.a.v}" x2="${l.b.u}" y2="${-l.b.v}" stroke="${GRAU.gesehen}" stroke-width="${stift}"/>`,
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
    `<g stroke="${BLATT.tinte}" fill="none" stroke-width="${BLATT.rahmenStift}">`,
    `<circle cx="${nx}" cy="16" r="4"/>`,
    `<path d="M ${nx} 19 L ${nx} 13 M ${nx - 1.4} 14.6 L ${nx} 13 L ${nx + 1.4} 14.6" />`,
    `<text x="${nx}" y="26" text-anchor="middle" font-size="3" stroke="none" fill="${BLATT.tinte}">N</text>`,
    `</g>`,
  );

  // Plankopf (SIA-angelehnt, schlicht)
  const y0 = paper.height - 18;
  parts.push(
    `<g font-size="3.2">`,
    `<line x1="10" y1="${y0}" x2="${paper.width - 10}" y2="${y0}" stroke="${BLATT.tinte}" stroke-width="${BLATT.rahmenStift}"/>`,
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
