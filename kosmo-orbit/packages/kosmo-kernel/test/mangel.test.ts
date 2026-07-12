import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import {
  KosmoDoc,
  execute,
  invertPatches,
  parseKosmoSafe,
  CommandError,
  deriveAbnahmeprotokoll,
  abnahmeprotokollSvg,
  ABNAHME_HINWEIS,
  MANGEL_GEWERK_VORSCHLAEGE,
  siaPhaseLabel,
  type Mangel,
} from '../src';

/**
 * Mängel-/Abnahme-Batch (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 5, Owner-Hauptaufgabe K22) — die Abschlussphase
 * «Gebäudeabnahme» gab es im Kernel vorher gar nicht (0 Treffer laut
 * Konzept). Tests für die `Mangel`-Entity (Roundtrip/Parse-Guard), die drei
 * Commands (`design.mangelErfassen`/`mangelStatusSetzen`/`mangelLoeschen`,
 * inkl. Undo) und `derive/abnahmeprotokoll.ts` (Gruppierung/Zählung,
 * Determinismus, Golden-SVG) — gebaut nach demselben Muster wie
 * `test/bauablauf.test.ts`.
 */

function erfassen(doc: KosmoDoc, overrides: Partial<Record<string, unknown>> = {}) {
  return execute(doc, 'design.mangelErfassen', {
    ort: 'Bad 2.OG',
    beschreibung: 'Silikonfuge Dusche undicht',
    gewerk: 'Sanitär/Heizung',
    erfasstAm: '08.07.2026',
    ...overrides,
  });
}

describe('Mangel-Entity — Roundtrip/Parse-Guard', () => {
  it('design.mangelErfassen legt eine Mangel-Entity mit status «offen» an', () => {
    const doc = new KosmoDoc();
    const res = erfassen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const mangel = doc.get<Mangel>(id)!;
    expect(mangel.kind).toBe('mangel');
    expect(mangel.ort).toBe('Bad 2.OG');
    expect(mangel.gewerk).toBe('Sanitär/Heizung');
    expect(mangel.status).toBe('offen');
    expect(mangel.erfasstAm).toBe('08.07.2026');
    expect(mangel.behobenAm).toBeUndefined();
  });

  it('optionale Felder (storeyId, at, frist) sind gesetzt, wenn übergeben, sonst ganz weg (exactOptionalPropertyTypes)', () => {
    const doc = new KosmoDoc();
    const geschoss = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (geschoss.patches[0] as { id: string }).id;

    const mitAllem = erfassen(doc, { storeyId, at: { x: 1000, y: 2000 }, frist: '31.08.2026' });
    const idMit = (mitAllem.patches[0] as { id: string }).id;
    const mangelMit = doc.get<Mangel>(idMit)!;
    expect(mangelMit.storeyId).toBe(storeyId);
    expect(mangelMit.at).toEqual({ x: 1000, y: 2000 });
    expect(mangelMit.frist).toBe('31.08.2026');

    const ohne = erfassen(doc);
    const idOhne = (ohne.patches[0] as { id: string }).id;
    const mangelOhne = doc.get<Mangel>(idOhne)!;
    expect('storeyId' in mangelOhne).toBe(false);
    expect('at' in mangelOhne).toBe(false);
    expect('frist' in mangelOhne).toBe(false);
  });

  it('lehnt eine unbekannte storeyId ab', () => {
    const doc = new KosmoDoc();
    expect(() => erfassen(doc, { storeyId: 'geschoss_unbekannt' })).toThrow(CommandError);
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die Mangel-Entity vollständig', () => {
    const doc = new KosmoDoc();
    const geschoss = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (geschoss.patches[0] as { id: string }).id;
    erfassen(doc, { storeyId, frist: '31.08.2026' });

    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    const mangel = wieder.byKind<Mangel>('mangel')[0]!;
    expect(mangel.ort).toBe('Bad 2.OG');
    expect(mangel.storeyId).toBe(storeyId);
    expect(mangel.frist).toBe('31.08.2026');
  });

  it('parse-guard: parseKosmoSafe akzeptiert ein Doc mit Mangel-Entities', () => {
    const doc = new KosmoDoc();
    erfassen(doc);
    const roh = JSON.stringify(doc.toJSON());
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.byKind<Mangel>('mangel').length).toBe(1);
  });
});

