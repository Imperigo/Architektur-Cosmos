import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { derivePlan } from '../src/derive/plan';
import { planToDxf, planGraphicToDxf } from '../src/dxf/export';
import { parseDxf } from '../src/dxf/import';
import type { Wall } from '../src/model/entities';

/**
 * v0.7.0 Stream 6A — DXF-Roundtrip-Beweis am «Testhaus» (Owner-Auftrag:
 * Finch-Interop-Brücke ehrlich härten). Testhaus = Wände + ein parametrisches
 * Zweiflügel-Fenster + eine Tür + Bemassungs-Einstellung.
 *
 * Geprüft wird das Roundtrip-Paar `planToDxf` (dxf/export.ts) ⇄ `parseDxf`
 * (dxf/import.ts) — dasselbe Paar, das die App im Design-Modul verwendet
 * (export-plan.ts).
 *
 * v0.7.1 Stream 3A (DXF-Konsolidierung): der früher ZWEITE, unabhängige
 * DXF-Exporter des Kernels (`exportDxf` / `derive/dxf.ts`, Q30,
 * `@tarikjabiri/dxf`-basiert, ohne y-Spiegelung, ohne Rückweg) ist entfernt.
 * Seine Bemassungs-Emission (Ketten aus `derive/dimensions.ts`) lebt jetzt
 * HIER, in `planToDxf`/`planGraphicToDxf`, MIT y-Spiegelung wie alle anderen
 * Elemente. `dxf/import.ts` liest den restlichen Plan weiterhin exakt
 * zurück, ignoriert den Bemassungs-Layer aber bewusst (eine Masskette ist
 * eine Ableitung, kein Entity) — siehe die eigene Describe-Gruppe unten und
 * `docs/INTEROP.md`.
 */

function testhausMitFensterUndTuer(): {
  doc: KosmoDoc;
  storeyId: string;
  suedWandId: string;
  ostWandId: string;
  fensterId: string;
  tuerId: string;
} {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [
      { material: 'beton', thickness: 250, function: 'tragend' },
      { material: 'daemmung', thickness: 160, function: 'daemmung' },
    ],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });

  const sued = wand({ x: 0, y: 0 }, { x: 8000, y: 0 });
  const suedWandId = (sued.patches[0] as { id: string }).id;
  const ost = wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  const ostWandId = (ost.patches[0] as { id: string }).id;
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });

  // Parametrisches Zweiflügel-Fenster in der Südwand.
  const fenster = execute(doc, 'design.oeffnungSetzen', {
    wallId: suedWandId,
    openingType: 'fenster',
    center: 4000,
    width: 1600,
    height: 1400,
    sill: 900,
  });
  const fensterId = (fenster.patches[0] as { id: string }).id;
  execute(doc, 'design.fensterParametrieren', {
    openingId: fensterId,
    fensterTyp: 'zweifluegel',
    teilungN: 2,
    teilungM: 1,
    rahmenbreite: 80,
    swing: 'links',
  });

  // Tür in der Ostwand.
  const tuer = execute(doc, 'design.oeffnungSetzen', {
    wallId: ostWandId,
    openingType: 'tuer',
    center: 3000,
    width: 900,
    height: 2100,
    sill: 0,
    swing: 'links',
  });
  const tuerId = (tuer.patches[0] as { id: string }).id;

  return { doc, storeyId, suedWandId, ostWandId, fensterId, tuerId };
}

const TOL = 1e-3;
const nah = (a: number, b: number) => Math.abs(a - b) <= TOL;
const punktNah = (a: { x: number; y: number }, b: { x: number; y: number }) => nah(a.x, b.x) && nah(a.y, b.y);

