import { InhaltsRegistry } from '../../../design/island/inhalte/registry';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19/E1) — die publish-Station bekommt eine
 * EIGENE `InhaltsRegistry`-Instanz (Klasse aus `design/island/inhalte/
 * registry.ts`, nur importiert — dieselbe Naht, die PC0 W1 dafür gebaut hat,
 * s. `vis/island/inhalte/registry.ts`, PC1s Vorbild). Eigener Namensraum
 * `'publish'`: Werkzeug-Ids wie `'export'`/`'plankopf'` könnten sonst mit
 * design/AUSTAUSCH bzw. vis-STIMMUNG kollidieren, sobald eine zweite Station
 * denselben Bestand registriert — mit einer eigenen Instanz ist das
 * strukturell ausgeschlossen (kein globaler Singleton mehr).
 */
export const publishInhaltsRegistry = new InhaltsRegistry('publish');
