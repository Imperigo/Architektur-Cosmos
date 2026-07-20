import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import {
  aussparungTreffer,
  aussparungWeltpos,
  distToSegment,
  istGesperrt,
  oeffnungTreffer,
  oeffnungWeltpos,
  outlineOf,
  pickEntityAt,
  pointInPolygon,
  VERSCHIEBBAR,
  wandTreffer,
} from '../src/modules/design/plan-hit-test';

/**
 * plan-hit-test.ts trägt die reine Geometrie hinter «Anwählen» und «Ziehen»
 * im 2D-Plan (T1) — unabhängig von derivePlan/den Poché-Regionen, damit die
 * Golden-SVGs unberührt bleiben. Dieser Test deckt die Trefferzonen und den
 * Anzeige-Umriss je Bauteilart ab.
 */

function setupDoc() {
  const doc = new KosmoDoc();
  const storeyId = (execute(doc, 'design.geschossErstellen', {
    name: 'EG',
    index: 0,
    elevation: 0,
    height: 3000,
  }).patches[0] as { id: string }).id;
  const assemblyId = (execute(doc, 'design.aufbauErstellen', {
    name: 'AW',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  }).patches[0] as { id: string }).id;
  const wallId = (execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: 6000, y: 0 },
    assemblyId,
  }).patches[0] as { id: string }).id;
  const columnId = (execute(doc, 'design.stuetzeSetzen', {
    storeyId,
    at: { x: 3000, y: 3000 },
    profil: 'rechteck',
    b: 400,
  }).patches[0] as { id: string }).id;
  const stairId = (execute(doc, 'design.treppeErstellen', {
    storeyId,
    a: { x: 0, y: 5000 },
    b: { x: 0, y: 8000 },
    width: 1200,
  }).patches[0] as { id: string }).id;
  const zoneId = (execute(doc, 'design.zoneErstellen', {
    storeyId,
    outline: [
      { x: 2000, y: 2000 },
      { x: 8000, y: 2000 },
      { x: 8000, y: 8000 },
      { x: 2000, y: 8000 },
    ],
    name: 'Raum 1',
    sia: 'HNF',
  }).patches[0] as { id: string }).id;
  return { doc, storeyId, wallId, columnId, stairId, zoneId };
}

describe('pointInPolygon / distToSegment', () => {
  it('erkennt innen/aussen eines einfachen Rechtecks', () => {
    const quadrat = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(pointInPolygon(quadrat, { x: 50, y: 50 })).toBe(true);
    expect(pointInPolygon(quadrat, { x: 150, y: 50 })).toBe(false);
  });

  it('misst die kürzeste Distanz zu einem Segment', () => {
    expect(distToSegment({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(10);
    // ausserhalb des Segments: Distanz zum nächsten Endpunkt
    expect(distToSegment({ x: 150, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(50);
  });
});

describe('pickEntityAt — Trefferzonen im Grundriss (T1: Anwählen)', () => {
  it('trifft eine Wand entlang der Achse innerhalb der halben Dicke + Toleranz', () => {
    const { doc, storeyId, wallId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(wallId);
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 90 })).toBe(wallId); // halbe Dicke 100 + Toleranz
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 400 })).toBeNull();
  });

  it('trifft eine Stütze auf ihrem (ggf. gedrehten) Profil', () => {
    const { doc, storeyId, columnId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 3000 })).toBe(columnId);
    expect(pickEntityAt(doc, storeyId, { x: 3190, y: 3000 })).toBe(columnId); // b=400 → halbe Breite 200
    expect(pickEntityAt(doc, storeyId, { x: 4000, y: 3000 })).not.toBe(columnId);
  });

  it('trifft eine Treppe entlang der Lauflinie innerhalb der halben Breite', () => {
    const { doc, storeyId, stairId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 0, y: 6500 })).toBe(stairId);
    expect(pickEntityAt(doc, storeyId, { x: 590, y: 6500 })).toBe(stairId); // width 1200 → halbe 600
  });

  it('trifft eine Zone per Punkt-in-Polygon, aber erst hinter Wand/Stütze/Treppe', () => {
    const { doc, storeyId, zoneId, wallId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: 5000, y: 5000 })).toBe(zoneId);
    // Die Wand liegt ausserhalb der Zone (y=0 < 2000) — kein Widerspruch, separater Fall:
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(wallId);
  });

  it('liefert null, wenn nichts getroffen wird', () => {
    const { doc, storeyId } = setupDoc();
    expect(pickEntityAt(doc, storeyId, { x: -5000, y: -5000 })).toBeNull();
  });

  it('wählt eine gesetzte Aussparung vor der Wand, aber nur im engen Kästchen (V1-Testlauf-Befund)', () => {
    const { doc, storeyId, wallId } = setupDoc();
    // Wand a=(0,0) b=(6000,0), Mitte bei center=3000 → Weltposition (3000, 0)
    const aussparungId = (
      execute(doc, 'design.aussparungSetzen', {
        hostId: wallId,
        typ: 'durchbruch',
        center: 3000,
        breite: 300,
        hoehe: 300,
        sill: 1100,
      }).patches[0] as { id: string }
    ).id;

    // Treffer mitten in der Öffnung
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(aussparungId);
    // Treffer noch im engen Kästchen (halbe Kante 150 + Toleranz 40 = 190)
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 185 })).toBe(aussparungId);
    // Ausserhalb des Kästchens, aber innerhalb der (grossen) Wand-Trefferzone →
    // die Wand bleibt weiterhin wählbar, die Aussparung verdeckt sie nicht grossflächig
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 210 })).toBe(wallId);
    // Weit weg auf der Wandachse: unverändert die Wand
    expect(pickEntityAt(doc, storeyId, { x: 500, y: 0 })).toBe(wallId);
  });
});

