import type { KosmoDoc } from '../model/doc';
import type { MassBody, Zone } from '../model/entities';
import type { Pt } from '../model/units';
import { bboxVonPunkte, projiziereUmriss, type BBox } from './studienbeurteilung';
import { BLATT, DASH, SCHWARZPLAN_FARBEN, STIFT } from './stilblatt';

/**
 * Schwarzplan/Situationsplan v1 (v0.7.0 E4, `docs/V070-KONZEPT.md`) —
 * eigenständiges, massstabstreues SVG-Blatt: Parzellengrenze strichpunktiert
 * + Gebäude-Footprints schwarz gefüllt + Nordpfeil + Massstabsbalken. Reine
 * Ableitung (kein Doc-Schreiben), analog zu `studienbericht.ts`/
 * `studienbeurteilung.ts` — Bbox/Projektion kommen von dort (`bboxVonPunkte`/
 * `projiziereUmriss`, «gemeinsame Quelle»).
 *
 * EHRLICHE GRENZEN dieses Moduls (v1, Owner-Vorgabe «nichts erfinden»):
 * - Parzelle: NUR aus einer via `standort.ts` `parzelleZuOutline()` →
 *   `DesignWorkspace.tsx` `parzelleImportieren()` importierten Zone erkennbar
 *   — diese vergibt als EINZIGE Stelle im Kernel `sia:'KF'` an eine
 *   Zonen-Umriss (kein legitimer eigenständiger KF-Nutzungszweck sonst,
 *   verifiziert per Repo-weitem Suchlauf). Eine handgezeichnete Zone mit
 *   `sia:'KF'` würde ebenfalls greifen — akzeptabel (dieselbe Geometrie-
 *   Semantik: «das ist die Parzelle»). OHNE eine solche Zone liefert
 *   `schwarzplanSvg` `null` (Daten-Guard) — KEIN Rateversuch aus
 *   `doc.settings.standort` (der trägt nur einen Punkt, keinen Umriss) und
 *   KEIN Rückgriff auf `Boundary`/Baugrenze (das ist die Bau-/Setzlinie nach
 *   Baugesetz, NICHT die Katastergrenze — beide zu verwechseln wäre falsch,
 *   nicht bloss ungenau).
 * - Gebäude-Footprints: NUR aus `MassBody`-Volumenkörpern (`doc.byKind
 *   ('mass')`) — dem im Kernel bereits etablierten Envelope für Fläche/AZ
 *   (`ausnuetzungsnachweis.ts`, `sia416.ts`, `mengen.ts`, `checks.ts`).
 *   Ein rein wandbasiertes Projekt OHNE MassBody-Volumen liefert (noch)
 *   KEINEN Footprint — eine Wandachsen-Näherung wäre erfunden statt aus dem
 *   Modell abgeleitet; die Lücke bleibt hier dokumentiert statt versteckt
 *   (Stream-Folgeauftrag: MassBody aus Wandzügen ableiten, falls gewünscht).
 * - Nachbarbebauung/Kontext (v0.7.1 E2/1B): Zonen mit `zonenArt:'nachbar'`
 *   (`design.nachbarnUebernehmen`, amtlicher geo.admin.ch-Import, KEIN OSM)
 *   erscheinen als GRAUE Footprints (`#8a8a8a`) — reine Kontext-Geometrie,
 *   von Raumtyp-Checks/SIA-416 ausgenommen (s. `model/entities.ts`
 *   `Zone.zonenArt`). Eigene Footprints (`MassBody`) bleiben SCHWARZ
 *   (`#1a1a1a`) und zeichnen zuletzt — Situationsplan-Usanz «eigenes Objekt
 *   hervorgehoben». OHNE Nachbar-Zonen bleibt die Ausgabe byte-identisch zu
 *   v0.7.0 (Daten-Guard: der Nachbar-Block bleibt bei leerer Liste
 *   wirkungslos). `Viewport3D.tsx`s `contextMeshes` (3D-GLB-Laufzeitablage,
 *   sessionweit, NICHT im Doc/Yjs) bleibt weiterhin ausserhalb — das ist
 *   3D-Referenzgeometrie, keine 2D-Situationsplan-Quelle.
 * - Nordpfeil: Modellkonvention `standort.ts` («Nord bleibt +y») — KEIN
 *   LV95-Koordinatenrahmen in v1 (nur Nordpfeil + Massstabsbalken verlangt,
 *   s. Auftragstext; ein Koordinatenraster wäre zusätzliche Politur, hier
 *   ehrlich ausgelassen statt suggeriert).
 */

/** Sia416Class-Marke für eine importierte Parzelle — s. Modul-Kommentar. */
const PARZELLEN_SIA_MARKE = 'KF';

