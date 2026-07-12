import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { schwarzplanSvg, schwarzplanGeometrie } from '../src/derive/schwarzplan';
import type { Zone } from '../src/model/entities';

/**
 * Schwarzplan/Situationsplan v1 (v0.7.0 E4, `docs/V070-KONZEPT.md`) —
 * Guard/Ehrlichkeitsgrenzen s. Modul-Kommentar `derive/schwarzplan.ts`.
 */

const PARZELLE_OUTLINE = [
  { x: -10000, y: -8000 },
  { x: 20000, y: -8000 },
  { x: 20000, y: 14000 },
  { x: -10000, y: 14000 },
];

const TESTHAUS_OUTLINE = [
  { x: 0, y: 0 },
  { x: 9000, y: 0 },
  { x: 9000, y: 6000 },
  { x: 0, y: 6000 },
];

function baueGeschoss(doc: KosmoDoc): string {
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return (eg.patches[0] as { id: string }).id;
}

function baueParzelle(doc: KosmoDoc, storeyId: string): void {
  execute(doc, 'design.zoneErstellen', {
    storeyId,
    outline: PARZELLE_OUTLINE,
    name: 'Parzelle Testadresse 1',
    sia: 'KF',
  });
}

function baueTesthaus(doc: KosmoDoc, storeyId: string): void {
  execute(doc, 'design.volumenErstellen', {
    storeyId,
    outline: TESTHAUS_OUTLINE,
    height: 6000,
    program: 'wohnen',
  });
}

function fixtureDoc(): KosmoDoc {
  const doc = new KosmoDoc();
  doc.settings.projectName = 'Golden-Schwarzplan';
  const sid = baueGeschoss(doc);
  baueParzelle(doc, sid);
  baueTesthaus(doc, sid);
  return doc;
}

describe('schwarzplanSvg — Daten-Guard', () => {
  it('liefert null OHNE erkennbare Parzelle (leeres Doc)', () => {
    const doc = new KosmoDoc();
    expect(schwarzplanSvg(doc)).toBeNull();
  });

  it('liefert null wenn nur ein Geschoss + Testhaus existieren, aber KEINE Parzellen-Zone (sia:\'KF\')', () => {
    const doc = new KosmoDoc();
    const sid = baueGeschoss(doc);
    baueTesthaus(doc, sid);
    expect(schwarzplanSvg(doc)).toBeNull();
  });

  it('eine Zone mit anderer SIA-416-Klasse (z.B. HNF) zählt NICHT als Parzelle', () => {
    const doc = new KosmoDoc();
    const sid = baueGeschoss(doc);
    execute(doc, 'design.zoneErstellen', { storeyId: sid, outline: PARZELLE_OUTLINE, name: 'Wohnen', sia: 'HNF' });
    expect(schwarzplanSvg(doc)).toBeNull();
  });

  it('mit Parzelle, aber OHNE MassBody-Footprint: liefert dennoch ein valides SVG (nur Parzellenumriss, ehrlich ohne Footprint)', () => {
    const doc = new KosmoDoc();
    const sid = baueGeschoss(doc);
    baueParzelle(doc, sid);
    const erg = schwarzplanSvg(doc);
    expect(erg).not.toBeNull();
    expect(erg!.svg).toContain('stroke-dasharray');
    expect(erg!.svg).not.toContain('#1a1a1a');
  });

  it('ein Parzellen-Umriss mit < 3 Punkten (nicht über einen Command erreichbar, direkte Entity-Manipulation) wird ehrlich als kein Umriss gewertet', () => {
    const doc = new KosmoDoc();
    const sid = baueGeschoss(doc);
    const entartet: Zone = {
      id: 'zone-entartet',
      kind: 'zone',
      storeyId: sid,
      outline: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      name: 'Parzelle entartet',
      sia: 'KF',
    };
    doc.entities.set(entartet.id, entartet);
    expect(schwarzplanSvg(doc)).toBeNull();
  });
});

