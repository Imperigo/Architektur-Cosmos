import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { pruefeSubmissionsreife } from '../src/derive/submissionsreife';
import type { Opening, Wall } from '../src/model/entities';

/**
 * Block C1 — Submissionsreife-Check (C-E8). Testet die Lückenliste gegen
 * die Kriterien-Tabelle aus docs/SUBMISSION-KONZEPT.md §1.4, soweit das
 * Datenmodell sie hergibt: Aufbau (a+b), Zone ohne Raumtyp (c), Öffnung
 * ohne Mass (d), Phase (e), Ausmass-Rückstich (f).
 */

function geschoss(doc: KosmoDoc, name = 'EG', index = 0): string {
  const eg = execute(doc, 'design.geschossErstellen', { name, index, elevation: 0, height: 3000 });
  return (eg.patches[0] as { id: string }).id;
}

function vollerAufbau(doc: KosmoDoc, target: 'wall' | 'slab' = 'wall'): string {
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 200',
    target,
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  return (aufbau.patches[0] as { id: string }).id;
}

function wand(doc: KosmoDoc, storeyId: string, assemblyId: string): string {
  const w = execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: 4000, y: 0 },
    assemblyId,
  });
  return (w.patches[0] as { id: string }).id;
}

describe('pruefeSubmissionsreife — ehrliche Grenzen', () => {
  it('leeres Doc → leere Liste', () => {
    const doc = new KosmoDoc();
    expect(pruefeSubmissionsreife(doc)).toEqual([]);
  });

  it('nur ein Geschoss ohne Bauteile → leere Liste (auch der Phasen-Hinweis bleibt aus)', () => {
    const doc = new KosmoDoc();
    geschoss(doc);
    expect(pruefeSubmissionsreife(doc)).toEqual([]);
  });
});

describe('pruefeSubmissionsreife — Aufbau (a+b)', () => {
  it('Wand ohne Aufbau (assemblyId zeigt ins Leere) → Lücke mit Bauteil-Id', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    const wandId = wand(doc, storeyId, assemblyId);
    // Alt-/Importdaten-Fall: assemblyId zeigt auf nichts Existierendes.
    const w = doc.get<Wall>(wandId)!;
    doc.apply([{ id: wandId, before: w, after: { ...w, assemblyId: 'geist-aufbau' } }]);

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    const treffer = befunde.find((b) => b.bauteilId === wandId);
    expect(treffer).toBeDefined();
    expect(treffer!.schwere).toBe('luecke');
    expect(treffer!.text).toContain('ohne Aufbau');
    expect(treffer!.text).toContain('SIA 118');
  });

  it('Wand mit vollständigem Aufbau → keine Aufbau-Lücke', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    const wandId = wand(doc, storeyId, assemblyId);

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde.some((b) => b.bauteilId === wandId)).toBe(false);
  });

  it('Aufbau-Schicht ohne Material → Lücke', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'Unklarer Aufbau',
      target: 'wall',
      layers: [{ material: '', thickness: 200, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const wandId = wand(doc, storeyId, assemblyId);

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    const treffer = befunde.find((b) => b.bauteilId === wandId);
    expect(treffer).toBeDefined();
    expect(treffer!.schwere).toBe('luecke');
    expect(treffer!.text).toContain('ohne Material');
  });

  it('Decke ohne Aufbau (assemblyId fehlt) → Lücke, Decke mit Aufbau → keine', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const ohneAufbau = execute(doc, 'design.deckeZeichnen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
    });
    const deckeId = (ohneAufbau.patches[0] as { id: string }).id;

    const deckenAufbauId = vollerAufbau(doc, 'slab');
    const mitAufbau = execute(doc, 'design.deckeZeichnen', {
      storeyId,
      outline: [
        { x: 0, y: 5000 },
        { x: 4000, y: 5000 },
        { x: 4000, y: 9000 },
        { x: 0, y: 9000 },
      ],
      assemblyId: deckenAufbauId,
    });
    const deckeMitAufbauId = (mitAufbau.patches[0] as { id: string }).id;

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde.some((b) => b.bauteilId === deckeId && b.schwere === 'luecke')).toBe(true);
    expect(befunde.some((b) => b.bauteilId === deckeMitAufbauId)).toBe(false);
  });
});

