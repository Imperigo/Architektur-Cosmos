import type { ComponentType } from 'react';

/**
 * Inhalts-Registry der Island-Stufen 2/3 (Fable-Naht für PD3a ‖ PD3b,
 * `docs/ISLAND-UI-SPEZ.md` §4.4/§7).
 *
 * Zweck: PD3a (ZEICHNEN+ANSICHT) und PD3b (PROJEKT+AUSTAUSCH) laufen
 * parallel und dürfen KEINE gemeinsame Datei anfassen. Jedes Werkzeug
 * registriert seine Stufe-2-/Stufe-3-Komponenten deshalb in seiner
 * Insel-Inhaltsdatei (`zeichnen.tsx`/`ansicht.tsx` → PD3a,
 * `projekt.tsx`/`austausch.tsx` → PD3b); `IslandShell.tsx` liest hier nur.
 * Registrierung passiert als Import-Seiteneffekt — `IslandShell.tsx`
 * importiert die vier Inhaltsdateien genau einmal.
 *
 * `Stufe2` = Mini-Popup-Inhalt (2–4 Schnelleinstellungen, §4.1); `Stufe3` =
 * Einstellungsfenster-Inhalt. Beide sind gewöhnliche React-Komponenten und
 * dürfen die bestehenden Stores (`useUiZustand`, `useProject`, …) direkt
 * nutzen — jede Modell-Änderung läuft über den bestehenden
 * Command→Patch→Undo-Weg, nie an ihm vorbei.
 */
export interface WerkzeugInhalt {
  /** Mini-Popup (Stufe 2). Fehlt sie, zeigt IslandShell den PD2-Hinweis/Rahmen. */
  Stufe2?: ComponentType;
  /** Einstellungsfenster (Stufe 3). Fehlt sie, zeigt IslandShell den PD2-Hinweis/Rahmen. */
  Stufe3?: ComponentType;
}

const REGISTRY = new Map<string, WerkzeugInhalt>();

/** Doppelregistrierung ist ein Programmierfehler (zwei Pakete, ein Werkzeug) — hart werfen. */
export function registriereInhalt(werkzeugId: string, inhalt: WerkzeugInhalt): void {
  if (REGISTRY.has(werkzeugId)) {
    throw new Error(`Island-Inhalt für «${werkzeugId}» ist bereits registriert (Dateikreis-Kollision PD3a/PD3b?).`);
  }
  REGISTRY.set(werkzeugId, inhalt);
}

export function inhaltFuer(werkzeugId: string): WerkzeugInhalt | undefined {
  return REGISTRY.get(werkzeugId);
}

/** Für das harte Gate C-38 («kein Werkzeug endet bei Stufe 1») — testbar. */
export function registrierteWerkzeugIds(): readonly string[] {
  return [...REGISTRY.keys()];
}
