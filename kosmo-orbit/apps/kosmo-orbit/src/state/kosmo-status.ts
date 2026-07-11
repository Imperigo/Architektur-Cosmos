import { create } from 'zustand';

/**
 * Kosmo-Status (K11, Owner-Befund «Copilot-Symbol, nicht Dauerchat») —
 * reiner LAUFZEIT-Store: läuft nie durch Yjs/Undo, lebt nur im Prozess
 * (Laufzeit ≠ Modell, siehe CLAUDE.md — Muster wie `modules/vis/vis-runtime.ts`).
 * Treibt das schwebende Kosmo-Symbol (`shell/KosmoSymbol.tsx`) UND den
 * wiederverwendbaren Orb (`shell/KosmoOrb.tsx`), solange das grosse Panel
 * geschlossen ist bzw. wo immer der Orb sonst eingebettet wird.
 *
 * v0.7.2 §6 (Paket 06 — «Kosmo-Zustände»): additiv um eine echte
 * State-Machine erweitert. `beschaeftigt` bleibt als ABGELEITETES Feld
 * bestehen (Rückwärtskompatibilität — jeder bestehende Aufrufer/Selector
 * kompiliert und verhält sich unverändert), gespeist aus `zustand`.
 */
export type KosmoZustand =
  | 'idle'
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'writing'
  | 'dispatching'
  | 'done'
  | 'error'
  | 'takeover';

/** `beschaeftigt = !['idle','done','error'].includes(zustand)` — wörtlich Spec §6. */
const NICHT_BESCHAEFTIGT: ReadonlySet<KosmoZustand> = new Set(['idle', 'done', 'error']);

function beschaeftigtAus(z: KosmoZustand): boolean {
  return !NICHT_BESCHAEFTIGT.has(z);
}

/**
 * Zustände, die `setzeBeschaeftigt(false)` NICHT stillschweigend nach
 * 'idle' zurückwirft:
 *  - 'done'/'error' laufen über ihren EIGENEN Decay-Timer aus (unten) — die
 *    ChatSession (`packages/kosmo-ai/src/chat.ts`) ruft nach jedem
 *    Sende-Zyklus IMMER `onBusy(false)`, auch direkt nachdem sie zuvor
 *    `onError(...)` gerufen hat (Reihenfolge: onBusy(true) → … →
 *    [onError] → onBusy(false)). Ohne diese Ausnahme würde das gerade erst
 *    gesetzte 'error' vom unmittelbar folgenden `onBusy(false)` sofort
 *    wieder auf 'idle' gestellt — die 4s-Fehleranzeige (§6 Punkt 7) wäre nie
 *    sichtbar. Dieselbe Überlegung gilt für 'done'.
 *  - 'takeover' ist ein eigenständiger Fensterrahmen-Modus (§6 Punkt 8),
 *    dem Chat-Sende-Lebenszyklus fachlich fremd — die ChatSession kennt ihn
 *    nicht und darf ihn nicht per Kompat-Pfad beenden.
 */
const BEHAELT_BEI_BESCHAEFTIGT_FALSE: ReadonlySet<KosmoZustand> = new Set(['done', 'error', 'takeover']);

/** Auto-Decay (Spec §6): done→idle nach 2s, error→idle nach 4s. */
const DECAY_MS: Partial<Record<KosmoZustand, number>> = { done: 2000, error: 4000 };

interface KosmoStatus {
  /** Läuft gerade eine Antwort/ein Tool-Aufruf (Sende-Lebenszyklus)? — abgeleitet aus `zustand`. */
  beschaeftigt: boolean;
  /** Feingranularer Kosmo-Zustand fürs `KosmoOrb` (v0.7.2 §6). */
  zustand: KosmoZustand;
  /** Kurze Zusammenfassung der letzten Antwort/des letzten Vorschlags — oder noch nichts. */
  letzteAktivitaet: string | null;
  /** Setzt den feingranularen Zustand — einzige Stelle, die `beschaeftigt` ableitet + den Decay-Timer plant. */
  setzeZustand: (z: KosmoZustand) => void;
  /**
   * Rückwärtskompatibler Kompakt-Setter (Bestand vor v0.7.2): `true` → 'thinking',
   * `false` → 'idle' — AUSSER der aktuelle Zustand ist 'done'/'error'/'takeover'
   * (siehe `BEHAELT_BEI_BESCHAEFTIGT_FALSE` oben). Alle bestehenden Aufrufer
   * (aktuell: `KosmoPanel.tsx` `onBusy`) bleiben ohne Anpassung korrekt.
   */
  setzeBeschaeftigt: (v: boolean) => void;
  setzeLetzteAktivitaet: (text: string) => void;
}

/** Modul-weiter Decay-Timer-Handle — EIN Timer gleichzeitig reicht (ein Store, ein Zustand). */
let decayTimer: ReturnType<typeof setTimeout> | null = null;

export const useKosmoStatus = create<KosmoStatus>((set, get) => ({
  beschaeftigt: false,
  zustand: 'idle',
  letzteAktivitaet: null,
  setzeZustand: (z) => {
    if (decayTimer !== null) {
      clearTimeout(decayTimer);
      decayTimer = null;
    }
    set({ zustand: z, beschaeftigt: beschaeftigtAus(z) });
    const decayNachMs = DECAY_MS[z];
    if (decayNachMs !== undefined) {
      decayTimer = setTimeout(() => {
        decayTimer = null;
        get().setzeZustand('idle');
      }, decayNachMs);
    }
  },
  setzeBeschaeftigt: (v) => {
    if (v) {
      get().setzeZustand('thinking');
      return;
    }
    if (!BEHAELT_BEI_BESCHAEFTIGT_FALSE.has(get().zustand)) {
      get().setzeZustand('idle');
    }
  },
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

/**
 * Test-Hook (Playwright) — Muster wie `window.__kosmoBlick`/`window.__kosmoChat`
 * (`shell/KosmoPanel.tsx`): rein lesend/schreibend, sonst nirgends im DOM
 * sichtbar. `e2e/kosmo-zustaende.spec.ts` treibt darüber gezielt einzelne
 * `KosmoZustand`-Werte, unabhängig davon, ob gerade das Symbol oder das Panel
 * gemountet ist — der Store selbst existiert immer (Modul-Singleton).
 */
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoStatus'] = {
    setzeZustand: (z: KosmoZustand) => useKosmoStatus.getState().setzeZustand(z),
    zustand: () => useKosmoStatus.getState().zustand,
    beschaeftigt: () => useKosmoStatus.getState().beschaeftigt,
  };
}
