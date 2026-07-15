import type { KosmoDoc } from '../model/doc';
import type { ImageAsset, Sheet, SheetImage, SheetPlacement, SheetText, Storey } from '../model/entities';
import type { Pt } from '../model/units';
import { deriveBerechnungsliste } from './berechnungsliste';
import { plankopfReserveMm } from './blattlayout';
import { axoInnerSvg, planInnerSvg, sectionInnerSvg } from './plansvg';
import { schwarzplanGeometrie } from './schwarzplan';
import { imagePaperBounds, placementPaperBounds, sheetPaperSize } from './sheet';

/**
 * Blatt-Auto-Befüllung (Owner-Befund K10, PDF S. 12: «Publish-Blätter halb
 * leer»). Pure Ableitung — KEIN Layout-«KI»: ein einfaches Spaltenraster über
 * die freie Blattfläche, befüllt in fester Priorität mit dem, was das Modell
 * TATSÄCHLICH hergibt (Grundriss/Schnitt/Axo/Situationsplan nur, wenn die
 * jeweilige Derivation echte Bounds liefert). Was fehlt (kein Schnitt
 * definiert, keine Parzelle, kein Raumprogramm, kein Render), wird als
 * Hinweis gemeldet — nie erfunden.
 *
 * Priorität: Grundriss je fehlendem Geschoss → Schnitt (aus bereits im
 * Plansatz definierten SectionSpecs) → Situationsplan (Parzelle+Footprints,
 * v0.7.0 E4) → Axonometrie → Kennzahlen → Renderbild.
 *
 * Schnitte kommen NICHT aus einer geratenen Schnittlinie (das wäre
 * Fake-Layout): sie werden aus bereits im Modell vorhandenen SectionSpecs
 * übernommen (irgendwo im Plansatz schon platzierte Schnitte). Gibt es
 * keinen, meldet die Ableitung das ehrlich statt eine Linie zu erfinden.
 * Aus demselben Grund bleiben Fassaden/«Ansichten» (Süd zuerst, Owner-
 * Formulierung K10) eine ehrliche Lücke, s. Hinweis unten: `SheetPlacement`
 * kennt keinen eigenständigen Ansichts-/Elevations-Blatt-Typ, und eine
 * Ansicht bräuchte — wie ein Schnitt — eine Schnittlinie ausserhalb des
 * Baukörpers, die hier niemand vorgibt. Denselben Grundsatz dokumentiert
 * `derive/baugesuch.ts` («kein eigener Blatt-Typ im Datenmodell»).
 */

/** Ein Vorschlag deckt sich 1:1 mit den Feldern, die publish.blattFuellen
 * daraus baut (SheetPlacement/SheetImage/SheetText). */
export type BlattVorschlag =
  | { art: 'grundriss'; storeyId: string; title: string; x: number; y: number; scale: number }
  | {
      art: 'schnitt';
      a: Pt;
      b: Pt;
      depth: number;
      lookLeft: boolean;
      title: string;
      x: number;
      y: number;
      scale: number;
    }
  | { art: 'axo'; title: string; x: number; y: number; scale: number }
  | { art: 'situationsplan'; title: string; x: number; y: number; scale: number }
  | { art: 'bild'; assetId: string | null; title?: string; x: number; y: number; w: number }
  | { art: 'text'; text: string; size: number; x: number; y: number; titel?: boolean };

export interface BlattBelegungsVorschlag {
  /** Priorisierte Belegung der freien Fläche (Reihenfolge = Platzierungsreihenfolge). */
  vorschlaege: BlattVorschlag[];
  /** Ehrliche Hinweise: was das Modell nicht hergibt ODER aus Platzmangel nicht mehr passt. */
  hinweise: string[];
}

/** Text-Marker vor der Kennzahlen-Zusammenfassung — verhindert Doppel-Einfügen
 * bei wiederholtem «Blatt füllen». */
const KENNZAHLEN_MARKER = 'Kennzahlen —';

/** Skalen, die die Ableitung zur Auswahl hat (grösster Massstab zuerst = grösste Zeichnung). */
const PASSENDE_SKALEN = [20, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];

