import type { RaumprogrammPosten } from '@kosmo/kernel';

/**
 * Start-Entwurf des Raumprogramm-Editors (T6 — Owner-Laptop-Befund, 05.07.2026):
 * die Kennzahlen «marktgerecht / preisgünstig / …» stammen aus EINEM konkreten
 * Zug-Wettbewerb und dürfen kein fest verdrahteter Default sein — je Wettbewerb/
 * Programm ist das anders.
 *
 * Default: KEIN wettbewerbsspezifisches Raumprogramm — leerer Entwurf. Die
 * Wohnungstyp-Zeilen erscheinen nur, wenn das geladene Projekt selbst ein
 * Raumprogramm mitbringt (`doc.settings.raumprogramm`, z.B. gesetzt vom
 * TKB-Demoprojekt oder importiert/eingegeben über
 * `design.raumprogrammSetzen`/CSV-Import). Manuelles Hinzufügen von Posten
 * bleibt jederzeit möglich (Knopf «+ Posten»).
 */
export function anfangsEntwurf(raumprogramm: RaumprogrammPosten[]): RaumprogrammPosten[] {
  return raumprogramm.length > 0 ? [...raumprogramm] : [];
}
