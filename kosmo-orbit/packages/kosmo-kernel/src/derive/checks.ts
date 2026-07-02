import type { KosmoDoc } from '../model/doc';
import type { Assembly, Opening, Stair, Storey, Wall, Zone } from '../model/entities';
import { polygonArea } from '../model/units';
import { stairSpec } from '../commands/design';

/**
 * Grundriss-Checks (Q12, Finch-Essenz) — Regeln laufen live auf der
 * Parametrik, nie auf Pixeln. V1 prüft die täglichen Stolperer des
 * CH-Wohnbaus; Schwere ehrlich dreistufig. Richtwerte, kein Normersatz.
 */

export interface PruefBefund {
  schwere: 'fehler' | 'warnung' | 'hinweis';
  regel: string;
  text: string;
  entityId?: string;
}

/** Kleinste Seitenlänge der Bounding-Box (V1-Näherung der lichten Breite). */
function minBreite(outline: { x: number; y: number }[]): number {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return Math.min(maxX - minX, maxY - minY);
}

export function pruefeGrundriss(doc: KosmoDoc, storeyId: string): PruefBefund[] {
  const befunde: PruefBefund[] = [];
  const storey = doc.get<Storey>(storeyId);
  if (!storey || storey.kind !== 'storey') return befunde;

  // Zonen: Zimmerbreite + Mindestfläche (HNF)
  for (const z of doc.byKind<Zone>('zone')) {
    if (z.storeyId !== storeyId) continue;
    const b = minBreite(z.outline);
    const flaeche = polygonArea(z.outline) / 1e6;
    if (z.sia === 'HNF' && b < 2400) {
      befunde.push({
        schwere: 'warnung',
        regel: 'Zimmerbreite',
        text: `«${z.name}» ist nur ${(b / 1000).toFixed(2)} m breit (Richtwert Wohnräume ≥ 2.40 m)`,
        entityId: z.id,
      });
    }
    if (z.sia === 'HNF' && flaeche < 10) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Zimmerfläche',
        text: `«${z.name}» hat ${flaeche.toFixed(1)} m² (Einzelzimmer üblich ≥ 10 m²)`,
        entityId: z.id,
      });
    }
  }

  // Türen: hindernisfreie Breite
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const assembly = doc.get<Assembly>(w.assemblyId);
    if (!assembly || assembly.kind !== 'assembly') {
      befunde.push({
        schwere: 'fehler',
        regel: 'Aufbau',
        text: 'Wand ohne gültigen Aufbau — Ableitung unvollständig',
        entityId: w.id,
      });
      continue;
    }
    for (const o of doc.openingsOf(w.id) as Opening[]) {
      if (o.openingType === 'tuer' && o.width < 800) {
        befunde.push({
          schwere: 'warnung',
          regel: 'Türbreite',
          text: `Tür nur ${o.width} mm breit (hindernisfrei SIA 500: ≥ 800 mm)`,
          entityId: o.id,
        });
      }
      if (o.openingType === 'fenster' && o.sill > 0 && o.sill < 600) {
        befunde.push({
          schwere: 'hinweis',
          regel: 'Brüstung',
          text: `Fensterbrüstung ${o.sill} mm — Absturzsicherung prüfen (üblich ≥ 900 mm oder Geländer)`,
          entityId: o.id,
        });
      }
    }
  }

  // Treppen: Schrittmass + Steigung
  for (const st of doc.byKind<Stair>('stair')) {
    if (st.storeyId !== storeyId) continue;
    const len = Math.hypot(st.b.x - st.a.x, st.b.y - st.a.y);
    const spec = stairSpec(len, storey.height);
    if (spec.comfort < 590 || spec.comfort > 650) {
      befunde.push({
        schwere: 'warnung',
        regel: 'Schrittmass',
        text: `Treppe: 2s+a = ${Math.round(spec.comfort)} mm (bequem 590–650); Lauf anpassen`,
        entityId: st.id,
      });
    }
    if (spec.riser > 180) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Steigung',
        text: `Treppensteigung ${Math.round(spec.riser)} mm (Wohnbau üblich ≤ 180 mm)`,
        entityId: st.id,
      });
    }
    if (st.width < 1000) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Laufbreite',
        text: `Treppenlauf ${st.width} mm (CH-üblich ≥ 1000 mm, Fluchtweg ≥ 1200 mm)`,
        entityId: st.id,
      });
    }
  }

  // Geschoss: lichte Höhe (grob: Geschosshöhe − 300 mm Decke/Boden)
  if (storey.height - 300 < 2300) {
    befunde.push({
      schwere: 'warnung',
      regel: 'Raumhöhe',
      text: `Geschosshöhe ${storey.height} mm ergibt unter ~2.30 m lichte Höhe`,
      entityId: storey.id,
    });
  }

  const rang = { fehler: 0, warnung: 1, hinweis: 2 } as const;
  return befunde.sort((a, b) => rang[a.schwere] - rang[b.schwere]);
}