/** Kleinste Skala aus PASSENDE_SKALEN, unter der die Welt-mm-Grösse in die Zelle passt. */
function passendeSkala(breiteWeltMm: number, hoeheWeltMm: number, zelleW: number, zelleH: number): number {
  for (const s of PASSENDE_SKALEN) {
    if (breiteWeltMm / s <= zelleW && hoeheWeltMm / s <= zelleH) return s;
  }
  return PASSENDE_SKALEN[PASSENDE_SKALEN.length - 1]!;
}

const M2_FMT = (v: number) => v.toLocaleString('de-CH', { maximumFractionDigits: 0 });

/** Grobe Papier-Bounds eines Textblocks — dieselbe Schätzung wie im Blatteditor
 * (Zeichen × Schrifthöhe), reicht für die Kollisionsprüfung des Rasters. */
function textPaperBounds(t: SheetText): { x: number; y: number; width: number; height: number } {
  const zeilen = t.text.split('\n');
  const wMm = Math.max(...zeilen.map((z) => z.length)) * t.size * 0.55;
  const hMm = zeilen.length * t.size * 1.35;
  return { x: t.x, y: t.y - t.size, width: Math.max(wMm, 20), height: Math.max(hMm, 8) };
}

/** Eindeutiger Schlüssel einer Schnittlinie (gerundet) — Dedupe über den ganzen Plansatz. */
function schnittSchluessel(a: Pt, b: Pt): string {
  return `${Math.round(a.x)}/${Math.round(a.y)}-${Math.round(b.x)}/${Math.round(b.y)}`;
}

/** Ein im Plansatz bereits definierter Schnitt (dedupe-Ergebnis). */
export interface BekannterSchnitt {
  a: Pt;
  b: Pt;
  depth: number;
  lookLeft: boolean;
  title: string;
}

/**
 * Alle im Plansatz irgendwo bereits platzierten Schnitte, dedupliziert über
 * die (gerundete) Schnittlinie — gemeinsam benutzt von `schlageBlattBelegungVor`
 * (Blatt füllen) UND `derive/baugesuch.ts` (Baugesuch-Blattsatz verlangt
 * mind. 1 Schnitt aus bereits definierten SectionSpecs, nie eine geratene
 * Linie — Ehrlichkeitsregel, s. Modul-Kommentar oben).
 */
export function alleBekanntenSchnitte(doc: KosmoDoc): Map<string, BekannterSchnitt> {
  const bekannteSchnitte = new Map<string, BekannterSchnitt>();
  for (const s of doc.byKind<Sheet>('sheet')) {
    for (const pl of s.placements) {
      if (pl.view !== 'schnitt' || !pl.section) continue;
      const key = schnittSchluessel(pl.section.a, pl.section.b);
      if (!bekannteSchnitte.has(key)) {
        bekannteSchnitte.set(key, { ...pl.section, title: pl.title ?? 'Schnitt' });
      }
    }
  }
  return bekannteSchnitte;
}

/**
 * Schlägt eine deterministische Belegung der freien Blattfläche vor.
 * Reihenfolge/Priorität: Grundrisse je Geschoss → Schnitte (aus im Modell
 * bereits definierten SectionSpecs) → Axonometrie → Kennzahlen → Renderbild
 * (vorhandenes Asset, sonst leerer Platzhalter-Slot).
 */