describe('pickEntityAt — Öffnungen (Fenster/Tür) vor der Wirtswand (v0.7.0, Muster Aussparungs-Kästchen)', () => {
  it('wählt ein Fenster vor der Wand, aber nur im engen Rechteck an der Wandachse', () => {
    const { doc, storeyId, wallId } = setupDoc();
    // Wand a=(0,0) b=(6000,0), Dicke 200 → halbe Dicke 100
    const fensterId = (
      execute(doc, 'design.oeffnungSetzen', {
        wallId,
        openingType: 'fenster',
        center: 2000,
        width: 1200,
        height: 1500,
        sill: 900,
      }).patches[0] as { id: string }
    ).id;

    // Treffer mitten in der Öffnung
    expect(pickEntityAt(doc, storeyId, { x: 2000, y: 0 })).toBe(fensterId);
    // Längs noch im Rechteck (halbe Breite 600 + Toleranz 40 = 640)
    expect(pickEntityAt(doc, storeyId, { x: 2635, y: 0 })).toBe(fensterId);
    // Quer noch im Rechteck (halbe Dicke 100 + Toleranz 40 = 140)
    expect(pickEntityAt(doc, storeyId, { x: 2000, y: 135 })).toBe(fensterId);
    // Quer ausserhalb des engen Rechtecks, aber in der (grossen) Wand-
    // Trefferzone → die Wand bleibt neben/über der Öffnung gut greifbar
    expect(pickEntityAt(doc, storeyId, { x: 2000, y: 160 })).toBe(wallId);
    expect(oeffnungWeltpos(doc, doc.get(fensterId) as import('@kosmo/kernel').Opening)).toEqual({ x: 2000, y: 0 });
  });

  it('trifft die Wand daneben (längs ausserhalb von center ± width/2 + Toleranz)', () => {
    const { doc, storeyId, wallId } = setupDoc();
    (void execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1500,
      sill: 900,
    }));
    // Knapp neben dem Rechteck (2000 + 640 = 2640) auf der Achse → Wand
    expect(pickEntityAt(doc, storeyId, { x: 2700, y: 0 })).toBe(wallId);
    // Weit weg auf der Wandachse: unverändert die Wand
    expect(pickEntityAt(doc, storeyId, { x: 500, y: 0 })).toBe(wallId);
  });

  it('unterscheidet Tür und Fenster auf derselben Wand (je eigene Trefferzone)', () => {
    const { doc, storeyId, wallId } = setupDoc();
    const fensterId = (
      execute(doc, 'design.oeffnungSetzen', {
        wallId, openingType: 'fenster', center: 1500, width: 1200, height: 1500, sill: 900,
      }).patches[0] as { id: string }
    ).id;
    const tuerId = (
      execute(doc, 'design.oeffnungSetzen', {
        wallId, openingType: 'tuer', center: 4500, width: 900, height: 2200, sill: 0,
      }).patches[0] as { id: string }
    ).id;
    expect(pickEntityAt(doc, storeyId, { x: 1500, y: 0 })).toBe(fensterId);
    expect(pickEntityAt(doc, storeyId, { x: 4500, y: 0 })).toBe(tuerId);
    // Zwischen den beiden Öffnungen: die Wand
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(wallId);
  });

  it('wählt auch ein parametrisches Fenster (fensterTyp/teilung ändern die Trefferzone nicht)', () => {
    const { doc, storeyId, wallId } = setupDoc();
    const fensterId = (
      execute(doc, 'design.oeffnungSetzen', {
        wallId, openingType: 'fenster', center: 2000, width: 1600, height: 1400, sill: 900,
      }).patches[0] as { id: string }
    ).id;
    execute(doc, 'design.fensterParametrieren', {
      openingId: fensterId, fensterTyp: 'zweifluegel', teilungN: 2, teilungM: 1, swing: 'links',
    });
    expect(pickEntityAt(doc, storeyId, { x: 2000, y: 0 })).toBe(fensterId);
    // Rand des Rechtecks (halbe Breite 800 + 40 = 840)
    expect(pickEntityAt(doc, storeyId, { x: 2835, y: 0 })).toBe(fensterId);
    expect(pickEntityAt(doc, storeyId, { x: 2900, y: 0 })).toBe(wallId);
  });

  it('oeffnungTreffer/oeffnungWeltpos liefern false/null bei verwaister Öffnung (Wand fehlt)', () => {
    const { doc } = setupDoc();
    const verwaist: import('@kosmo/kernel').Opening = {
      id: 'oeffnung-verwaist',
      kind: 'opening',
      wallId: 'existiert-nicht',
      openingType: 'fenster',
      center: 1000,
      width: 1200,
      height: 1500,
      sill: 900,
    };
    expect(oeffnungWeltpos(doc, verwaist)).toBeNull();
    expect(oeffnungTreffer(doc, verwaist, { x: 1000, y: 0 })).toBe(false);
  });

  it('outlineOf liefert für die Öffnung ihr Symbol-Rechteck (width × Wanddicke)', () => {
    const { doc, wallId } = setupDoc();
    const fensterId = (
      execute(doc, 'design.oeffnungSetzen', {
        wallId, openingType: 'fenster', center: 3000, width: 1200, height: 1500, sill: 900,
      }).patches[0] as { id: string }
    ).id;
    const outline = outlineOf(doc, fensterId)!;
    expect(outline).not.toBeNull();
    expect(outline).toHaveLength(4);
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(1200); // Wand horizontal → width entlang x
    expect(Math.max(...ys) - Math.min(...ys)).toBe(200); // Aufbau-Dicke quer
  });
});

