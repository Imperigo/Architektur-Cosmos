import type { KosmoDoc } from '../model/doc';
import type { Boundary, Storey } from '../model/entities';
import type { Mm, Pt } from '../model/units';
import { alleBekanntenSchnitte } from './blattfuellung';
import { planInnerSvg, sectionInnerSvg } from './plansvg';

/**
 * Baugesuch-Blattsatz (v0.6.3 VP2, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 2, Owner-Hauptaufgabe K22) — kuratiert die
 * Blattliste fürs CH-Baugesuch (SIA-Teilphase 33/Bewilligung) AUS DEM
 * MODELL: reine Ableitung, kein Doc-Zugriff ausserhalb dieser Datei, keine
 * geratenen Geometrien. Ehrlich: das ist die ZUSAMMENSTELLUNG der
 * Unterlagen — die Einreichung/Behörde bleibt real, nichts wird simuliert.
 *
 * Muster wie `derive/blattfuellung.ts` (Owner-Befund K10): Priorität kommt
 * NUR aus dem, was die jeweilige Derivation TATSÄCHLICH hergibt. Was fehlt
 * (keine Parzelle, kein Schnitt, kein Fassaden-Blatt-Typ im Datenmodell),
 * wird als ehrlicher Hinweis gemeldet statt stillschweigend übersprungen
 * oder erfunden.
 */

/** Massstab-Konventionen des Baugesuch-Satzes (CH-üblich, Richtwerte). */
export const BAUGESUCH_SITUATION_SCALE = 500;
export const BAUGESUCH_GRUNDRISS_SCALE = 100;
export const BAUGESUCH_SCHNITT_SCALE = 100;

export interface BaugesuchSituation {
  storeyId: string;
  storeyName: string;
  scale: number;
}

export interface BaugesuchGrundriss {
  storeyId: string;
  storeyName: string;
  scale: number;
}

export interface BaugesuchSchnitt {
  a: Pt;
  b: Pt;
  depth: Mm;
  lookLeft: boolean;
  title: string;
  scale: number;
}

export interface BaugesuchSatzVorschlag {
  /** Situationsplan (Baugrenze/Parzelle + Fussabdruck) — `null`, wenn das
   *  Modell keine Baugrenze hergibt (s. `hinweise`). */
  situation: BaugesuchSituation | null;
  /** Grundriss je Geschoss, das echte Geometrie liefert (1:100). */
  grundrisse: BaugesuchGrundriss[];
  /** Schnitte aus bereits im Plansatz definierten SectionSpecs (nie geraten). */
  schnitte: BaugesuchSchnitt[];
  /** Ehrliche Lücken: was das Modell (noch) nicht hergibt. */
  hinweise: string[];
}

/**
 * Schlägt die kuratierte Blattliste fürs CH-Baugesuch vor. Reine Funktion:
 * liest nur das Doc, verändert nichts. Der Command `publish.baugesuchErstellen`
 * baut daraus die eigentlichen Sheet-/Platzierungs-Patches.
 */
