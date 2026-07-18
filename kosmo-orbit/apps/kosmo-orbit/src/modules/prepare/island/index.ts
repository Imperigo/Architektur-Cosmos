/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — EIN Einstiegspunkt für den
 * Prepare-Island-Katalog: `PrepareWorkspace.tsx` importiert nur diese Datei
 * (Muster `vis/island/index.ts` ‖ `design/island/IslandShell.tsx`s
 * Kopfimporte der vier `inhalte/*.tsx`-Dateien) — die Registrierung der
 * Stufe-2/3-Inhalte läuft als Import-Seiteneffekt, GENAU EINMAL.
 */
export { PREPARE_INSELN, type PrepareIslandId } from './prepare-island-katalog';
export { prepareInhaltsRegistry } from './inhalte/registry';

import './inhalte/aufnahme';
import './inhalte/wissen';
import './inhalte/bestand';
import './inhalte/austausch';
