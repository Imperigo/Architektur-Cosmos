import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import {
  KosmoDoc,
  execute,
  invertPatches,
  schlageBaugesuchSatzVor,
  formatBaugesuchBericht,
  deriveAusnuetzungKennwerte,
  ausnuetzungsnachweisSvg,
  deriveBerechnungsliste,
  BAUGESUCH_HINWEIS,
  utf8ToBase64,
  type Sheet,
  type ImageAsset,
} from '../src';

/**
 * Baugesuch-Blattsatz (v0.6.3 VP2, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 2, Owner-Hauptaufgabe K22) — Kernel-Tests für
 * `derive/baugesuch.ts` (die kuratierte Blattliste), `derive/
 * ausnuetzungsnachweis.ts` (Zonenregel-Gegenüberstellung + SVG-Blatt) und
 * den Command `publish.baugesuchErstellen` (Golden-SVG, Undo).
 */

/** Vollständiges Modell: 2 Geschosse mit Wänden, eine Zone (Fläche für die
 *  Berechnungsliste), eine Baugrenze (Situation + Grenzabstand-Check), eine
 *  aktive Zonenregel und ein bereits im Plansatz platzierter Schnitt — das
 *  «TKB-artige» Doc, das ALLE Baugesuch-Blätter ableitbar macht. */
function volleDoku() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyEg = (eg.patches[0] as { id: string }).id;
  const og = execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3000, height: 3000 });
  const storeyOg = (og.patches[0] as { id: string }).id;

  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;

  const rechteck = (storeyId: string) => {
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    wand({ x: 0, y: 0 }, { x: 10000, y: 0 });
    wand({ x: 10000, y: 0 }, { x: 10000, y: 20000 });
    wand({ x: 10000, y: 20000 }, { x: 0, y: 20000 });
    wand({ x: 0, y: 20000 }, { x: 0, y: 0 });
  };
  rechteck(storeyEg);
  rechteck(storeyOg);

  execute(doc, 'design.zoneErstellen', {
    storeyId: storeyEg,
    outline: [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 20000 },
      { x: 0, y: 20000 },
    ],
    name: 'Wohnen',
    sia: 'HNF',
  });

  // Baugrenze deutlich grösser als der Baukörper (5 m Luft ringsum) — Grenzabstand-Check bleibt «eingehalten»
  execute(doc, 'design.baugrenzeSetzen', {
    storeyId: storeyEg,
    outline: [
      { x: -5000, y: -5000 },
      { x: 15000, y: -5000 },
      { x: 15000, y: 25000 },
      { x: -5000, y: 25000 },
    ],
    grenzabstand: 3000,
  });

  execute(doc, 'design.zonenRegelSetzen', {
    name: 'W2 Test',
    az: 0.5,
    maxHoehe: 10000,
    maxVollgeschosse: 2,
    grenzabstandKlein: 3000,
    grenzabstandGross: 6000,
    parzellenFlaeche: 1000,
  });

  const blatt = execute(doc, 'publish.blattErstellen', { name: 'Arbeitsblatt', format: 'A1', orientation: 'quer' });
  const sheetId = (blatt.patches[0] as { id: string }).id;
  execute(doc, 'publish.ansichtPlatzieren', {
    sheetId,
    view: 'schnitt',
    a: { x: -1000, y: 10000 },
    b: { x: 11000, y: 10000 },
    scale: 100,
    x: 400,
    y: 300,
    title: 'Schnitt A-A',
  });

  return { doc, storeyEg, storeyOg, sheetId };
}

