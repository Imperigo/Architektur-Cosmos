import { create } from 'zustand';
import { abspielenAktiv } from './abspiel-ebene';

/**
 * Dock-Orb-Laufzeit (v0.7.8 Welle 3 / Paket P7 — «Kosmo ordnet») — reiner
 * LAUFZEIT-Store (Laufzeit ≠ Modell, CLAUDE.md): nichts hier geht durchs Doc/
 * Undo/Yjs. Hält fest, welches Panel Kosmo zuletzt über einen `ui.dock*`-
 * Schreibbefehl bedient hat (`aktivPanelId`/`badgePanelId`), ob die
 * Steuerungs-Anzeige gerade läuft (`laeuft`), und — von `DockFlaeche.tsx`
 * nach JEDEM `solve()`-Lauf geschrieben — die aktuellen Panel-Kopf-Rechtecke
 * (`rects`), damit `KosmoOrdnetOrb.tsx` weiss, wohin der Orb wandern soll,
 * ohne selbst den Solver zu kennen.
 *
 * **Gate identisch zu `abspiel-ebene.ts`** (Auftrag: "Funktionen aus
 * abspiel-ebene wiederverwenden falls exportiert"): `abspielenAktiv()` prüft
 * bereits genau die drei verlangten Fälle — `navigator.webdriver` (aus ausser
 * mit dem `'erzwingen'`-Test-Hook), `prefers-reduced-motion`, die Einstellung
 * `kosmo.abspielen`. Eine zweite, eigene Gate-Funktion wäre eine zweite
 * Quelle der Wahrheit für dieselbe Frage — hier bewusst REEXPORTIERT statt
 * dupliziert (E2E-Tests, die den `'erzwingen'`-Hook für `kosmo-zeichnet.spec.
 * ts` schon kennen, brauchen keinen zweiten Mechanismus für diesen Store).
 *
 * **Sichtbar nur solange `laeuft`** (Auftrag): `meldeAktion()` schaltet
 * `laeuft` auf `true` — der Stopp-Chip (`KosmoOrdnetOrb.tsx`) und jeder
 * weitere Gate-Fehlschlag (`abspielenAktiv()` wird false, z.B. weil
 * reduced-motion mitten in einer Sitzung kippt) setzen es zurück. Ist das
 * Gate beim Melden schon zu ⇒ der `ui.dock*`-Befehl WIRKT trotzdem (die
 * Mutation läuft unabhängig von der Optik), nur Orb/Badge bleiben unsichtbar
 * — exakt dieselbe Trennung "Wirkung vs. sichtbares Vorspiel" wie bei
 * `abspiel-ebene.ts`.
 */

export { abspielenAktiv };

export interface DockKopfRechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DockOrbRuntimeZustand {
  /** Das Panel, das Kosmo zuletzt bedient hat — Ziel der Orb-Wanderung. */
  aktivPanelId: string | undefined;
  /** Panel, das gerade die "KOSMO"-Kopf-Badge zeigt — identisch zu `aktivPanelId`,
   *  separat gehalten, damit ein künftiger Schwarm (mehrere Badges) diesen
   *  Store ohne Bruch erweitern kann. */
  badgePanelId: string | undefined;
  /** Zeigt Orb/Badge/Stopp-Chip überhaupt an (Gate + mindestens eine Meldung seit dem letzten Stopp). */
  laeuft: boolean;
  /** Panel-Kopf-Rechtecke der aktuell gemounteten `DockFlaeche` (von ihr nach jedem `solve()` geschrieben). */
  rects: Record<string, DockKopfRechteck>;
  /** Von jedem erfolgreichen `ui.dock*`-Schreibbefehl gerufen (`dock-befehle.ts`). */
  meldeAktion: (panelId: string) => void;
  /** STOPP-Chip / Gate-Verlust: Orb+Badge verschwinden sofort. */
  stoppen: () => void;
  /** `DockFlaeche.tsx` — schreibt die aktuellen Panel-Rechtecke nach jedem Solve. */
  setzeRects: (rects: Record<string, DockKopfRechteck>) => void;
}

export const useDockOrbRuntime = create<DockOrbRuntimeZustand>((set) => ({
  aktivPanelId: undefined,
  badgePanelId: undefined,
  laeuft: false,
  rects: {},
  meldeAktion: (panelId) => {
    if (!abspielenAktiv()) return; // Gate zu — Mutation lief trotzdem, nur keine Optik.
    set({ aktivPanelId: panelId, badgePanelId: panelId, laeuft: true });
  },
  stoppen: () => set({ aktivPanelId: undefined, badgePanelId: undefined, laeuft: false }),
  setzeRects: (rects) => set({ rects }),
}));

/** Test-/Setup-Helfer: setzt den Store auf den Anfangszustand zurück. */
export function setzeDockOrbRuntimeZurueck(): void {
  useDockOrbRuntime.setState({ aktivPanelId: undefined, badgePanelId: undefined, laeuft: false, rects: {} });
}

// ─────────────────────────────────────────────────────────────────────────
// Test-Hook (Playwright) — Muster `window.__kosmoAbspiel` (`abspiel-ebene.ts`)
// ─────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoDockOrb'] = {
    laeuft: () => useDockOrbRuntime.getState().laeuft,
    aktivPanelId: () => useDockOrbRuntime.getState().aktivPanelId,
    stoppen: () => useDockOrbRuntime.getState().stoppen(),
  };
}