describe('design.mangelStatusSetzen — Commands + Undo', () => {
  it('setzt status «behoben» inkl. behobenAm', () => {
    const doc = new KosmoDoc();
    const res = erfassen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.mangelStatusSetzen', { mangelId: id, status: 'behoben', behobenAm: '15.07.2026' });
    const mangel = doc.get<Mangel>(id)!;
    expect(mangel.status).toBe('behoben');
    expect(mangel.behobenAm).toBe('15.07.2026');
  });

  it('lehnt «behoben» ohne behobenAm ab', () => {
    const doc = new KosmoDoc();
    const res = erfassen(doc);
    const id = (res.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.mangelStatusSetzen', { mangelId: id, status: 'behoben' })).toThrow(
      CommandError,
    );
  });

  it('Rückstufung auf «offen» löscht behobenAm wieder vollständig (kein undefined-Rest)', () => {
    const doc = new KosmoDoc();
    const res = erfassen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.mangelStatusSetzen', { mangelId: id, status: 'behoben', behobenAm: '15.07.2026' });
    execute(doc, 'design.mangelStatusSetzen', { mangelId: id, status: 'offen' });
    const mangel = doc.get<Mangel>(id)!;
    expect(mangel.status).toBe('offen');
    expect('behobenAm' in mangel).toBe(false);
  });

  it('ist über invertPatches vollständig rückgängig zu machen (atomare Undo-Gruppe)', () => {
    const doc = new KosmoDoc();
    const res = erfassen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const vorher = doc.get<Mangel>(id)!;
    const statusRes = execute(doc, 'design.mangelStatusSetzen', {
      mangelId: id,
      status: 'behoben',
      behobenAm: '15.07.2026',
    });
    doc.apply(invertPatches(statusRes.patches));
    expect(doc.get<Mangel>(id)).toEqual(vorher);
  });

  it('lehnt eine unbekannte mangelId ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.mangelStatusSetzen', { mangelId: 'mangel_unbekannt', status: 'offen' }),
    ).toThrow(CommandError);
  });
});

describe('design.mangelLoeschen — Commands + Undo', () => {
  it('löscht die Entity, Undo stellt sie wieder her', () => {
    const doc = new KosmoDoc();
    const res = erfassen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const vorher = doc.get<Mangel>(id)!;

    const delRes = execute(doc, 'design.mangelLoeschen', { mangelId: id });
    expect(doc.get<Mangel>(id)).toBeUndefined();

    doc.apply(invertPatches(delRes.patches));
    expect(doc.get<Mangel>(id)).toEqual(vorher);
  });

  it('lehnt eine unbekannte mangelId ab', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.mangelLoeschen', { mangelId: 'mangel_unbekannt' })).toThrow(CommandError);
  });
});

describe('deriveAbnahmeprotokoll — Gruppierung/Zählung', () => {
  it('leeres Doc: keine Gruppen, alle Zähler 0', () => {
    const doc = new KosmoDoc();
    const protokoll = deriveAbnahmeprotokoll(doc);
    expect(protokoll.gruppen).toEqual([]);
    expect(protokoll.anzahlOffen).toBe(0);
    expect(protokoll.anzahlBehoben).toBe(0);
    expect(protokoll.anzahlTotal).toBe(0);
  });

  it('gruppiert nach Gewerk, zählt offen/behoben korrekt', () => {
    const doc = new KosmoDoc();
    const m1 = erfassen(doc, { ort: 'Bad 2.OG', gewerk: 'Sanitär/Heizung' });
    const m2 = erfassen(doc, { ort: 'Küche EG', gewerk: 'Sanitär/Heizung' });
    const m3 = erfassen(doc, { ort: 'Wohnzimmer 1.OG', gewerk: 'Elektro' });
    execute(doc, 'design.mangelStatusSetzen', {
      mangelId: (m1.patches[0] as { id: string }).id,
      status: 'behoben',
      behobenAm: '15.07.2026',
    });
    void m2;
    void m3;

    const protokoll = deriveAbnahmeprotokoll(doc);
    expect(protokoll.anzahlTotal).toBe(3);
    expect(protokoll.anzahlOffen).toBe(2);
    expect(protokoll.anzahlBehoben).toBe(1);
    expect(protokoll.gruppen.map((g) => g.gewerk)).toEqual(['Elektro', 'Sanitär/Heizung']);
    const sanitaer = protokoll.gruppen.find((g) => g.gewerk === 'Sanitär/Heizung')!;
    expect(sanitaer.maengel.length).toBe(2);
  });

  it('Gruppen-Reihenfolge: bekannte Gewerke (Bauablauf-Vorschlagsliste) zuerst, unbekannte alphabetisch danach', () => {
    const doc = new KosmoDoc();
    // Absichtlich in "falscher" Reihenfolge erfasst.
    erfassen(doc, { gewerk: 'Zzz-Sonderfall' });
    erfassen(doc, { gewerk: 'Maler' });
    erfassen(doc, { gewerk: 'Aushub' });
    erfassen(doc, { gewerk: 'Abc-Sonderfall' });

    const protokoll = deriveAbnahmeprotokoll(doc);
    expect(protokoll.gruppen.map((g) => g.gewerk)).toEqual(['Aushub', 'Maler', 'Abc-Sonderfall', 'Zzz-Sonderfall']);
    // Die Vorschlagsliste selbst enthält die bekannten Gewerke in genau der Reihenfolge, die hier vorausgesetzt wird.
    expect(MANGEL_GEWERK_VORSCHLAEGE.indexOf('Aushub')).toBeLessThan(MANGEL_GEWERK_VORSCHLAEGE.indexOf('Maler'));
  });

  it('Determinismus: zweimaliger Aufruf mit identischem Doc liefert dasselbe Ergebnis', () => {
    const doc = new KosmoDoc();
    erfassen(doc, { gewerk: 'Elektro' });
    erfassen(doc, { gewerk: 'Maler' });
    const a = deriveAbnahmeprotokoll(doc);
    const b = deriveAbnahmeprotokoll(doc);
    expect(a).toEqual(b);
  });
});

