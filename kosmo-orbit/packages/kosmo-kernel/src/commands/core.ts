import { z } from 'zod';
import type { AnyPatch, KosmoDoc } from '../model/doc';
import { invertPatches } from '../model/doc';

/**
 * Command-System — die eine Schreib-Schnittstelle des Kerns.
 *
 * Jeder Command trägt ein zod-Schema. Dasselbe Schema wird dreifach genutzt:
 * UI-Werkzeuge rufen Commands direkt, die Command-Palette listet sie, und
 * kosmo-ai exportiert sie als JSON-Schema-Tools an das LLM. Was Kosmo kann,
 * kann ein Mensch rückgängig machen, inspizieren und nachvollziehen.
 */

export interface Command<P = unknown> {
  readonly id: string;
  /** Deutscher Anzeigename fürs UI und die Palette. */
  readonly title: string;
  /** Beschreibung für Menschen UND fürs LLM-Tool-Schema. */
  readonly description: string;
  readonly params: z.ZodType<P>;
  /**
   * Menschlesbare Zusammenfassung einer konkreten Ausführung (Diff-Karte,
   * Journal). `doc` ist additiv (D4, `docs/WETTBEWERB-KONZEPT.md` D-E9):
   * die meisten Commands fassen nur aus `params` zusammen und ignorieren
   * ihn; ein Command, dessen Zusammenfassung berechnete Ergebnisse braucht
   * (z.B. eine Kennzahl, die erst aus dem Doc ableitbar ist), darf ihn
   * lesen. `execute()` ruft `run()` zuerst auf — schlägt die Validierung
   * dort fehl, wird `summarize` gar nicht erreicht, darf sich also auf
   * bereits geprüfte Eingaben verlassen.
   */
  summarize(params: P, doc: KosmoDoc): string;
  /** Pur: liest den Doc, liefert Patches — mutiert nie selbst. */
  run(doc: KosmoDoc, params: P): AnyPatch[];
}

export class CommandError extends Error {
  constructor(
    message: string,
    readonly commandId?: string,
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

export interface JournalEntry {
  ts: string;
  actor: 'benutzer' | 'kosmo' | 'kosmodev' | 'kosmodoc' | 'kosmotrain' | 'system';
  commandId: string;
  params: unknown;
  summary: string;
}

export interface ExecutionResult {
  patches: AnyPatch[];
  summary: string;
  journal: JournalEntry;
}

const registry = new Map<string, Command<never>>();

export function registerCommand<P>(cmd: Command<P>): Command<P> {
  if (registry.has(cmd.id)) throw new Error(`Command doppelt registriert: ${cmd.id}`);
  registry.set(cmd.id, cmd as Command<never>);
  return cmd;
}

export function getCommand(id: string): Command<unknown> | undefined {
  return registry.get(id) as Command<unknown> | undefined;
}

export function allCommands(): Command<unknown>[] {
  return [...registry.values()] as Command<unknown>[];
}

export interface ExecuteOptions {
  actor?: JournalEntry['actor'];
  /** Nur validieren + Patches berechnen, nicht anwenden (Diff-Karten-Vorschau). */
  dryRun?: boolean;
}

export function execute(
  doc: KosmoDoc,
  commandId: string,
  rawParams: unknown,
  opts: ExecuteOptions = {},
): ExecutionResult {
  const cmd = getCommand(commandId);
  if (!cmd) throw new CommandError(`Unbekannter Command: ${commandId}`, commandId);
  const parsed = cmd.params.safeParse(rawParams);
  if (!parsed.success) {
    throw new CommandError(
      `Ungültige Parameter für ${commandId}: ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'} — ${i.message}`)
        .join('; ')}`,
      commandId,
    );
  }
  const patches = cmd.run(doc, parsed.data);
  if (!opts.dryRun) doc.apply(patches);
  const summary = cmd.summarize(parsed.data, doc);
  return {
    patches,
    summary,
    journal: {
      ts: new Date().toISOString(),
      actor: opts.actor ?? 'benutzer',
      commandId,
      params: parsed.data,
      summary,
    },
  };
}

/** Undo/Redo über Patch-Inverse; Schritte können mehrere Commands gruppieren. */
export class History {
  private undoStack: AnyPatch[][] = [];
  private redoStack: AnyPatch[][] = [];
  private openGroup: AnyPatch[] | null = null;
  readonly limit = 500;

  beginGroup(): void {
    if (this.openGroup === null) this.openGroup = [];
  }

  endGroup(): void {
    if (this.openGroup && this.openGroup.length > 0) {
      this.undoStack.push(this.openGroup);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
    }
    this.openGroup = null;
  }

  record(patches: AnyPatch[]): void {
    if (patches.length === 0) return;
    this.redoStack = [];
    if (this.openGroup) {
      this.openGroup.push(...patches);
    } else {
      this.undoStack.push(patches);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
    }
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Anzahl rückgängig machbarer Schritte (Diagnose/Anzeige). */
  get depth(): number {
    return this.undoStack.length;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(doc: KosmoDoc): AnyPatch[] | null {
    const step = this.undoStack.pop();
    if (!step) return null;
    const inverted = invertPatches(step);
    doc.apply(inverted);
    this.redoStack.push(step);
    return inverted;
  }

  redo(doc: KosmoDoc): AnyPatch[] | null {
    const step = this.redoStack.pop();
    if (!step) return null;
    doc.apply(step);
    this.undoStack.push(step);
    return step;
  }
}