export function schlageBlattBelegungVor(doc: KosmoDoc, sheet: Sheet): BlattBelegungsVorschlag {
  const hinweise: string[] = [];
  const paper = sheetPaperSize(sheet);

  // --- Kandidaten sammeln (nur was die Derivation wirklich hergibt) ---
  type Kandidat = {
    label: string;
    breite: number;
    hoehe: number;
    bauen: (x: number, y: number, scale: number, w?: number) => BlattVorschlag;
  };
  const kandidaten: Kandidat[] = [];

  // 1) Grundrisse je Geschoss, die auf diesem Blatt noch fehlen
  for (const storey of doc.storeysOrdered() as Storey[]) {
    const vorhanden = sheet.placements.some((pl) => pl.view === 'grundriss' && pl.storeyId === storey.id);
    if (vorhanden) continue;
    const { bounds } = planInnerSvg(doc, storey.id, 100);
    if (!bounds) {
      hinweise.push(`Geschoss «${storey.name}» hat noch keine Bauteile — kein Grundriss ableitbar`);
      continue;
    }
    kandidaten.push({
      label: `Grundriss ${storey.name}`,
      breite: bounds.maxX - bounds.minX,
      hoehe: bounds.maxY - bounds.minY,
      bauen: (x, y, scale) => ({ art: 'grundriss', storeyId: storey.id, title: `Grundriss ${storey.name}`, x, y, scale }),
    });
  }

  // 2) Schnitte aus SectionSpecs, die irgendwo im Plansatz schon definiert sind
  const bekannteSchnitte = alleBekanntenSchnitte(doc);
  if (bekannteSchnitte.size === 0) {
    hinweise.push('Kein Schnitt im Modell definiert — zuerst irgendwo eine Schnittlinie platzieren (publish.ansichtPlatzieren)');
  } else {
    for (const [key, spec] of bekannteSchnitte) {
      const schonAufBlatt = sheet.placements.some(
        (pl) => pl.view === 'schnitt' && pl.section && schnittSchluessel(pl.section.a, pl.section.b) === key,
      );
      if (schonAufBlatt) continue;
      const { bounds } = sectionInnerSvg(doc, spec, 100);
      if (!bounds) {
        hinweise.push(`Schnitt «${spec.title}» liegt ausserhalb des Modells — keine Schnittfläche ableitbar`);
        continue;
      }
      kandidaten.push({
        label: spec.title,
        breite: bounds.maxX - bounds.minX,
        hoehe: bounds.maxY - bounds.minY,
        bauen: (x, y, scale) => ({
          art: 'schnitt',
          a: spec.a,
          b: spec.b,
          depth: spec.depth,
          lookLeft: spec.lookLeft,
          title: spec.title,
          x,
          y,
          scale,
        }),
      });
    }
  }

  // 2b) Fassaden/«Ansichten» (Süd zuerst): ehrliche Lücke, s. Modul-Kommentar.
  // `SheetPlacement.view` kennt keinen eigenen Ansichts-/Elevations-Typ, und
  // eine Ansicht bräuchte — wie ein Schnitt — eine Schnittlinie ausserhalb
  // des Baukörpers, die niemand vorgibt. Kein Kandidat, nur ein Hinweis.
  hinweise.push(
    'Ansichten (Fassaden): kein eigener Blatt-Typ im Datenmodell (SheetPlacement kennt Grundriss/Schnitt/Axonometrie/Situationsplan) — keine Ansichten ableitbar, Lücke bleibt offen.',
  );

  // 2c) Situationsplan — nur wenn eine Parzelle erkennbar ist (dieselbe
  // Entitäts-Erkennung wie `schwarzplanSvg`, «gemeinsame Quelle»).
  if (!sheet.placements.some((pl) => pl.view === 'situationsplan')) {
    const geo = schwarzplanGeometrie(doc);
    if (!geo) {
      hinweise.push(
        'Keine Parzelle erkennbar — kein Situationsplan ableitbar (Parzelle als Zone mit sia=KF importieren, design.zoneErstellen)',
      );
    } else {
      kandidaten.push({
        label: 'Situationsplan',
        breite: geo.bounds.maxX - geo.bounds.minX,
        hoehe: geo.bounds.maxY - geo.bounds.minY,
        bauen: (x, y, scale) => ({ art: 'situationsplan', title: 'Situationsplan', x, y, scale }),
      });
    }
  }

  // 3) Axonometrie — höchstens eine je Blatt
  if (!sheet.placements.some((pl) => pl.view === 'axo')) {
    const { bounds } = axoInnerSvg(doc, {}, 100);
    if (!bounds) {
      hinweise.push('Modell noch ohne Baukörper — keine Axonometrie ableitbar');
    } else {
      kandidaten.push({
        label: 'Axonometrie',
        breite: bounds.maxX - bounds.minX,
        hoehe: bounds.maxY - bounds.minY,
        bauen: (x, y, scale) => ({ art: 'axo', title: 'Axonometrie', x, y, scale }),
      });
    }
  }

  // 4) Kennzahlen/Berechnungsliste — als kurzer Textblock, einmalig (Marker)
  const hatKennzahlenText = (sheet.texte ?? []).some((t) => t.text.startsWith(KENNZAHLEN_MARKER));
  if (!hatKennzahlenText) {
    const liste = deriveBerechnungsliste(doc);
    if (liste.totalGf === 0 && liste.totalAgf === 0) {
      hinweise.push('Keine Kennzahlen ableitbar — noch keine Decken oder Volumenkörper im Modell');
    } else {
      const zeilen = [`${KENNZAHLEN_MARKER} ${sheet.name}`, `Total GF: ${M2_FMT(liste.totalGf)} m²`];
      if (liste.zeilen.length > 0) zeilen.push(`Total aGF: ${M2_FMT(liste.totalAgf)} m²`);
      if (liste.deltaMax !== null) {
        zeilen.push(`Δ Max: ${liste.deltaMax >= 0 ? '+' : ''}${M2_FMT(liste.deltaMax)} m²`);
      }
      const text = zeilen.join('\n');
      const zeilenzahl = zeilen.length;
      const size = 4;
      kandidaten.push({
        label: 'Kennzahlen',
        breite: Math.max(...zeilen.map((z) => z.length)) * size * 0.55,
        hoehe: zeilenzahl * size * 1.35,
        bauen: (x, y) => ({ art: 'text', text, size, x, y: y + size, titel: false }),
      });
    }
  }

  // 5) Renderbild — nur wenn das Blatt noch KEIN Bild trägt
  if ((sheet.bilder ?? []).length === 0) {
    const assets = doc.byKind<ImageAsset>('imageasset');
    const asset = assets[assets.length - 1]; // zuletzt eingebettetes Render
    if (asset) {
      kandidaten.push({
        label: 'Render',
        breite: 200,
        hoehe: (200 * (asset.height ?? 2)) / (asset.width ?? 3),
        bauen: (x, y, _scale, w?: number) => ({ art: 'bild', assetId: asset.id, title: asset.name, x, y, w: w ?? 120 }),
      });
    } else {
      hinweise.push('Kein Render im Modell — Platzhalter-Slot reserviert, HomeStation liefert später');
      kandidaten.push({
        label: 'Render-Platzhalter',
        breite: 200,
        hoehe: (200 * 2) / 3,
        bauen: (x, y, _scale, w?: number) => ({ art: 'bild', assetId: null, x, y, w: w ?? 120 }),
      });
    }
  }

  if (kandidaten.length === 0) return { vorschlaege: [], hinweise };

  // --- Einfaches Spaltenraster über die freie Fläche ---
  const RAND = 14; // Blattrahmen (10 mm) + Luft
  // v0.8.0 P7 (Golden-Sammelwechsel 080, Spez §5.1): die vormals pauschale
  // «40» ist ersetzt durch die EINZIGE Quelle `plankopfReserveMm().hoehe`
  // (`derive/blattlayout.ts`) — mit dem seit P7 default-aktiven, deutlich
  // grösseren 180×55-Plankopf reicht die alte Schätzung nicht mehr aus, neu
  // platzierter Auto-Fuellungs-Inhalt würde sonst in den Plankopf hineinragen.
  const PLANKOPF_RESERVE = plankopfReserveMm().hoehe;
  const x0 = RAND;
  const y0 = RAND;
  const x1 = paper.width - RAND;
  const y1 = paper.height - RAND - PLANKOPF_RESERVE;
  const usableW = Math.max(0, x1 - x0);
  const usableH = Math.max(0, y1 - y0);

  const SPALTEN_ZIEL = 200; // mm Zielbreite je Spalte
  const spalten = Math.min(3, Math.max(1, Math.floor(usableW / SPALTEN_ZIEL) || 1));
  const spaltenBreite = usableW / spalten;
  const ZEILEN_HOEHE = 150; // mm, generische Zellhöhe
  const maxZeilen = Math.max(1, Math.floor(usableH / ZEILEN_HOEHE));
  const GUTTER = 6;

  // Belegte Zellen aus bereits vorhandenem Blattinhalt markieren
  const belegt = new Set<string>();
  const zelleVon = (cx: number, cy: number): string => {
    const col = Math.min(spalten - 1, Math.max(0, Math.floor((cx - x0) / spaltenBreite)));
    const row = Math.max(0, Math.floor((cy - y0) / ZEILEN_HOEHE));
    return `${row}:${col}`;
  };
  for (const pl of sheet.placements) {
    const b = placementPaperBounds(doc, pl);
    belegt.add(zelleVon(b.x + b.width / 2, b.y + b.height / 2));
  }
  for (const bild of sheet.bilder ?? []) {
    const b = imagePaperBounds(doc, bild);
    belegt.add(zelleVon(b.x + b.width / 2, b.y + b.height / 2));
  }
  for (const t of sheet.texte ?? []) {
    const b = textPaperBounds(t);
    belegt.add(zelleVon(b.x + b.width / 2, b.y + b.height / 2));
  }

  // Freie Zellen in Lesereihenfolge (oben→unten, links→rechts) sammeln
  const freieZellen: { row: number; col: number }[] = [];
  for (let row = 0; row < maxZeilen && freieZellen.length < kandidaten.length; row++) {
    for (let col = 0; col < spalten; col++) {
      if (!belegt.has(`${row}:${col}`)) freieZellen.push({ row, col });
    }
  }

  const vorschlaege: BlattVorschlag[] = [];
  kandidaten.forEach((k, i) => {
    const zelle = freieZellen[i];
    if (!zelle) {
      hinweise.push(`«${k.label}» passt nicht mehr aufs Blatt — kein freier Platz im Raster`);
      return;
    }
    const zellX0 = x0 + zelle.col * spaltenBreite;
    const zellY0 = y0 + zelle.row * ZEILEN_HOEHE;
    const zellW = spaltenBreite - 2 * GUTTER;
    const zellH = ZEILEN_HOEHE - 2 * GUTTER;
    const cx = zellX0 + spaltenBreite / 2;
    const cy = zellY0 + ZEILEN_HOEHE / 2;
    // Bild-Slots/Text brauchen keine Massstabswahl — nur Grundriss/Schnitt/Axo
    const scale = passendeSkala(k.breite, k.hoehe, zellW, zellH);
    const vorschlag = k.bauen(cx, cy, scale, Math.round(zellW));
    if (vorschlag.art === 'bild') {
      // Bild-Slot: x/y = linke obere Ecke, nicht Mitte
      vorschlaege.push({ ...vorschlag, x: Math.round(zellX0 + GUTTER), y: Math.round(zellY0 + GUTTER) });
    } else if (vorschlag.art === 'text') {
      // Text: x/y = linke obere Ecke / Basislinie erste Zeile — oben in der Zelle, nicht in der Mitte
      vorschlaege.push({ ...vorschlag, x: Math.round(zellX0 + GUTTER), y: Math.round(zellY0 + GUTTER + vorschlag.size) });
    } else {
      vorschlaege.push(vorschlag);
    }
  });

  return { vorschlaege, hinweise };
}

