import { create } from 'zustand';
import {
  KosmoDoc,
  History,
  execute,
  type ExecuteOptions,
  type ExecutionResult,
  type JournalEntry,
} from '@kosmo/kernel';

/**
 * Projekt-Store — hält den lebenden KosmoDoc AUSSERHALB von React (grosse
 * Entity-Stores re-rendern nicht pro Mutation); React abonniert nur die
 * Revisionsnummer. Der three.js-Viewport hängt per transientem subscribe dran.
 */

export interface ProjectState {
  doc: KosmoDoc;
  history: History;
  journal: JournalEntry[];
  revision: number;
  activeStoreyId: string | null;
  selection: string[];

  runCommand(commandId: string, params: unknown, opts?: ExecuteOptions): ExecutionResult;
  undo(): void;
  redo(): void;
  setActiveStorey(id: string): void;
  select(ids: string[]): void;
}

/** Sync-Haken: wird nach jeder lokalen Mutation mit den Patches gerufen. */
let patchListener: ((patches: readonly import('@kosmo/kernel').AnyPatch[]) => void) | null = null;
export function setPatchListener(fn: typeof patchListener): void {
  patchListener = fn;
}

export const useProject = create<ProjectState>((set, get) => {
  const doc = new KosmoDoc();
  const history = new History();

  return {
    doc,
    history,
    journal: [],
    revision: 0,
    activeStoreyId: null,
    selection: [],

    runCommand(commandId, params, opts) {
      const result = execute(get().doc, commandId, params, opts);
      if (!opts?.dryRun) {
        get().history.record(result.patches);
        set((s) => ({
          revision: get().doc.revision,
          journal: [...s.journal, result.journal].slice(-500),
        }));
        patchListener?.(result.patches);
      }
      return result;
    },

    undo() {
      const patches = get().history.undo(get().doc);
      if (patches) {
        set({ revision: get().doc.revision });
        patchListener?.(patches);
      }
    },

    redo() {
      const patches = get().history.redo(get().doc);
      if (patches) {
        set({ revision: get().doc.revision });
        patchListener?.(patches);
      }
    },

    setActiveStorey(id) {
      set({ activeStoreyId: id });
    },

    select(ids) {
      set({ selection: ids });
    },
  };
});

/** Startprojekt: EG + Standardaufbauten, damit sofort gezeichnet werden kann. */
export function bootstrapProject(): void {
  const { doc, runCommand } = useProject.getState();
  if (doc.byKind('storey').length > 0) return;
  const eg = runCommand('design.geschossErstellen', {
    name: 'EG',
    index: 0,
    elevation: 0,
    height: 3000,
  });
  runCommand('design.geschossErstellen', {
    name: '1.OG',
    index: 1,
    elevation: 3000,
    height: 2800,
  });
  runCommand('design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [
      { material: 'putz', thickness: 20, function: 'bekleidung' },
      { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
      { material: 'beton', thickness: 180, function: 'tragend' },
    ],
  });
  runCommand('design.aufbauErstellen', {
    name: 'IW Beton 18',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 180, function: 'tragend' }],
  });
  const storeyId = (eg.patches[0] as { id: string }).id;
  useProject.setState({ activeStoreyId: storeyId });
}
