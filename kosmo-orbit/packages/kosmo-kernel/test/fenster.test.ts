import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { KosmoDoc } from '../src/model/doc';
import { execute, CommandError } from '../src/commands/core';
import '../src/commands/design';
import '../src/commands/publish';
import type { Opening } from '../src/model/entities';
import { derivePlan } from '../src/derive/plan';
import { deriveAll, deriveAllMitFensterdetails } from '../src/derive/scene';
import { planToSvg, sectionInnerSvg, A3_QUER } from '../src/derive/plansvg';
import { ansichtSvg, testhausFensterband, testhausFensterZweifluegel } from './fixtures';

/**
 * Parametrische Fenster & Fensterband/Curtain-Wall v1 (v0.6.9 Stream A,
 * docs/FENSTER-KONZEPT.md): Commands, Derive-Guards und die vier neuen
 * Goldens. Alt-Öffnungen ohne fensterTyp bleiben in allen Ableitungen
 * byte-identisch — das beweisen die BESTANDS-Goldens in kernel.test.ts.
 */

function grundgeruest(): { doc: KosmoDoc; storeyId: string; wallId: string; assemblyId: string } {
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
  const wand = execute(doc, 'design.wandZeichnen', {
    storeyId,
    a: { x: 0, y: 0 },
    b: { x: 8000, y: 0 },
    assemblyId,
  });
  return { doc, storeyId, wallId: (wand.patches[0] as { id: string }).id, assemblyId };
}

function fensterSetzen(doc: KosmoDoc, wallId: string): string {
  const r = execute(doc, 'design.oeffnungSetzen', {
    wallId,
    openingType: 'fenster',
    center: 4000,
    width: 1600,
    height: 1400,
    sill: 900,
  });
  return (r.patches[0] as { id: string }).id;
}

describe('design.fensterParametrieren', () => {
  it('setzt fensterTyp, Teilung und Rahmenbreite additiv auf die bestehende Öffnung', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    const vorher = doc.get<Opening>(openingId)!;
    const r = execute(doc, 'design.fensterParametrieren', {
      openingId,
      fensterTyp: 'zweifluegel',
      teilungN: 2,
      teilungM: 1,
      rahmenbreite: 80,
      swing: 'links',
    });
    expect(r.patches).toHaveLength(1);
    const patch = r.patches[0] as { id: string; before: Opening; after: Opening };
    expect(patch.before).toEqual(vorher);
    const nachher = doc.get<Opening>(openingId)!;
    expect(nachher.fensterTyp).toBe('zweifluegel');
    expect(nachher.teilung).toEqual({ n: 2, m: 1 });
    expect(nachher.rahmenbreite).toBe(80);
    expect(nachher.swing).toBe('links');
    // Geometrie der Lochung bleibt unangetastet
    expect(nachher.center).toBe(vorher.center);
    expect(nachher.width).toBe(vorher.width);
    expect(r.summary).toBe('Fenster Zweiflügel 2×1 parametriert');
  });

  it('lehnt Türen mit sprechendem Fehler ab', () => {
    const { doc, wallId } = grundgeruest();
    const tuer = execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'tuer',
      center: 2000,
      width: 900,
      height: 2100,
      sill: 0,
    });
    const tuerId = (tuer.patches[0] as { id: string }).id;
    expect(() =>
      execute(doc, 'design.fensterParametrieren', { openingId: tuerId, fensterTyp: 'einfluegel' }),
    ).toThrowError(/Tür/);
  });

  it('verbietet swing beim Fensterband und entfernt ein bestehendes swing beim Umtypen', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    expect(() =>
      execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fensterband', swing: 'links' }),
    ).toThrowError(CommandError);
    // Erst Zweiflügel mit swing, dann Umtypen aufs Band: swing verschwindet
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'zweifluegel', swing: 'rechts' });
    expect(doc.get<Opening>(openingId)!.swing).toBe('rechts');
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fensterband', teilungN: 6 });
    const band = doc.get<Opening>(openingId)!;
    expect(band.fensterTyp).toBe('fensterband');
    expect(band.swing).toBeUndefined();
  });

  it('weist Teilungen über 12 und Rahmenbreiten ausserhalb 20–200 mm ab (zod)', () => {
    const { doc, wallId } = grundgeruest();
    const openingId = fensterSetzen(doc, wallId);
    expect(() =>
      execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', teilungN: 13 }),
    ).toThrowError(/Ungültige Parameter/);
    expect(() =>
      execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', rahmenbreite: 10 }),
    ).toThrowError(/Ungültige Parameter/);
    expect(() =>
      execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', rahmenbreite: 250 }),
    ).toThrowError(/Ungültige Parameter/);
  });
});

