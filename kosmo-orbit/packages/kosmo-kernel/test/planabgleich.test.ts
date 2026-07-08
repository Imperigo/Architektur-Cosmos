import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { derivePlan } from '../src/derive/plan';
import { planToDxf } from '../src/dxf/export';
import { parseDxf, type DxfGraphic } from '../src/dxf/import';
import { vergleichePlaene } from '../src/derive/planabgleich';
import type { Wall } from '../src/model/entities';

/**
 * V1.6 Block C / C3 — Diff-Engine Architektenplan ↔ Unternehmerplan
 * (Entscheid C-E3, `docs/SUBMISSION-KONZEPT.md`). Kein externes Fixture:
 * das Test-Doc entsteht wie in `dxf-import.test.ts` (execute + design.*),
 * wird exportiert (`planToDxf`) und zurückgelesen (`parseDxf`) — danach
 * wird das `DxfGraphic`-Objekt direkt mutiert (nicht der DXF-String), um
 * den Unternehmer-Rücklauf zu simulieren.
 */

function baueTestpaar() {
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
  const dxfString = planToDxf(doc, sid);
  return { doc, sid, plan, dxfString };
}

/**
 * Wie `baueTestpaar`, ergänzt um ein Keynote-Etikett (ASCII-sicherer Text
 * «K1») für den Text-Abgleich (f). Bewusst NICHT über
 * `design.aussparungSetzen`: dessen Kote trägt ein «×» (Multiplikationszeichen),
 * das `dxf/export.ts` beim Schreiben als Nicht-ASCII stillschweigend
 * entfernt (`dxfText`, ausserhalb des Batch-Scopes) — ein «identischer»
 * Roundtrip wäre dort gar nicht text-identisch, unabhängig vom Diff-Befund.
 */
function baueTestpaarMitText() {
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
  const dxfString = planToDxf(doc, sid);
  return { doc, sid, plan, dxfString };
}

function frischesDxf(dxfString: string): DxfGraphic {
  return parseDxf(dxfString);
}

describe('vergleichePlaene — Identität (a)', () => {
  it('unveränderter Roundtrip: 0 Befunde, unveraendert > 0, keine geschätzte Ausrichtung', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = frischesDxf(dxfString);
    const result = vergleichePlaene(plan, dxf);
    expect(result.befunde).toEqual([]);
    expect(result.unveraendert).toBeGreaterThan(0);
    expect(result.ausrichtung).toEqual({ dx: 0, dy: 0, geschaetzt: false });
  });
});

describe('vergleichePlaene — verschoben (b)', () => {
  it('ein um 50 mm verschobenes Segment ergibt genau einen Verschiebungs-Befund', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = frischesDxf(dxfString);
    expect(dxf.lines.length).toBeGreaterThan(0);
    const ziel = dxf.lines[0]!;
    ziel.a = { x: ziel.a.x + 50, y: ziel.a.y };
    ziel.b = { x: ziel.b.x + 50, y: ziel.b.y };

    const result = vergleichePlaene(plan, dxf);
    expect(result.ausrichtung.geschaetzt).toBe(false); // ein Ausreisser reicht nicht für Fehlausrichtung
    const verschoben = result.befunde.filter((b) => b.art === 'verschoben');
    expect(verschoben.length).toBe(1);
    const befund = verschoben[0]!;
    expect(befund.delta!.x).toBeCloseTo(50, 0);
    expect(befund.delta!.y).toBeCloseTo(0, 0);
    expect(befund.konfidenz).toBeGreaterThan(0.9);
    // sonst keine falschen Zusatzbefunde
    expect(result.befunde.length).toBe(1);
  });
});

describe('vergleichePlaene — neu (c)', () => {
  it('ein neues Segment auf Layer DURCHBRUCH wird als neu mit Klasse aussparung gemeldet', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = frischesDxf(dxfString);
    dxf.lines.push({
      a: { x: 50000, y: 50000 },
      b: { x: 50400, y: 50000 },
      layer: 'DURCHBRUCH',
    });

    const result = vergleichePlaene(plan, dxf);
    const treffer = result.befunde.filter((b) => b.art === 'neu' && b.klasse === 'aussparung');
    expect(treffer.length).toBe(1);
    expect(treffer[0]!.konfidenz).toBeCloseTo(0.9, 5);
    expect(treffer[0]!.layer).toBe('DURCHBRUCH');
  });
});

describe('vergleichePlaene — entfernt (d)', () => {
  it('ein Architekten-Segment ohne Unternehmer-Zwilling wird als entfernt gemeldet', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = frischesDxf(dxfString);
    const idx = dxf.lines.findIndex((l) => l.layer === 'FENSTER');
    expect(idx).toBeGreaterThanOrEqual(0);
    dxf.lines.splice(idx, 1);

    const result = vergleichePlaene(plan, dxf);
    const entfernt = result.befunde.filter((b) => b.art === 'entfernt' && b.klasse === 'fenster');
    expect(entfernt.length).toBe(1);
    expect(entfernt[0]!.konfidenz).toBeCloseTo(0.9, 5);
  });
});

