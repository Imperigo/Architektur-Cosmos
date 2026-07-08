import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  KosmoDoc,
  execute,
  invertPatches,
  parseKosmoSafe,
  CommandError,
  deriveBauablauf,
  bauablaufBlattSvg,
  BAUABLAUF_HINWEIS,
  defaultBauablaufKennwerte,
  siaPhaseLabel,
} from '../src';

/**
 * Bauablaufplan-Grundgerüst (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 4, Owner-Hauptaufgabe K22) — Kernel-Tests für
 * `derive/bauablauf.ts` (die reine Ableitfunktion), das additive
 * Settings-Feld `bauablaufKennwerte` (Roundtrip/Parse-Guard, analog
 * `kvKennwerte`), den Command `design.bauablaufKennwerteSetzen` und das
 * `derive/bauablaufblatt.ts`-Exportartefakt (Golden-SVG).
 */

/** Ein Wandaufbau (200 mm, eine Schicht) für alle Wände der Fixtur. */
function setupAssembly(doc: KosmoDoc): string {
  const res = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 20',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  return (res.patches[0] as { id: string }).id;
}

function createStorey(doc: KosmoDoc, name: string, index: number, elevation: number): string {
  const res = execute(doc, 'design.geschossErstellen', { name, index, elevation, height: 3000 });
  return (res.patches[0] as { id: string }).id;
}

/** 10×3 m Wand (Achslänge 10 m), Höhe = Geschosshöhe 3 m ⇒ 30 m² Ansichtsfläche. */
function zeichneWand(doc: KosmoDoc, storeyId: string, assemblyId: string, laenge = 10000): string {
  const res = execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: laenge, y: 0 },
    assemblyId,
  });
  return (res.patches[0] as { id: string }).id;
}

/** 10×20 m Decke ⇒ 200 m² (dieselbe Fixtur-Grösse wie `kostenschaetzung.test.ts`). */
function zeichneDecke(doc: KosmoDoc, storeyId: string, thickness = 250): void {
  execute(doc, 'design.deckeZeichnen', {
    storeyId,
    outline: [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 20000 },
      { x: 0, y: 20000 },
    ],
    thickness,
  });
}

function setupEinGeschossDoc() {
  const doc = new KosmoDoc();
  const assemblyId = setupAssembly(doc);
  const egId = createStorey(doc, 'EG', 0, 0);
  zeichneDecke(doc, egId); // Bodenplatte
  zeichneWand(doc, egId, assemblyId);
  return { doc, assemblyId, egId };
}

describe('deriveBauablauf — feste Gewerke-Reihenfolge', () => {
  it('Reihenfolge ist immer: Aushub, Fundament, Rohbau je Geschoss, Dach, Hülle, Innenausbau (5×), Umgebung, Abnahme', () => {
    const { doc } = setupEinGeschossDoc();
    const ablauf = deriveBauablauf(doc);
    const ids = ablauf.phasen.map((p) => p.id);
    expect(ids).toEqual([
      'aushub',
      'fundament',
      expect.stringMatching(/^rohbau:/),
      'dach',
      'huelle',
      'innenausbau:elektro',
      'innenausbau:sanitaerHeizung',
      'innenausbau:trockenbau',
      'innenausbau:bodenbelaege',
      'innenausbau:maler',
      'umgebung',
      'abnahme',
    ]);
  });

  it('Wochen sind streng seriell fortlaufend, ausser den überlappenden Innenausbau-Gewerken', () => {
    const { doc } = setupEinGeschossDoc();
    const ablauf = deriveBauablauf(doc);
    // Vor dem Innenausbau ist alles lückenlos seriell: Aushub..Hülle.
    const vorInnenausbau = ablauf.phasen.filter((p) => !p.id.startsWith('innenausbau:') && p.id !== 'umgebung' && p.id !== 'abnahme');
    for (let i = 1; i < vorInnenausbau.length; i++) {
      expect(vorInnenausbau[i]!.startWoche).toBe(vorInnenausbau[i - 1]!.endWoche + 1);
    }
    const innenausbau = ablauf.phasen.filter((p) => p.parallel);
    expect(innenausbau.length).toBe(5);
    // Alle Innenausbau-Gewerke beginnen in derselben Woche (sie überlappen).
    const starts = new Set(innenausbau.map((p) => p.startWoche));
    expect(starts.size).toBe(1);
    const huelle = ablauf.phasen.find((p) => p.id === 'huelle')!;
    expect([...starts][0]).toBe(huelle.endWoche + 1);
    // Die nächste serielle Phase (Umgebung) beginnt erst NACH dem spätesten Innenausbau-Ende.
    const innenausbauEnde = Math.max(...innenausbau.map((p) => p.endWoche));
    const umgebung = ablauf.phasen.find((p) => p.id === 'umgebung')!;
    expect(umgebung.startWoche).toBe(innenausbauEnde + 1);
    const abnahme = ablauf.phasen.find((p) => p.id === 'abnahme')!;
    expect(abnahme.startWoche).toBe(umgebung.endWoche + 1);
  });

  it('gesamtWochen ist das Ende der letzten Phase (Abnahme)', () => {
    const { doc } = setupEinGeschossDoc();
    const ablauf = deriveBauablauf(doc);
    const abnahme = ablauf.phasen.find((p) => p.id === 'abnahme')!;
    expect(ablauf.gesamtWochen).toBe(abnahme.endWoche);
  });
});