/** Rundwert je Massstab für den Massstabsbalken (m) — 20 m bei 1:500 (rund
 *  10 % der A4-Blattbreite ~1:500), 50 m bei 1:1000. */
const BALKEN_LAENGE_M: Record<500 | 1000, number> = { 500: 20, 1000: 50 };

/** Weltmass-Rand (mm) um Parzelle+Footprints — Platz für Nordpfeil/Balken,
 *  ohne die Geometrie am Blattrand zu bedrängen. */
const RAND_MM = 3000;

export interface SchwarzplanOptionen {
  /** Ziel-Massstab; Default 500 (1:500, CH-Situationsplan-Konvention). */
  massstab?: 500 | 1000;
}

export interface SchwarzplanErgebnis {
  /** Eigenständiges, druckfähiges SVG (mm-Papiereinheiten, 1 SVG-Einheit = 1 Papier-mm). */
  svg: string;
  massstab: 500 | 1000;
  /** Welt-mm-Bounds (Parzelle+Footprints, OHNE Rand) — für Aufrufer/Debug. */
  bounds: BBox;
}

/** Parzellen-Umriss — s. Modul-Kommentar für die Erkennungsregel. */
function parzellenUmriss(doc: KosmoDoc): Pt[] | null {
  const parzelle = doc.byKind<Zone>('zone').find((z) => z.sia === PARZELLEN_SIA_MARKE);
  return parzelle && parzelle.outline.length >= 3 ? parzelle.outline : null;
}

/** Gebäude-Footprints — s. Modul-Kommentar für die Grenze (nur MassBody). */
function gebaeudeFootprints(doc: KosmoDoc): Pt[][] {
  return doc
    .byKind<MassBody>('mass')
    .map((m) => m.outline)
    .filter((o) => o.length >= 3);
}

/** Nachbar-Footprints (v0.7.1 E2/1B) — Zonen mit `zonenArt:'nachbar'`, s.
 *  Modul-Kommentar. Leer, solange keine solchen Zonen existieren (Daten-
 *  Guard: die Ausgabe bleibt dann byte-identisch zu v0.7.0). */
function nachbarFootprints(doc: KosmoDoc): Pt[][] {
  return doc
    .byKind<Zone>('zone')
    .filter((z) => z.zonenArt === 'nachbar')
    .map((z) => z.outline)
    .filter((o) => o.length >= 3);
}

export interface SchwarzplanGeometrie {
  parzelle: Pt[];
  footprints: Pt[][];
  /** Nachbar-Footprints (v0.7.1 E2/1B) — leer ohne Nachbar-Zonen. */
  nachbarn: Pt[][];
  /** Welt-mm-Bounds von Parzelle+Footprints+Nachbarn, OHNE Rand (roh). */
  bounds: BBox;
}

/**
 * Sammelt Parzelle+Footprints+Nachbarn+Bbox — Guard/Ehrlichkeitsregeln s.
 * Modul-Kommentar. `null` ohne erkennbare Parzelle. Gemeinsame Quelle für
 * `schwarzplanSvg` (unten, eigenständiges Blatt) UND `sheet.ts`s additive
 * Situationsplan-Vorbereitung (`situationsplanInnerSvg`, v0.7.0 E4) — beide
 * brauchen dieselbe Entitäts-Erkennung, keine doppelte Guard-Logik.
 */
export function schwarzplanGeometrie(doc: KosmoDoc): SchwarzplanGeometrie | null {
  const parzelle = parzellenUmriss(doc);
  if (!parzelle) return null;
  const footprints = gebaeudeFootprints(doc);
  const nachbarn = nachbarFootprints(doc);
  const bounds = bboxVonPunkte([parzelle, ...footprints, ...nachbarn]);
  if (!bounds) return null;
  return { parzelle, footprints, nachbarn, bounds };
}

/**
 * Schwarzplan/Situationsplan v1: Parzellengrenze strichpunktiert +
 * Footprints schwarz gefüllt + Nordpfeil + Massstabsbalken. `null` ohne
 * erkennbare Parzelle (Daten-Guard, s. Modul-Kommentar) — Aufrufer (Sheet-
 * Komposition) zeigt dann ehrlich «kein Situationsplan ableitbar» statt
 * eines leeren, aber als Situationsplan beschrifteten Blatts.
 */
