// Golden-Datei für die Ansicht Süd (Hidden-Line) neu erzeugen.
// NUR nach bewusster Plan-Änderung laufen lassen und den Diff begutachten:
//   npx tsx e2e/tools/golden-ansicht.mts
import { writeFileSync } from 'node:fs';
import { testhausMitQuertrakt, ansichtSvg } from '../../packages/kosmo-kernel/test/fixtures';

const { doc, spec } = testhausMitQuertrakt();
const ziel = new URL('../../packages/kosmo-kernel/test/golden/ansicht-sued-testhaus.svg', import.meta.url);
writeFileSync(ziel, ansichtSvg(doc, spec));
console.log('Golden geschrieben:', ziel.pathname);
