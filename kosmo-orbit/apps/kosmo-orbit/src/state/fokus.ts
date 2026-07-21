/**
 * Fokus-/Wichtigkeits-Systematik (T7 — docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md).
 *
 * Drei Stufen ordnen jedes Bedienelement nach Häufigkeit/Zentralität:
 * primär (oft/zentral, immer sichtbar) · sekundär (gruppiert, eine Ebene
 * tiefer) · selten (Overflow/Menü, nicht dauerpräsent). Die Stufe bestimmt
 * NUR die visuelle Prominenz über die CSS-Klassen `k-primaer`/`k-sekundaer`/
 * `k-selten` (aura.css) — nie Funktion oder Erreichbarkeit.
 *
 * **Schichtenmodell (v0.6.6, docs/BEWEGUNGSKONZEPT-066.md §4):** diese Datei
 * bleibt Schicht 2 ("Fokus-Dimmung", unangetastet) — sie dimmt/hebt einzelne
 * Werkzeuge INNERHALB des Satzes, den ein Arbeitsmodus (Schicht 1, NEU,
 * `state/arbeitsmodi-kern.ts` + `sichtbaresSet()`) überhaupt aufgebaut hat.
 * Schicht 3 sind manuell geöffnete Panels (Bestand). Die Invariante bleibt
 * wörtlich: Adaption ändert NIE Erreichbarkeit, nur Prominenz — was ein Modus
 * ausblendet, bleibt vollständig im «Mehr»-Fächer der Werkzeugleiste.
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
  /** V1.6 Block E → K7 (docs/OWNER-KORREKTUREN-2026-07.md, Owner wörtlich
   *  «…und fragenzeichen, die beiden dürfen präsenter sein»): der
   *  «?»-Rundgang-Knopf ist Grundfunktion — sekundär statt selten, nicht
   *  mehr auf 0.6 gedimmt. */
  guide: 'sekundaer',
  /** Serie K / A4 (Owner-Befund K14) → K7 (Owner wörtlich «einstellung ist
   *  KosmoOrbit grundeinstellungen … die beiden dürfen präsenter sein»):
   *  das zentrale Einstellungs-Panel — präsenter (sekundär), neben dem «?». */
  einstellungen: 'sekundaer',
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