describe('deriveBauablauf — Dauer als Funktion echter Mengen', () => {
  it('Rohbau-Dauer eines Geschosses skaliert mit dem Wandvolumen (exakt nachrechenbar)', () => {
    const { doc, egId } = setupEinGeschossDoc();
    const ablauf = deriveBauablauf(doc);
    const rohbauEg = ablauf.phasen.find((p) => p.id === `rohbau:${egId}`)!;
    // Wand 10 m × 3 m Geschosshöhe × 0.2 m Dicke = 6 m³. Kein Deckenanteil
    // (das unterste Geschoss trägt seine Decke bereits als Fundament).
    const erwartetesVolumen = 6;
    const erwarteteWochen = Math.ceil(erwartetesVolumen / defaultBauablaufKennwerte.m3RohbauProWoche);
    expect(rohbauEg.dauerWochen).toBe(Math.max(erwarteteWochen, defaultBauablaufKennwerte.minDauerWochen));
  });

  it('doppelte Wandlänge verdoppelt (näherungsweise) die Rohbau-Dauer', () => {
    const doc1 = new KosmoDoc();
    const asm1 = setupAssembly(doc1);
    const eg1 = createStorey(doc1, 'EG', 0, 0);
    zeichneDecke(doc1, eg1);
    zeichneWand(doc1, eg1, asm1, 400000); // lang genug, um Rundung zu dominieren

    const doc2 = new KosmoDoc();
    const asm2 = setupAssembly(doc2);
    const eg2 = createStorey(doc2, 'EG', 0, 0);
    zeichneDecke(doc2, eg2);
    zeichneWand(doc2, eg2, asm2, 800000);

    const a1 = deriveBauablauf(doc1).phasen.find((p) => p.id === `rohbau:${eg1}`)!;
    const a2 = deriveBauablauf(doc2).phasen.find((p) => p.id === `rohbau:${eg2}`)!;
    expect(a2.dauerWochen).toBeGreaterThan(a1.dauerWochen);
    expect(a2.dauerWochen).toBeCloseTo(a1.dauerWochen * 2, -1);
  });

  it('Fundament-Dauer kommt aus dem Volumen der untersten Geschossdecke (Bodenplatte)', () => {
    const { doc } = setupEinGeschossDoc();
    const ablauf = deriveBauablauf(doc);
    const fundament = ablauf.phasen.find((p) => p.id === 'fundament')!;
    // 200 m² × 0.25 m Dicke = 50 m³.
    const erwarteteWochen = Math.ceil(50 / defaultBauablaufKennwerte.m3RohbauProWoche);
    expect(fundament.dauerWochen).toBe(Math.max(erwarteteWochen, defaultBauablaufKennwerte.minDauerWochen));
  });

  it('ohne jede Geometrie (nur Geschosse) landen alle Phasen auf der Mindestdauer', () => {
    const doc = new KosmoDoc();
    createStorey(doc, 'EG', 0, 0);
    const ablauf = deriveBauablauf(doc);
    expect(ablauf.phasen.length).toBeGreaterThan(0);
    for (const p of ablauf.phasen) {
      expect(p.dauerWochen).toBeGreaterThanOrEqual(defaultBauablaufKennwerte.minDauerWochen);
    }
  });
});

