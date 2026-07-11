import { create } from 'zustand';

/**
 * Cursor-Zustand (v0.7.2 §8, Paket 08) — reiner LAUFZEIT-Store (Muster wie
 * `state/kosmo-status.ts`): läuft nie durch Yjs/Undo, lebt nur im Prozess.
 * Treibt `shell/CursorEbene.tsx` — das eigentliche Zeichnen (SVG/CSS) lebt
 * dort, hier nur der Zustand + die Eigencursor-An/Aus-Ermittlung.
 *
 * Bewusst OHNE Import aus `shell/**` (Schichtregel: `state/` kennt `shell/`
 * nicht, umgekehrt schon — `CursorEbene.tsx` importiert diesen Store, nicht
 * andersherum). Die Werkzeug-Glyphen-Art für den `tool`-Zustand wird darum
 * hier nur als loser String gehalten; `CursorEbene.tsx` validiert ihn gegen
 * `WerkzeugGlyphenArt`, bevor sie ihn rendert.
 */
export type CursorZustand = 'default' | 'loading' | 'kosmo' | 'tool' | 'precision';

export interface ToolCursorInfo {
  /** Werkzeug-Glyphen-Art (`shell/werkzeug-glyphen.tsx`, z.B. "draw"). */
  art: string;
  /** CSS-Custom-Property-NAME einer Rollenfarbe (z.B. `--k-rolle-manuell`), OHNE `var()`. */
  rolle?: string;
}

interface CursorStore {
  /** Programmatisch gesetzter Grundzustand — `precision` wird NIE direkt
   *  hierüber gesetzt (das ist reine Zonen-Erkennung in `CursorEbene.tsx`,
   *  siehe dortiger Kopfkommentar), nur `default/loading/kosmo/tool`. */
  zustand: Exclude<CursorZustand, 'precision'>;
  tool: ToolCursorInfo | null;
  setzeZustand: (z: Exclude<CursorZustand, 'precision'>) => void;
  setzeToolCursor: (info: ToolCursorInfo) => void;
  zurueckAufDefault: () => void;
}

export const useCursorZustand = create<CursorStore>((set) => ({
  zustand: 'default',
  tool: null,
  setzeZustand: (z) => set({ zustand: z }),
  setzeToolCursor: (info) => set({ zustand: 'tool', tool: info }),
  zurueckAufDefault: () => set({ zustand: 'default', tool: null }),
}));

const EIGENCURSOR_KEY = 'kosmo.eigencursor';

/** pointer:fine = Maus/Trackpad (kein Touch-only-Gerät). */
function zeigtPointerFine(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: fine)').matches
      : false;
  } catch {
    return false;
  }
}

/**
 * Ist der Eigencursor aktiv? Spec §8: **Default AN nur bei `pointer:fine`**
 * — ein gespeicherter Wert (der Schalter selbst kommt erst mit W4-H,
 * `Einstellungen.tsx`) gewinnt IMMER; hier wird `kosmo.eigencursor` nur
 * GELESEN, nie geschrieben. `'1'` = an, `'0'` = aus, jeder andere/fehlende
 * Wert fällt auf die `pointer:fine`-Regel zurück.
 */
export function eigencursorAktiv(): boolean {
  try {
    if (typeof localStorage === 'undefined') return zeigtPointerFine();
    const gespeichert = localStorage.getItem(EIGENCURSOR_KEY);
    if (gespeichert === '1') return true;
    if (gespeichert === '0') return false;
    return zeigtPointerFine();
  } catch {
    return zeigtPointerFine();
  }
}

/** Event-Name (v0.7.2 W4-H, Einstellungs-Verdrahtung): `CursorEbene.tsx`
 *  liest `eigencursorAktiv()` nur beim RENDER, nicht reaktiv aus einem
 *  Store — ein Schreiben aus `Einstellungen.tsx` (ein separater Komponenten-
 *  baum) löst dort sonst keinen Re-Render aus. Statt die bewusst store-freie
 *  Architektur dieser Datei umzubauen (Kopfkommentar: «kein Import aus
 *  shell/**»), ein simples DOM-Event — `CursorEbene.tsx` hört zu und
 *  erzwingt einen Re-Render, der `eigencursorAktiv()` dann frisch liest. */
export const EIGENCURSOR_EINSTELLUNG_EVENT = 'kosmo:eigencursor-einstellung';

/** Schreibt `kosmo.eigencursor` (Einstellungen.tsx, Schalter
 *  `einstellung-eigencursor`) UND benachrichtigt `CursorEbene.tsx` sofort
 *  (s. `EIGENCURSOR_EINSTELLUNG_EVENT` oben) — der Schalter wirkt ohne
 *  Reload. */
export function setEigencursorEingestellt(an: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(EIGENCURSOR_KEY, an ? '1' : '0');
  } catch {
    /* localStorage kann in seltenen Umgebungen (privates Fenster o.ä.) werfen — Einstellung ist optional */
  }
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EIGENCURSOR_EINSTELLUNG_EVENT));
  } catch {
    /* kein window (SSR/Test) — nichts zu benachrichtigen */
  }
}

/** `prefers-reduced-motion: reduce`? — reiner Lese-Helfer, siehe `CursorEbene.tsx`
 *  Kopfkommentar dazu, WARUM diese Datei ihn kaum je selbst braucht (die
 *  komplette Zeitsteuerung des Cursors läuft über CSS, das der globale
 *  `aura.css`-Riegel bereits auf 0.01ms zwingt). */
export function bevorzugtReduzierteBewegung(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  } catch {
    return false;
  }
}
