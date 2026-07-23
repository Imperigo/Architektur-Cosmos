import { describe, expect, it } from 'vitest';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute, CommandError } from '../src/commands/core';
import '../src/commands/design';
import type { DetailMarker, Gelaender } from '../src/model/entities';
import { deriveDetail } from '../src/derive/detail';

/**
 * v0.9.2 P-D (`docs/V092-SPEZ.md` §P-D — Scope v1 BEWUSST schmal): Entity/
 * Command-Roundtrip für `DetailMarker` (`design.detailErstellen`/
 * `design.detailLoeschen`/`design.eigenschaftSetzen`) + `deriveDetail`
 * (Filter + Skalierung als reine Daten). Muster `rampe.test.ts`.
 */

function grundgeruest(): { doc: KosmoDoc; storeyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

describe('design.detailErstellen / design.detailLoeschen — Command-Roundtrip', () => {
  it('erstellt einen DetailMarker mit allen Feldern', () => {
    const { doc, storeyId } = grundgeruest();
    const res = execute(doc, 'design.detailErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 2000 },
      massstab: 5,
      name: 'Fensteranschluss',
    });
    const id = (res.patches[0] as { id: string }).id;
    const marker = doc.get<DetailMarker>(id)!;
    expect(marker.kind).toBe('detail');
    expect(marker.storeyId).toBe(storeyId);
    expect(marker.a).toEqual({ x: 0, y: 0 });
    expect(marker.b).toEqual({ x: 2000, y: 2000 });
    expect(marker.massstab).toBe(5);
    expect(marker.name).toBe('Fensteranschluss');
    expect(res.summary).toBe('Detail «Fensteranschluss» 1:5');
  });

  it('lehnt ein entartetes Rechteck ab (gleiche x-Koordinate) — Marker entsteht gar nicht erst', () => {
    const { doc, storeyId } = grundgeruest();
    expect(() =>
      execute(doc, 'design.detailErstellen', {
        storeyId,
        a: { x: 500, y: 0 },
        b: { x: 500, y: 2000 },
        massstab: 5,
        name: 'Entartet',
      }),
    ).toThrow(CommandError);
    expect(doc.byKind<DetailMarker>('detail')).toHaveLength(0);
  });

  it('lehnt ein entartetes Rechteck ab (gleiche y-Koordinate)', () => {
    const { doc, storeyId } = grundgeruest();
    expect(() =>
      execute(doc, 'design.detailErstellen', {
        storeyId,
        a: { x: 0, y: 700 },
        b: { x: 2000, y: 700 },
        massstab: 5,
        name: 'Entartet',
      }),
    ).toThrow(CommandError);
    expect(doc.byKind<DetailMarker>('detail')).toHaveLength(0);
  });

  it('lehnt massstab <= 0 ab (zod .positive() — CommandError, keine stille Klemmung)', () => {
    const { doc, storeyId } = grundgeruest();
    expect(() =>
      execute(doc, 'design.detailErstellen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 2000, y: 2000 },
        massstab: 0,
        name: 'Nullmassstab',
      }),
    ).toThrow(CommandError);
    expect(() =>
      execute(doc, 'design.detailErstellen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 2000, y: 2000 },
        massstab: -5,
        name: 'Negativ',
      }),
    ).toThrow(CommandError);
    expect(doc.byKind<DetailMarker>('detail')).toHaveLength(0);
  });

  it('Undo/Redo über invertPatches stellt den Zustand vor dem Erstellen wieder her', () => {
    const { doc, storeyId } = grundgeruest();
    const res = execute(doc, 'design.detailErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 2000 },
      massstab: 5,
      name: 'Test',
    });
    const id = (res.patches[0] as { id: string }).id;
    expect(doc.get(id)).toBeDefined();
    doc.apply(invertPatches(res.patches));
    expect(doc.get(id)).toBeUndefined();
  });

  it('löscht einen bestehenden Marker (design.detailLoeschen)', () => {
    const { doc, storeyId } = grundgeruest();
    const res = execute(doc, 'design.detailErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 2000 },
      massstab: 5,
      name: 'Test',
    });
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.detailLoeschen', { detailId: id });
    expect(doc.get(id)).toBeUndefined();
  });

  it('lehnt das Löschen eines unbekannten/falschen Ids ab', () => {
    const { doc } = grundgeruest();
    expect(() => execute(doc, 'design.detailLoeschen', { detailId: 'nichtvorhanden' })).toThrow(CommandError);
  });
});

describe('design.eigenschaftSetzen — DetailMarker(name, massstab)', () => {
  function markerErstellen(doc: KosmoDoc, storeyId: string): string {
    const res = execute(doc, 'design.detailErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 2000 },
      massstab: 5,
      name: 'Alt',
    });
    return (res.patches[0] as { id: string }).id;
  }

  it('ändert name als ECHTES Modellfeld (nicht meta.name, Muster Zone/Sheet)', () => {
    const { doc, storeyId } = grundgeruest();
    const id = markerErstellen(doc, storeyId);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'name', wert: 'Neu' });
    const marker = doc.get<DetailMarker>(id)!;
    expect(marker.name).toBe('Neu');
    expect(marker.meta?.name).toBeUndefined();
  });

  it('ändert massstab auf einen gültigen Wert', () => {
    const { doc, storeyId } = grundgeruest();
    const id = markerErstellen(doc, storeyId);
    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'massstab', wert: 10 });
    expect(doc.get<DetailMarker>(id)!.massstab).toBe(10);
  });

  it('lehnt massstab <= 0 ehrlich ab (keine stille Klemmung)', () => {
    const { doc, storeyId } = grundgeruest();
    const id = markerErstellen(doc, storeyId);
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'massstab', wert: 0 })).toThrow(
      CommandError,
    );
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'massstab', wert: -3 })).toThrow(
      CommandError,
    );
    // unverändert nach beiden abgelehnten Versuchen
    expect(doc.get<DetailMarker>(id)!.massstab).toBe(5);
  });

  it('lehnt ein nicht-änderbares Feld ab (Muster jedes anderen Kinds)', () => {
    const { doc, storeyId } = grundgeruest();
    const id = markerErstellen(doc, storeyId);
    expect(() => execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'pitch', wert: 10 })).toThrow(
      CommandError,
    );
  });
});