/** Menschenlesbarer Bericht — was platziert wurde + was im Modell fehlt
 * (für Command-Zusammenfassung und UI-Meldung). */
export function formatBelegungsBericht(v: BlattBelegungsVorschlag): string {
  const anzahl = (art: BlattVorschlag['art']) => v.vorschlaege.filter((x) => x.art === art).length;
  const teile: string[] = [];
  const g = anzahl('grundriss');
  const s = anzahl('schnitt');
  if (g > 0) teile.push(`${g} Grundriss${g === 1 ? '' : 'e'}`);
  if (s > 0) teile.push(`${s} Schnitt${s === 1 ? '' : 'e'}`);
  if (v.vorschlaege.some((x) => x.art === 'situationsplan')) teile.push('Situationsplan');
  if (v.vorschlaege.some((x) => x.art === 'axo')) teile.push('Axonometrie');
  if (v.vorschlaege.some((x) => x.art === 'text')) teile.push('Kennzahlen');
  const bild = v.vorschlaege.find((x): x is Extract<BlattVorschlag, { art: 'bild' }> => x.art === 'bild');
  if (bild) teile.push(bild.assetId ? 'Render' : 'Render-Platzhalter');

  const platziert = teile.length > 0 ? `Platziert: ${teile.join(', ')}` : 'Blatt bereits vollständig — nichts zu ergänzen';
  const hinweise = v.hinweise.length > 0 ? ` · Fehlt im Modell: ${v.hinweise.join('; ')}` : '';
  return platziert + hinweise;
}
