import { type KosmoDoc } from '../model/doc';
import type { ImageAsset, Sheet, SheetFormat, SheetImage, SheetPlacement } from '../model/entities';
import { axoInnerSvg, escapeXml, planInnerSvg, sectionInnerSvg, type InnerSvg } from './plansvg';
import { docFuerUmbau, UMBAU_LABEL } from './umbau';
import { schwarzplanGeometrie } from './schwarzplan';
import { BLATT_RAENDER, faltmarken, leporelloFaltung, lochungMm, plankopfRect, rahmenRect, type BlattRect } from './blattlayout';
import {
  afFreigabeStempelSvg,
  massstabsbalkenSvg,
  nordpfeilSvg,
  plancode,
  plankopfSvg,
  siaZuMatrixStufe,
  wasserzeichenSvg,
  type PlankopfDaten,
} from './plankopf';
import {
  BLATT,
  BLATT_TYPO_MM,
  DASH,
  messbarAttr,
  PLATZHALTER,
  SCHWARZPLAN_FARBEN,
  STIFT,
  titelAttr,
  TITEL_STIL,
  UMBAU_STIFTE,
  versal,
} from './stilblatt';
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
  // v0.8.1/P13 (docs/V081-SPEZ.md §7(d)): Rollenformat, identisch zu
  // `blattlayout.ts`s `BLATT_FORMATE.Rolle` (1600×594mm, bewusst NICHT von
  // dort importiert, s. Datei-Kopfkommentar oben zur Trennung der beiden
  // Registrierungen bis zum künftigen Sammelwechsel).
  Rolle: { width: 1600, height: 594 },
};

export function sheetPaperSize(sheet: Pick<Sheet, 'format' | 'orientation'>): {
  width: number;
  height: number;
} {
  const s = ISO_LANG[sheet.format];
  return sheet.orientation === 'quer' ? { ...s } : { width: s.height, height: s.width };
}