describe('aussparungWeltpos / aussparungTreffer — Aussparung/Durchbruch (kein Geometrieschnitt im Modell)', () => {
  it('berechnet die Weltposition am Wand-Wirt aus a + dir·center', () => {
    const { doc, wallId } = setupDoc();
    const aussparungId = (
      execute(doc, 'design.aussparungSetzen', {
        hostId: wallId,
        typ: 'durchbruch',
        center: 1500,
        breite: 300,
        hoehe: 300,
      }).patches[0] as { id: string }
    ).id;
    const a = doc.get(aussparungId) as import('@kosmo/kernel').Aussparung;
    expect(aussparungWeltpos(doc, a)).toEqual({ x: 1500, y: 0 });
  });

  it('berechnet die Weltposition am Decken-Wirt aus `at`', () => {
    const doc = new KosmoDoc();
    const storeyId = (
      execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 }).patches[0] as {
        id: string;
      }
    ).id;
    const slabId = (
      execute(doc, 'design.deckeZeichnen', {
        storeyId,
        outline: [
          { x: 0, y: 0 },
          { x: 4000, y: 0 },
          { x: 4000, y: 4000 },
          { x: 0, y: 4000 },
        ],
      }).patches[0] as { id: string }
    ).id;
    const aussparungId = (
      execute(doc, 'design.aussparungSetzen', {
        hostId: slabId,
        typ: 'durchbruch',
        at: { x: 2000, y: 2500 },
        breite: 400,
        hoehe: 400,
      }).patches[0] as { id: string }
    ).id;
    const a = doc.get(aussparungId) as import('@kosmo/kernel').Aussparung;
    expect(aussparungWeltpos(doc, a)).toEqual({ x: 2000, y: 2500 });
    expect(pickEntityAt(doc, storeyId, { x: 2000, y: 2500 })).toBe(aussparungId);
    // Innerhalb der Decke, aber weit weg von der Öffnung → nicht die Aussparung
    expect(pickEntityAt(doc, storeyId, { x: 500, y: 500 })).toBe(slabId);
  });

  it('liefert null, wenn der Wirt fehlt oder das nötige Feld fehlt', () => {
    const { doc } = setupDoc();
    const verwaist: import('@kosmo/kernel').Aussparung = {
      id: 'aussparung-verwaist',
      kind: 'aussparung',
      storeyId: 'eg',
      hostId: 'existiert-nicht',
      typ: 'durchbruch',
      breite: 300,
      hoehe: 300,
    };
    expect(aussparungWeltpos(doc, verwaist)).toBeNull();
    expect(aussparungTreffer(doc, verwaist, { x: 0, y: 0 })).toBe(false);
  });
});