describe('schwarzplanSvg — Geometrie/Inhalt', () => {
  it('enthält Parzellengrenze (strichpunktiert) UND Footprint (schwarz gefüllt)', () => {
    const doc = fixtureDoc();
    const erg = schwarzplanSvg(doc)!;
    expect(erg).not.toBeNull();
    expect(erg.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(erg.svg.endsWith('</svg>')).toBe(true);
    // Parzellengrenze: kein Fill, strichpunktiertes Dash-Muster (4 Werte, wie plansvg.ts «baugrenze»)
    expect(erg.svg).toContain('stroke-dasharray="3 0.9 0.6 0.9"');
    // Footprint: solide schwarz gefüllt
    expect(erg.svg).toContain('fill="#1a1a1a"');
  });

  it('enthält einen Nordpfeil (Kreis + Pfeil-Pfad + «N»-Label)', () => {
    const doc = fixtureDoc();
    const erg = schwarzplanSvg(doc)!;
    expect(erg.svg).toContain('<circle');
    expect(erg.svg).toMatch(/>N<\/text>/);
  });

  it('enthält einen Massstabsbalken mit Meterangabe und Massstab-Text', () => {
    const doc = fixtureDoc();
    const erg500 = schwarzplanSvg(doc, { massstab: 500 })!;
    expect(erg500.svg).toContain('20 m · 1:500');
    const erg1000 = schwarzplanSvg(doc, { massstab: 1000 })!;
    expect(erg1000.svg).toContain('50 m · 1:1000');
  });

  it('Massstab 1000 liefert ein halb so grosses Papierformat wie 500 (dieselbe Welt-Bbox)', () => {
    const doc = fixtureDoc();
    const erg500 = schwarzplanSvg(doc, { massstab: 500 })!;
    const erg1000 = schwarzplanSvg(doc, { massstab: 1000 })!;
    const breite = (svg: string) => Number(svg.match(/viewBox="0 0 ([\d.]+) /)![1]);
    expect(breite(erg500.svg)).toBeCloseTo(breite(erg1000.svg) * 2, 1);
  });

  it('Default-Massstab ist 500', () => {
    const doc = fixtureDoc();
    const ohneOpts = schwarzplanSvg(doc);
    const mit500 = schwarzplanSvg(doc, { massstab: 500 });
    expect(ohneOpts!.massstab).toBe(500);
    expect(ohneOpts!.svg).toBe(mit500!.svg);
  });

  it('Determinismus: zweimaliger Aufruf mit identischem Doc liefert byte-identisches SVG', () => {
    const doc = fixtureDoc();
    const a = schwarzplanSvg(doc);
    const b = schwarzplanSvg(doc);
    expect(a!.svg).toBe(b!.svg);
  });

  it('mehrere MassBody-Volumen liefern mehrere Footprint-Polygone', () => {
    const doc = fixtureDoc();
    const sid = doc.storeysOrdered()[0]!.id;
    execute(doc, 'design.volumenErstellen', {
      storeyId: sid,
      outline: [
        { x: 12000, y: 0 },
        { x: 15000, y: 0 },
        { x: 15000, y: 3000 },
        { x: 12000, y: 3000 },
      ],
      height: 3000,
      program: 'garage',
    });
    const geo = schwarzplanGeometrie(doc)!;
    expect(geo.footprints).toHaveLength(2);
    const erg = schwarzplanSvg(doc)!;
    expect(erg.svg.match(/fill="#1a1a1a"/g)?.length).toBe(2);
  });
});

describe('Golden-SVG (Schwarzplan v1)', () => {
  it('Schwarzplan der Fixtur (Parzelle + Testhaus-Volumen) ist byte-identisch zur committeten Referenz', () => {
    const doc = fixtureDoc();
    const erg = schwarzplanSvg(doc)!;
    pruefeGolden(erg.svg, new URL('./golden/schwarzplan.svg', import.meta.url));
  });
});

describe('Nachbar-Zonen (v0.7.1 E2/1B) — Daten-Guard + Darstellung', () => {
  const NACHBAR_1 = [
    { x: 22000, y: -6000 },
    { x: 28000, y: -6000 },
    { x: 28000, y: 0 },
    { x: 22000, y: 0 },
  ];
  const NACHBAR_2 = [
    { x: -16000, y: 2000 },
    { x: -10000, y: 2000 },
    { x: -10000, y: 8000 },
    { x: -16000, y: 8000 },
  ];

  function fixtureDocMitNachbarn(): KosmoDoc {
    const doc = fixtureDoc();
    const sid = doc.storeysOrdered()[0]!.id;
    execute(doc, 'design.nachbarnUebernehmen', { storeyId: sid, outlines: [NACHBAR_1, NACHBAR_2] });
    return doc;
  }

  it('OHNE Nachbar-Zonen bleibt die Ausgabe byte-identisch zu v0.7.0 (Daten-Guard)', () => {
    // Dieselbe Fixtur wie oben, ohne den Nachbar-Import — muss exakt dem
    // Golden aus dem v0.7.0-Block entsprechen (kein #8a8a8a im Markup).
    const doc = fixtureDoc();
    const erg = schwarzplanSvg(doc)!;
    expect(erg.svg).not.toContain('#8a8a8a');
    pruefeGolden(erg.svg, new URL('./golden/schwarzplan.svg', import.meta.url));
  });

  it('Nachbar-Zonen erscheinen als graue Footprints (#8a8a8a), eigene bleiben schwarz, Parzelle strichpunktiert', () => {
    const doc = fixtureDocMitNachbarn();
    const erg = schwarzplanSvg(doc)!;
    expect(erg.svg.match(/fill="#8a8a8a"/g)?.length).toBe(2);
    expect(erg.svg.match(/fill="#1a1a1a"/g)?.length).toBe(1);
    expect(erg.svg).toContain('stroke-dasharray="3 0.9 0.6 0.9"');
  });

  it('schwarzplanGeometrie liefert die Nachbar-Footprints separat und bezieht sie in die Bbox ein', () => {
    const doc = fixtureDocMitNachbarn();
    const geo = schwarzplanGeometrie(doc)!;
    expect(geo.nachbarn).toHaveLength(2);
    expect(geo.footprints).toHaveLength(1);
    // Nachbar 1 liegt östlich ausserhalb der Parzelle → Bbox wächst mit.
    const ohneNachbarn = schwarzplanGeometrie(fixtureDoc())!;
    expect(geo.bounds.maxX).toBeGreaterThan(ohneNachbarn.bounds.maxX);
  });

  it('eigene Footprints zeichnen NACH den Nachbar-Footprints (eigenes Objekt hervorgehoben, on top im Markup)', () => {
    const doc = fixtureDocMitNachbarn();
    const erg = schwarzplanSvg(doc)!;
    const letzterGrauIndex = erg.svg.lastIndexOf('#8a8a8a');
    const ersterSchwarzIndex = erg.svg.indexOf('#1a1a1a');
    expect(ersterSchwarzIndex).toBeGreaterThan(letzterGrauIndex);
  });
});

describe('Golden-SVG (Schwarzplan mit Nachbarn, v0.7.1 E2/1B)', () => {
  it('Schwarzplan der Fixtur (eigenes Volumen + Parzelle + 2 Nachbar-Zonen) ist byte-identisch zur committeten Referenz', () => {
    const doc = fixtureDoc();
    const sid = doc.storeysOrdered()[0]!.id;
    execute(doc, 'design.nachbarnUebernehmen', {
      storeyId: sid,
      outlines: [
        [{ x: 22000, y: -6000 }, { x: 28000, y: -6000 }, { x: 28000, y: 0 }, { x: 22000, y: 0 }],
        [{ x: -16000, y: 2000 }, { x: -10000, y: 2000 }, { x: -10000, y: 8000 }, { x: -16000, y: 8000 }],
      ],
    });
    const erg = schwarzplanSvg(doc)!;
    pruefeGolden(erg.svg, new URL('./golden/schwarzplan-nachbarn.svg', import.meta.url));
  });
});
