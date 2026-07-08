import { create } from 'zustand';

/**
 * Kosmo-Status (K11, Owner-Befund «Copilot-Symbol, nicht Dauerchat») —
 * reiner LAUFZEIT-Store: läuft nie durch Yjs/Undo, lebt nur im Prozess
 * (Laufzeit ≠ Modell, siehe CLAUDE.md — Muster wie `modules/vis/vis-runtime.ts`).
 * Treibt das schwebende Kosmo-Symbol (`shell/KosmoSymbol.tsx`), solange das
 * grosse Panel geschlossen ist: ob Kosmo gerade arbeitet (Puls-Animation) und
 * eine kurze deutsche Zusammenfassung der letzten Aktivität fürs Mini-Popup.
 */
interface KosmoStatus {
  /** Läuft gerade eine Antwort/ein Tool-Aufruf (Sende-Lebenszyklus)? */
  beschaeftigt: boolean;
  /** Kurze Zusammenfassung der letzten Antwort/des letzten Vorschlags — oder noch nichts. */
  letzteAktivitaet: string | null;
  setzeBeschaeftigt: (v: boolean) => void;
  setzeLetzteAktivitaet: (text: string) => void;
}

export const useKosmoStatus = create<KosmoStatus>((set) => ({
  beschaeftigt: false,
  letzteAktivitaet: null,
  setzeBeschaeftigt: (v) => set({ beschaeftigt: v }),
  setzeLetzteAktivitaet: (text) => set({ letzteAktivitaet: text }),
}));

/**
 * Kürzt eine Kosmo-Antwort auf eine Mini-Popup-taugliche Zusammenfassung
 * (Owner-Vorgabe: «erste ~80 Zeichen der Antwort»). Zeilenumbrüche werden
 * geglättet, damit das Popup nie mehrzeilig aus dem Ruder läuft.
 */
export function kurzform(text: string, maxLaenge = 80): string {
  const einzeilig = text.replace(/\s+/g, ' ').trim();
  if (einzeilig.length <= maxLaenge) return einzeilig;
  return `${einzeilig.slice(0, maxLaenge).trimEnd()}…`;
}