describe('design.curtainWallSetzen', () => {
  it('stanzt über MEHRERE Südwand-Segmente je ein Fensterband — in EINEM Command-Resultat', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Beton 36',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    // Südfassade aus ZWEI Segmenten + Rest des Rings
    wand({ x: 0, y: 0 }, { x: 4000, y: 0 });
    wand({ x: 4000, y: 0 }, { x: 8000, y: 0 });
    wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
    wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
    wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
    const r = execute(doc, 'design.curtainWallSetzen', {
      storeyId,
      richtung: 'sued',
      pfostenraster: 1200,
      bruestung: 800,
      sturz: 300,
    });
    // Zwei Openings in EINEM Resultat (atomarer Undo-Schritt)
    expect(r.patches).toHaveLength(2);
    const baender = doc.byKind<Opening>('opening').filter((o) => o.fensterTyp === 'fensterband');
    expect(baender).toHaveLength(2);
    for (const b of baender) {
      expect(b.sill).toBe(800);
      expect(b.height).toBe(3000 - 800 - 300);
      // Band 150..3850 auf 4000er-Segment → 3700 breit, n = floor(3700/1200) = 3
      expect(b.width).toBe(3700);
      expect(b.teilung).toEqual({ n: 3, m: 1 });
    }
    expect(r.summary).toBe('Fensterband Süd (Raster 1.20 m)');
  });

  it('lässt zu kurze Segmente aus und meldet das ehrlich im summarize', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Beton 36',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    // Langes + zu kurzes Südsegment (1200er-Band: 900 nutzbar < Raster)
    wand({ x: 0, y: 0 }, { x: 6800, y: 0 });
    wand({ x: 6800, y: 0 }, { x: 8000, y: 0 });
    wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
    wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
    wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
    const r = execute(doc, 'design.curtainWallSetzen', { storeyId, richtung: 'sued', pfostenraster: 1200 });
    expect(r.patches).toHaveLength(1);
    expect(r.summary).toContain('1 Segment(e) ausgelassen');
  });

  it('wirft ohne Aussenwand auf der Fassadenseite einen CommandError', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.curtainWallSetzen', { storeyId, richtung: 'sued' })).toThrowError(
      /Keine Aussenwand/,
    );
  });

  it('blockt gegen bestehende Öffnungen im Band — ein Doppel-Lauf wirft statt doppelt zu stanzen', () => {
    const { doc, storeyId, wallId } = grundgeruest();
    // Ring schliessen, damit die Richtungs-Klassierung eine echte Bbox hat
    const asm = doc.byKind<import('../src/model/entities').Assembly>('assembly')[0]!;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId: asm.id });
    wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
    wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
    wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
    fensterSetzen(doc, wallId);
    // Bestehendes Fenster im Band → Südsegment belegt → nichts stanzbar
    expect(() => execute(doc, 'design.curtainWallSetzen', { storeyId, richtung: 'sued' })).toThrowError(
      /zu kurz fürs Raster oder belegt/,
    );
  });
});

