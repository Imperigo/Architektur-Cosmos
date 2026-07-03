import type { KosmoDoc } from '../model/doc';
import type { Zone, ZonenTuer } from '../model/entities';
import type { Pt } from '../model/units';

/**
 * Wände aus Zonen (Schlussstein des Generator-Strangs): Die achsparallelen
 * Kanten aller Räume (Zonen MIT Raumtyp) werden in atomare Intervalle
 * zerlegt — ein Intervall, das ZWEI Räume berühren, wird EINE Innenwand
 * (dedupliziert), eines mit nur EINEM Raum wird Aussenwand. Zonentüren auf
 * einer Wandachse werden zu echten Öffnungen. Nicht-achsparallele Kanten
 * werden gemeldet, nicht verschwiegen.
 */

export interface WandVorschlag {
  a: Pt;
  b: Pt;
  typ: 'aussen' | 'innen' | 'trennwand';
  /** Zonentüren, die auf dieser Achse liegen (center = mm ab a). */
  tueren: { center: number; breite: number; tuerId: string }[];
}

export interface ZonenWaende {
  waende: WandVorschlag[];
  diagnose: string[];
}

interface Seg {
  fix: number; // y bei horizontal, x bei vertikal
  von: number;
  bis: number;
}

function segmente(zonen: Zone[], horizontal: boolean, diagnose: string[]): Seg[] {
  const raus: Seg[] = [];
  for (const z of zonen) {
    for (let i = 0; i < z.outline.length; i++) {
      const a = z.outline[i]!;
      const b = z.outline[(i + 1) % z.outline.length]!;
      if (a.y === b.y && horizontal && a.x !== b.x) {
        raus.push({ fix: a.y, von: Math.min(a.x, b.x), bis: Math.max(a.x, b.x) });
      } else if (a.x === b.x && !horizontal && a.y !== b.y) {
        raus.push({ fix: a.x, von: Math.min(a.y, b.y), bis: Math.max(a.y, b.y) });
      } else if (a.x !== b.x && a.y !== b.y && horizontal) {
        diagnose.push(`Schräge Kante in «${z.name}» — übersprungen (v1 kann nur achsparallel).`);
      }
    }
  }
  return raus;
}

/** Atomare Intervalle einer Achslage: Deckungszahl 1 = aussen, 2 = innen. */
function laeufe(segs: Seg[]): { von: number; bis: number; anzahl: number }[] {
  const punkte = [...new Set(segs.flatMap((s) => [s.von, s.bis]))].sort((a, b) => a - b);
  const atome: { von: number; bis: number; anzahl: number }[] = [];
  for (let i = 0; i < punkte.length - 1; i++) {
    const von = punkte[i]!;
    const bis = punkte[i + 1]!;
    const mitte = (von + bis) / 2;
    const anzahl = segs.filter((s) => s.von <= mitte && mitte <= s.bis).length;
    if (anzahl > 0) atome.push({ von, bis, anzahl });
  }
  // Nachbarn mit gleicher Deckung verschmelzen
  const runs: typeof atome = [];
  for (const a of atome) {
    const letzter = runs[runs.length - 1];
    if (letzter && letzter.bis === a.von && (letzter.anzahl >= 2) === (a.anzahl >= 2)) {
      letzter.bis = a.bis;
    } else {
      runs.push({ ...a });
    }
  }
  return runs;
}

function imPoly(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function zonenZuWaenden(doc: KosmoDoc, storeyId: string): ZonenWaende {
  const diagnose: string[] = [];
  const zonen = doc
    .byKind<Zone>('zone')
    .filter((z) => z.storeyId === storeyId && z.raumTyp);
  if (zonen.length === 0) {
    return { waende: [], diagnose: ['Keine Räume (Zonen mit Raumtyp) auf dem Geschoss.'] };
  }
  // Wohnungs-Container (Zonen mit program) für die Trennwand-Erkennung
  const wohnungen = doc
    .byKind<Zone>('zone')
    .filter((z) => z.storeyId === storeyId && z.program && !z.raumTyp);
  const wohnungVon = (p: Pt): string | null => wohnungen.find((w) => imPoly(p, w.outline))?.id ?? null;
  const tueren = doc.byKind<ZonenTuer>('zonentuer').filter((t) => t.storeyId === storeyId);
  const waende: WandVorschlag[] = [];

  for (const horizontal of [true, false]) {
    const alle = segmente(zonen, horizontal, horizontal ? diagnose : []);
    const proLage = new Map<number, Seg[]>();
    for (const s of alle) {
      const liste = proLage.get(s.fix) ?? [];
      liste.push(s);
      proLage.set(s.fix, liste);
    }
    for (const [fix, segs] of proLage) {
      for (const run of laeufe(segs)) {
        if (run.bis - run.von < 100) continue;
        const a: Pt = horizontal ? { x: run.von, y: fix } : { x: fix, y: run.von };
        const b: Pt = horizontal ? { x: run.bis, y: fix } : { x: fix, y: run.bis };
        const wandTueren = tueren
          .filter((t) =>
            horizontal
              ? Math.abs(t.at.y - fix) < 200 && t.at.x > run.von && t.at.x < run.bis
              : Math.abs(t.at.x - fix) < 200 && t.at.y > run.von && t.at.y < run.bis,
          )
          .map((t) => ({
            center: horizontal ? t.at.x - run.von : t.at.y - run.von,
            breite: t.breite,
            tuerId: t.id,
          }));
        let typ: 'aussen' | 'innen' | 'trennwand' = run.anzahl >= 2 ? 'innen' : 'aussen';
        if (typ === 'innen') {
          // Räume beidseits der Laufmitte in VERSCHIEDENEN Wohnungen → Trennwand
          const mitte = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const n = horizontal ? { x: 0, y: 1 } : { x: 1, y: 0 };
          const w1 = wohnungVon({ x: mitte.x + n.x * 300, y: mitte.y + n.y * 300 });
          const w2 = wohnungVon({ x: mitte.x - n.x * 300, y: mitte.y - n.y * 300 });
          if (w1 && w2 && w1 !== w2) typ = 'trennwand';
        }
        waende.push({ a, b, typ, tueren: wandTueren });
      }
    }
  }
  diagnose.push(
    `${waende.filter((w) => w.typ === 'aussen').length} Aussen-, ${waende.filter((w) => w.typ === 'innen').length} Innen-, ${waende.filter((w) => w.typ === 'trennwand').length} Trennwände (Schallschutz), ${waende.reduce((s2, w) => s2 + w.tueren.length, 0)} Türen übernommen.`,
  );
  return { waende, diagnose };
}
