import { create } from 'zustand';

/**
 * Plan-Ansicht-Store (PD3c «Island-Modus radikal leer», Owner-Befehl 17.07.,
 * `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7).
 *
 * Hebt die drei PlanView-lokalen Bildschirm-Anzeigezustände `achsenAn`/
 * `graphAn`/`traceId` (bisher `useState` in `PlanView.tsx`, Z.142-149) in
 * einen kleinen additiven Store — nach demselben Zweck, aus dem PD3a diese
 * drei Werkzeuge bisher nur als «Status + Anleitung» in der ANSICHT-Insel
 * zeigen konnte (`island/inhalte/ansicht.tsx`s `TraceInfo`/`GraphInfo`-
 * Kopfkommentar: «State lebt PlanView-lokal … ausserhalb dieses
 * Dateikreises»). Mit diesem Store kann `island/inhalte/ansicht.tsx` (PD3c)
 * ECHTE Schalter bauen, ohne einen zweiten, konkurrierenden State neben
 * `PlanView.tsx` zu führen — beide lesen/schreiben denselben Store.
 *
 * **NICHT persistiert** (`localStorage`) — reiner Laufzeit-Anzeigezustand,
 * genau wie `tool`/`viewMode`/die Panel-Flags in `state/ui-zustand.ts`
 * (dortiger Kopfkommentar: «Sitzung, NICHT persistiert»). Achsen/Trace/Graph
 * sind reine Bildschirmhilfen ohne Modellwirkung — Druck/Export
 * (`derive/plan.ts`/`plansvg.ts`) bleiben unberührt, ein Neuladen setzt sie
 * bewusst zurück, exakt wie das bisherige lokale `useState` es auch tat.
 *
 * **Manuell-Modus bleibt byte-gleich**: `PlanView.tsx` liest/schreibt exakt
 * dieselben drei Werte, nur aus diesem Store statt aus lokalem `useState` —
 * kein Verhaltensunterschied, nur der Ort des State (mechanische Migration,
 * gleiches Muster wie Stream B/W1b bei `state/ui-zustand.ts`).
 */
export interface PlanAnsichtZustand {
  /** T3: Stützenraster-Achsen (Konstruktionslinien) — Default aus, s.
   *  `PlanView.tsx`s `achsen-toggle`-Knopf-Kommentar. */
  achsenAn: boolean;
  setAchsenAn: (v: boolean) => void;
  /** Raumgraph-Overlay (Finch-Clip) — Default aus. */
  graphAn: boolean;
  setGraphAn: (v: boolean) => void;
  /** Trace: Ziel-Geschoss-Id, leerer String = aus. */
  traceId: string;
  setTraceId: (v: string) => void;
}

export const usePlanAnsicht = create<PlanAnsichtZustand>((set) => ({
  achsenAn: false,
  setAchsenAn: (v) => set({ achsenAn: v }),
  graphAn: false,
  setGraphAn: (v) => set({ graphAn: v }),
  traceId: '',
  setTraceId: (v) => set({ traceId: v }),
}));
