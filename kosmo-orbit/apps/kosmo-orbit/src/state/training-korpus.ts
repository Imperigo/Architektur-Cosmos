import { allCommands } from '@kosmo/kernel';
import type { LearningJournal } from '@kosmo/ai';

/**
 * D3 (KosmoData-Dach, Serie D Batch 3) — der Trainings-Korpus, zwei Achsen
 * (siehe `docs/EIN-SYSTEM-KOSMODATA.md`):
 *
 * (a) Architektur — Fachwissen/Bürostil: die kuratierten Lehren aus dem
 *     Lernjournal (Einträge MIT gesetzter Notiz — «die Notiz ist der
 *     Trainings-Kern», dieselbe Regel wie `istTraining` in
 *     `state/kosmodata-dach.ts`).
 * (b) Software-Selbstwissen — damit Kosmo die Software selbst bedienen,
 *     erklären und verbessern kann: jedes registrierte Kernel-Command
 *     (`@kosmo/kernel#allCommands()`) + ein Doku-Korpus (ROADMAP/CLAUDE/
 *     Gestaltungskonzept …, gebündelt von `tools/build-software-korpus.mjs`
 *     nach `public/training/software-korpus.json`).
 *
 * Rein additiv: KEIN Umbau der KosmoTrain-Station (`modules/train/
 * TrainWorkspace.tsx`) — die bleibt der Ort der tiefen Kuration (Notizen
 * schärfen, Einträge löschen). Dieses Modul ist die Sammlungs-/Übersichts-/
 * Export-Ebene für die kombinierte LoRA-JSONL (KosmoTrain/HomeStation).
 */

export type TrainAchse = 'architektur' | 'software';

export interface TrainBeispiel {
  id: string;
  achse: TrainAchse;
  frage: string;
  antwort: string;
  /** z.B. 'command:design.geschoss', 'journal:2026-07-05T…', 'doku:ROADMAP' */
  quelle: string;
  /** menschlesbar, z.B. 'KosmoOrbit · Commands' */
  herkunft: string;
}

/**
 * Software-Achse, Teil 1: jedes registrierte Kernel-Command als Beispiel
 * («was macht dieses Werkzeug»). Pur — braucht nur die Command-Registry, die
 * per Import-Seiteneffekt aus `@kosmo/kernel` gefüllt wird (siehe
 * `packages/kosmo-kernel/src/index.ts`, importiert von der App-Shell/den
 * Tests genau wie hier).
 */
export function softwareKorpusCommands(): TrainBeispiel[] {
  return [...allCommands()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((cmd) => ({
      achse: 'software',
      id: `cmd-${cmd.id}`,
      frage: `Was macht das Werkzeug «${cmd.title}» (${cmd.id}) und wozu dient es?`,
      antwort: cmd.description,
      quelle: `command:${cmd.id}`,
      herkunft: 'KosmoOrbit · Commands',
    }));
}

/** Vom Build-Tool gebündelter Doku-Korpus — defensiv: fehlt/Fehler → leer, kein Absturz. */
export async function ladeDokuKorpus(): Promise<TrainBeispiel[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL ?? '/'}training/software-korpus.json`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const daten = (await res.json()) as TrainBeispiel[];
    return Array.isArray(daten) ? daten : [];
  } catch {
    return [];
  }
}

/** Software-Achse komplett: Commands (pur) + Doku-Korpus (gebündelt). */
export async function softwareKorpus(): Promise<TrainBeispiel[]> {
  return [...softwareKorpusCommands(), ...(await ladeDokuKorpus())];
}

/**
 * Architektur-Achse: nur die kuratierten Lehren (Notiz gesetzt) — dieselbe
 * Regel wie `istTraining` in `state/kosmodata-dach.ts`. Pur.
 */
export function architekturKorpus(journal: LearningJournal): TrainBeispiel[] {
  const beispiele: TrainBeispiel[] = [];
  for (const l of journal.all) {
    const note = l.note?.trim();
    if (!note) continue;
    beispiele.push({
      achse: 'architektur',
      id: `journal-${l.ts}`,
      frage: l.context || 'Bürostil/Regel',
      antwort: note,
      quelle: `journal:${l.ts}`,
      herkunft: 'KosmoTrain · Kuration',
    });
  }
  return beispiele;
}

/** LoRA-taugliches JSONL: eine JSON-Zeile pro Beispiel, Chat-Format. */
export function exportTrainingJsonl(beispiele: TrainBeispiel[]): string {
  return beispiele
    .map((b) =>
      JSON.stringify({
        messages: [
          { role: 'user', content: b.frage },
          { role: 'assistant', content: b.antwort },
        ],
        meta: { achse: b.achse, quelle: b.quelle },
      }),
    )
    .join('\n');
}

export function zaehleAchsen(beispiele: TrainBeispiel[]): { architektur: number; software: number } {
  let architektur = 0;
  let software = 0;
  for (const b of beispiele) {
    if (b.achse === 'architektur') architektur++;
    else software++;
  }
  return { architektur, software };
}