describe('deriveBauablauf — Geschoss-Anzahl wirkt (Rohbau Geschoss für Geschoss)', () => {
  it('je ein zusätzliches Geschoss ergibt eine zusätzliche Rohbau-Phase', () => {
    const doc = new KosmoDoc();
    const asm = setupAssembly(doc);
    const eg = createStorey(doc, 'EG', 0, 0);
    zeichneDecke(doc, eg);
    zeichneWand(doc, eg, asm);

    const mitEinemGeschoss = deriveBauablauf(doc);
    const rohbauEins = mitEinemGeschoss.phasen.filter((p) => p.id.startsWith('rohbau:'));
    expect(rohbauEins.length).toBe(1);

    const og1 = createStorey(doc, '1.OG', 1, 3000);
    zeichneWand(doc, og1, asm);
    const og2 = createStorey(doc, '2.OG', 2, 6000);
    zeichneWand(doc, og2, asm);

    const mitDreiGeschossen = deriveBauablauf(doc);
    const rohbauDrei = mitDreiGeschossen.phasen.filter((p) => p.id.startsWith('rohbau:'));
    expect(rohbauDrei.length).toBe(3);
    // Mehr Rohbau-Phasen ⇒ mehr Gesamtwochen (mehr serielle Arbeit).
    expect(mitDreiGeschossen.gesamtWochen).toBeGreaterThan(mitEinemGeschoss.gesamtWochen);
  });

  it('Rohbau-Phasen erscheinen in Geschoss-Reihenfolge (UG vor EG vor OG)', () => {
    const doc = new KosmoDoc();
    const asm = setupAssembly(doc);
    // Bewusst nicht in Baureihenfolge angelegt — Sortierung muss nach `index` erfolgen.
    const og1 = createStorey(doc, '1.OG', 1, 3000);
    const ug1 = createStorey(doc, '1.UG', -1, -3000);
    const eg = createStorey(doc, 'EG', 0, 0);
    zeichneDecke(doc, ug1);
    zeichneWand(doc, ug1, asm);
    zeichneWand(doc, eg, asm);
    zeichneWand(doc, og1, asm);

    const ablauf = deriveBauablauf(doc);
    const rohbauIds = ablauf.phasen.filter((p) => p.id.startsWith('rohbau:')).map((p) => p.id);
    expect(rohbauIds).toEqual([`rohbau:${ug1}`, `rohbau:${eg}`, `rohbau:${og1}`]);
  });
});

describe('deriveBauablauf — leeres Doc', () => {
  it('ohne jedes Geschoss: keine Phasen, gesamtWochen 0 — keine erfundenen Wochen', () => {
    const doc = new KosmoDoc();
    const ablauf = deriveBauablauf(doc);
    expect(ablauf.phasen).toEqual([]);
    expect(ablauf.gesamtWochen).toBe(0);
  });
});

describe('deriveBauablauf — Kennwert-Overrides', () => {
  it('Overrides ersetzen einzelne Kennwerte NUR für den Aufruf, mutieren doc.settings nicht', () => {
    // Grosse Wand, damit die Default-Dauer über der Mindestdauer liegt (sonst
    // verschluckt der Mindestdauer-Boden jeden Override-Effekt).
    const doc = new KosmoDoc();
    const asm = setupAssembly(doc);
    const egId = createStorey(doc, 'EG', 0, 0);
    zeichneDecke(doc, egId);
    zeichneWand(doc, egId, asm, 400000);

    const ohne = deriveBauablauf(doc);
    const mit = deriveBauablauf(doc, { m3RohbauProWoche: 600 }); // 10× so schnell

    const rohbauOhne = ohne.phasen.find((p) => p.id === `rohbau:${egId}`)!;
    const rohbauMit = mit.phasen.find((p) => p.id === `rohbau:${egId}`)!;
    expect(rohbauMit.dauerWochen).toBeLessThan(rohbauOhne.dauerWochen);
    expect(doc.settings.bauablaufKennwerte.m3RohbauProWoche).toBe(defaultBauablaufKennwerte.m3RohbauProWoche);
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert dasselbe Ergebnis', () => {
    const { doc } = setupEinGeschossDoc();
    const a = deriveBauablauf(doc);
    const b = deriveBauablauf(doc);
    expect(a).toEqual(b);
  });
});

