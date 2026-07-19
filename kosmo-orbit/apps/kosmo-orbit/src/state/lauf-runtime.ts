import { create } from 'zustand';
import { LaufRunner, loeseLaufPlanRefs, type LaufGesamtStatus, type LaufPlan, type LaufSchrittZustand } from '@kosmo/ai';
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
  /**
   * v0.8.8 PA5 «Autopilot-Fortsetzung + Runner-Härtung» (`docs/V088-SPEZ.md`
   * §2 D4, §3 E4) — Generations-Zähler, erhöht sich bei JEDEM `starte()` UND
   * `zuruecksetzen()`. Jede Runner-Instanz bindet ihre Callbacks (die
   * `onFortschritt`-Meldung UND der `fuehreAus`-Callback, der tatsächlich
   * `runCommand` aufruft) an die Generation, die zum Zeitpunkt IHRES
   * `starte()`-Aufrufs aktiv war. Vor JEDEM Store-`set()` UND vor JEDEM
   * `runCommand`-Aufruf prüfen diese Callbacks, ob ihre Generation noch die
   * AKTIVE ist — eine schwebende `.then()`-Kette eines veralteten Runners
   * (D4: der Doppel-Start-Test leckt genau so eine Kette, wenn er nicht
   * awaitet) schreibt dann NICHTS mehr, weder in den Store noch ins Doc.
   * Der jeweils AKTIVE (auch ein fortgesetzter) Runner schreibt unverändert
   * durch (C-7).
   */
  generation: number;

  /** Startet EINEN neuen Lauf. No-Op, solange bereits einer läuft (kein
   * zweiter Runner gegen denselben Doc). */
  starte(plan: LaufPlan): void;
  /** Bricht den aktuell laufenden Lauf ab (wirkt vor dem nächsten Schritt,
   * `LaufRunner#abbrechen`). No-Op ohne aktiven Runner. */
  abbrechen(): void;
  /** Räumt den Store auf (Panel schliessen, neuer Lauf ohne Altlast). Erhöht
   * die Generation — ALLE Callbacks eines noch schwebenden vorherigen Laufs
   * werden damit endgültig zu No-Ops (Generations-Guard, D4). */
  zuruecksetzen(): void;
  /**
   * v0.8.8 PA5 (E4, C-6) — setzt den aktuellen Lauf ab dem ERSTEN
   * nicht-`ok`-Schritt fort (`LaufRunner#fortsetzenAb`). NUR ein No-Op-freier
   * Aufruf, solange `status` `'fehler'` ODER `'abgebrochen'` ist — sonst
   * No-Op (Sanktion 4 V088-SPEZ §6: «Autopilot-Fortsetzung … aus
   * Nicht-Fehler-Zustand = ungültig»); `LaufRunner#fortsetzenAb` selbst wirft
   * bei einem Verstoss zusätzlich (zweite Verteidigungslinie).
   */
  fortsetzen(): void;
  /**
   * v0.8.8 PA5 (E4, C-6) — wiederholt GENAU den Schritt `index`
   * (`LaufRunner#wiederholeSchritt`). Derselbe Zulässigkeits-Vertrag wie
   * `fortsetzen()`: No-Op ausserhalb `'fehler'`/`'abgebrochen'`.
   */
  wiederholen(index: number): void;
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
 *
 * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, C-13) — **@ref-Auflösung VOR
 * jedem Schritt:** die drei kuratierten Bibliotheks-Drehbücher
 * (`wissen/training/eval/kosmo-laufplaene/*.json`, Lauf-Bibliothek im
 * `KosmoPanel.tsx`) sind bewusst SELBSTSTÄNDIG lauffähig — ein späterer
 * Schritt referenziert eine Entity (Geschoss/Aufbau/Blatt/Graph/Node), die
 * ein FRÜHERER Schritt DESSELBEN Laufs gerade erst erzeugt hat
 * (`@ref:storey:...` usw., README.md dort «Platzhalter-Konvention»). Ein
 * einziger Auflöse-Durchlauf für den GANZEN Plan VOR Laufbeginn könnte diese
 * Selbst-Referenzen nicht sehen (die Entity existiert dann noch nicht) —
 * `loeseLaufPlanRefs` (`@kosmo/ai`, Semantik exakt aus dem ehemaligen
 * Prüfcode-Duplikat `pruefe-laufplaene.mts`) läuft deshalb PROGRESSIV, JE
 * SCHRITT frisch, gegen den zu diesem Zeitpunkt bereits fortgeschrittenen
 * Live-Doc (`useProject.getState().doc`, von ALLEN vorherigen Schritten
 * DIESES Laufs bereits mutiert) — «vor dem Runner» bezogen auf den
 * jeweiligen Ausführungsschritt, den `LaufRunner#starte()` über `fuehreAus`
 * anstösst. Ein Plan ganz ohne @ref-Platzhalter (z.B. ein Kosmo-Dialog-
 * Vorschlag mit bereits realen IDs) durchläuft dieselbe Auflösung wirkungslos
 * (`loeseWertAuf` lässt jeden Nicht-`@ref:`-Wert unverändert).
 *
 * v0.8.8 PA5 (D4/E4, Generations-Guard): `generation` ist die Generation,
 * die zum Zeitpunkt des zugehörigen `starte()`-Aufrufs aktiv war — VOR JEDEM
 * `runCommand`-Aufruf wird geprüft, ob sie noch die AKTIVE Generation des
 * Stores ist. Ein veralteter Runner (Store längst `zuruecksetzen()`t oder
 * durch einen neuen `starte()` ersetzt), dessen `.then()`-Kette aber noch
 * schwebt (D4-Leck aus einem nicht-awaiteten Test), schreibt so NICHT mehr
 * ins Doc — der Wurf lässt `LaufRunner` den Schritt ehrlich als `fehler`
 * verbuchen, aber dieser veraltete Runner ist ohnehin nicht mehr im Store
 * verankert (die `onFortschritt`-Meldung unten ist ZUSÄTZLICH geguardet) —
 * die Meldung geht also nirgendwo sichtbar hin.
 */
