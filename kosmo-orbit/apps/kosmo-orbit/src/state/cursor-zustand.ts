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
/** v0.8.4 PA1 (D1-Fix) — Zonen-FORMEN: `CursorEbene.tsx` liest den COMPUTED
 *  cursor der Elementkette unter dem Zeiger und MAPPT ihn auf eine dieser
 *  Formen, statt die Ebene (wie die alte `hatEigenenComputedCursor()`-
 *  Heuristik) zu verstecken. Rein zonen-abgeleitet — nie über `setzeZustand`
 *  gesetzt, genau wie `precision` schon vorher (s. `CursorStore.zustand`
 *  unten). Siehe `CSS_CURSOR_ZU_FORM`/`formVonComputedCursor` für die
 *  eigentliche (reine, unit-getestete) Abbildung. */
export type ZonenForm = 'greifen' | 'greift' | 'fadenkreuz' | 'spalte' | 'zeile' | 'gesperrt';

export type CursorZustand = 'default' | 'loading' | 'kosmo' | 'tool' | 'precision' | ZonenForm;

export interface ToolCursorInfo {
  /** Werkzeug-Glyphen-Art (`shell/werkzeug-glyphen.tsx`, z.B. "draw"). */
  art: string;
  /** CSS-Custom-Property-NAME einer Rollenfarbe (z.B. `--k-rolle-manuell`), OHNE `var()`. */
  rolle?: string;
}

interface CursorStore {
  /** Programmatisch gesetzter Grundzustand — `precision`/die `ZonenForm`-
   *  Werte werden NIE direkt hierüber gesetzt (das ist reine Zonen-Erkennung
   *  in `CursorEbene.tsx`, siehe dortiger Kopfkommentar), nur
   *  `default/loading/kosmo/tool`. */
  zustand: Exclude<CursorZustand, 'precision' | ZonenForm>;
  tool: ToolCursorInfo | null;
  setzeZustand: (z: Exclude<CursorZustand, 'precision' | ZonenForm>) => void;
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

/**
 * v0.8.4 PA1 (D1-Fix, docs/V084-SPEZ.md §2 D1) — die Zonen-Tabelle: welcher
 * COMPUTED `cursor`-Wert einer Elementkette auf welche `ZonenForm` mappt.
 * Bewusst NUR die sechs vertraglich verlangten Werte (crosshair/grab/
 * grabbing/col-resize/row-resize/not-allowed) — alles andere (inkl. `auto`/
 * `default`/`pointer`/leer) bleibt neutral (Morph-Default, kein Zonen-Layer).
 *
 * **Wichtig — die eigentliche Fund-Ursache von D1:** `:root[data-eigencursor
 * ='an'] { cursor: none }` (`cursor-ebene.css`) steht auf `<html>`. `cursor`
 * ist eine VERERBTE CSS-Eigenschaft — jedes Element OHNE eigene `cursor`-
 * Deklaration erbt darum, sobald der Eigencursor an ist, den COMPUTED Wert
 * `"none"` (live mit Playwright/Chromium nachgemessen: ein `<div>` ohne
 * eigene Cursor-Regel unter `html{cursor:none}` liefert `getComputedStyle
 * (div).cursor === "none"`, NICHT `"auto"`). Die alte Heuristik
 * (`hatEigenenComputedCursor`, jetzt entfernt) schloss nur `''`/`auto`/
 * `default`/`pointer` aus — `"none"` fiel NICHT unter den Ausschluss und
 * wurde fälschlich als "Element hat einen eigenen Cursor-Wunsch" gewertet:
 * die Ebene versteckte sich darum nicht nur über den paar explizit
 * gestylten Zonen (crosshair/grab/…), sondern über praktisch JEDEM
 * unbestylten Element der App — UND weil `cursor:none` gleichzeitig den
 * echten System-Zeiger unsichtbar machte, verschwand der Zeiger dort
 * komplett (die vom Owner beschriebene "buggt weg"). `"none"` taucht darum
 * bewusst NICHT in dieser Tabelle auf — es ist kein Zonen-Signal, sondern
 * ein reines Vererbungs-Artefakt des eigenen `cursor:none`-Riegels.
 */
const CSS_CURSOR_ZU_FORM: Readonly<Record<string, ZonenForm>> = {
  crosshair: 'fadenkreuz',
  grab: 'greifen',
  grabbing: 'greift',
  'col-resize': 'spalte',
  'row-resize': 'zeile',
  'not-allowed': 'gesperrt',
};

/** Reine Funktion (unit-getestet in `test/cursor-zustand.test.ts`): bildet
 *  einen COMPUTED-`cursor`-String auf eine `ZonenForm` ab, oder `null` für
 *  alles, was neutral bleiben soll (`CursorEbene.tsx` fällt dann auf den
 *  Store-/Morph-Zustand zurück). Kennt keine DOM-APIs — `CursorEbene.tsx`
 *  liest `getComputedStyle(el).cursor` und reicht nur den String rein. */
export function formVonComputedCursor(cursorWert: string): ZonenForm | null {
  return CSS_CURSOR_ZU_FORM[cursorWert] ?? null;
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
