import { KosmoDoc } from '../model/doc';
import type { Aussparung, Opening } from '../model/entities';

/**
 * Umbau-Filter je Blatt-Platzierung (RE-ARCHICAD A2, ArchiCADs
 * Renovierungsfilter): dieselbe Ableitung, gefilterte Sicht — Abbruch- und
 * Neubaupläne entstehen aus EINEM Modell. Semantik der SIA-Planläufe:
 *
 *   'abbruch'  → Abbruchplan:  Bestand + Abbruch sichtbar, Neubau weg
 *   'neu'      → Neubauplan:   Bestand + Neu sichtbar, Abbruch weg
 *   'bestand'  → Bestandsplan: nur Bestand (und Unmarkiertes)
 *   undefined  → kombinierter Plan (heutiges Verhalten, alle Farben)
 */
export type UmbauFilter = 'bestand' | 'abbruch' | 'neu';

/**
 * Gefilterte Sicht auf den Doc: Bauteile mit ausgeblendetem Umbau-Status
 * fehlen, ihre Kinder (Öffnungen der Wand, Aussparungen des Wirts) mit.
 * Ohne Filter kommt der Original-Doc zurück (keine Kopie, byte-identische
 * Ableitungen). Der Klon teilt die Entity-Objekte — NUR für Ableitungen
 * verwenden, nie mutieren.
 */
export function docFuerUmbau(doc: KosmoDoc, filter?: UmbauFilter): KosmoDoc {
  if (!filter) return doc;
  const versteckt =
    filter === 'abbruch'
      ? new Set(['neu'])
      : filter === 'neu'
        ? new Set(['abbruch'])
        : new Set(['neu', 'abbruch']);
  const weg = new Set<string>();
  for (const [id, e] of doc.entities) {
    const ren = e.meta?.renovation;
    if (ren && versteckt.has(ren)) weg.add(id);
  }
  const sicht = new KosmoDoc();
  sicht.settings = doc.settings;
  for (const [id, e] of doc.entities) {
    if (weg.has(id)) continue;
    if (e.kind === 'opening' && weg.has((e as Opening).wallId)) continue;
    if (e.kind === 'aussparung' && weg.has((e as Aussparung).hostId)) continue;
    sicht.entities.set(id, e);
  }
  return sicht;
}

/** Kurzlabel fürs Blatt (Titelzeile der Platzierung). */
export const UMBAU_LABEL: Record<UmbauFilter, string> = {
  bestand: 'Bestand',
  abbruch: 'Abbruch',
  neu: 'Neubau',
};