describe('schlageBaugesuchSatzVor — Blattliste je Modellzustand', () => {
  it('leeres Doc: Situation/Grundrisse/Schnitte leer, jede Lücke ehrlich benannt', () => {
    const doc = new KosmoDoc();
    const v = schlageBaugesuchSatzVor(doc);
    expect(v.situation).toBeNull();
    expect(v.grundrisse).toEqual([]);
    expect(v.schnitte).toEqual([]);
    expect(v.hinweise.some((h) => h.includes('Keine Parzelle'))).toBe(true);
    expect(v.hinweise.some((h) => h.includes('keine Geschosse'))).toBe(true);
    expect(v.hinweise.some((h) => h.includes('Kein Schnitt'))).toBe(true);
    expect(v.hinweise.some((h) => h.includes('Fassaden/Ansichten'))).toBe(true);
  });

  it('ohne Schnitt: volles Modell, aber kein SectionSpec definiert — nur DIESE Lücke bleibt offen (+ Fassaden-Lücke)', () => {
    const { doc } = volleDoku();
    // Den einzigen Schnitt wieder entfernen (Blatt löschen)
    const blaetter = doc.byKind<Sheet>('sheet');
    for (const b of blaetter) execute(doc, 'publish.blattEntfernen', { sheetId: b.id });

    const v = schlageBaugesuchSatzVor(doc);
    expect(v.situation).not.toBeNull();
    expect(v.grundrisse).toHaveLength(2);
    expect(v.schnitte).toEqual([]);
    expect(v.hinweise.some((h) => h.includes('Kein Schnitt im Modell definiert'))).toBe(true);
    expect(v.hinweise.filter((h) => h.includes('keine Situation ableitbar'))).toHaveLength(0);
    expect(v.hinweise.filter((h) => h.includes('kein Grundriss ableitbar'))).toHaveLength(0);
  });

  it('volles TKB-artiges Doc: Situation + 2 Grundrisse + 1 Schnitt, einzige verbleibende Lücke ist die Fassaden-Lücke', () => {
    const { doc, storeyEg } = volleDoku();
    const v = schlageBaugesuchSatzVor(doc);
    expect(v.situation).toEqual({ storeyId: storeyEg, storeyName: 'EG', scale: 500 });
    expect(v.grundrisse).toHaveLength(2);
    expect(v.grundrisse.map((g) => g.storeyName).sort()).toEqual(['1.OG', 'EG']);
    expect(v.schnitte).toHaveLength(1);
    expect(v.schnitte[0]!.title).toBe('Schnitt A-A');
    expect(v.hinweise).toHaveLength(1);
    expect(v.hinweise[0]).toContain('Fassaden/Ansichten');
  });

  it('formatBaugesuchBericht nennt Situation/Grundrisse/Schnitte/Ausnützungsnachweis UND die Lücken', () => {
    const { doc } = volleDoku();
    const bericht = formatBaugesuchBericht(schlageBaugesuchSatzVor(doc));
    expect(bericht).toContain('Situation');
    expect(bericht).toContain('2 Grundrisse');
    expect(bericht).toContain('1 Schnitt');
    expect(bericht).toContain('Ausnützungsnachweis');
    expect(bericht).toContain('Fehlt/Lücke');
  });
});