describe('pruefeSubmissionsreife — Zone (c)', () => {
  it('Zone ohne Raumtyp → Hinweis', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const zone = execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 3000 },
      ],
      name: 'Zimmer 1',
    });
    const zoneId = (zone.patches[0] as { id: string }).id;

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    const treffer = befunde.find((b) => b.bauteilId === zoneId);
    expect(treffer).toBeDefined();
    expect(treffer!.schwere).toBe('hinweis');
    expect(treffer!.text).toContain('Raumtyp');
  });

  it('Zone MIT Raumtyp → keine Zonen-Lücke', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const zone = execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 3000 },
      ],
      name: 'Zimmer 1',
      raumTyp: 'zimmer',
    });
    const zoneId = (zone.patches[0] as { id: string }).id;

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde.some((b) => b.bauteilId === zoneId)).toBe(false);
  });
});

describe('pruefeSubmissionsreife — Öffnung (d)', () => {
  it('Öffnung ohne gültiges Mass (width 0) → Lücke', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    const wandId = wand(doc, storeyId, assemblyId);
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId: wandId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1200,
    });
    const oeffnungId = (oeffnung.patches[0] as { id: string }).id;
    // Command sperrt width<=0 (zod .positive()); simuliert Altdaten-Fall.
    const o = doc.get<Opening>(oeffnungId)!;
    doc.apply([{ id: oeffnungId, before: o, after: { ...o, width: 0 } }]);

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    const treffer = befunde.find((b) => b.bauteilId === oeffnungId);
    expect(treffer).toBeDefined();
    expect(treffer!.schwere).toBe('luecke');
  });

  it('Öffnung mit gültigem Mass → keine Öffnungs-Lücke', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    const wandId = wand(doc, storeyId, assemblyId);
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId: wandId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1200,
    });
    const oeffnungId = (oeffnung.patches[0] as { id: string }).id;

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde.some((b) => b.bauteilId === oeffnungId)).toBe(false);
  });
});

describe('pruefeSubmissionsreife — Phase (e)', () => {
  it('Phase vorprojekt → Phasen-Hinweis erscheint', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    wand(doc, storeyId, assemblyId);
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde.some((b) => b.schwere === 'hinweis' && b.text.includes('Werkplan'))).toBe(true);
  });

  it('Phase werkplan (Default) → kein Phasen-Hinweis', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    wand(doc, storeyId, assemblyId);

    expect(doc.settings.phase).toBe('werkplan');
    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde.some((b) => b.text.includes('Werkplan-Detaillierung'))).toBe(false);
  });
});

describe('pruefeSubmissionsreife — Gesamtbild', () => {
  it('vollständig definiertes Bauteil-Set (Wand+Zone+Öffnung, Werkplan) → leere Liste', () => {
    const doc = new KosmoDoc();
    const storeyId = geschoss(doc);
    const assemblyId = vollerAufbau(doc);
    const wandId = wand(doc, storeyId, assemblyId);
    execute(doc, 'design.oeffnungSetzen', {
      wallId: wandId,
      openingType: 'fenster',
      center: 2000,
      width: 1200,
      height: 1200,
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 500 },
        { x: 3000, y: 500 },
        { x: 3000, y: 2500 },
        { x: 0, y: 2500 },
      ],
      name: 'Zimmer 1',
      raumTyp: 'zimmer',
    });

    const befunde = pruefeSubmissionsreife(doc, storeyId);
    expect(befunde).toEqual([]);
  });

  it('storeyId filtert: Lücke im anderen Geschoss taucht nicht auf', () => {
    const doc = new KosmoDoc();
    const eg = geschoss(doc, 'EG', 0);
    const og = geschoss(doc, '1.OG', 1);
    const assemblyId = vollerAufbau(doc);
    const wandEg = wand(doc, eg, assemblyId);
    const w = doc.get<Wall>(wandEg)!;
    doc.apply([{ id: wandEg, before: w, after: { ...w, assemblyId: 'geist-aufbau' } }]);
    wand(doc, og, assemblyId); // OG: sauber

    expect(pruefeSubmissionsreife(doc, og)).toEqual([]);
    expect(pruefeSubmissionsreife(doc, eg).some((b) => b.bauteilId === wandEg)).toBe(true);
    // Ohne storeyId (projektweit) taucht die Lücke ebenfalls auf.
    expect(pruefeSubmissionsreife(doc).some((b) => b.bauteilId === wandEg)).toBe(true);
  });
});