describe('deriveDetail — Ausschnitt-Ableitung als reine Daten', () => {
  /** Zwei Geländer: A liegt VOLLSTÄNDIG im Bereich [0,0]-[2000,2000], B
   *  VOLLSTÄNDIG ausserhalb (x=5000…) — deriveDetail muss A zeigen, B nicht. */
  function fixtureMitGelaender(): { doc: KosmoDoc; storeyId: string; detailId: string } {
    const { doc, storeyId } = grundgeruest();
    execute(doc, 'design.gelaenderZeichnen', {
      storeyId,
      punkte: [{ x: 200, y: 200 }, { x: 200, y: 1200 }],
      hoehe: 1000,
      art: 'staketen',
    });
    execute(doc, 'design.gelaenderZeichnen', {
      storeyId,
      punkte: [{ x: 5000, y: 5000 }, { x: 5000, y: 6000 }],
      hoehe: 1000,
      art: 'staketen',
    });
    const res = execute(doc, 'design.detailErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 2000 },
      massstab: 5,
      name: 'Geländeranschluss',
    });
    const detailId = (res.patches[0] as { id: string }).id;
    return { doc, storeyId, detailId };
  }

  it('zeigt nur Inhalte innerhalb des Bereichs, ausserhalb liegende bleiben weg', () => {
    const { doc, detailId } = fixtureMitGelaender();
    expect(doc.byKind<Gelaender>('gelaender')).toHaveLength(2);
    const ableitung = deriveDetail(doc, detailId);
    // 1 Handlauf-Segment + 2 Pfosten-Ticks (n = ceil(1000/1200) = 1 → k=0,1) = 3 Linien, NUR von A.
    expect(ableitung.linien).toHaveLength(3);
    for (const l of ableitung.linien) {
      expect(l.classes).toContain('gelaender');
    }
  });

  it('skaliert Koordinaten um 1/massstab, verschoben auf den Bereichs-Ursprung', () => {
    const { doc, detailId } = fixtureMitGelaender();
    const ableitung = deriveDetail(doc, detailId);
    // massstab 5 → faktor 0.2. Handlauf a=(200,200)->(40,40), b=(200,1200)->(40,240).
    const handlauf = ableitung.linien.find((l) => !l.classes.includes('gelaender-pfosten'));
    expect(handlauf).toBeDefined();
    expect(handlauf!.a).toEqual({ x: 40, y: 40 });
    expect(handlauf!.b).toEqual({ x: 40, y: 240 });
    // Pfosten-Ticks: p=(200,200) und p=(200,1200), Normale (-1,0)*80 → x=120/280, skaliert 24/56.
    const ticks = ableitung.linien.filter((l) => l.classes.includes('gelaender-pfosten'));
    expect(ticks).toHaveLength(2);
    const ys = ticks.map((t) => t.a.y).sort((a, b) => a - b);
    expect(ys).toEqual([40, 240]);
    for (const t of ticks) {
      const xs = [t.a.x, t.b.x].sort((a, b) => a - b);
      expect(xs).toEqual([24, 56]);
    }
  });

  it('liefert Meta (name/massstab/bereich) und Grösse (Welt-mm × faktor)', () => {
    const { doc, detailId } = fixtureMitGelaender();
    const ableitung = deriveDetail(doc, detailId);
    expect(ableitung.meta.name).toBe('Geländeranschluss');
    expect(ableitung.meta.massstab).toBe(5);
    expect(ableitung.meta.bereich).toEqual({ minX: 0, minY: 0, maxX: 2000, maxY: 2000 });
    expect(ableitung.groesse).toEqual({ breite: 400, hoehe: 400 });
  });

  it('leerer Bereich (keine Inhalte darin) → leere Ableitung (Linien/Regionen leer, Meta bleibt)', () => {
    const { doc, storeyId } = grundgeruest();
    // Geländer weit weg vom Detail-Bereich.
    execute(doc, 'design.gelaenderZeichnen', {
      storeyId,
      punkte: [{ x: 9000, y: 9000 }, { x: 9000, y: 9800 }],
      hoehe: 1000,
      art: 'staketen',
    });
    const res = execute(doc, 'design.detailErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 1000, y: 1000 },
      massstab: 5,
      name: 'Leer',
    });
    const detailId = (res.patches[0] as { id: string }).id;
    const ableitung = deriveDetail(doc, detailId);
    expect(ableitung.linien).toHaveLength(0);
    expect(ableitung.regionen).toHaveLength(0);
    expect(ableitung.meta.name).toBe('Leer');
  });

  it('liefert eine leere Ableitung bei unbekannter/fehlender Marker-Id (defensiv, wie derivePlan)', () => {
    const { doc } = grundgeruest();
    const ableitung = deriveDetail(doc, 'nichtvorhanden');
    expect(ableitung.linien).toHaveLength(0);
    expect(ableitung.regionen).toHaveLength(0);
    expect(ableitung.meta.name).toBe('');
    expect(ableitung.groesse).toEqual({ breite: 0, hoehe: 0 });
  });
});
