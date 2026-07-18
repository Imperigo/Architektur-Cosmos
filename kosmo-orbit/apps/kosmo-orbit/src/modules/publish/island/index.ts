/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — EIN Einstiegspunkt für den
 * Publish-Island-Katalog: `PublishWorkspace.tsx` importiert nur diese Datei
 * (Muster `vis/island/index.ts`, das seinerseits `design/island/
 * IslandShell.tsx`s Kopfimporte der vier `inhalte/*.tsx`-Dateien spiegelt) —
 * die Registrierung der Stufe-2/3-Inhalte läuft als Import-Seiteneffekt,
 * GENAU EINMAL.
 */
export { PUBLISH_INSELN, type PublishIslandId } from './publish-island-katalog';
export { publishInhaltsRegistry } from './inhalte/registry';

import './inhalte/blatt';
import './inhalte/darstellung';
import './inhalte/projekt';
import './inhalte/austausch';