describe('abnahmeprotokollSvg', () => {
  function fixture() {
    const doc = new KosmoDoc();
    const m1 = erfassen(doc, { ort: 'Bad 2.OG', beschreibung: 'Silikonfuge Dusche undicht', gewerk: 'Sanitär/Heizung' });
    erfassen(doc, {
      ort: 'Treppenhaus EG',
      beschreibung: 'Handlauf lose',
      gewerk: 'Rohbau',
      frist: '31.08.2026',
    });
    execute(doc, 'design.mangelStatusSetzen', {
      mangelId: (m1.patches[0] as { id: string }).id,
      status: 'behoben',
      behobenAm: '15.07.2026',
    });
    return deriveAbnahmeprotokoll(doc);
  }

  it('liefert ein wohlgeformtes, eigenständiges A4-SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const svg = abnahmeprotokollSvg(fixture());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 794 1123"');
  });

  it('enthält den Ehrlichkeits-Disclaimer IMMER, prominent und als zusammenhängender String', () => {
    const svg = abnahmeprotokollSvg(fixture());
    expect(svg).toContain(ABNAHME_HINWEIS);
    expect(ABNAHME_HINWEIS).toContain('kein rechtsgültiges Abnahmeprotokoll');
    expect(ABNAHME_HINWEIS).toContain('SIA 118');
  });

  it('Kopf: Titel/Datum/SIA-Teilphase erscheinen nur, wenn übergeben; Zusammenfassung immer', () => {
    const protokoll = fixture();
    const ohne = abnahmeprotokollSvg(protokoll);
    expect(ohne).not.toContain('Wettbewerb/Studie');
    expect(ohne).toContain('1 offen / 1 behoben (2 total)');

    const mit = abnahmeprotokollSvg(protokoll, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'abnahme',
    });
    expect(mit).toContain('Abnahmeprotokoll — Ersatzneubau Zürich-Altstetten');
    expect(mit).toContain('08.07.2026');
    expect(mit).toContain(siaPhaseLabel('abnahme'));
  });

  it('Mängelliste zeigt Ort/Beschreibung/Status/Frist gruppiert nach Gewerk', () => {
    const svg = abnahmeprotokollSvg(fixture());
    expect(svg).toContain('Sanitär/Heizung (1)');
    expect(svg).toContain('Rohbau (1)');
    expect(svg).toContain('Bad 2.OG');
    expect(svg).toContain('Silikonfuge Dusche undicht');
    expect(svg).toContain('Behoben (15.07.2026)');
    expect(svg).toContain('Handlauf lose');
    expect(svg).toContain('31.08.2026');
    expect(svg).toContain('Offen');
  });

  it('leeres Protokoll (keine Mängel) zeigt eine ehrliche Leermeldung statt einer erfundenen Liste', () => {
    const doc = new KosmoDoc();
    const protokoll = deriveAbnahmeprotokoll(doc);
    const svg = abnahmeprotokollSvg(protokoll);
    expect(svg).toContain('Keine Mängel erfasst');
    expect(svg).toContain('0 offen / 0 behoben (0 total)');
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const protokoll = fixture();
    const opts = { titel: 'Testprojekt', datum: '08.07.2026' } as const;
    expect(abnahmeprotokollSvg(protokoll, opts)).toBe(abnahmeprotokollSvg(protokoll, opts));
  });
});

describe('Golden-SVG (Abnahmeprotokoll)', () => {
  it('Protokoll der Fixtur (2 Mängel, 1 behoben) ist byte-identisch zur committeten Referenz', () => {
    const doc = new KosmoDoc();
    const m1 = erfassen(doc, { ort: 'Bad 2.OG', beschreibung: 'Silikonfuge Dusche undicht', gewerk: 'Sanitär/Heizung' });
    erfassen(doc, {
      ort: 'Treppenhaus EG',
      beschreibung: 'Handlauf lose',
      gewerk: 'Rohbau',
      frist: '31.08.2026',
    });
    execute(doc, 'design.mangelStatusSetzen', {
      mangelId: (m1.patches[0] as { id: string }).id,
      status: 'behoben',
      behobenAm: '15.07.2026',
    });
    const protokoll = deriveAbnahmeprotokoll(doc);
    const svg = abnahmeprotokollSvg(protokoll, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'abnahme',
    });
    pruefeGolden(svg, new URL('./golden/abnahmeprotokoll.svg', import.meta.url));
  });
});
