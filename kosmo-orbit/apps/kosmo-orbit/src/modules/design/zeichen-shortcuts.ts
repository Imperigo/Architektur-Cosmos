/**
 * Zeichen-Kurzbefehle (T3) — an ArchiCAD angelehnte Werkzeug-Tasten fürs
 * KosmoDesign-Modul: EIN Buchstabe wählt das Werkzeug, ohne Maus zur
 * Werkzeugleiste. Reine Registry (testbar ohne DOM) — DesignWorkspace.tsx
 * bindet sie an `keydown`, Kurzbefehle.tsx zeigt sie im `?`-Overlay.
 *
 * Belegung (dokumentiert im `?`-Overlay UND im Statuszeilen-Hinweis):
 *   W Wand · Z Zone · V Volumen · D Dach · T Treppe · C Stütze (Column) ·
 *   S Schnitt · F Freihand-Skizze · Esc zurück zur Auswahl (+ Kette abbrechen)
 */

export interface ZeichenKurzbefehl {
  /** Einzelner Buchstabe, klein geschrieben (Vergleich ist case-insensitiv). */
  taste: string;
  werkzeug: string;
  beschrieb: string;
}

export const ZEICHEN_KURZBEFEHLE: readonly ZeichenKurzbefehl[] = [
  { taste: 'w', werkzeug: 'wand', beschrieb: 'Wand' },
  { taste: 'z', werkzeug: 'zone', beschrieb: 'Zone' },
  { taste: 'v', werkzeug: 'volumen', beschrieb: 'Volumen' },
  { taste: 'd', werkzeug: 'dach', beschrieb: 'Dach' },
  { taste: 't', werkzeug: 'treppe', beschrieb: 'Treppe' },
  { taste: 'c', werkzeug: 'stuetze', beschrieb: 'Stütze (Column)' },
  { taste: 's', werkzeug: 'schnitt', beschrieb: 'Schnitt' },
  { taste: 'f', werkzeug: 'skizze', beschrieb: 'Freihand-Skizze' },
];

/** Werkzeug-Id für eine gedrückte Taste, oder null (unbekannte Taste). */
export function werkzeugFuerTaste(taste: string): string | null {
  const t = taste.toLowerCase();
  return ZEICHEN_KURZBEFEHLE.find((k) => k.taste === t)?.werkzeug ?? null;
}
