import type {
  Assembly,
  MassBody,
  Opening,
  Roof,
  Slab,
  Stair,
  Storey,
  Wall,
  Zone,
} from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { assemblyThickness } from '../geometry/wall';
import { areaOf, massFloors } from './sia416';

/**
 * Mengenauszug (KosmoDraw) — ehrliche Modellmengen aus der Parametrik,
 * mit IFC-Identität je Position. Grundlage für Vorausmasse in der
 * Wettbewerbs-/Vorprojektphase; KEIN Ersatz fürs Ausmass nach NPK:
 * Wandflächen sind Achslänge × Höhe abzüglich Öffnungen, ohne
 * Leibungen/Anschlüsse.
 */

export interface MengenPosition {
  kind: string;
  ifcKlasse: string;
  bezeichnung: string;
  anzahl: number;
  /** Achs-/Lauflänge in m. */
  laenge?: number;
  /** Fläche in m² (Wände: Ansichtsfläche; Decken/Dächer/Zonen: Grundfläche). */
  flaeche?: number;
  /** Volumen in m³. */
  volumen?: number;
}

export interface Mengenauszug {
  positionen: MengenPosition[];
}

const M = 1000;
const M2 = 1_000_000;
const M3 = 1_000_000_000;

function wallHeight(doc: KosmoDoc, w: Wall): number {
  if (w.heightMode === 'fix' && w.height) return w.height;
  const s = doc.get<Storey>(w.storeyId);
  return s ? s.height : 3000;
}

export function deriveMengen(doc: KosmoDoc): Mengenauszug {
  const positionen: MengenPosition[] = [];

  // Wände — je Aufbau eine Position (so denkt der Devisierende)
  const walls = doc.byKind<Wall>('wall');
  const nachAufbau = new Map<string, Wall[]>();
  for (const w of walls) {
    const list = nachAufbau.get(w.assemblyId) ?? [];
    list.push(w);
    nachAufbau.set(w.assemblyId, list);
  }
  for (const [assemblyId, group] of nachAufbau) {
    const asm = doc.get<Assembly>(assemblyId);
    const dicke = asm && asm.kind === 'assembly' ? assemblyThickness(asm) : 200;
    let laenge = 0;
    let flaeche = 0;
    let oeffnungen = 0;
    for (const w of group) {
      const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
      const h = wallHeight(doc, w);
      laenge += len;
      flaeche += len * h;
      for (const o of doc.openingsOf(w.id) as Opening[]) {
        oeffnungen += o.width * o.height;
      }
    }
    const netto = flaeche - oeffnungen;
    positionen.push({
      kind: 'wall',
      ifcKlasse: 'IfcWall',
      bezeichnung: asm?.kind === 'assembly' ? asm.name : 'Wand',
      anzahl: group.length,
      laenge: laenge / M,
      flaeche: netto / M2,
      volumen: (netto * dicke) / M3,
    });
  }

  // Öffnungen
  const openings = doc.byKind<Opening>('opening');
  for (const typ of ['fenster', 'tuer'] as const) {
    const group = openings.filter((o) => o.openingType === typ);
    if (group.length === 0) continue;
    positionen.push({
      kind: `opening:${typ}`,
      ifcKlasse: typ === 'fenster' ? 'IfcWindow' : 'IfcDoor',
      bezeichnung: typ === 'fenster' ? 'Fenster' : 'Türen',
      anzahl: group.length,
      flaeche: group.reduce((a, o) => a + o.width * o.height, 0) / M2,
    });
  }

  // Decken
  const slabs = doc.byKind<Slab>('slab');
  if (slabs.length > 0) {
    const flaeche = slabs.reduce((a, s) => a + areaOf(s.outline), 0);
    positionen.push({
      kind: 'slab',
      ifcKlasse: 'IfcSlab',
      bezeichnung: 'Decken/Bodenplatten',
      anzahl: slabs.length,
      flaeche,
      volumen: slabs.reduce((a, s) => a + areaOf(s.outline) * (s.thickness / M), 0),
    });
  }

  // Dächer (Grundfläche; echte Dachfläche folgt mit der Abwicklung)
  const roofs = doc.byKind<Roof>('roof');
  if (roofs.length > 0) {
    positionen.push({
      kind: 'roof',
      ifcKlasse: 'IfcRoof',
      bezeichnung: 'Dächer (Grundfläche)',
      anzahl: roofs.length,
      flaeche: roofs.reduce((a, r) => a + areaOf(r.outline), 0),
    });
  }

  // Treppen
  const stairs = doc.byKind<Stair>('stair');
  if (stairs.length > 0) {
    positionen.push({
      kind: 'stair',
      ifcKlasse: 'IfcStair',
      bezeichnung: 'Treppen',
      anzahl: stairs.length,
      laenge: stairs.reduce((a, s) => a + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), 0) / M,
    });
  }

  // Zonen je SIA-Klasse
  const zones = doc.byKind<Zone>('zone');
  for (const sia of ['HNF', 'NNF', 'VF', 'FF', 'KF'] as const) {
    const group = zones.filter((z) => z.sia === sia);
    if (group.length === 0) continue;
    positionen.push({
      kind: `zone:${sia}`,
      ifcKlasse: 'IfcSpace',
      bezeichnung: `Zonen ${sia}`,
      anzahl: group.length,
      flaeche: group.reduce((a, z) => a + areaOf(z.outline), 0),
    });
  }

  // Volumenkörper
  const masses = doc.byKind<MassBody>('mass');
  if (masses.length > 0) {
    positionen.push({
      kind: 'mass',
      ifcKlasse: 'IfcBuildingElementProxy',
      bezeichnung: 'Volumenkörper (GF über Geschosse)',
      anzahl: masses.length,
      flaeche: masses.reduce((a, m) => a + areaOf(m.outline) * massFloors(m), 0),
      volumen: masses.reduce((a, m) => a + areaOf(m.outline) * (m.height / M), 0),
    });
  }

  return { positionen };
}
