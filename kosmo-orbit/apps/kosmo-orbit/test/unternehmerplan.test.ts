import { beforeEach, describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  derivePlan,
  execute,
  parseDxf,
  planGraphicToDxf,
  vergleichePlaene,
  type PlanGraphic,
  type Wall,
} from '@kosmo/kernel';
import { baueKarten, importBerichtText, useUnternehmerplan } from '../src/modules/design/unternehmerplan';

/**
 * V1.6 Block C / C4a — Unternehmerplan-Laufzeitschicht (Entscheide C-E4/C-E5,
 * `docs/SUBMISSION-KONZEPT.md`). Kein DOM nötig: der Store ist ein reines
 * zustand-Objekt, `baueKarten`/`importBerichtText` sind reine Funktionen.
 * Test-Doc wie in `planabgleich.test.ts`/`dxf-import.test.ts` (execute +
 * design.*, dann `derivePlan` → `planGraphicToDxf` → zurückgelesen bzw.
 * mutiert), damit kein externes Fixture nötig ist.
 */

function baueTestpaar(): { plan: PlanGraphic; dxfString: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const sid = (eg.patches[0] as { id: string }).id;
  const auf = execute(doc, 'design.aufbauErstellen', {
    name: 'AW',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  const aid = (auf.patches[0] as { id: string }).id;
  const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId: sid, a, b, assemblyId: aid });
  w({ x: 0, y: 0 }, { x: 6000, y: 0 });
  w({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
  w({ x: 6000, y: 4000 }, { x: 0, y: 4000 });
  w({ x: 0, y: 4000 }, { x: 0, y: 0 });
  const waende = doc.byKind<Wall>('wall');
  execute(doc, 'design.oeffnungSetzen', {
    wallId: waende[0]!.id,
    openingType: 'fenster',
    center: 3000,
    width: 1600,
    height: 1400,
    sill: 900,
  });

  const plan = derivePlan(doc, sid);
  const dxfString = planToDxfString(plan);
  return { plan, dxfString };
}

// planGraphicToDxf ist der reine Kern von dxf/export.ts (kein Doc-Zugriff
// nötig, da `plan` schon abgeleitet ist).
function planToDxfString(plan: PlanGraphic): string {
  return planGraphicToDxf(plan);
}

beforeEach(() => {
  useUnternehmerplan.getState().verwerfen();
});

describe('useUnternehmerplan.laden (a)', () => {
  it('setzt dxf + abgleich, fehler bleibt null', () => {
    const { plan, dxfString } = baueTestpaar();
    useUnternehmerplan.getState().laden('unternehmer.dxf', dxfString, plan);
    const s = useUnternehmerplan.getState();
    expect(s.dxf).not.toBeNull();
    expect(s.abgleich).not.toBeNull();
    expect(s.dateiname).toBe('unternehmer.dxf');
    expect(s.fehler).toBeNull();
    // unveränderter Roundtrip → keine Befunde
    expect(s.abgleich!.befunde).toEqual([]);
  });
});

describe('useUnternehmerplan.laden — kaputter DXF-Text (b)', () => {
  it('setzt fehler, dxf/abgleich bleiben null, wirft NICHT', () => {
    // Kein gültiges (Code, Wert)-Zeilenpaar — parseDxf wirft, laden fängt ab.
    const kaputt = 'kein-gueltiger-gruppencode\nirgendein-wert\n';
    expect(() => useUnternehmerplan.getState().laden('kaputt.dxf', kaputt, dummyPlan())).not.toThrow();
    const s = useUnternehmerplan.getState();
    expect(s.fehler).not.toBeNull();
    expect(typeof s.fehler).toBe('string');
    expect(s.dxf).toBeNull();
    expect(s.abgleich).toBeNull();
    expect(s.dateiname).toBeNull();
  });
});

function dummyPlan(): PlanGraphic {
  return derivePlan(new KosmoDoc(), 'nicht-vorhanden');
}

describe('baueKarten (c)', () => {
  it('eine um 50 mm verschobene tragende Wand wird Stufe 1', () => {
    // Die vier Wände sind zu EINER TRAGEND-Poché-Region unioniert
    // (`derive/plan.ts` — Poché-Konvention gleichen Materials); eine Wand
    // isoliert zu verschieben heisst: nur die Aussenkante dieser einen Wand
    // (zwei benachbarte Ring-Vertices) im DxfGraphic verschieben. Die beiden
    // Nachbarkanten ändern dadurch ihre Länge und werden separat als
    // entfernt/neu gemeldet (Stufe 2) — hier interessiert nur die eine
    // saubere 'verschoben'-Kante.
    const { plan, dxfString } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    const region = dxf.regions.find((r) => r.layer === 'TRAGEND')!;
    expect(region).toBeDefined();
    const linkeAussenkante = new Set([9, 10]);
    region.ring = region.ring.map((p, i) => (linkeAussenkante.has(i) ? { x: p.x + 50, y: p.y } : p));

    const abgleich = vergleichePlaene(plan, dxf);
    expect(abgleich.ausrichtung.geschaetzt).toBe(false); // Einzelkante — keine globale Fehlausrichtung
    const karten = baueKarten(abgleich, dxf.bericht);
    const verschoben = karten.filter((k) => k.befund.art === 'verschoben' && k.befund.klasse === 'tragend');
    expect(verschoben.length).toBe(1);
    expect(verschoben[0]!.stufe).toBe(1);
    expect(verschoben[0]!.titel).toContain('50 mm verschoben');
    expect(verschoben[0]!.titel).toMatch(/Konfidenz \d+ %/);
  });

  it('ein neuer Durchbruch (Layer DURCHBRUCH) ist Stufe 2 — Aussparungs-Vokabular-Lücke', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    dxf.lines.push({ a: { x: 50000, y: 50000 }, b: { x: 50400, y: 50000 }, layer: 'DURCHBRUCH' });

    const abgleich = vergleichePlaene(plan, dxf);
    const karten = baueKarten(abgleich, dxf.bericht);
    const neu = karten.filter((k) => k.befund.art === 'neu' && k.befund.klasse === 'aussparung');
    expect(neu.length).toBe(1);
    expect(neu[0]!.stufe).toBe(2);
  });

  it('ein geänderter Text ist Stufe 2', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const auf = execute(doc, 'design.aufbauErstellen', {
      name: 'AW',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const aid = (auf.patches[0] as { id: string }).id;
    execute(doc, 'design.wandZeichnen', { storeyId: sid, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, assemblyId: aid });
    const wallId = doc.byKind<Wall>('wall')[0]!.id;
    execute(doc, 'design.keynoteSetzen', { nr: 'K1', text: 'Sichtbeton, Schalungsraster 1250' });
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 3000, y: 800 }, inhalt: 'keynote', keynote: 'K1' });
    const plan = derivePlan(doc, sid);
    const dxfString = planGraphicToDxf(plan);
    const dxf = parseDxf(dxfString);
    expect(dxf.texte.length).toBe(1);
    dxf.texte[0]!.text = 'K2';

    const abgleich = vergleichePlaene(plan, dxf);
    const karten = baueKarten(abgleich, dxf.bericht);
    const geaendert = karten.filter((k) => k.befund.art === 'text-geaendert');
    expect(geaendert.length).toBe(1);
    expect(geaendert[0]!.stufe).toBe(2);
    expect(geaendert[0]!.titel).toContain('K2');
  });

  it('ids sind deterministisch (up-1, up-2, … in Befund-Reihenfolge)', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    dxf.lines.push({ a: { x: 50000, y: 50000 }, b: { x: 50400, y: 50000 }, layer: 'DURCHBRUCH' });
    const idx = dxf.lines.findIndex((l) => l.layer === 'FENSTER');
    dxf.lines.splice(idx, 1);

    const abgleich = vergleichePlaene(plan, dxf);
    const karten1 = baueKarten(abgleich, dxf.bericht);
    const karten2 = baueKarten(abgleich, dxf.bericht);
    expect(karten1.length).toBeGreaterThan(1);
    expect(karten1.map((k) => k.id)).toEqual(karten1.map((_, i) => `up-${i + 1}`));
    // gleiche Eingabe → gleiche ids (Determinismus)
    expect(karten2.map((k) => k.id)).toEqual(karten1.map((k) => k.id));
  });
});

