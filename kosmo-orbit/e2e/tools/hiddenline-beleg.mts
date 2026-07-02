// Vorher/Nachher-Beleg für die Hidden-Line-Rechnung: Ansicht Süd des
// Testhauses (Walmdach + Quertrakt dahinter), einmal ohne, einmal mit.
import { writeFileSync } from 'node:fs';
import { KosmoDoc, execute, sectionInnerSvg, type SectionSpec } from '@kosmo/kernel';

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

// Haupthaus 9×6 m mit Walmdach
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
// Quertrakt dahinter (breiter, flacher) — seine Kanten müssen hinterm Haus verschwinden
execute(doc, 'design.volumenErstellen', {
  storeyId,
  outline: [{ x: -5000, y: 9000 }, { x: 14000, y: 9000 }, { x: 14000, y: 12000 }, { x: -5000, y: 12000 }],
  height: 4500,
});

// Ansicht Süd: Linie südlich des Modells, Blick nach Norden
const spec: SectionSpec = { a: { x: -6000, y: -3000 }, b: { x: 15000, y: -3000 }, depth: 30000, lookLeft: true };

const rahmen = (inner: string, b: { minX: number; minY: number; maxX: number; maxY: number }, titel: string) => {
  const pad = 800;
  const w = b.maxX - b.minX + 2 * pad;
  const h = b.maxY - b.minY + 2 * pad + 900;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX - pad} ${b.minY - pad - 900} ${w} ${h}" width="${Math.round(w / 14)}" height="${Math.round(h / 14)}">
<rect x="${b.minX - pad}" y="${b.minY - pad - 900}" width="${w}" height="${h}" fill="#faf7f2"/>
<text x="${b.minX}" y="${b.minY - pad - 200}" font-size="500" font-family="sans-serif" fill="#a84b2b">${titel}</text>
${inner}</svg>`;
};

for (const [name, hiddenLine] of [['vorher', false], ['nachher', true]] as const) {
  const { inner, bounds } = sectionInnerSvg(doc, { ...spec, hiddenLine }, 14);
  if (!bounds) throw new Error('leer');
  writeFileSync(
    `${process.env.BELEG_OUT ?? '.'}/hiddenline-${name}.svg`,
    rahmen(inner, bounds, hiddenLine ? 'Ansicht Süd — mit Hidden-Line' : 'Ansicht Süd — ohne (V1 bisher)'),
  );
  console.log(name, 'ok');
}