describe('outlineOf — Anzeige-Umriss für Auswahl-Highlight/Zieh-Vorschau', () => {
  it('liefert für die Wand ein Rechteck um die Achse (Wanddicke)', () => {
    const { doc, wallId } = setupDoc();
    const outline = outlineOf(doc, wallId)!;
    expect(outline).not.toBeNull();
    const ys = outline.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(200); // Aufbau-Dicke
  });

  it('liefert für die Zone ihren eigenen Umriss', () => {
    const { doc, zoneId } = setupDoc();
    const outline = outlineOf(doc, zoneId)!;
    expect(outline).toEqual([
      { x: 2000, y: 2000 },
      { x: 8000, y: 2000 },
      { x: 8000, y: 8000 },
      { x: 2000, y: 8000 },
    ]);
  });

  it('liefert für die Stütze ihr Profil-Polygon', () => {
    const { doc, columnId } = setupDoc();
    const outline = outlineOf(doc, columnId)!;
    expect(outline).toHaveLength(4); // rechteckiges Profil
  });

  it('liefert null für eine unbekannte Id', () => {
    const { doc } = setupDoc();
    expect(outlineOf(doc, 'nichts-da')).toBeNull();
  });

  it('liefert für die Aussparung ihr Symbol-Rechteck (breite×hoehe, an der Wandachse ausgerichtet)', () => {
    const { doc, wallId } = setupDoc();
    const aussparungId = (
      execute(doc, 'design.aussparungSetzen', {
        hostId: wallId,
        typ: 'durchbruch',
        center: 3000,
        breite: 300,
        hoehe: 300,
      }).patches[0] as { id: string }
    ).id;
    const outline = outlineOf(doc, aussparungId)!;
    expect(outline).not.toBeNull();
    expect(outline).toHaveLength(4);
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(300); // Wand horizontal → breite entlang x
    expect(Math.max(...ys) - Math.min(...ys)).toBe(300);
  });
});