describe('importBerichtText (d)', () => {
  it('enthält Quote, unklassierte Layer und Blöcke-Zahl', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    dxf.lines.push({ a: { x: 1000, y: 1000 }, b: { x: 1400, y: 1000 }, layer: 'UNBEKANNT_LAYER_XYZ' });
    dxf.bericht.layerBenutzt = [...dxf.bericht.layerBenutzt, 'UNBEKANNT_LAYER_XYZ'].sort();
    dxf.bericht.layerUnklassiert = [...dxf.bericht.layerUnklassiert, 'UNBEKANNT_LAYER_XYZ'];
    dxf.bericht.bloeckeNichtAufgeloest = 2;

    const abgleich = vergleichePlaene(plan, dxf);
    const text = importBerichtText(dxf.bericht, abgleich);

    expect(text).toMatch(/Match-Quote.*\d+ %/);
    expect(text).toContain('UNBEKANNT_LAYER_XYZ');
    expect(text).toContain('2 Block');
    expect(text).toMatch(/\d+ von \d+ Abweichungen als Vorschlag/);
  });

  it('meldet «keine Abweichungen» und «alle Layer klassiert», wenn beides zutrifft', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    const abgleich = vergleichePlaene(plan, dxf);
    expect(abgleich.befunde).toEqual([]);
    const text = importBerichtText(dxf.bericht, abgleich);
    expect(text).toContain('Keine Abweichungen');
    expect(text).toContain('Keine unaufgelösten Blöcke.');
  });
});

describe('useUnternehmerplan.verwerfen (e)', () => {
  it('räumt dxf/abgleich/dateiname/fehler/overlay komplett', () => {
    const { plan, dxfString } = baueTestpaar();
    useUnternehmerplan.getState().laden('unternehmer.dxf', dxfString, plan);
    useUnternehmerplan.getState().overlayUmschalten();
    expect(useUnternehmerplan.getState().overlaySichtbar).toBe(true);
    expect(useUnternehmerplan.getState().dxf).not.toBeNull();

    useUnternehmerplan.getState().verwerfen();
    const s = useUnternehmerplan.getState();
    expect(s.dxf).toBeNull();
    expect(s.abgleich).toBeNull();
    expect(s.dateiname).toBeNull();
    expect(s.fehler).toBeNull();
    expect(s.overlaySichtbar).toBe(false);
  });
});
