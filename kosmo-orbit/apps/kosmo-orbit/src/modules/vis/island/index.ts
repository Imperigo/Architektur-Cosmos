/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2, C-15) — EIN Einstiegspunkt für den
 * Vis-Island-Katalog: `VisWorkspace.tsx` importiert nur diese Datei (Muster
 * `design/island/IslandShell.tsx`s Kopfimporte der vier `inhalte/*.tsx`-
 * Dateien) — die Registrierung der Stufe-2/3-Inhalte läuft als
 * Import-Seiteneffekt, GENAU EINMAL.
 */
export { VIS_INSELN, type VisIslandId } from './vis-island-katalog';
export { visInhaltsRegistry } from './inhalte/registry';

import './inhalte/graph';
import './inhalte/ansicht';
import './inhalte/stimmung';
import './inhalte/austausch';
// v0.8.9 §9 E11 (PBL2, `docs/V089-SPEZ.md`) — SONNE-Insel (Sonnenstunden-
// Client), Registrierung als Import-Seiteneffekt wie die vier Bestands-Inseln.
import './inhalte/sonne';
