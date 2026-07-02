import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
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

/** Ansicht als eigenständiges SVG-Dokument (fester Rahmen, 500 mm Rand). */
export function ansichtSvg(doc: KosmoDoc, spec: SectionSpec): string {
  const { inner, bounds: b } = sectionInnerSvg(doc, spec, 14);
  if (!b) throw new Error('Ansicht ist leer');
  const pad = 500;
  const w = b.maxX - b.minX + 2 * pad;
  const h = b.maxY - b.minY + 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX - pad} ${b.minY - pad} ${w} ${h}">\n${inner}\n</svg>\n`;
}