describe('DXF-Roundtrip-Beweis am Testhaus (Wände + Fenster + Tür), v0.7.0 6A', () => {
  const { doc, storeyId, suedWandId, ostWandId } = testhausMitFensterUndTuer();
  const plan = derivePlan(doc, storeyId);
  const dxf = planToDxf(doc, storeyId);
  const zurueck = parseDxf(dxf);

  it('ist strukturell valides, verlustfrei re-exportierbares DXF (deterministisch)', () => {
    expect(dxf.trim().endsWith('0\nEOF')).toBe(true);
    expect(planToDxf(doc, storeyId)).toBe(dxf); // deterministisch, kein Zeitstempel/GUID-Rauschen
  });

  it('jede Poché-Region (Wand-Umriss inkl. Öffnungs-Notch) kommt geometrisch identisch zurück (±0.001 mm)', () => {
    // planToDxf schreibt jede Ringgruppe als eigene POLYLINE — 1:1-Reihenfolge
    // zum PlanGraphic (kein Shuffling), daher direkter Index-Vergleich zulässig.
    const erwarteteRinge = plan.regions.flatMap((r) => r.rings);
    expect(zurueck.regions.length).toBe(erwarteteRinge.length);
    for (const [i, ring] of erwarteteRinge.entries()) {
      const r = zurueck.regions[i]!;
      expect(r.ring.length, `Ring ${i} Punktzahl`).toBe(ring.length);
      for (const [k, p] of ring.entries()) {
        expect(punktNah(r.ring[k]!, p), `Ring ${i} Punkt ${k}: erwartet ${JSON.stringify(p)}, erhalten ${JSON.stringify(r.ring[k])}`).toBe(true);
      }
    }
  });

  it('Fenster UND Tür erzeugen echte geometrische Lücken (Notch) in der Wand-Poché — nicht nur ein Symbol', () => {
    // Eine reine Rechteckwand ohne Öffnung hätte 4 Eckpunkte je Ringgruppe;
    // eine Wand mit einer schneidenden Öffnung hat mehr (der `difference()`-
    // Schnitt fügt die Notch-Kontur ein). Süd- und Ostwand tragen je eine
    // Öffnung, die die Schnitthöhe (1100 mm) kreuzt (Fenster 900–2300 mm,
    // Tür 0–2100 mm) — beide MÜSSEN daher als Notch erscheinen. Ehrlicher
    // Befund (Code-Audit): Weil BEIDE Notches den tragenden Querschnitt ganz
    // durchtrennen und über eine gemeinsame Gebäudeecke verbunden sind,
    // vereinigt `derivePlan` (coreByMaterial-Union) die vier Wände NICHT zu
    // einem einzigen Ring mit zwei Löchern, sondern zu ZWEI getrennten
    // Poché-Teilstücken — beide selbst wieder mit mehr als 4 Eckpunkten
    // (die Notch-Kontur bleibt in jedem Teilstück erhalten). Das ist reales,
    // korrektes Verschneidungsverhalten (SIA-Poché-Konvention), keine
    // Export-Absturzquelle — und übersteht den DXF-Roundtrip Punkt für Punkt
    // (siehe Test oben).
    const suedWand = doc.get<Wall>(suedWandId)!;
    const ostWand = doc.get<Wall>(ostWandId)!;
    expect(suedWand.kind).toBe('wall');
    expect(ostWand.kind).toBe('wall');
    const tragendRinge = zurueck.regions.filter((r) => r.layer === 'TRAGEND');
    expect(tragendRinge.length).toBeGreaterThanOrEqual(2);
    const mitNotch = tragendRinge.filter((r) => r.ring.length > 4);
    expect(mitNotch.length).toBeGreaterThanOrEqual(2);
  });

  it('Wandachsen-Länge bleibt in Toleranz: an einer freistehenden Wand (kein Eck-Gehrungseinfluss) ' +
    'deckt die reimportierte Poché exakt die Modell-Wandlänge ab', () => {
    // Eck-Gehrungen (detectEndMiters, plan.ts) verlängern die Poché an
    // geschlossenen Ecken über die nominelle Wandlänge hinaus (reale,
    // andernorts getestete Geometrie — siehe 3D-Wandknoten-Tests in
    // kernel.test.ts) — ein Vergleich am geschlossenen Testhaus-Rechteck
    // wäre daher gegen die falsche Referenzgrösse geprüft. Eine freistehende
    // Einzelwand hat keinen Nachbarn zum Gehren: ihre Poché-Breite entlang
    // der Achse ist exakt die Wandlänge, unabhängig von Dicke/Achslage
    // (Dicke wirkt nur quer zur Achse). Das ist der ehrliche, robuste Beweis
    // für «Wandachsen/Längen in Toleranz».
    const einzelDoc = new KosmoDoc();
    const eg = execute(einzelDoc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(einzelDoc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const aid = (aufbau.patches[0] as { id: string }).id;
    const w = execute(einzelDoc, 'design.wandZeichnen', { storeyId: sid, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, assemblyId: aid });
    const wandId = (w.patches[0] as { id: string }).id;
    execute(einzelDoc, 'design.oeffnungSetzen', {
      wallId: wandId, openingType: 'fenster', center: 3000, width: 1600, height: 1400, sill: 900,
    });
    const einzelDxf = planToDxf(einzelDoc, sid);
    const einzelZurueck = parseDxf(einzelDxf);
    const nominaleLaenge = Math.hypot(6000 - 0, 0 - 0); // dist(wall.a, wall.b)
    const tragend = einzelZurueck.regions.filter((r) => r.layer === 'TRAGEND');
    expect(tragend.length).toBeGreaterThan(0);
    // Das Fenster durchtrennt die (einschichtige) Wand über die GESAMTE
    // Dicke → die Poché zerfällt auch hier in zwei getrennte Rechteck-Stücke
    // links/rechts der Öffnung (dieselbe Union-Realität wie oben). Die
    // Wandlänge ist daher die kombinierte Bounding-Box über BEIDE Stücke,
    // nicht die Spanne eines einzelnen Rings.
    const alleX = tragend.flatMap((r) => r.ring.map((p) => p.x));
    const gesamtSpanne = Math.max(...alleX) - Math.min(...alleX);
    expect(Math.abs(gesamtSpanne - nominaleLaenge)).toBeLessThanOrEqual(1);
  });

  it('Öffnungs-Symbole (Leibung/Fenster/Tür-Linien) kommen mit korrektem Layer und Position zurück', () => {
    const fensterLinien = zurueck.lines.filter((l) => l.layer === 'FENSTER');
    const tuerLinien = zurueck.lines.filter((l) => l.layer === 'TUEREN');
    expect(fensterLinien.length).toBeGreaterThan(0);
    expect(tuerLinien.length).toBeGreaterThan(0);
    // Leibungslinien der Südwand-Öffnung liegen exakt bei x=3200/x=4800
    // (center 4000 ± 800 Breite/2).
    const leibungXWerte = zurueck.lines
      .filter((l) => l.layer === 'FENSTER')
      .flatMap((l) => [l.a.x, l.b.x]);
    expect(leibungXWerte.some((x) => nah(x, 3200))).toBe(true);
    expect(leibungXWerte.some((x) => nah(x, 4800))).toBe(true);
  });

  it('Bericht: kein Blockverlust, keine unbekannten Entities, alle Layer klassiert', () => {
    expect(zurueck.bericht.bloeckeNichtAufgeloest).toBe(0);
    expect(zurueck.bericht.unbekannteEntities).toEqual({});
    expect(zurueck.bericht.layerUnklassiert).toEqual([]);
  });

  it('Bemassung wird beim Import bewusst NICHT zu Geometrie: LAYER_BEMASSUNG-Entities ' +
    '(Linien + Text) fliessen NICHT in zurueck.lines/texte — eine Masskette ist eine ' +
    'Ableitung (derive/dimensions.ts), kein Entity', () => {
    expect(dxf).toContain('2\nBEMASSUNG\n');
    // Der Layer ist im Bericht sichtbar (nichts wird verschwiegen)...
    expect(zurueck.bericht.layerBenutzt).toContain('BEMASSUNG');
    // ...aber KEINE seiner Linien/Texte landet in der Geometrie.
    expect(zurueck.lines.some((l) => l.layer === 'BEMASSUNG')).toBe(false);
    expect(zurueck.texte.some((t) => t.layer === 'BEMASSUNG')).toBe(false);
  });

  it('behobene Grenze (v0.7.1 3A): die projektweite Bemassungs-Einstellung (design.bemassungSetzen) ' +
    'wirkt jetzt auf planToDxf — Bemassungsketten (derive/dimensions.ts) fliessen seit der ' +
    'DXF-Konsolidierung direkt in diesen Roundtrip-Pfad ein (vorher nur in den entfernten ' +
    'Q30-Exporter und die SVG-Bemassung)', () => {
    // Default (aussenKetten:'beide') zeichnet bereits eine Bemassung — das
    // ist der neue Normalfall, keine Ausnahme mehr.
    const dxfVorher = planToDxf(doc, storeyId);
    expect(dxfVorher).toContain('BEMASSUNG\n');

    // 'keine' schaltet die Aussenketten ab → BEMASSUNG-Layer verschwindet
    // wieder (die Emission ist wirklich an die Einstellung gekoppelt).
    execute(doc, 'design.bemassungSetzen', { aussenKetten: 'keine', innenKetten: false, hoehenKoten: true });
    const dxfOhne = planToDxf(doc, storeyId);
    expect(dxfOhne).not.toContain('BEMASSUNG\n');
    expect(dxfOhne).not.toBe(dxfVorher);
  });
});

describe('planGraphicToDxf ⇄ parseDxf — synthetische Bemassungs-Klasse (Layer wird generisch geroutet, Import filtert ihn)', () => {
  it('eine PlanLine mit Klasse "bemassung" LANDET beim Export auf dem BEMASSUNG-Layer, ' +
    'kommt beim Import aber NICHT als Linie zurück (bewusst gefiltert)', () => {
    const plan = {
      storeyId: 's',
      regions: [],
      lines: [{ a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, classes: ['bemassung'] }],
      arcs: [],
      axes: [],
      texte: [],
      massketten: [],
      bounds: null,
    };
    const dxf = planGraphicToDxf(plan);
    expect(dxf).toContain('2\nBEMASSUNG\n');
    const zurueck = parseDxf(dxf);
    expect(zurueck.lines.length).toBe(0);
    expect(zurueck.bericht.layerBenutzt).toContain('BEMASSUNG');
  });
});
