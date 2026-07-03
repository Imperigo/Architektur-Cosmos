import type { KosmoDoc } from '../model/doc';
import type { Stair, Zone } from '../model/entities';
import { polygonArea } from '../model/units';

/**
 * Raumtyp-Copilot (V2-F10): Heuristik-Vorschlag für Zonen ohne Raumtyp —
 * Form und Fläche statt Magie, mit Begründung. Der Klick übernimmt
 * (gated wie alles); daneben immer manuell wählbar.
 */

export interface RaumTypVorschlag {
  raumTyp: 'zimmer' | 'wohnen' | 'kueche' | 'bad' | 'korridor' | 'treppenhaus' | 'abstellraum';
  grund: string;
}

export function raumTypVorschlag(doc: KosmoDoc, zone: Zone): RaumTypVorschlag | null {
  if (zone.raumTyp) return null;
  const flaeche = Math.abs(polygonArea(zone.outline)) / 1e6;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of zone.outline) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const kurz = Math.min(maxX - minX, maxY - minY);
  const lang = Math.max(maxX - minX, maxY - minY);

  // Treppe in der Zone → Treppenhaus
  const inZone = (p: { x: number; y: number }) =>
    p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  for (const t of doc.byKind<Stair>('stair')) {
    if (t.storeyId === zone.storeyId && (inZone(t.a) || inZone(t.b))) {
      return { raumTyp: 'treppenhaus', grund: 'Treppe liegt in der Zone' };
    }
  }
  if (lang / Math.max(kurz, 1) > 2.8 && kurz < 2500) {
    return { raumTyp: 'korridor', grund: `schmal-lang (${(kurz / 1000).toFixed(1)} m breit)` };
  }
  if (flaeche < 2) return { raumTyp: 'abstellraum', grund: `${flaeche.toFixed(1)} m²` };
  if (flaeche < 5.5) return { raumTyp: 'bad', grund: `${flaeche.toFixed(1)} m² — Nasszellen-Format` };
  if (flaeche < 8.5) return { raumTyp: 'kueche', grund: `${flaeche.toFixed(1)} m²` };
  if (flaeche < 17) return { raumTyp: 'zimmer', grund: `${flaeche.toFixed(1)} m²` };
  return { raumTyp: 'wohnen', grund: `${flaeche.toFixed(1)} m² — grösster Wohnraum-Bereich` };
}
