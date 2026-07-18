import type { KosmoDoc } from '@kosmo/kernel';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — reine, komponentenfreie
 * Publish-Aktionen, die sowohl `PublishWorkspace.tsx`s Manuell-Modus als
 * auch die neue BLATT-Insel (`island/inhalte/blatt.tsx`) brauchen. Muster
 * `modules/vis/vis-graph-aktionen.ts`/`vis-jobs.ts` (PC1): Insel-Inhalte
 * dürfen KEINE Workspace-lokalen Closures importieren (kein Prop-Pfad durch
 * die Registry, s. `island/inhalte/registry.ts`-Kopfkommentar) — geteilte
 * Logik wandert darum hierher, EIN Ort statt zweier Implementierungen.
 *
 * `PublishWorkspace.tsx`s Manuell-Zweig ruft `schnittLinie` seither ebenfalls
 * von hier — Verhalten byte-gleich (reine Verschiebung, keine Rechnung
 * geändert).
 */

export interface SchnittLinie {
  a: { x: number; y: number };
  b: { x: number; y: number };
  titel: string;
}

/** Schnitt-/Ansichtslinie aus der Modell-Bbox (Blick = linke Normale a→b). */
export function schnittLinie(
  doc: KosmoDoc,
  richtung: 'schnitt' | 'nord' | 'ost' | 'sued' | 'west',
): SchnittLinie | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const e of doc.entities.values()) {
    if (e.kind === 'wall' || e.kind === 'mass') {
      const pts = e.kind === 'wall' ? [e.a, e.b] : e.outline;
      for (const p of pts) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
  }
  if (minX === Infinity) return null;
  const midY = Math.round((minY + maxY) / 2);
  const linien = {
    schnitt: { a: { x: minX - 1000, y: midY }, b: { x: maxX + 1000, y: midY }, titel: 'Schnitt' },
    sued: { a: { x: minX - 1000, y: minY - 2000 }, b: { x: maxX + 1000, y: minY - 2000 }, titel: 'Ansicht Süd' },
    nord: { a: { x: maxX + 1000, y: maxY + 2000 }, b: { x: minX - 1000, y: maxY + 2000 }, titel: 'Ansicht Nord' },
    ost: { a: { x: maxX + 2000, y: minY - 1000 }, b: { x: maxX + 2000, y: maxY + 1000 }, titel: 'Ansicht Ost' },
    west: { a: { x: minX - 2000, y: maxY + 1000 }, b: { x: minX - 2000, y: minY - 1000 }, titel: 'Ansicht West' },
  } as const;
  return linien[richtung];
}