describe('vergleichePlaene — Ausrichtungs-Schätzung (e)', () => {
  it('ein globaler Versatz von +2000/+1000 wird erkannt und danach fehlerfrei verglichen', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf = frischesDxf(dxfString);
    const VX = 2000;
    const VY = 1000;
    for (const l of dxf.lines) {
      l.a = { x: l.a.x + VX, y: l.a.y + VY };
      l.b = { x: l.b.x + VX, y: l.b.y + VY };
    }
    for (const r of dxf.regions) {
      r.ring = r.ring.map((p) => ({ x: p.x + VX, y: p.y + VY }));
    }
    for (const t of dxf.texte) {
      t.at = { x: t.at.x + VX, y: t.at.y + VY };
    }

    const result = vergleichePlaene(plan, dxf);
    expect(result.ausrichtung.geschaetzt).toBe(true);
    expect(result.ausrichtung.dx).toBeCloseTo(VX, 0);
    expect(result.ausrichtung.dy).toBeCloseTo(VY, 0);
    expect(result.befunde).toEqual([]); // nach Ausrichtung wieder identisch
    expect(result.hinweise.some((h) => h.includes('Nullpunkt-Versatz'))).toBe(true);
    expect(result.hinweise.some((h) => h.includes('Rotation wird nicht geschätzt'))).toBe(true);
  });
});

describe('vergleichePlaene — Text geändert (f)', () => {
  it('ein geänderter Etikett-Text wird als text-geaendert mit alt/neu gemeldet', () => {
    const { plan, dxfString } = baueTestpaarMitText();
    expect(plan.texte.length).toBe(1);
    const alterText = plan.texte[0]!.text;
    const dxf = frischesDxf(dxfString);
    expect(dxf.texte.length).toBe(1);
    dxf.texte[0]!.text = 'K2';

    const result = vergleichePlaene(plan, dxf);
    const geaendert = result.befunde.filter((b) => b.art === 'text-geaendert');
    expect(geaendert.length).toBe(1);
    expect(geaendert[0]!.text).toEqual({ alt: alterText, neu: 'K2', at: dxf.texte[0]!.at });
    expect(geaendert[0]!.konfidenz).toBeCloseTo(0.7, 5);
    // Sonst identisch — keine Zusatzbefunde aus der Geometrie.
    expect(result.befunde.length).toBe(1);
  });
});

describe('vergleichePlaene — Determinismus (g)', () => {
  it('zweimal vergleichen liefert JSON-identische Ergebnisse', () => {
    const { plan, dxfString } = baueTestpaar();
    const dxf1 = frischesDxf(dxfString);
    const dxf2 = frischesDxf(dxfString);
    // Beide Läufe erhalten unterschiedliche, aber inhaltsgleiche Mutationen —
    // ein realistischerer Determinismus-Test als zweimal derselbe Referenz.
    for (const dxf of [dxf1, dxf2]) {
      dxf.lines[0]!.a = { x: dxf.lines[0]!.a.x + 33, y: dxf.lines[0]!.a.y };
    }
    const r1 = vergleichePlaene(plan, dxf1);
    const r2 = vergleichePlaene(plan, dxf2);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));

    // Und: zweimal auf demselben Objekt aufgerufen (keine versteckte Mutation
    // der Eingaben durch vergleichePlaene selbst).
    const r3 = vergleichePlaene(plan, dxf1);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r3));
  });
});

describe('vergleichePlaene — leere Eingaben (h)', () => {
  it('leerer Architektenplan und leeres DxfGraphic werfen nicht und liefern ein leeres Ergebnis', () => {
    const leererPlan = derivePlan(new KosmoDoc(), 'nicht-vorhanden');
    const leeresDxf: DxfGraphic = {
      regions: [],
      lines: [],
      arcs: [],
      texte: [],
      bericht: { layerBenutzt: [], layerUnklassiert: [], bloeckeNichtAufgeloest: 0, unbekannteEntities: {} },
    };
    expect(() => vergleichePlaene(leererPlan, leeresDxf)).not.toThrow();
    const result = vergleichePlaene(leererPlan, leeresDxf);
    expect(result).toEqual({
      befunde: [],
      unveraendert: 0,
      ausrichtung: { dx: 0, dy: 0, geschaetzt: false },
      hinweise: [],
    });
  });

  it('leerer Architektenplan gegen echtes DxfGraphic meldet alles als neu, ohne zu werfen', () => {
    const { dxfString } = baueTestpaar();
    const leererPlan = derivePlan(new KosmoDoc(), 'nicht-vorhanden');
    const dxf = frischesDxf(dxfString);
    expect(() => vergleichePlaene(leererPlan, dxf)).not.toThrow();
    const result = vergleichePlaene(leererPlan, dxf);
    expect(result.befunde.length).toBeGreaterThan(0);
    expect(result.befunde.every((b) => b.art === 'neu')).toBe(true);
  });
});
