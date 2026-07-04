/**
 * Deep-Links der Zentrale (Vision D1): Die Kacheln KosmoDraw und KosmoSketch
 * öffnen KosmoDesign mit dem passenden Panel/Werkzeug — OHNE Code-Duplikat.
 * Ein einmaliger Merker, den die Werkstatt beim Mounten konsumiert.
 */

export type DesignDeepLink = 'draw' | 'sketch';

let pending: DesignDeepLink | null = null;

export function setDeepLink(ziel: DesignDeepLink): void {
  pending = ziel;
}

export function consumeDeepLink(): DesignDeepLink | null {
  const ziel = pending;
  pending = null;
  return ziel;
}
