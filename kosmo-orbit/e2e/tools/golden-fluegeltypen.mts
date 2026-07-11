// Golden-Datei für die Ansicht «vier Flügeltypen» neu erzeugen (v0.7.1 E5/4B).
// NUR nach bewusster Plan-Änderung laufen lassen und den Diff begutachten:
//   npx tsx e2e/tools/golden-fluegeltypen.mts
import { writeFileSync } from 'node:fs';
import { testhausFluegeltypen, ansichtSvg } from '../../packages/kosmo-kernel/test/fixtures';

const { doc, spec } = testhausFluegeltypen();
const ziel = new URL('../../packages/kosmo-kernel/test/golden/ansicht-fluegeltypen.svg', import.meta.url);
writeFileSync(ziel, ansichtSvg(doc, spec));
console.log('Golden geschrieben:', ziel.pathname);