export function schlageBaugesuchSatzVor(doc: KosmoDoc): BaugesuchSatzVorschlag {
  const hinweise: string[] = [];
  const storeys = doc.storeysOrdered() as Storey[];

  // ── Situation: nur ableitbar, wenn eine Baugrenze (Parzelle) im Modell
  // steht — sie ist es, die derive/plan.ts als «baugrenze»-Linienzug
  // zeichnet (s. Kommentar dort). Ein reiner Standort (Geokoordinaten) ohne
  // Baugrenze liefert KEINE zeichenbare Geometrie — ehrlicher Hinweis statt
  // eines leeren, aber als «Situation» beschrifteten Blatts.
  let situation: BaugesuchSituation | null = null;
  const grenzen = doc.byKind<Boundary>('boundary');
  if (grenzen.length > 0) {
    const storeyIds = new Set(grenzen.map((g) => g.storeyId));
    const storey = storeys.find((s) => storeyIds.has(s.id));
    if (storey) {
      situation = { storeyId: storey.id, storeyName: storey.name, scale: BAUGESUCH_SITUATION_SCALE };
    } else {
      hinweise.push('Baugrenze verweist auf ein Geschoss, das nicht mehr existiert — keine Situation ableitbar');
    }
  } else if (doc.settings.standort) {
    hinweise.push('Standort gesetzt, aber keine Parzelle (Baugrenze) gezeichnet — keine Situation ableitbar (design.baugrenzeSetzen)');
  } else {
    hinweise.push('Keine Parzelle (Baugrenze) und kein Standort im Modell — keine Situation ableitbar');
  }

  // ── Grundrisse ALLER Geschosse, die echte Geometrie liefern
  const grundrisse: BaugesuchGrundriss[] = [];
  if (storeys.length === 0) {
    hinweise.push('Noch keine Geschosse im Modell — keine Grundrisse ableitbar');
  }
  for (const storey of storeys) {
    const { bounds } = planInnerSvg(doc, storey.id, BAUGESUCH_GRUNDRISS_SCALE);
    if (!bounds) {
      hinweise.push(`Geschoss «${storey.name}» hat noch keine Bauteile — kein Grundriss ableitbar`);
      continue;
    }
    grundrisse.push({ storeyId: storey.id, storeyName: storey.name, scale: BAUGESUCH_GRUNDRISS_SCALE });
  }

  // ── Mind. 1 Schnitt — NUR aus im Plansatz bereits definierten SectionSpecs
  // (nie eine geratene Linie, s. blattfuellung.ts-Modulkommentar).
  const bekannteSchnitte = alleBekanntenSchnitte(doc);
  const schnitte: BaugesuchSchnitt[] = [];
  if (bekannteSchnitte.size === 0) {
    hinweise.push('Kein Schnitt im Modell definiert — Baugesuch verlangt mind. 1 Schnitt (zuerst publish.ansichtPlatzieren)');
  } else {
    for (const [, spec] of bekannteSchnitte) {
      const { bounds } = sectionInnerSvg(doc, spec, BAUGESUCH_SCHNITT_SCALE);
      if (!bounds) {
        hinweise.push(`Schnitt «${spec.title}» liegt ausserhalb des Modells — keine Schnittfläche ableitbar`);
        continue;
      }
      schnitte.push({ a: spec.a, b: spec.b, depth: spec.depth, lookLeft: spec.lookLeft, title: spec.title, scale: BAUGESUCH_SCHNITT_SCALE });
    }
    if (schnitte.length === 0) {
      hinweise.push('Alle definierten Schnitte liegen ausserhalb des Modells — Baugesuch verlangt mind. 1 Schnitt');
    }
  }

  // ── Fassaden/Ansichten: ehrliche Lücke. `SheetPlacement.view` kennt nur
  // 'grundriss' | 'schnitt' | 'axo' — das Datenmodell hat KEINEN eigenen
  // Ansichts-/Elevations-Blatt-Typ. Nichts wird als Fassadenplan erfunden.
  hinweise.push(
    'Fassaden/Ansichten: kein eigener Blatt-Typ im Datenmodell (SheetPlacement kennt nur Grundriss/Schnitt/Axonometrie) — keine Fassadenpläne ableitbar, Lücke bleibt offen.',
  );

  return { situation, grundrisse, schnitte, hinweise };
}

/** Menschenlesbarer Bericht — analog `formatBelegungsBericht` (blattfuellung.ts):
 *  was erstellt wurde + was das Modell (noch) nicht hergibt. Das
 *  Ausnützungsnachweis-Blatt entsteht IMMER (Pflichtbeilage, auch mit «—»-Werten
 *  bei leerem Modell) — es taucht daher nicht in den Lücken auf. */
export function formatBaugesuchBericht(v: BaugesuchSatzVorschlag): string {
  const teile: string[] = [];
  if (v.situation) teile.push('Situation');
  if (v.grundrisse.length > 0) teile.push(`${v.grundrisse.length} Grundriss${v.grundrisse.length === 1 ? '' : 'e'}`);
  if (v.schnitte.length > 0) teile.push(`${v.schnitte.length} Schnitt${v.schnitte.length === 1 ? '' : 'e'}`);
  teile.push('Ausnützungsnachweis');
  const erstellt = `Baugesuch-Satz erstellt: ${teile.join(', ')}`;
  const fehlend = v.hinweise.length > 0 ? ` · Fehlt/Lücke: ${v.hinweise.join('; ')}` : '';
  return erstellt + fehlend;
}