describe('Derive-Guards & parametrische Symbolik', () => {
  it('Alt-Fenster ohne fensterTyp erzeugen weiterhin KEINE Rahmen-Artefakte in `deriveAll` (Schnitt/Axo/GLTF/Kamera)', () => {
    const { doc, wallId } = grundgeruest();
    fensterSetzen(doc, wallId);
    const rahmen = deriveAll(doc).filter((a) => a.materialKey === 'fenster-rahmen');
    expect(rahmen).toHaveLength(0);
  });

  it('parametrische Fenster bekommen Rahmen-, Pfosten- und Riegel-Boxen (fenster-rahmen) in `deriveAll`', () => {
    const { doc } = testhausFensterZweifluegel();
    const rahmen = deriveAll(doc).filter((a) => a.materialKey === 'fenster-rahmen');
    // Zweiflügel 2×1: 2 Blendrahmen vertikal + 1 Mittelpfosten + 2 Riegel = 5
    expect(rahmen).toHaveLength(5);
  });

  // v0.7.1 E5 Stream 4A (docs/V071-KONZEPT.md «Fenster echt», Vertrags-Audit
  // «Glas-Artefakte ändern PLAN nicht»): die neuen Glas-/Standardrahmen-
  // Artefakte hängen NICHT an `deriveAll` (das bleibt für Schnitt/Axo/GLTF-
  // Export/Kamera unverändert, s. die beiden Tests oben), sondern NUR an der
  // zusätzlichen `deriveAllMitFensterdetails` — einzig vom 3D-Viewport benutzt.
  it('deriveAllMitFensterdetails: Alt-Fenster ohne fensterTyp bekommen einen Standard-Rahmen-Loop (4 Leisten) + Glas, `deriveAll` bleibt exakt gleich lang', () => {
    const { doc, wallId } = grundgeruest();
    fensterSetzen(doc, wallId);
    const basis = deriveAll(doc);
    const erweitert = deriveAllMitFensterdetails(doc);
    const rahmen = erweitert.filter((a) => a.materialKey === 'fenster-rahmen');
    // Standardrahmen: nur der Blendrahmen-Loop (links/rechts/unten/oben), KEINE Teilung
    expect(rahmen).toHaveLength(4);
    expect(rahmen.every((a) => a.entityId.includes(':rahmen-std:'))).toBe(true);
    const glas = erweitert.filter((a) => a.materialKey === 'glas');
    expect(glas).toHaveLength(1);
    // `deriveAll` bleibt exakt so lang wie ohne die 4A-Erweiterung (Daten-Guard)
    expect(erweitert.length).toBe(basis.length + rahmen.length + glas.length);
  });

  it('Tür-Öffnungen bekommen WEDER Glas NOCH Rahmen (nur openingType "fenster" zählt)', () => {
    const { doc, wallId } = grundgeruest();
    execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'tuer',
      center: 2000,
      width: 900,
      height: 2100,
      sill: 0,
    });
    const arts = deriveAllMitFensterdetails(doc);
    expect(arts.filter((a) => a.materialKey === 'glas')).toHaveLength(0);
    expect(arts.filter((a) => a.materialKey === 'fenster-rahmen')).toHaveLength(0);
  });

  it('Glas-Masse stimmen mit der Öffnung überein (Zentrum der Wanddicke, Öffnungsbreite/-höhe)', () => {
    const { doc, wallId } = grundgeruest();
    fensterSetzen(doc, wallId); // center 4000, width 1600, height 1400, sill 900 — Wand a=(0,0)→b=(8000,0), Aufbau 410mm zentriert
    const glas = deriveAllMitFensterdetails(doc).find((a) => a.materialKey === 'glas')!;
    expect(glas).toBeDefined();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < glas.positions.length; i += 3) {
      minX = Math.min(minX, glas.positions[i]!); maxX = Math.max(maxX, glas.positions[i]!);
      minY = Math.min(minY, glas.positions[i + 1]!); maxY = Math.max(maxY, glas.positions[i + 1]!);
      minZ = Math.min(minZ, glas.positions[i + 2]!); maxZ = Math.max(maxZ, glas.positions[i + 2]!);
    }
    expect(minX).toBeCloseTo(4000 - 800, 0); // center - width/2
    expect(maxX).toBeCloseTo(4000 + 800, 0);
    expect(minZ).toBeCloseTo(900, 0); // sill
    expect(maxZ).toBeCloseTo(900 + 1400, 0); // sill + height
    // Wanddicke 410mm zentriert (Achse in Wandmitte) → Glas mittig bei y=0, ±5mm dick
    expect(minY).toBeCloseTo(-5, 1);
    expect(maxY).toBeCloseTo(5, 1);
  });

  it('deriveAllMitFensterdetails: parametrische Fenster bekommen KEINEN Doppel-Rahmen, aber Glas', () => {
    const { doc } = testhausFensterZweifluegel();
    const arts = deriveAllMitFensterdetails(doc);
    const rahmen = arts.filter((a) => a.materialKey === 'fenster-rahmen');
    // Zweiflügel 2×1: weiterhin genau 5 (2 Blendrahmen + 1 Mittelpfosten + 2 Riegel) — KEIN
    // zusätzlicher Standard-Loop (Guard `o.fensterTyp` in deriveFensterRahmenStandard)
    expect(rahmen).toHaveLength(5);
    expect(rahmen.some((a) => a.entityId.includes(':rahmen-std:'))).toBe(false);
    // Glas kommt trotzdem dazu (ALLE Fenster-Öffnungen bekommen Glas)
    const glas = arts.filter((a) => a.materialKey === 'glas');
    expect(glas).toHaveLength(1);
  });

  it('Grundriss: Zweiflügel zeigt Teilungslinie + zwei Öffnungsbögen (fenster-bogen)', () => {
    const { doc, storeyId } = testhausFensterZweifluegel();
    const plan = derivePlan(doc, storeyId);
    const boegen = plan.arcs.filter((a) => a.classes.includes('fenster-bogen'));
    expect(boegen).toHaveLength(2);
    // Beide Flügel: Radius = halbe Öffnungsbreite
    for (const b of boegen) expect(b.radius).toBe(800);
    // Mittelsprosse: Linie quer zur Glasebene bei x = 4000
    const sprossen = plan.lines.filter(
      (l) => l.classes.includes('fenster') && Math.abs(l.a.x - 4000) < 1 && Math.abs(l.b.x - 4000) < 1,
    );
    expect(sprossen.length).toBeGreaterThanOrEqual(1);
  });

  it('Grundriss: Fensterband zeigt Pfostentakt, aber keinen Öffnungsbogen', () => {
    const { doc, storeyId } = testhausFensterband();
    const plan = derivePlan(doc, storeyId);
    expect(plan.arcs.filter((a) => a.classes.includes('fenster-bogen'))).toHaveLength(0);
    // n = floor(7700/1200) = 6 Felder → 5 Pfosten-Teilungslinien im Band
    const band = doc.byKind<Opening>('opening').find((o) => o.fensterTyp === 'fensterband')!;
    expect(band.teilung).toEqual({ n: 6, m: 2 });
    const fensterLinien = plan.lines.filter((l) => l.classes.includes('fenster'));
    // 2 Glaslinien + 5 Pfostenstriche
    expect(fensterLinien).toHaveLength(7);
  });
});

