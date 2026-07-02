/**
 * Aktions-Registry der Befehlspalette (⌘K/Ctrl+K). Module registrieren ihre
 * Aktionen beim Mounten und räumen beim Unmount wieder ab — die Palette
 * zeigt immer nur, was gerade wirklich ausführbar ist.
 */

export interface PaletteAction {
  id: string;
  titel: string;
  /** Gruppierung in der Liste, z.B. «Module», «Ansicht», «Export». */
  gruppe: string;
  run: () => void;
}

const registry = new Map<string, PaletteAction[]>();
let listeners: (() => void)[] = [];

export function registerActions(ownerId: string, actions: PaletteAction[]): () => void {
  registry.set(ownerId, actions);
  listeners.forEach((l) => l());
  return () => {
    registry.delete(ownerId);
    listeners.forEach((l) => l());
  };
}

export function allActions(): PaletteAction[] {
  return [...registry.values()].flat();
}

export function onActionsChanged(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

/** Einfaches Subsequenz-Matching mit Wortanfangs-Bonus. */
export function scoreAction(query: string, titel: string): number {
  const q = query.toLowerCase();
  const t = titel.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let ti = 0;
  let score = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    score += found === 0 || t[found - 1] === ' ' ? 5 : 1;
    ti = found + 1;
  }
  return score;
}