describe('VERSCHIEBBAR — Deckung mit design.verschieben (Kernel)', () => {
  it('enthält genau die vom Kernel-Command unterstützten Bauteilarten', () => {
    // beam/furniture/boundary/etikett seit v0.8.10 Z3 (Kernel kann sie seit
    // v0.8.8 E1 verschieben, jetzt sind sie im Plan auch greifbar).
    for (const kind of ['wall', 'slab', 'mass', 'zone', 'column', 'stair', 'roof', 'beam', 'furniture', 'boundary', 'etikett']) {
      expect(VERSCHIEBBAR.has(kind)).toBe(true);
    }
    expect(VERSCHIEBBAR.has('storey')).toBe(false);
    // Massketten/Kommentare bleiben bewusst draussen (eigene Trefferwege in
    // PlanView, C-26-Erbe) — DesignWorkspace ergänzt sie separat.
    expect(VERSCHIEBBAR.has('masskette')).toBe(false);
    expect(VERSCHIEBBAR.has('kommentar')).toBe(false);
  });

  it('design.verschieben verschiebt eine Stütze und eine Treppe (Kernel-Erweiterung)', () => {
    const { doc, columnId, stairId } = setupDoc();
    execute(doc, 'design.verschieben', { entityId: columnId, dx: 100, dy: -50 });
    const column = doc.get(columnId) as { at: { x: number; y: number } };
    expect(column.at).toEqual({ x: 3100, y: 2950 });

    execute(doc, 'design.verschieben', { entityId: stairId, dx: 100, dy: -50 });
    const stair = doc.get(stairId) as { a: { x: number; y: number }; b: { x: number; y: number } };
    expect(stair.a).toEqual({ x: 100, y: 4950 });
    expect(stair.b).toEqual({ x: 100, y: 7950 });
  });
});

describe('wandTreffer — Öffnung-Klickmodus (v0.8.3 E3, §3.2 docs/V083-SPEZ.md)', () => {
  it('trifft die Wand und projiziert `center` (mm ab Wandanfang a) entlang der Achse', () => {
    const { doc, storeyId, wallId } = setupDoc(); // Wand a=(0,0) b=(6000,0), Dicke 200
    expect(wandTreffer(doc, storeyId, { x: 3000, y: 0 })).toEqual({ wallId, center: 3000 });
    expect(wandTreffer(doc, storeyId, { x: 0, y: 0 })).toEqual({ wallId, center: 0 });
    expect(wandTreffer(doc, storeyId, { x: 6000, y: 0 })).toEqual({ wallId, center: 6000 });
  });

  it('trifft innerhalb der halben Wanddicke + Toleranz auch quer zur Achse', () => {
    const { doc, storeyId, wallId } = setupDoc();
    const treffer = wandTreffer(doc, storeyId, { x: 3000, y: 90 }); // halbe Dicke 100 + Toleranz
    expect(treffer?.wallId).toBe(wallId);
    expect(treffer?.center).toBe(3000);
  });

  it('liefert null, weit ausserhalb jeder Wand', () => {
    const { doc, storeyId } = setupDoc();
    expect(wandTreffer(doc, storeyId, { x: 3000, y: 5000 })).toBeNull();
  });

  it('liefert null für ein Geschoss ohne Wände', () => {
    const doc = new KosmoDoc();
    const storeyId = (execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000 })
      .patches[0] as { id: string }).id;
    expect(wandTreffer(doc, storeyId, { x: 0, y: 0 })).toBeNull();
  });

  it('liefert die NÄCHSTE Wand, wenn mehrere in Reichweite liegen', () => {
    const { doc, storeyId, wallId: wandA } = setupDoc();
    const assemblyId = doc.byKind('assembly')[0]!.id;
    // Zweite, parallele Wand 150mm entfernt (näher als wandA bei y=150 zum Klickpunkt y=140)
    const wandB = (execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 260 },
      b: { x: 6000, y: 260 },
      assemblyId,
    }).patches[0] as { id: string }).id;
    const naeherAnB = wandTreffer(doc, storeyId, { x: 3000, y: 220 });
    expect(naeherAnB?.wallId).toBe(wandB);
    const naeherAnA = wandTreffer(doc, storeyId, { x: 3000, y: 20 });
    expect(naeherAnA?.wallId).toBe(wandA);
  });

  it('ignoriert Wände in einem anderen Geschoss', () => {
    const { doc, wallId } = setupDoc();
    const og = (execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000 })
      .patches[0] as { id: string }).id;
    expect(wandTreffer(doc, og, { x: 3000, y: 0 })).toBeNull();
    void wallId;
  });
});

