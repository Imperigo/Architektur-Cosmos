import { InhaltsRegistry } from '../../../design/island/inhalte/registry';

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20/E1) — die prepare-Station bekommt eine
 * EIGENE `InhaltsRegistry`-Instanz (Klasse aus `design/island/inhalte/
 * registry.ts`, nur importiert — dieselbe Naht, die PC0 W1 dafür gebaut hat
 * und PC1 als erste W2-Konsumentin bewiesen hat). Eigener Namensraum
 * `'prepare'`: Werkzeug-Ids wie `'manuell'` kollidieren sonst mit design/vis'
 * gleichnamigem AUSTAUSCH-Werkzeug, sobald mehrere Stationen denselben
 * globalen Singleton registrieren würden — mit einer eigenen Instanz ist das
 * strukturell ausgeschlossen.
 */
export const prepareInhaltsRegistry = new InhaltsRegistry('prepare');
