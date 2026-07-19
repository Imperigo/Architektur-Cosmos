import { create } from 'zustand';
import { LaufRunner, type LaufGesamtStatus, type LaufPlan, type LaufSchrittZustand } from '@kosmo/ai';
import { useProject } from './project-store';

/**
 * lauf-runtime — die APP-seitige Verdrahtung des `LaufRunner` aus
 * `@kosmo/ai` (v0.8.5 PA3 «Autopilot-Kern», `docs/V085-SPEZ.md` §3 E4, C-8/
 * C-9/C-10). Laufzeit-Store, KEIN Doc-Feld: der Status eines Laufs (welcher
 * Schritt gerade läuft/fertig/fehlgeschlagen ist) gehört NICHT zu
 * `KosmoDoc`/Yjs-Sync — nur die tatsächlich ausgeführten Commands landen dort
 * (über `runCommand` unten), exakt wie bei jedem anderen Kosmo-Werkzeug-
 * Vorschlag. Muster: `modules/vis/vis-runtime.ts` («BEWUSST ausserhalb des
 * Doc»).
 *
 * KEIN AUTO-START (C-10): dieses Modul startet nie von selbst einen Lauf.
 * `starte()` muss explizit gerufen werden — heute nur über den `__kosmoLauf`-
 * Testhook unten (Muster `vis-runtime.ts` Zeilen ~386-390,
 * `__kosmoVisRuntime`) bzw. künftig aus einem echten Kosmo-Dialog. Der
 * Import dieses Moduls (z.B. durch `KosmoPanel.tsx`, das nur den Status
 * ANZEIGT) legt für sich genommen KEINEN Lauf an — der Store beginnt leer
 * (`plan: null`).
 */

export interface LaufRuntimeState {
  plan: LaufPlan | null;
  schritte: readonly LaufSchrittZustand[];
  status: LaufGesamtStatus;
  /** Die laufende `LaufRunner`-Instanz — `null` solange kein Lauf existiert. */
  runner: LaufRunner | null;

  /** Startet EINEN neuen Lauf. No-Op, solange bereits einer läuft (kein
   * zweiter Runner gegen denselben Doc). */
  starte(plan: LaufPlan): void;
  /** Bricht den aktuell laufenden Lauf ab (wirkt vor dem nächsten Schritt,
   * `LaufRunner#abbrechen`). No-Op ohne aktiven Runner. */
  abbrechen(): void;
  /** Räumt den Store auf (Panel schliessen, neuer Lauf ohne Altlast). */
  zuruecksetzen(): void;
}

/**
 * Baut den ECHTEN Ausführungsweg für den `LaufRunner`: JEDER Schritt läuft
 * über `useProject().runCommand` — DENSELBEN Weg wie ein Handgriff des
 * Architekten oder ein einzelner Kosmo-Kartenvorschlag (Sanktion 3, V085-
 * SPEZ §6: «Autopilot-Schritt an `runCommand` vorbei = Paket ungültig»).
 *
 * Jeder Schritt bekommt eine EIGENE Undo-Gruppe (E4) — Muster
 * `DesignWorkspace.tsx`s Delete-Handler (~Z. 866-877: EIN `beginGroup()`/
 * `endGroup()`-Paar je Aktion, NICHT eins für den ganzen Lauf wie beim
 * Paket-Apply in `KosmoPanel.tsx#applyPaket`). `history.endGroup()` ist
 * selbst ein No-Op, wenn `runCommand` wirft, bevor irgendein Patch entsteht
 * (`History#endGroup`: eine leere Gruppe landet nie auf dem Undo-Stack) —
 * ein fehlgeschlagener Schritt hinterlässt also KEINEN leeren Undo-Eintrag.
 * `actor: 'kosmo'` — derselbe Actor wie `applyPaket` in `KosmoPanel.tsx`.
 */
function baueFuehreAus(): (commandId: string, params: unknown) => string {
  return (commandId, params) => {
    const { history, runCommand } = useProject.getState();
    history.beginGroup();
    try {
      const result = runCommand(commandId, params, { actor: 'kosmo' });
      return result.summary;
    } finally {
      history.endGroup();
    }
  };
}

export const useLaufRuntime = create<LaufRuntimeState>((set, get) => ({
  plan: null,
  schritte: [],
  status: 'offen',
  runner: null,

  starte(plan) {
    if (get().status === 'laeuft') return;
    let runner: LaufRunner;
    runner = new LaufRunner(plan, baueFuehreAus(), {
      onFortschritt: (schritte) => set({ schritte, status: runner.gesamtStatus }),
    });
    set({ plan, schritte: runner.schritte, status: 'laeuft', runner });
    void runner.starte().then(() => {
      // `onFortschritt` feuert nur bei Schritt-Änderungen — ein Abbruch VOR
      // dem ersten Schritt (abbrechen() unmittelbar nach starte()) löst
      // z.B. NIE einen einzigen Fortschritts-Ruf aus. Nach Lauf-Ende den
      // Gesamtstatus deshalb hier nochmal ehrlich nachziehen.
      set({ status: runner.gesamtStatus });
    });
  },

  abbrechen() {
    get().runner?.abbrechen();
  },

  zuruecksetzen() {
    set({ plan: null, schritte: [], status: 'offen', runner: null });
  },
}));

/**
 * Test-/Werkzeug-Hook (Muster `modules/vis/vis-runtime.ts`s
 * `__kosmoVisRuntime`): erlaubt E2E-Kampagnen, einen `LaufPlan` OHNE UI-
 * Klick anzustossen — dieselbe Naht, über die auch ein künftiger Kosmo-
 * Dialog einen Lauf auslösen würde. Reiner Fenster-Anschluss, KEIN
 * Auto-Start (C-10): ohne einen expliziten `window.__kosmoLauf.starte(...)`-
 * Aufruf bleibt der Store für immer leer.
 */
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoLauf'] = {
    starte: (plan: LaufPlan) => useLaufRuntime.getState().starte(plan),
    abbrechen: () => useLaufRuntime.getState().abbrechen(),
    zustand: () => {
      const s = useLaufRuntime.getState();
      return { plan: s.plan, schritte: s.schritte, status: s.status };
    },
  };
}