describe('Bauablauf-Kennwerte — additives Settings-Feld (v0.6.3, wie kvKennwerte)', () => {
  it('Default eines neuen Docs entspricht defaultBauablaufKennwerte', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.bauablaufKennwerte).toEqual(defaultBauablaufKennwerte);
  });

  it('Command setzt NUR genannte Felder, ist undo-fähig', () => {
    const doc = new KosmoDoc();
    const res = execute(doc, 'design.bauablaufKennwerteSetzen', { m3RohbauProWoche: 80, abnahmeWochen: 2 });
    expect(doc.settings.bauablaufKennwerte.m3RohbauProWoche).toBe(80);
    expect(doc.settings.bauablaufKennwerte.abnahmeWochen).toBe(2);
    expect(doc.settings.bauablaufKennwerte.m2AushubProWoche).toBe(defaultBauablaufKennwerte.m2AushubProWoche);
    expect(res.summary).toContain('ersetzt keine Bauleitung');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.bauablaufKennwerte).toEqual(defaultBauablaufKennwerte);
  });

  it('lehnt ungültige Werte ab (negativer Leistungswert)', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.bauablaufKennwerteSetzen', { m3RohbauProWoche: -5 })).toThrow(CommandError);
    expect(() => execute(doc, 'design.bauablaufKennwerteSetzen', { m2AushubProWoche: 0 })).toThrow(CommandError);
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die Kennwerte', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.bauablaufKennwerteSetzen', { m2DachProWoche: 250, abnahmeWochen: 3 });
    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    expect(wieder.settings.bauablaufKennwerte.m2DachProWoche).toBe(250);
    expect(wieder.settings.bauablaufKennwerte.abnahmeWochen).toBe(3);
  });

  it('parse-guard: Altbestand-Doc ohne bauablaufKennwerte-Feld lädt mit Default (kein Absturz)', () => {
    const altesSettings = { projectName: 'Altbau', agfFactor: 1.28, facadeFactor: 1.1 } as never;
    const doc = KosmoDoc.fromJSON({ schema: 'kosmo.model/v1', settings: altesSettings, entities: [] });
    expect(doc.settings.bauablaufKennwerte).toEqual(defaultBauablaufKennwerte);
    const roh = JSON.stringify({ schema: 'kosmo.model/v1', settings: altesSettings, entities: [] });
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.settings.bauablaufKennwerte).toEqual(defaultBauablaufKennwerte);
  });
});

describe('bauablaufBlattSvg', () => {
  function fixture() {
    const { doc } = setupEinGeschossDoc();
    return deriveBauablauf(doc);
  }

  it('liefert ein wohlgeformtes, eigenständiges A4-quer-SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const svg = bauablaufBlattSvg(fixture());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1123 794"');
  });

  it('enthält den Ehrlichkeits-Hinweis IMMER, prominent', () => {
    const svg = bauablaufBlattSvg(fixture());
    expect(svg).toContain(BAUABLAUF_HINWEIS);
  });

  it('Kopf: Titel/Datum/SIA-Teilphase erscheinen nur, wenn übergeben', () => {
    const ablauf = fixture();
    const ohne = bauablaufBlattSvg(ablauf);
    expect(ohne).not.toContain('Wettbewerb/Studie');

    const mit = bauablaufBlattSvg(ablauf, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'ausfuehrung',
    });
    expect(mit).toContain('Bauablaufplan — Ersatzneubau Zürich-Altstetten');
    expect(mit).toContain('08.07.2026');
    expect(mit).toContain(siaPhaseLabel('ausfuehrung'));
  });

  it('leerer Ablauf (keine Geschosse) zeigt eine ehrliche Leermeldung statt eines erfundenen Balkenplans', () => {
    const doc = new KosmoDoc();
    const ablauf = deriveBauablauf(doc);
    const svg = bauablaufBlattSvg(ablauf);
    expect(svg).toContain('Keine Geometrie');
    // «Fundament» erscheint NUR als Gantt-Zeilenname (die Fusszeilen-Legende
    // nennt Aushub/Rohbau/Dach/Hülle/Umgebung/Abnahme, aber nie Fundament) —
    // fehlt es, wurde kein Balkenplan vorgetäuscht.
    expect(svg).not.toContain('Fundament');
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const ablauf = fixture();
    const opts = { titel: 'Testprojekt', datum: '08.07.2026' } as const;
    expect(bauablaufBlattSvg(ablauf, opts)).toBe(bauablaufBlattSvg(ablauf, opts));
  });
});

describe('Golden-SVG (Bauablaufblatt)', () => {
  it('Blatt der Fixtur (1 Geschoss, 10 m Wand, 200 m² Decke) ist byte-identisch zur committeten Referenz', () => {
    const { doc } = setupEinGeschossDoc();
    const ablauf = deriveBauablauf(doc);
    const svg = bauablaufBlattSvg(ablauf, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'ausfuehrung',
    });
    const golden = readFileSync(new URL('./golden/bauablaufblatt.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
  });
});