function baueFuehreAus(generation: number): (commandId: string, params: unknown) => string {
  return (commandId, params) => {
    if (useLaufRuntime.getState().generation !== generation) {
      throw new Error('Stale Lauf-Generation — Schritt wird nicht mehr ausgeführt (Generations-Guard).');
    }
    const { doc, history, runCommand } = useProject.getState();
    const aufgeloest = loeseLaufPlanRefs(
      { titel: '', schritte: [{ commandId, params, begruendung: '' }] },
      doc,
    ).schritte[0]!.params;
    history.beginGroup();
    try {
      const result = runCommand(commandId, aufgeloest, { actor: 'kosmo' });
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
  generation: 0,

  starte(plan) {
    if (get().status === 'laeuft') return;
    const generation = get().generation + 1;
    let runner: LaufRunner;
    runner = new LaufRunner(plan, baueFuehreAus(generation), {
      onFortschritt: (schritte) => {
        // Generations-Guard (D4/E4, v0.8.8): eine schwebende Meldung eines
        // längst abgelösten Runners schreibt NICHTS mehr in den Store.
        if (get().generation !== generation) return;
        set({ schritte, status: runner.gesamtStatus });
      },
    });
    set({ plan, schritte: runner.schritte, status: 'laeuft', runner, generation });
    void runner.starte().then(() => {
      // `onFortschritt` feuert nur bei Schritt-Änderungen — ein Abbruch VOR
      // dem ersten Schritt (abbrechen() unmittelbar nach starte()) löst
      // z.B. NIE einen einzigen Fortschritts-Ruf aus. Nach Lauf-Ende den
      // Gesamtstatus deshalb hier nochmal ehrlich nachziehen.
      if (get().generation !== generation) return; // Generations-Guard (D4/E4)
      set({ status: runner.gesamtStatus });
    });
  },

  abbrechen() {
    get().runner?.abbrechen();
  },

  zuruecksetzen() {
    // Generation hochzählen: JEDE noch schwebende Callback-Kette eines
    // vorherigen Runners (z.B. ein geleckter `.then()` aus einem
    // nicht-awaiteten Test, D4) erkennt beim nächsten Check, dass sie nicht
    // mehr aktiv ist, und schreibt fortan nirgendwo mehr hin.
    set((s) => ({ plan: null, schritte: [], status: 'offen', runner: null, generation: s.generation + 1 }));
  },

  fortsetzen() {
    const { runner, status, schritte, generation } = get();
    if (!runner) return;
    // No-Op-Schicht für die UI (Sanktion 4 V088-SPEZ §6): NUR aus
    // 'fehler'/'abgebrochen' — `LaufRunner#fortsetzenAb` prüft dasselbe
    // nochmal unabhängig und wirft bei einem Verstoss.
    if (status !== 'fehler' && status !== 'abgebrochen') return;
    const index = schritte.findIndex((s) => s.status !== 'ok');
    if (index === -1) return; // nichts Offenes/Fehlerhaftes übrig — kein Fortsetzungspunkt
    set({ status: 'laeuft' });
    void runner
      .fortsetzenAb(index)
      .catch(() => {
        // Sollte durch die status-Prüfung oben nie eintreten — ehrlich
        // aufgefangen statt eine unhandled rejection zu riskieren; der
        // Gesamtstatus wird im .then() unten in jedem Fall nachgezogen.
      })
      .then(() => {
        if (get().generation !== generation) return; // Generations-Guard (D4/E4)
        set({ status: runner.gesamtStatus });
      });
  },

  wiederholen(index) {
    const { runner, status, generation } = get();
    if (!runner) return;
    if (status !== 'fehler' && status !== 'abgebrochen') return;
    set({ status: 'laeuft' });
    void runner
      .wiederholeSchritt(index)
      .catch(() => {
        // s. Kommentar in fortsetzen() — dieselbe defensive Auffang-Schicht.
      })
      .then(() => {
        if (get().generation !== generation) return; // Generations-Guard (D4/E4)
        set({ status: runner.gesamtStatus });
      });
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
    // v0.8.8 PA5 (E4, C-6) — dieselbe Naht wie starte()/abbrechen() oben,
    // additiv für die neuen Store-Aktionen (der Beweis in
    // `e2e/autopilot-fortsetzen.spec.ts` klickt trotzdem die ECHTEN
    // KosmoPanel-Knöpfe `lauf-fortsetzen`/`lauf-wiederholen` — dieser Hook
    // ist nur eine zusätzliche, konsistente Testnaht).
    fortsetzen: () => useLaufRuntime.getState().fortsetzen(),
    wiederholen: (index: number) => useLaufRuntime.getState().wiederholen(index),
    zustand: () => {
      const s = useLaufRuntime.getState();
      return { plan: s.plan, schritte: s.schritte, status: s.status };
    },
  };
}
