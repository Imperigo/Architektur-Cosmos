// Golden-Datei für den Grundriss «Kipp/Drehkipp/Schiebe» neu erzeugen
// (v0.7.1 E5/4B). NUR nach bewusster Plan-Änderung laufen lassen und den
// Diff begutachten:
//   npx tsx e2e/tools/golden-grundriss-kipp.mts
import { writeFileSync } from 'node:fs';
import { testhausFluegelGrundriss } from '../../packages/kosmo-kernel/test/fixtures';
import { planToSvg, A3_QUER } from '../../packages/kosmo-kernel/src/derive/plansvg';

const { doc, storeyId } = testhausFluegelGrundriss();
const svg = planToSvg(doc, storeyId, {
  scale: 50,
  paper: A3_QUER,
  projectName: 'Golden-Fluegeltyp',
  planTitle: 'Grundriss Kipp/Drehkipp/Schiebe',
  date: '11.07.2026',
});
const ziel = new URL('../../packages/kosmo-kernel/test/golden/grundriss-kipp.svg', import.meta.url);
writeFileSync(ziel, svg);
console.log('Golden geschrieben:', ziel.pathname);