describe('deriveAusnuetzungKennwerte — exakte Zahlen gegen deriveBerechnungsliste + Zonenregel', () => {
  it('leeres Doc: alle Kennwerte «unbekannt» (keine Regel/Fläche/Baugrenze) — keine erfundene Zahl', () => {
    const doc = new KosmoDoc();
    const kennwerte = deriveAusnuetzungKennwerte(doc);
    expect(kennwerte).toHaveLength(4);
    for (const k of kennwerte) {
      expect(k.status).toBe('unbekannt');
      expect(k.ist).toBe('—');
    }
  });

  it('volles Doc: AZ/Höhe/Vollgeschosse/Grenzabstand exakt nachrechenbar, alle «ok»', () => {
    const { doc } = volleDoku();
    const liste = deriveBerechnungsliste(doc);
    expect(liste.totalAgf).toBeCloseTo(200, 5); // 10×20 m Zone, ungetypt

    const kennwerte = deriveAusnuetzungKennwerte(doc);
    const az = kennwerte.find((k) => k.label.startsWith('Ausnützungsziffer'))!;
    expect(az.ist).toBe((200 / 1000).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    expect(az.erlaubt).toBe((0.5).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    expect(az.status).toBe('ok');

    const hoehe = kennwerte.find((k) => k.label === 'Gebäudehöhe')!;
    expect(hoehe.ist).toBe('6 m'); // 1.OG: elevation 3000 + baseOffset 0 + height 3000 = 6000 mm
    expect(hoehe.erlaubt).toBe('10 m');
    expect(hoehe.status).toBe('ok');

    const voll = kennwerte.find((k) => k.label === 'Vollgeschosse')!;
    expect(voll.ist).toBe('2');
    expect(voll.erlaubt).toBe('2');
    expect(voll.status).toBe('ok');

    const grenz = kennwerte.find((k) => k.label === 'Grenzabstand')!;
    expect(grenz.ist).toBe('eingehalten');
    expect(grenz.status).toBe('ok');
  });

  it('Zonenregel enger als das Modell: Vollgeschosse/Höhe melden «ueberschritten»', () => {
    const { doc } = volleDoku();
    execute(doc, 'design.zonenRegelSetzen', {
      name: 'Eng',
      az: 0.05,
      maxHoehe: 4000, // 4 m < tatsächliche 6 m
      maxVollgeschosse: 1, // < tatsächliche 2
      grenzabstandKlein: 3000,
      grenzabstandGross: 6000,
      parzellenFlaeche: 1000,
    });
    const kennwerte = deriveAusnuetzungKennwerte(doc);
    expect(kennwerte.find((k) => k.label === 'Gebäudehöhe')!.status).toBe('ueberschritten');
    expect(kennwerte.find((k) => k.label === 'Vollgeschosse')!.status).toBe('ueberschritten');
    expect(kennwerte.find((k) => k.label.startsWith('Ausnützungsziffer'))!.status).toBe('ueberschritten');
  });

  it('Baugrenze mit Grenzabstand-Verletzung: Status «ueberschritten», Verletzungszahl > 0', () => {
    const { doc, storeyEg } = volleDoku();
    // Baugrenze knapp um den Baukörper (kein Abstand) → Wände verletzen den Grenzabstand
    execute(doc, 'design.baugrenzeSetzen', {
      storeyId: storeyEg,
      outline: [
        { x: 0, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 20000 },
        { x: 0, y: 20000 },
      ],
      grenzabstand: 3000,
    });
    const kennwerte = deriveAusnuetzungKennwerte(doc);
    const grenz = kennwerte.find((k) => k.label === 'Grenzabstand')!;
    expect(grenz.status).toBe('ueberschritten');
    expect(grenz.ist).toMatch(/Verletzung/);
  });

  it('Determinismus: zweimaliger Aufruf mit demselben Doc liefert dieselben Kennwerte', () => {
    const { doc } = volleDoku();
    expect(deriveAusnuetzungKennwerte(doc)).toEqual(deriveAusnuetzungKennwerte(doc));
  });
});

describe('ausnuetzungsnachweisSvg', () => {
  function fixture() {
    const { doc } = volleDoku();
    return { liste: deriveBerechnungsliste(doc), kennwerte: deriveAusnuetzungKennwerte(doc) };
  }

  it('liefert ein wohlgeformtes, eigenständiges A4-SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const { liste, kennwerte } = fixture();
    const svg = ausnuetzungsnachweisSvg(liste, kennwerte);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 794 1123"');
  });

  it('enthält den Ehrlichkeits-Hinweis IMMER, prominent', () => {
    const { liste, kennwerte } = fixture();
    const svg = ausnuetzungsnachweisSvg(liste, kennwerte);
    expect(svg).toContain(BAUGESUCH_HINWEIS);
    expect(svg).toContain('ZUSAMMENSTELLUNG — KEINE BEWILLIGUNG');
  });

  it('leeres Doc: ehrliche Leermeldung statt einer 0-Zeile, alle Status «—»', () => {
    const doc = new KosmoDoc();
    const svg = ausnuetzungsnachweisSvg(deriveBerechnungsliste(doc), deriveAusnuetzungKennwerte(doc));
    expect(svg).toContain('Keine Geometrie');
  });

  it('Kopf: Titel/Datum/SIA-Phase/Regelname erscheinen nur, wenn übergeben', () => {
    const { liste, kennwerte } = fixture();
    const ohne = ausnuetzungsnachweisSvg(liste, kennwerte);
    expect(ohne).not.toContain('Ersatzneubau');
    const mit = ausnuetzungsnachweisSvg(liste, kennwerte, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'bewilligung',
      regelName: 'W2 Test',
    });
    // D4 (v0.7.3 «Zwei Stimmen»): Titel-Stimme setzt versal — reiner
    // Matcher-String, kein Golden (s. GOLDEN-WECHSEL-D4.md).
    expect(mit).toContain('AUSNÜTZUNGSNACHWEIS — ERSATZNEUBAU ZÜRICH-ALTSTETTEN');
    expect(mit).toContain('08.07.2026');
    expect(mit).toContain('Zonenregel «W2 Test»');
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const { liste, kennwerte } = fixture();
    const opts = { titel: 'Testprojekt', datum: '08.07.2026', siaPhase: 'bewilligung' } as const;
    expect(ausnuetzungsnachweisSvg(liste, kennwerte, opts)).toBe(ausnuetzungsnachweisSvg(liste, kennwerte, opts));
  });
});

describe('Golden-SVG (Ausnützungsnachweis)', () => {
  it('Blatt der Fixtur-Doku ist byte-identisch zur committeten Referenz', () => {
    const { doc } = volleDoku();
    const liste = deriveBerechnungsliste(doc);
    const kennwerte = deriveAusnuetzungKennwerte(doc);
    const svg = ausnuetzungsnachweisSvg(liste, kennwerte, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'bewilligung',
      regelName: 'W2 Test',
    });
    pruefeGolden(svg, new URL('./golden/ausnuetzungsnachweis.svg', import.meta.url));
  });
});