describe('Fenster-Goldens (v0.6.9 Stream A)', () => {
  it('Golden: Grundriss mit Zweiflügel-Fenster (Teilung + Öffnungsbogen) ist byte-identisch', () => {
    const { doc, storeyId } = testhausFensterZweifluegel();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Fenster',
      planTitle: 'Grundriss Zweiflügel',
      date: '10.07.2026',
    });
    const golden = readFileSync(new URL('./golden/grundriss-fenster-zweifluegel.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
  });

  it('Golden: Grundriss mit Fensterband (Pfostentakt im Doppellinien-Band) ist byte-identisch', () => {
    const { doc, storeyId } = testhausFensterband();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Fensterband',
      planTitle: 'Grundriss Fensterband',
      date: '10.07.2026',
    });
    const golden = readFileSync(new URL('./golden/grundriss-fensterband.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
  });

  it('Golden: Schnitt durch das parametrische Fenster (Sturz/Brüstung + Riegelprofile) ist byte-identisch', () => {
    const { doc, spec } = testhausFensterZweifluegel();
    const { inner, bounds: b } = sectionInnerSvg(doc, spec, 14);
    const pad = 500;
    const w = b!.maxX - b!.minX + 2 * pad;
    const h = b!.maxY - b!.minY + 2 * pad;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b!.minX - pad} ${b!.minY - pad} ${w} ${h}">\n${inner}\n</svg>\n`;
    const golden = readFileSync(new URL('./golden/schnitt-fenster-parametrisch.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
  });

  it('Golden: Ansicht Süd der Fensterband-Fassade (Pfosten-Riegel-Raster) ist byte-identisch', () => {
    const { doc, spec } = testhausFensterband();
    const svg = ansichtSvg(doc, spec);
    const golden = readFileSync(new URL('./golden/ansicht-curtainwall.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
  });
});
