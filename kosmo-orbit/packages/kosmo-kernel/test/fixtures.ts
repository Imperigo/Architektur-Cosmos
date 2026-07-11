import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
// Commands registrieren — die Fixtures laufen auch ausserhalb der Test-Suite (Golden-Generatoren)
import '../src/commands/design';
import '../src/commands/publish';
import { sectionInnerSvg } from '../src/derive/plansvg';
import type { SectionSpec } from '../src/derive/section';

/**
 * Deterministische Test-Fixtures — von Kernel-Tests UND den Golden-Generatoren
 * (e2e/tools) gemeinsam benutzt, damit Fixture und Golden nie auseinanderlaufen.
 */

/** Walmdach-Haus 9×6 m mit breitem, flachem Quertrakt dahinter. */
export function testhausMitQuertrakt(): { doc: KosmoDoc; spec: SectionSpec } {
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
  wand({ x: 0, y: 0 }, { x: 9000, y: 0 });
  wand({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
  wand({ x: 9000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  execute(doc, 'design.dachErstellen', {
    storeyId,
    outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 6000 }, { x: 0, y: 6000 }],
    pitch: 38,
    overhang: 500,
  });
  execute(doc, 'design.volumenErstellen', {
    storeyId,
    outline: [{ x: -5000, y: 9000 }, { x: 14000, y: 9000 }, { x: 14000, y: 12000 }, { x: -5000, y: 12000 }],
    height: 4500,
  });
  // Ansicht Süd: Linie südlich des Modells, Blick nach Norden
  const spec: SectionSpec = { a: { x: -6000, y: -3000 }, b: { x: 15000, y: -3000 }, depth: 30000, lookLeft: true };
  return { doc, spec };
}

/** Satteldach-Haus 8×6 m, First entlang x — für die Sattel-Golden-Ansicht. */
export function testhausSatteldach(): { doc: KosmoDoc; spec: SectionSpec } {
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
  wand({ x: 0, y: 0 }, { x: 8000, y: 0 });
  wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  execute(doc, 'design.dachErstellen', {
    storeyId,
    outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
    pitch: 40,
    overhang: 400,
    form: 'sattel',
    firstrichtung: 'x',
  });
  // Ansicht Süd: Linie südlich des Modells, Blick nach Norden
  const spec: SectionSpec = { a: { x: -5000, y: -3000 }, b: { x: 13000, y: -3000 }, depth: 30000, lookLeft: true };
  return { doc, spec };
}

/** Ansicht als eigenständiges SVG-Dokument (fester Rahmen, 500 mm Rand). */
export function ansichtSvg(doc: KosmoDoc, spec: SectionSpec): string {
  const { inner, bounds: b } = sectionInnerSvg(doc, spec, 14);
  if (!b) throw new Error('Ansicht ist leer');
  const pad = 500;
  const w = b.maxX - b.minX + 2 * pad;
  const h = b.maxY - b.minY + 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX - pad} ${b.minY - pad} ${w} ${h}">\n${inner}\n</svg>\n`;
}

/** Walmdach-Haus 8×6 m, niedrige Neigung (12°) — für die Grundriss-Golden
 * «Flachdach-Aufsicht» (Stream A / v0.6.8: der Kern kennt nur `form`
 * «walm»/«sattel», pitch ist auf 5–75° begrenzt — ein Walmdach nahe der
 * Minimalneigung ist die nächstliegende «Flachdach»-Lesart). */
export function testhausWalmdachGrundriss(): { doc: KosmoDoc; storeyId: string } {
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
  wand({ x: 0, y: 0 }, { x: 8000, y: 0 });
  wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  execute(doc, 'design.dachErstellen', {
    storeyId,
    outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
    pitch: 12,
    overhang: 500,
    form: 'walm',
  });
  return { doc, storeyId };
}

/** Testhaus 8×6 m mit EINEM parametrischen Zweiflügel-Fenster in der Südwand
 * (v0.6.9 Stream A, docs/FENSTER-KONZEPT.md) — für die Fenster-Goldens
 * Grundriss (Teilungslinie + Öffnungsbogen) und Schnitt (Sturz/Brüstung +
 * Riegel-Querschnitte). Der Schnitt-Spec läuft quer durch das rechte
 * Flügelfeld (x = 4200, NEBEN dem Mittelpfosten bei x = 4000). */
export function testhausFensterZweifluegel(): {
  doc: KosmoDoc;
  storeyId: string;
  openingId: string;
  spec: SectionSpec;
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
  const suedId = (sued.patches[0] as { id: string }).id;
  wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  const oeffnung = execute(doc, 'design.oeffnungSetzen', {
    wallId: suedId,
    openingType: 'fenster',
    center: 4000,
    width: 1600,
    height: 1400,
    sill: 900,
  });
  const openingId = (oeffnung.patches[0] as { id: string }).id;
  execute(doc, 'design.fensterParametrieren', {
    openingId,
    fensterTyp: 'zweifluegel',
    teilungN: 2,
    teilungM: 1,
    rahmenbreite: 80,
    swing: 'links',
  });
  const spec: SectionSpec = { a: { x: 4200, y: -2000 }, b: { x: 4200, y: 8000 }, depth: 30000, lookLeft: true };
  return { doc, storeyId, openingId, spec };
}

/** Testhaus 8×6 m mit Fensterband (Curtain-Wall v1, Pfosten-Riegel als
 * Teilung) über die ganze Südfassade — für die Goldens Grundriss
 * (Pfostentakt im Doppellinien-Band) und Ansicht Süd (Raster-Beleg).
 * Brüstung 800 / Sturz 300 auf 3000er-Geschoss → Bandhöhe 1900;
 * Riegelraster 900 → m = 2 (ein Zwischenriegel). */
export function testhausFensterband(): { doc: KosmoDoc; storeyId: string; spec: SectionSpec } {
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
  wand({ x: 0, y: 0 }, { x: 8000, y: 0 });
  wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  execute(doc, 'design.curtainWallSetzen', {
    storeyId,
    richtung: 'sued',
    pfostenraster: 1200,
    riegelraster: 900,
    rahmenbreite: 60,
    bruestung: 800,
    sturz: 300,
  });
  // Ansicht Süd: Linie südlich des Modells, Blick nach Norden
  const spec: SectionSpec = { a: { x: -5000, y: -3000 }, b: { x: 13000, y: -3000 }, depth: 30000, lookLeft: true };
  return { doc, storeyId, spec };
}

/** Satteldach-Testhaus über ZWEI Geschossen (First entlang x, auf dem OG) —
 * für die Grundriss-Golden «Geschoss darunter»: das EG zeigt nur den
 * gestrichelten Dachumriss (Überzeichnungs-Konvention), das OG die volle
 * Aufsicht. */
export function testhausSatteldachZweiGeschosse(): { doc: KosmoDoc; egId: string; ogId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const egId = (eg.patches[0] as { id: string }).id;
  const og = execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
  const ogId = (og.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [
      { material: 'beton', thickness: 250, function: 'tragend' },
      { material: 'daemmung', thickness: 160, function: 'daemmung' },
    ],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (storeyId: string, a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
  for (const sid of [egId, ogId]) {
    wand(sid, { x: 0, y: 0 }, { x: 8000, y: 0 });
    wand(sid, { x: 8000, y: 0 }, { x: 8000, y: 6000 });
    wand(sid, { x: 8000, y: 6000 }, { x: 0, y: 6000 });
    wand(sid, { x: 0, y: 6000 }, { x: 0, y: 0 });
  }
  execute(doc, 'design.dachErstellen', {
    storeyId: ogId,
    outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
    pitch: 40,
    overhang: 400,
    form: 'sattel',
    firstrichtung: 'x',
  });
  return { doc, egId, ogId };
}

/** Testhaus 16×6 m mit VIER Fenstern in der Südwand, je eines pro Flügeltyp
 * (v0.7.1 E5/4B, docs/V071-KONZEPT.md): dreh/kipp/drehkipp/schiebe von links
 * nach rechts — für die Ansicht-Golden «ansicht-fluegeltypen.svg» (SIA-
 * Öffnungssymbolik: Dreieck-Spitzen an den richtigen Kanten). `fensterTyp:
 * 'fest'` gibt jedem Fenster ein sichtbares Rahmenprofil (`derive/scene.ts`
 * `deriveFensterProfile`) — ohne eigenes Profil wäre die reine Lochung in
 * der Hidden-Line-Ansicht unsichtbar (koplanar zur Wandfläche, wird von ihr
 * verdeckt) und die SIA-Symbolik schwebte kontextlos auf der blanken Wand.
 * `fluegelTyp` läuft über denselben `design.fensterParametrieren`-Aufruf wie
 * `fensterTyp` (die um `fluegelTyp` erweiterte Command-Signatur). */
export function testhausFluegeltypen(): { doc: KosmoDoc; storeyId: string; spec: SectionSpec } {
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
  const sued = wand({ x: 0, y: 0 }, { x: 16000, y: 0 });
  const suedId = (sued.patches[0] as { id: string }).id;
  wand({ x: 16000, y: 0 }, { x: 16000, y: 6000 });
  wand({ x: 16000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  const typen = ['dreh', 'kipp', 'drehkipp', 'schiebe'] as const;
  typen.forEach((fluegelTyp, i) => {
    const center = 2200 + i * 4000;
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId: suedId,
      openingType: 'fenster',
      center,
      width: 1600,
      height: 1400,
      sill: 900,
    });
    const openingId = (oeffnung.patches[0] as { id: string }).id;
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'fest', fluegelTyp });
  });
  // Ansicht Süd: Linie südlich des Modells, Blick nach Norden
  const spec: SectionSpec = { a: { x: -3000, y: -3000 }, b: { x: 19000, y: -3000 }, depth: 30000, lookLeft: true };
  return { doc, storeyId, spec };
}

/** Testhaus 8×6 m mit DREI Fenstern in der Südwand — kipp/drehkipp/schiebe
 * von links nach rechts (v0.7.1 E5/4B) — für die Grundriss-Golden
 * «grundriss-kipp.svg» (Doppelstrich-Symbol Kipp/Drehkipp, versetzte
 * Doppellinie Schiebe). Alt-Fenster ohne `fensterTyp`, wie oben. */
export function testhausFluegelGrundriss(): { doc: KosmoDoc; storeyId: string } {
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
  const suedId = (sued.patches[0] as { id: string }).id;
  wand({ x: 8000, y: 0 }, { x: 8000, y: 6000 });
  wand({ x: 8000, y: 6000 }, { x: 0, y: 6000 });
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  const fenster = [
    { center: 1500, fluegelTyp: 'kipp' },
    { center: 4000, fluegelTyp: 'drehkipp' },
    { center: 6500, fluegelTyp: 'schiebe' },
  ] as const;
  for (const f of fenster) {
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId: suedId,
      openingType: 'fenster',
      center: f.center,
      width: 1200,
      height: 1400,
      sill: 900,
    });
    const openingId = (oeffnung.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: openingId, feld: 'fluegelTyp', wert: f.fluegelTyp });
  }
  return { doc, storeyId };
}