describe('utf8ToBase64', () => {
  it('roundtrip gegen Buffer (Node) für ASCII UND Umlaute — kein Zeichenverlust', () => {
    const texte = ['Ausnützungsnachweis — Zusammenstellung für die Eingabe', 'ÄÖÜäöüß «Grenzabstand» 42%'];
    for (const t of texte) {
      const b64 = utf8ToBase64(t);
      expect(Buffer.from(b64, 'base64').toString('utf8')).toBe(t);
    }
  });

  it('leerer String ergibt leeren Base64-String', () => {
    expect(utf8ToBase64('')).toBe('');
  });
});

describe('Command publish.baugesuchErstellen', () => {
  it('erzeugt Situation + Grundrisse + Schnitt + Ausnützungsnachweis als je eigenes Blatt, bündelt sie als Set «Baugesuch»', () => {
    const { doc } = volleDoku();
    const vorSheets = doc.byKind<Sheet>('sheet').length; // 1 (Arbeitsblatt mit dem Schnitt)
    const res = execute(doc, 'publish.baugesuchErstellen', {});
    const neueSheets = doc.byKind<Sheet>('sheet');
    expect(neueSheets.length).toBe(vorSheets + 5); // Situation + 2 Grundrisse + 1 Schnitt + Ausnützungsnachweis

    const set = (doc.settings.publikationsSets ?? []).find((s) => s.name === 'Baugesuch');
    expect(set).toBeDefined();
    expect(set!.sheetIds).toHaveLength(5);

    const nachweis = neueSheets.find((s) => s.name === 'Ausnützungsnachweis')!;
    expect(nachweis.format).toBe('A4');
    expect(nachweis.orientation).toBe('hoch');
    expect(nachweis.bilder).toHaveLength(1);
    const asset = doc.get<ImageAsset>(nachweis.bilder![0]!.assetId!)!;
    expect(asset.mime).toBe('image/svg+xml');
    expect(Buffer.from(asset.data, 'base64').toString('utf8')).toContain(BAUGESUCH_HINWEIS);
    expect(nachweis.bilder![0]!.title).toContain('Ausnützungsnachweis');

    expect(res.summary).toContain('Baugesuch-Satz erstellt');
    expect(res.summary).toContain('Situation');
    expect(res.summary).toContain('2 Grundrisse');
    expect(res.summary).toContain('1 Schnitt');
    expect(res.summary).not.toContain('Fehlt/Lücke: Kein Schnitt');
  });

  it('leeres Doc: erzeugt trotzdem NUR das Ausnützungsnachweis-Blatt (Pflichtbeilage) + Set mit 1 Blatt, ehrliche Fehlliste', () => {
    const doc = new KosmoDoc();
    const res = execute(doc, 'publish.baugesuchErstellen', {});
    const sheets = doc.byKind<Sheet>('sheet');
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.name).toBe('Ausnützungsnachweis');
    const set = (doc.settings.publikationsSets ?? []).find((s) => s.name === 'Baugesuch');
    expect(set!.sheetIds).toHaveLength(1);
    expect(res.summary).toContain('Fehlt/Lücke');
    expect(res.summary).toContain('Keine Parzelle');
    expect(res.summary).toContain('Kein Schnitt');
  });

  it('EIN atomarer Undo-Schritt: invertPatches räumt ALLE erzeugten Blätter, das Asset und das Set restlos weg', () => {
    const { doc } = volleDoku();
    const vorSheetIds = new Set(doc.byKind<Sheet>('sheet').map((s) => s.id));
    const vorAssetIds = new Set(doc.byKind<ImageAsset>('imageasset').map((a) => a.id));
    const vorSets = doc.settings.publikationsSets ?? [];

    const res = execute(doc, 'publish.baugesuchErstellen', {});
    expect(doc.byKind<Sheet>('sheet').length).toBeGreaterThan(vorSheetIds.size);

    doc.apply(invertPatches(res.patches));

    expect(new Set(doc.byKind<Sheet>('sheet').map((s) => s.id))).toEqual(vorSheetIds);
    expect(new Set(doc.byKind<ImageAsset>('imageasset').map((a) => a.id))).toEqual(vorAssetIds);
    expect(doc.settings.publikationsSets ?? []).toEqual(vorSets);
  });

  it('zweifacher Aufruf ersetzt das Set «Baugesuch» (gleicher Name, neue Blätter) statt es zu verdoppeln', () => {
    const { doc } = volleDoku();
    execute(doc, 'publish.baugesuchErstellen', {});
    execute(doc, 'publish.baugesuchErstellen', {});
    const sets = (doc.settings.publikationsSets ?? []).filter((s) => s.name === 'Baugesuch');
    expect(sets).toHaveLength(1);
  });
});