function placementInner(doc: KosmoDoc, pl: SheetPlacement, datenAttribute?: boolean): InnerSvg {
  // Umbau-Filter je Platzierung (A2): gefilterte Sicht, dieselbe Ableitung
  const sicht = docFuerUmbau(doc, pl.umbau);
  if (pl.view === 'grundriss' && pl.storeyId) {
    // Themenplan (A5): Regeln aus settings.themen tönen die Platzierung
    const thema = pl.thema ? (doc.settings.themen ?? []).find((t) => t.name === pl.thema) : undefined;
    // E3-Opt-in (v0.8.6 §3, D3): `datenAttribute` reicht NUR hier bis zu
    // `planInnerSvg` durch — Axo/Schnitt/Situationsplan kennen keine
    // Raumtyp-Regionen, das Flag bleibt dort wirkungslos (kein Parameter).
    const planOpts = thema || datenAttribute ? { ...(thema ? { thema } : {}), ...(datenAttribute ? { datenAttribute } : {}) } : undefined;
    return planInnerSvg(sicht, pl.storeyId, pl.scale, planOpts);
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
  const { parzelle, footprints, nachbarn, bounds } = geo;
  const punkte = (o: Pt[]) => o.map((p) => `${p.x},${-p.y}`).join(' ');
  const parts: string[] = [
    `<polygon points="${punkte(parzelle)}" fill="none" stroke="${SCHWARZPLAN_FARBEN.parzelle}" stroke-width="${(STIFT.sekundaer * scale).toFixed(3)}" stroke-dasharray="${DASH.strichpunktBestand.map((d) => (d * scale).toFixed(2)).join(' ')}"/>`,
  ];
  // Nachbarn grau VOR den eigenen Footprints (v0.7.1 E2) — dieselbe
  // Reihenfolge/Farbe wie das eigenständige Schwarzplan-Blatt; ohne
  // Nachbar-Zonen bleibt die Liste leer und die Ausgabe byte-identisch.
  for (const np of nachbarn) {
    parts.push(`<polygon points="${punkte(np)}" fill="${SCHWARZPLAN_FARBEN.nachbar}" stroke="none"/>`);
  }
  for (const fp of footprints) {
    parts.push(`<polygon points="${punkte(fp)}" fill="${SCHWARZPLAN_FARBEN.eigen}" stroke="none"/>`);
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
  /**
   * E3-Opt-in (v0.8.6 §3, D3): reicht `planInnerSvg`s `opts.datenAttribute`
   * an JEDE `grundriss`-Platzierung durch (`data-raumtyp` auf den
   * Raumtyp-Flächen). Default AUS (Golden-Sanktion) — bestehende Aufrufer
   * (`export-sheets.ts`, `.kosmo`-Paket, Transmittal-CSV-Vorschau) bleiben
   * dadurch unverändert; NUR der Publish-Blatt-Renderpfad der App
   * (`apps/kosmo-orbit`s `PublishWorkspace.tsx`) setzt es explizit.
   */
  datenAttribute?: boolean;
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

  // v0.8.0 P7 (Golden-Sammelwechsel 080, docs/V080-PLANKOPF-SPEZ.md §5.1,
  // Default-Flip): der volle 180×55-Plankopf-Framework-Pfad
  // (`derive/plankopf.ts` + `derive/blattlayout.ts`) ist ab jetzt der EINZIGE
  // Pfad — der P4-Daten-Guard (`sheet.plankopf`/`sheet.layout` musste gesetzt
  // sein) war eine reine Rollout-Vorsichtsmassnahme für P1–P6 und ist hier
  // bewusst aufgelöst (Owner-Entscheid 2, Spez §5.2: «alle Blätter automatisch
  // umstellen», kein Opt-in). Fehlende `SheetLayout`-Booleans bedeuten NEU die
  // fixierten Spez-§5.1-Defaults (heftrand/faltmarken/wasserzeichen/
  // massstabsbalken AN, nordpfeil AN nur mit platziertem Grundriss/
  // Situationsplan, s. unten) — explizite `false`-Werte bleiben respektiert
  // (P2-Lösch-Semantik, `mergeTeilPatch` in `commands/publish.ts`). Die
  // einzige dauerhafte Ausnahme ist `heftrand` bei A0-Plakat-Preset-Blättern
  // (`erzeugePlakat()`, `PublishWorkspace.tsx`) — die setzen beim Erstellen
  // explizit `layout: { heftrand: false }`, s. `publish.blattErstellen`.
  //
  // Der alte kompakte ~120×26-mm-Fusskopf (uniform 10mm-Rahmen,
  // `phaseLabel(settings.phase)`) ist damit VOLLSTÄNDIG abgelöst — es gibt
  // keinen erreichbaren Zustand mehr, der ihn zeichnet (auch die
  // Plakat-Ausnahme braucht ihn nicht: sie erhält den vollen Plankopf, nur
  // ohne Heftrand).
  // K41 (Golden-Zug 0.8.12 Teil C, Owner wörtlich «einheitlicher rahmen am
  // blattrand!», docs/OWNER-KORREKTUREN-2026-07.md S.17): der Default dreht
  // vom asymmetrischen ISO-838-Heftrand (20mm links / 10mm sonst) auf den
  // EINHEITLICHEN 10mm-Rahmen rundum — derselbe Rahmen, den Plakate schon
  // immer hatten (kein zweiter Codepfad). Der Heftrand bleibt als bewusstes
  // Opt-in (`layout.heftrand === true`) für Ablage-Bedarf erhalten;
  // bestehende Blätter mit explizitem true behalten ihn.
  const heftrandAn = sheet.layout?.heftrand === true;
  // `plankopfRect()` hängt nur von der rechten/unteren Rahmenkante ab (je
  // 10mm, unabhängig vom Heftrand) — die 180×55-Box liegt also unabhängig
  // von `layout.heftrand` immer an derselben Stelle (s. `blattlayout.ts`-
  // Doku zu `plankopfRect`). Nur Rahmen/Zeichenfläche selbst unterscheiden
  // sich: mit Heftrand 20mm links + 10mm sonst (`rahmenRect`), ohne
  // Heftrand weiterhin 10mm rundum (Plakat-Ausnahme).
  const rahmenNeu: BlattRect = heftrandAn
    ? rahmenRect(paper.width, paper.height)
    : {
        x: BLATT_RAENDER.oben,
        y: BLATT_RAENDER.oben,
        breite: paper.width - BLATT_RAENDER.oben * 2,
        hoehe: paper.height - BLATT_RAENDER.oben * 2,
      };

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}mm" height="${paper.height}mm" viewBox="0 0 ${paper.width} ${paper.height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${paper.width}" height="${paper.height}" fill="${opts.paperFill ?? 'white'}"/>`,
  );
  let leporelloTeile: string[] = [];
  {
    const rahmenTeile: string[] = [
      `<rect x="${rahmenNeu.x}" y="${rahmenNeu.y}" width="${rahmenNeu.breite}" height="${rahmenNeu.hoehe}" fill="none" stroke="${BLATT.tinte}" stroke-width="${BLATT.rahmenStift}"/>`,
    ];
    // Faltmarken (DIN 824, Spez §1.3) — Default AN (Spez §5.1), explizites
    // `false` schaltet sie aus.
    if (sheet.layout?.faltmarken !== false) {
      const fm = faltmarken(paper.width, paper.height);
      for (const x of fm.vertikal) {
        rahmenTeile.push(
          `<line x1="${x}" y1="0" x2="${x}" y2="4" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
          `<line x1="${x}" y1="${paper.height - 4}" x2="${x}" y2="${paper.height}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
        );
      }
      for (const y of fm.horizontal) {
        rahmenTeile.push(
          `<line x1="0" y1="${y}" x2="4" y2="${y}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
          `<line x1="${paper.width - 4}" y1="${y}" x2="${paper.width}" y2="${y}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
        );
      }
      // Leporello-Faltlinien (v0.8.1/P13, docs/V081-SPEZ.md §7(d), C-27) — NUR
      // beim Rolle-Format: volle Knicklinien über die ganze Blatthöhe statt der
      // kurzen DIN-824-Eckstriche oben, damit die Zickzack-Faltfelder der
      // langen Rolle sichtbar werden. Dieselben Vertikal-Positionen wie oben
      // (`leporelloFaltung()` ist eine reine Ableitung von `faltmarken()`,
      // KEIN zweiter Faltalgorithmus) — nur die Darstellung unterscheidet
      // sich. Guard `sheet.format === 'Rolle'` hält A0–A4 komplett unberührt
      // (byte-identische Bestandsgoldens): für sie ist dieser Zweig
      // unerreichbar, `leporelloTeile` bleibt leer, keine neue Gruppe entsteht.
      if (sheet.format === 'Rolle') {
        const { knicklinien } = leporelloFaltung(paper.width, paper.height);
        leporelloTeile = knicklinien.map(
          (x) =>
            `<line x1="${x}" y1="0" x2="${x}" y2="${paper.height}" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}" stroke-dasharray="6 3"/>`,
        );
      }
    }
    // Lochung (ISO 838, Spez §1.4) sitzt mittig im Heftrand — ergibt ohne
    // Heftrand keinen Sinn, deshalb an denselben Schalter gebunden statt an
    // ein eigenes `SheetLayout`-Feld (das es dafür bewusst nicht gibt, s.
    // `model/entities.ts`).
    if (heftrandAn) {
      const loch = lochungMm(paper.height);
      rahmenTeile.push(
        `<circle cx="${loch.x}" cy="${loch.y1}" r="${loch.d / 2}" fill="none" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
        `<circle cx="${loch.x}" cy="${loch.y2}" r="${loch.d / 2}" fill="none" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
      );
    }
    parts.push(`<g data-teil="blattlayout">`, ...rahmenTeile, `</g>`);
    if (leporelloTeile.length > 0) {
      parts.push(`<g data-teil="leporello">`, ...leporelloTeile, `</g>`);
    }
  }

  // v0.8.0 P4: «grösste platzierte Ansicht» (Spez §1.6, Massstabsbalken) =
  // grösste PAPIER-Fläche (Breite×Höhe in mm nach Massstabsteilung) — nicht
  // der grösste Massstabs-NENNER.
  let primaryScale: number | undefined;
  let primaryFlaeche = -1;
  for (const pl of sheet.placements) {
    const { inner, bounds } = placementInner(doc, pl, opts.datenAttribute);
    if (!bounds) continue;
    const f = 1 / pl.scale;
    const flaeche = (bounds.maxX - bounds.minX) * f * ((bounds.maxY - bounds.minY) * f);
    if (flaeche > primaryFlaeche) {
      primaryFlaeche = flaeche;
      primaryScale = pl.scale;
    }
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
        `<text x="${pl.x}" y="${labelY.toFixed(2)}" text-anchor="middle" ${titelAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(versal(pl.title))}  <tspan font-weight="normal" ${messbarAttr(BLATT_TYPO_MM.etikett)} fill="${BLATT.textSekundaer}">1:${pl.scale}${umbauZusatz}${escapeXml(themaZusatz)}</tspan></text>`,
      );
      // Themenplan-Legende (A5): Farbkästchen + Label unter dem Titel
      const thema = pl.thema ? (doc.settings.themen ?? []).find((t) => t.name === pl.thema) : undefined;
      let legendeY = labelY + 6;
      if (thema) {
        let lx = pl.x - ((bounds.maxX - bounds.minX) / 2) * f;
        for (const r of thema.regeln) {
          const label = r.label ?? r.wert;
          parts.push(
            `<rect x="${lx.toFixed(2)}" y="${(legendeY - 3).toFixed(2)}" width="4" height="3" fill="${r.farbe}" stroke="${BLATT.tinte}" stroke-width="${BLATT.trennStift}"/>`,
            `<text x="${(lx + 5.5).toFixed(2)}" y="${legendeY.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(label)}</text>`,
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
            `<text x="${lx.toFixed(2)}" y="${legendeY.toFixed(2)}" ${messbarAttr(BLATT_TYPO_MM.etikett)}><tspan font-weight="bold">${escapeXml(nr)}</tspan>  ${escapeXml(eintrag.text)}</text>`,
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
        `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
      );
    } else {
      parts.push(
        `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="${PLATZHALTER.linie}" stroke-width="${BLATT.kastenStift}" stroke-dasharray="${DASH.platzhalter.join(' ')}"/>`,
        `<line x1="${r.x}" y1="${r.y}" x2="${r.x + r.width}" y2="${r.y + r.height}" stroke="${PLATZHALTER.kreuz}" stroke-width="${BLATT.trennStift}"/>`,
        `<line x1="${r.x + r.width}" y1="${r.y}" x2="${r.x}" y2="${r.y + r.height}" stroke="${PLATZHALTER.kreuz}" stroke-width="${BLATT.trennStift}"/>`,
        `<text x="${r.x + r.width / 2}" y="${r.y + r.height / 2}" text-anchor="middle" font-size="3.2" fill="${PLATZHALTER.linie}">Render folgt — HomeStation</text>`,
      );
    }
    if (b.title) {
      parts.push(
        `<text x="${r.x + r.width / 2}" y="${(r.y + r.height + 5).toFixed(2)}" text-anchor="middle" ${titelAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(versal(b.title))}</text>`,
      );
    }
  }

  // Freie Textblöcke (Plakat-Titel, Konzepttexte) — Titel-Zeilen (`t.titel`)
  // sprechen ab D4 die Titel-Stimme (Lato Heavy versal) statt vormals
  // 'Archivo Narrow'; Grösse bleibt frei wählbar (`t.size`, kein Fixwert der
  // BLATT_TYPO_MM-Leiter, darum `TITEL_STIL` ohne eingebackene font-size).
  for (const t of sheet.texte ?? []) {
    const zeilen = (t.titel ? versal(t.text) : t.text).split('\n');
    const stil = t.titel ? TITEL_STIL : '';
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
      `<path d="${wolkenPfad(wo.x, wo.y, wo.w, wo.h)}" fill="none" stroke="${UMBAU_STIFTE.neu}" stroke-width="${BLATT.rahmenStift}"/>`,
      `<circle cx="${wo.x + wo.w}" cy="${wo.y}" r="3" fill="white" stroke="${UMBAU_STIFTE.neu}" stroke-width="${BLATT.rahmenStift}"/>`,
      `<text x="${wo.x + wo.w}" y="${wo.y + 1.1}" text-anchor="middle" fill="${UMBAU_STIFTE.neu}" font-weight="bold" ${messbarAttr(3)}>${escapeXml(wo.revision)}</text>`,
    );
  }

  const pkRect = plankopfRect(paper.width, paper.height);

  // Revisionsverzeichnis (A7, Spez §6.1 Punkt 5: «bleibt als Tabelle ÜBER
  // dem Plankopf, unverändert») — folgt der 180×55-Box.
  if ((sheet.revisionen ?? []).length > 0) {
    const rows = [...sheet.revisionen!].reverse();
    const rh = 4.5;
    const th = rows.length * rh + 5;
    const ty = pkRect.y - 2 - th;
    parts.push(
      `<g font-size="2.8" data-teil="revisionen">`,
      `<rect x="${pkRect.x}" y="${ty}" width="${pkRect.breite}" height="${th}" fill="white" stroke="${BLATT.tinte}" stroke-width="${BLATT.kastenStift}"/>`,
      `<text x="${pkRect.x + 3}" y="${ty + 4}" ${TITEL_STIL}>${versal('Revisionen')}</text>`,
    );
    rows.forEach((r, i) => {
      const yy = ty + 5 + (i + 1) * rh - 1.2;
      parts.push(
        `<text x="${pkRect.x + 3}" y="${yy}" font-weight="bold" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(r.index)}</text>`,
        `<text x="${pkRect.x + 10}" y="${yy}" fill="${BLATT.textSekundaer}" ${messbarAttr(BLATT_TYPO_MM.etikett)}>${escapeXml(r.datum)}</text>`,
        `<text x="${pkRect.x + 28}" y="${yy}">${escapeXml(r.text)}</text>`,
      );
    });
    parts.push('</g>');
  }

  const matrixStufe = siaZuMatrixStufe(doc.settings.siaPhase);
  // Die Zeichenfläche für Wasserzeichen/Massstabsbalken/Nordpfeil deckt sich
  // dimensional mit dem Rahmen selbst (`rahmenRect`/Uniform-10mm-Variante
  // liefern exakt dieselbe Box wie die jeweilige Zeichenfläche).
  const zfRect: BlattRect = rahmenNeu;

  // Wasserzeichen/AF-Freigabestempel (Spez §1.7): EIN Schalter deckt beide
  // Fälle ab (Post-Wechsel-Begründung §5.1) — AF zeigt nie ein
  // Wasserzeichen, sondern IMMER den Freigabestempel, solange derselbe
  // `layout.wasserzeichen`-Schalter an ist. Default AN, explizites `false`
  // schaltet beides aus.
  if (sheet.layout?.wasserzeichen !== false) {
    const wz = wasserzeichenSvg(zfRect, matrixStufe);
    if (wz) {
      parts.push(`<g data-teil="blattlayout">`, wz, `</g>`);
    } else {
      const stempel = afFreigabeStempelSvg(zfRect, matrixStufe, sheet.plankopf?.datum);
      if (stempel) parts.push(`<g data-teil="blattlayout">`, stempel, `</g>`);
    }
  }

  // Massstabsbalken (Spez §1.6): Default AN — Massstab der grössten
  // platzierten Ansicht (`primaryScale`, oben in der Platzierungs-Schleife
  // ermittelt); ohne platzierte Ansicht (kein `primaryScale`) entfällt der
  // Balken (kein erfundener Massstab).
  if (sheet.layout?.massstabsbalken !== false && primaryScale !== undefined) {
    parts.push(`<g data-teil="blattlayout">`, massstabsbalkenSvg(zfRect, pkRect.y, primaryScale), `</g>`);
  }

  // Nordpfeil (Spez §1.6): Default AN, aber NUR wenn ein Grundriss ODER eine
  // Situationsplan-Ansicht auf dem Blatt platziert ist — reine
  // Entitäts-Prüfung auf `sheet.placements` (nicht davon abhängig, ob die
  // Ansicht tatsächlich sichtbare Geometrie lieferte). Explizites `false`
  // schaltet ihn unabhängig von der Platzierung aus.
  const hatGrundrissOderSituation = sheet.placements.some((p) => p.view === 'grundriss' || p.view === 'situationsplan');
  if (sheet.layout?.nordpfeil !== false && hatGrundrissOderSituation) {
    parts.push(`<g data-teil="blattlayout">`, nordpfeilSvg(zfRect), `</g>`);
  }

  // Plankopf-Datenauflösung (Spez §3.2, Token-Schema → derive-Auflösung):
  // dieses Modul löst jedes Feld direkt aus typisierten Modellfeldern auf
  // (kein Template-Text). Logo-Daten-URL wird erst hier aufgelöst
  // (`derive/plankopf.ts` bleibt asset-frei, s. dortigen Kommentar zu
  // `PlankopfBueroDaten`).
  const buero = doc.settings.buero;
  const logoAsset = buero?.logoAssetId ? doc.get<ImageAsset>(buero.logoAssetId) : undefined;
  const revisionenListe = sheet.revisionen ?? [];
  const letzteRevision = revisionenListe[revisionenListe.length - 1];
  const daten: PlankopfDaten = {
    ...(buero
      ? {
          buero: {
            ...(buero.name !== undefined ? { name: buero.name } : {}),
            ...(buero.adresse !== undefined ? { adresse: buero.adresse } : {}),
            ...(buero.kuerzel !== undefined ? { kuerzel: buero.kuerzel } : {}),
            ...(logoAsset ? { logoDataUrl: `data:${logoAsset.mime};base64,${logoAsset.data}` } : {}),
          },
        }
      : {}),
    ...(doc.settings.projekt?.bauherr !== undefined ? { bauherr: doc.settings.projekt.bauherr } : {}),
    projektName: opts.projectName,
    ...(doc.settings.projekt?.adresse !== undefined ? { adresse: doc.settings.projekt.adresse } : {}),
    ...(doc.settings.projekt?.parzelleNr !== undefined ? { parzelleNr: doc.settings.projekt.parzelleNr } : {}),
    ...(sheet.plankopf?.inhalt !== undefined ? { inhalt: sheet.plankopf.inhalt } : {}),
    ...(primaryScale !== undefined ? { massstab: primaryScale } : {}),
    format: sheet.format,
    ...(sheet.plankopf?.gezeichnet !== undefined ? { gezeichnet: sheet.plankopf.gezeichnet } : {}),
    ...(sheet.plankopf?.geprueft !== undefined ? { geprueft: sheet.plankopf.geprueft } : {}),
    ...(sheet.plankopf?.datum !== undefined ? { datum: sheet.plankopf.datum } : {}),
    plancode: plancode({
      ...(buero?.kuerzel !== undefined ? { buero: buero.kuerzel } : {}),
      ...(doc.settings.projekt?.projektCode !== undefined ? { projekt: doc.settings.projekt.projektCode } : {}),
      phase: matrixStufe,
      ...(sheet.plankopf?.disziplin !== undefined ? { disziplin: sheet.plankopf.disziplin } : {}),
      ...(sheet.plankopf?.geschossCode !== undefined ? { geschoss: sheet.plankopf.geschossCode } : {}),
      ...(sheet.plankopf?.planNummer !== undefined ? { nr: sheet.plankopf.planNummer } : {}),
    }),
    // `SheetRevision` trägt kein Kürzel-Feld (`model/entities.ts`) — bleibt
    // ehrlich leer statt eines erfundenen Werts (Guard-Prinzip §3.2).
    ...(letzteRevision
      ? { revision: { index: letzteRevision.index, datum: letzteRevision.datum, text: letzteRevision.text, kuerzel: '' } }
      : {}),
  };
  parts.push(plankopfSvg(paper.width, paper.height, matrixStufe, daten));

  parts.push('</svg>');
  return parts.join('\n');
}
