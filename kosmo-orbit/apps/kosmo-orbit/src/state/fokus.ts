/**
 * Fokus-/Wichtigkeits-Systematik (T7 — docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md).
 *
 * Drei Stufen ordnen jedes Bedienelement nach Häufigkeit/Zentralität:
 * primär (oft/zentral, immer sichtbar) · sekundär (gruppiert, eine Ebene
 * tiefer) · selten (Overflow/Menü, nicht dauerpräsent). Die Stufe bestimmt
 * NUR die visuelle Prominenz über die CSS-Klassen `k-primaer`/`k-sekundaer`/
 * `k-selten` (aura.css) — nie Funktion oder Erreichbarkeit.
 */

export type FokusStufe = 'primaer' | 'sekundaer' | 'selten';

/**
 * Kopfleisten-Elemente (App.tsx) — wie oft/zentral gebraucht. Dient als
 * einzige Quelle der Wahrheit, statt die Stufe an jeder Stelle neu zu raten.
 */
export const KOPFLEISTE_FOKUS = {
  kosmo: 'primaer',
  speichern: 'primaer',
  oeffnen: 'primaer',
  sync: 'sekundaer',
  thema: 'selten',
  akzent: 'selten',
  /** V1.6 Block E: der «?»-Rundgang-Knopf — selten gebraucht, immer erreichbar. */
  guide: 'selten',
  /** «App deinstallieren…» — sehr selten gebraucht, aber immer auffindbar (Owner-Auftrag). */
  deinstallieren: 'selten',
} as const satisfies Record<string, FokusStufe>;

export type KopfleisteElement = keyof typeof KOPFLEISTE_FOKUS;

/** Element-Id → Fokus-Stufe. Reine Zuordnungsfunktion, unit-testbar. */
export function fokusStufe(element: KopfleisteElement): FokusStufe {
  return KOPFLEISTE_FOKUS[element];
}

/** Fokus-Stufe → CSS-Klasse (aura.css: .k-primaer/.k-sekundaer/.k-selten). */
export function fokusKlasse(stufe: FokusStufe): string {
  return `k-${stufe}`;
}