describe('istGesperrt (v0.8.9 E2, PA2 — docs/V089-SPEZ.md §3 E2)', () => {
  it('liest meta.locked === true; unlocked/fehlend/unbekannte Id liefern false', () => {
    const { doc, wallId } = setupDoc();
    expect(istGesperrt(doc, wallId)).toBe(false);
    execute(doc, 'design.sperren', { entityId: wallId, locked: true });
    expect(istGesperrt(doc, wallId)).toBe(true);
    execute(doc, 'design.sperren', { entityId: wallId, locked: false });
    expect(istGesperrt(doc, wallId)).toBe(false);
    expect(istGesperrt(doc, 'nichtig')).toBe(false);
  });

  it('Sanktion 3: ein gesperrtes Element bleibt über pickEntityAt unverändert findbar', () => {
    const { doc, storeyId, wallId } = setupDoc();
    const vorher = pickEntityAt(doc, storeyId, { x: 3000, y: 0 });
    execute(doc, 'design.sperren', { entityId: wallId, locked: true });
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(vorher);
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: 0 })).toBe(wallId);
  });
});

describe('pickEntityAt/outlineOf — beam/furniture/boundary/etikett (v0.8.10 Z3)', () => {
  /** Basis-Fixtur + die vier neuen Kinds, alle bewusst so platziert, dass die
   * Prioritätsfragen (Etikett vor Wand, Möbel vor Zone, Baugrenze zuletzt und
   * nur an der Linie) direkt am Klickpunkt prüfbar sind. */
  function setupZ3() {
    const base = setupDoc();
    const { doc, storeyId, wallId } = base;
    const beamId = (execute(doc, 'design.unterzugZeichnen', {
      storeyId,
      a: { x: 0, y: -3000 },
      b: { x: 6000, y: -3000 },
      breite: 300,
      hoehe: 400,
    }).patches[0] as { id: string }).id;
    // Bett 1800×2000, Rückkante (5000,5000), rot 0 → Korpus x 4100–5900,
    // y 5000–7000 — vollständig IN der Zone (2000–8000).
    const moebelId = (execute(doc, 'design.moebelSetzen', {
      storeyId,
      typ: 'bett-doppel',
      at: { x: 5000, y: 5000 },
      rotationGrad: 0,
    }).patches[0] as { id: string }).id;
    const boundaryId = (execute(doc, 'design.baugrenzeSetzen', {
      storeyId,
      outline: [
        { x: -10000, y: -10000 },
        { x: 20000, y: -10000 },
        { x: 20000, y: 20000 },
        { x: -10000, y: 20000 },
      ],
    }).patches[0] as { id: string }).id;
    // Anker bewusst IN der Wand-Trefferzone (|y| ≤ 220): beweist die
    // Etikett-vor-Wand-Priorität am selben Punkt.
    const etikettId = (execute(doc, 'design.etikettSetzen', {
      targetId: wallId,
      at: { x: 4500, y: -150 },
      inhalt: 'aufbau',
    }).patches[0] as { id: string }).id;
    return { ...base, beamId, moebelId, boundaryId, etikettId };
  }

  it('Unterzug: Achse ± halbe Breite + Toleranz trifft, daneben nicht', () => {
    const { doc, storeyId, beamId } = setupZ3();
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: -3000 })).toBe(beamId);
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: -2750 })).toBe(beamId); // 250 ≤ 150+120
    expect(pickEntityAt(doc, storeyId, { x: 3000, y: -2600 })).toBeNull(); // 400 > 270, keine Zone hier
  });

  it('Möbel: Korpus gewinnt gegen die Zone darunter, die Bewegungsfläche bleibt Zone', () => {
    const { doc, storeyId, moebelId, zoneId } = setupZ3();
    expect(pickEntityAt(doc, storeyId, { x: 5000, y: 6000 })).toBe(moebelId); // im Korpus
    // Bewegungsfläche (y 7000–8200) ist Prüf-Overlay, kein greifbares Symbol:
    expect(pickEntityAt(doc, storeyId, { x: 5000, y: 7500 })).toBe(zoneId);
  });

  it('Baugrenze: nur die LINIE trifft (zuletzt), leere Parzellenfläche bleibt leer', () => {
    const { doc, storeyId, boundaryId } = setupZ3();
    expect(pickEntityAt(doc, storeyId, { x: 5000, y: -9950 })).toBe(boundaryId); // 50 mm neben der Kante
    expect(pickEntityAt(doc, storeyId, { x: 15000, y: 15000 })).toBeNull(); // tief im Polygon, weit weg von allem
    // Bestands-Priorität unangetastet: die Wand liegt im Baugrenzen-Polygon und gewinnt weiter.
    expect(pickEntityAt(doc, storeyId, { x: 1000, y: 0 })).not.toBe(boundaryId);
  });

  it('Etikett: Anker-Klickzone gewinnt gegen die Wand am selben Punkt, ausserhalb des Radius wieder die Wand', () => {
    const { doc, storeyId, etikettId, wallId } = setupZ3();
    expect(pickEntityAt(doc, storeyId, { x: 4500, y: -150 })).toBe(etikettId);
    // 500 mm daneben (Distanz 350 > 300): wieder die Wand (|y|=150 ≤ 220).
    expect(pickEntityAt(doc, storeyId, { x: 5000, y: -150 })).toBe(wallId);
  });

  it('outlineOf liefert für alle vier einen brauchbaren Umriss (Highlight/Zieh-Vorschau)', () => {
    const { doc, beamId, moebelId, boundaryId, etikettId } = setupZ3();
    const beam = outlineOf(doc, beamId)!;
    expect(beam).toHaveLength(4);
    expect(beam[0]).toEqual({ x: 0, y: -2850 }); // a + Normale·breite/2
    const moebel = outlineOf(doc, moebelId)!;
    expect(moebel).toEqual([
      { x: 4100, y: 5000 },
      { x: 5900, y: 5000 },
      { x: 5900, y: 7000 },
      { x: 4100, y: 7000 },
    ]);
    const grenze = outlineOf(doc, boundaryId)!;
    expect(grenze).toHaveLength(4);
    expect(grenze[0]).toEqual({ x: -10000, y: -10000 });
    const etikett = outlineOf(doc, etikettId)!;
    expect(etikett).toEqual([
      { x: 4200, y: -450 },
      { x: 4800, y: -450 },
      { x: 4800, y: 150 },
      { x: 4200, y: 150 },
    ]);
  });

  it('design.verschieben bewegt alle vier Kinds (Kernel seit v0.8.8 E1 — Smoke am App-Set)', () => {
    const { doc, beamId, moebelId, boundaryId, etikettId } = setupZ3();
    execute(doc, 'design.verschieben', { entityId: beamId, dx: 100, dy: 50 });
    expect((doc.get(beamId) as { a: { x: number; y: number } }).a).toEqual({ x: 100, y: -2950 });
    execute(doc, 'design.verschieben', { entityId: moebelId, dx: 100, dy: 50 });
    expect((doc.get(moebelId) as { at: { x: number; y: number } }).at).toEqual({ x: 5100, y: 5050 });
    execute(doc, 'design.verschieben', { entityId: boundaryId, dx: 100, dy: 50 });
    expect((doc.get(boundaryId) as { outline: { x: number; y: number }[] }).outline[0]).toEqual({ x: -9900, y: -9950 });
    execute(doc, 'design.verschieben', { entityId: etikettId, dx: 100, dy: 50 });
    const et = doc.get(etikettId) as { at: { x: number; y: number }; targetId: string };
    expect(et.at).toEqual({ x: 4600, y: -100 });
    expect(et.targetId).toBeTruthy(); // Assoziation bleibt (Sanktion-2-Erbe 0.8.8)
  });
});