export function schwarzplanSvg(doc: KosmoDoc, opts?: SchwarzplanOptionen): SchwarzplanErgebnis | null {
  const geo = schwarzplanGeometrie(doc);
  if (!geo) return null;
  const { parzelle, footprints, nachbarn, bounds: bbRoh } = geo;
  const massstab = opts?.massstab ?? 500;
  const bb: BBox = {
    minX: bbRoh.minX - RAND_MM,
    minY: bbRoh.minY - RAND_MM,
    maxX: bbRoh.maxX + RAND_MM,
    maxY: bbRoh.maxY + RAND_MM,
  };

  const f = 1 / massstab; // Welt-mm → Papier-mm, massstabstreu (wie plansvg.ts)
  const paperW = (bb.maxX - bb.minX) * f;
  const paperH = (bb.maxY - bb.minY) * f;
  const projiziere = (outline: Pt[]): string => projiziereUmriss(outline, bb, f, 0, 0);

  const teile: string[] = [];
  teile.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paperW.toFixed(2)}mm" height="${paperH.toFixed(2)}mm" viewBox="0 0 ${paperW.toFixed(2)} ${paperH.toFixed(2)}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${paperW.toFixed(2)}" height="${paperH.toFixed(2)}" fill="white"/>`,
  );

  // Parzellengrenze strichpunktiert (dieselbe Dash-Kadenz wie `baugrenze` in
  // plansvg.ts, hier direkt in Papier-mm statt Welt-mm×scale).
  teile.push(
    `<polygon points="${projiziere(parzelle)}" fill="none" stroke="${SCHWARZPLAN_FARBEN.parzelle}" stroke-width="${STIFT.sekundaer}" stroke-dasharray="${DASH.strichpunktBestand.join(' ')}"/>`,
  );

  // Nachbar-Footprints grau (v0.7.1 E2/1B, Kontext-Geometrie) — zeichnen VOR
  // den eigenen Footprints, damit «eigenes Objekt hervorgehoben» bleibt.
  // Ohne Nachbar-Zonen ist `nachbarn` leer — dieser Block bleibt dann
  // wirkungslos (Daten-Guard, byte-identisch zu v0.7.0).
  for (const np of nachbarn) {
    teile.push(`<polygon points="${projiziere(np)}" fill="${SCHWARZPLAN_FARBEN.nachbar}" stroke="none"/>`);
  }

  // Gebäude-Footprints schwarz gefüllt (eigene Objekte, zeichnen zuletzt)
  for (const fp of footprints) {
    teile.push(`<polygon points="${projiziere(fp)}" fill="${SCHWARZPLAN_FARBEN.eigen}" stroke="none"/>`);
  }

  // Nordpfeil oben rechts (SIA 400 C.2.1) — Nord = +y (standort.ts-Konvention)
  const nx = paperW - 10;
  const ny = 10;
  teile.push(
    `<g stroke="${BLATT.tinte}" fill="none" stroke-width="${BLATT.rahmenStift}">`,
    `<circle cx="${nx.toFixed(2)}" cy="${ny.toFixed(2)}" r="4"/>`,
    `<path d="M ${nx.toFixed(2)} ${(ny + 3).toFixed(2)} L ${nx.toFixed(2)} ${(ny - 3).toFixed(2)} M ${(nx - 1.4).toFixed(2)} ${(ny - 1.4).toFixed(2)} L ${nx.toFixed(2)} ${(ny - 3).toFixed(2)} L ${(nx + 1.4).toFixed(2)} ${(ny - 1.4).toFixed(2)}"/>`,
    `<text x="${nx.toFixed(2)}" y="${(ny + 9).toFixed(2)}" text-anchor="middle" font-size="3" stroke="none" fill="${BLATT.tinte}">N</text>`,
    `</g>`,
  );

  // Massstabsbalken unten links
  const balkenLaengeM = BALKEN_LAENGE_M[massstab];
  const balkenPapierMm = balkenLaengeM * 1000 * f;
  const bx = 10;
  const by = paperH - 10;
  teile.push(
    `<g stroke="${BLATT.tinte}" fill="${BLATT.tinte}" stroke-width="${BLATT.rahmenStift}">`,
    `<line x1="${bx.toFixed(2)}" y1="${by.toFixed(2)}" x2="${(bx + balkenPapierMm).toFixed(2)}" y2="${by.toFixed(2)}"/>`,
    `<line x1="${bx.toFixed(2)}" y1="${(by - 1.2).toFixed(2)}" x2="${bx.toFixed(2)}" y2="${(by + 1.2).toFixed(2)}"/>`,
    `<line x1="${(bx + balkenPapierMm).toFixed(2)}" y1="${(by - 1.2).toFixed(2)}" x2="${(bx + balkenPapierMm).toFixed(2)}" y2="${(by + 1.2).toFixed(2)}"/>`,
    `<text x="${(bx + balkenPapierMm / 2).toFixed(2)}" y="${(by - 2).toFixed(2)}" text-anchor="middle" font-size="3" stroke="none">${balkenLaengeM} m · 1:${massstab}</text>`,
    `</g>`,
  );

  teile.push('</svg>');
  return { svg: teile.join('\n'), massstab, bounds: bbRoh };
}
