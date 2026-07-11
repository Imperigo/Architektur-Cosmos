import type { ProposalVorschau } from './proposal-vorschau';

/**
 * V0.7.2 §7/§12 — Anschluss-Stelle der Abspiel-Ebene («Kosmo zeichnet
 * sichtbar», Stufe 1). Vom Opus-Leiter nach der W2-D-Integration angelegt,
 * weil die reine Prop-Schnittstelle (`KosmoPanel.onAbspielStart?`) zwei
 * Lücken hatte, die das Spec-Ziel «Overlay-Vorspiel VOR atomarem Apply»
 * verfehlen:
 *
 *  1. Der Aufruf war fire-and-forget — `applyPaket` lief sofort weiter,
 *     das Vorspiel wäre PARALLEL zum Apply gelaufen statt davor.
 *  2. `KosmoPanel` wird in `App.tsx` ohne Prop gemountet; die Prop zu
 *     verdrahten hiesse App.tsx anzufassen (Besitz Stream W2-C bzw. W3-F —
 *     Merge-Gesetz §12).
 *
 * Lösung: Stream W3-E registriert hier sein Vorspiel (`registriere-
 * AbspielVorspiel`), `KosmoPanel.applyPaket` AWAITET `abspielVorspiel()`
 * vor dem unveränderten, atomaren Apply. Ohne Registrierung (oder wenn das
 * Vorspiel `undefined` zurückgibt) bleibt alles ein No-op — exakt das
 * heutige Verhalten. Die Abbruch-Semantik (ESC/`navigator.webdriver`/
 * reduced-motion ⇒ sofort auflösen) liegt vollständig beim registrierten
 * Vorspiel — der Apply findet IMMER statt, das Vorspiel kann ihn nur
 * verzögern, nie verhindern (Undo-Atomarität 100 % gewahrt).
 */

/** Struktureller Schritt-Blick für die Abspiel-Ebene: genau die Felder, die
 *  §7 braucht (SVG-Quelle aus `params`/`vorschau`, Etikett aus `summary`).
 *  `KosmoPanel`s internes `PendingCard` erfüllt das Interface strukturell —
 *  kein Import-Zyklus Panel↔Ebene. */
export interface AbspielSchritt {
  commandId: string;
  params: unknown;
  summary: string;
  vorschau: ProposalVorschau | null;
}

type AbspielVorspiel = (schritte: readonly AbspielSchritt[]) => Promise<void> | void;

let vorspiel: AbspielVorspiel | null = null;

/** Registriert das Overlay-Vorspiel (Stream W3-E). Rückgabe = Abmelden. */
export function registriereAbspielVorspiel(fn: AbspielVorspiel): () => void {
  vorspiel = fn;
  return () => {
    if (vorspiel === fn) vorspiel = null;
  };
}

/** Vom `KosmoPanel.applyPaket` awaited — No-op ohne Registrierung. */
export function abspielVorspiel(schritte: readonly AbspielSchritt[]): Promise<void> | void {
  return vorspiel?.(schritte);
}
