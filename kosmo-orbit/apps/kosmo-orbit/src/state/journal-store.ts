import type { ArchivStore, Learning, MemoryStore } from '@kosmo/ai';
import { vaultTx } from './project-vault';

/**
 * Journal-Persistenz (V1-Finish P3) — löst den «Tauri/SQLite folgt»-Vermerk
 * im Container ein: localStorage bleibt der synchrone Arbeitsspeicher des
 * Lernjournals, IndexedDB der dauerhafte Spiegel (überlebt Storage-Druck
 * des Browsers). Beim Start hydriert der Spiegel ein leeres localStorage.
 */

const KEY = 'kosmo.lernjournal';

/** MemoryStore, der localStorage UND (fire-and-forget) IndexedDB schreibt. */
export function journalStore(): MemoryStore {
  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Learning[];
      } catch {
        return [];
      }
    },
    save(entries) {
      const kurz = entries.slice(-200);
      localStorage.setItem(KEY, JSON.stringify(kurz));
      // Spiegel-Schutz: NIE einen kleineren Stand über einen grösseren
      // schreiben (Startet die App mit leerem localStorage, bevor die
      // Hydration durch ist, darf ein erster 👍 das Journal nicht löschen) —
      // stattdessen mergen (ts+context als Schlüssel) und neu schreiben.
      void (async () => {
        const alt = await vaultTx<{ id: string; entries: Learning[] } | undefined>(
          'lernjournal',
          'readonly',
          (s) => s.get('journal') as IDBRequest<{ id: string; entries: Learning[] } | undefined>,
        );
        const bekannt = new Set(kurz.map((e) => `${e.ts}|${e.context}`));
        const nurAlt = (alt?.entries ?? []).filter((e) => !bekannt.has(`${e.ts}|${e.context}`));
        const gemischt = [...nurAlt, ...kurz].slice(-400);
        await vaultTx('lernjournal', 'readwrite', (s) => s.put({ id: 'journal', entries: gemischt }));
      })().catch(() => undefined);
    },
  };
}

const ARCHIV_KEY = 'kosmo.lernjournal.archiv';

/**
 * v0.8.2/P3 («Signal-Erfassung», `docs/V082-SPEZ.md` §4.3, additiv) — NIE
 * gekappt, anders als `journalStore()` oben (das bewusst bei seinem
 * 200/400er-Fenster fürs Prompt-Budget bleibt, unverändert). Jeder je per
 * `LearningJournal.add()` erfasste Eintrag bleibt hier zusätzlich erhalten;
 * derselbe Merge-Schutz (ts+context als Schlüssel) wie oben, aber ohne
 * `.slice(...)` — der eigene IndexedDB-Store `lernjournalarchiv`
 * (`project-vault.ts` v6) ist additiv, kein bestehender Tresor migriert.
 */
export function journalArchivStore(): ArchivStore {
  const lesen = (): Learning[] => {
    try {
      return JSON.parse(localStorage.getItem(ARCHIV_KEY) ?? '[]') as Learning[];
    } catch {
      return [];
    }
  };
  return {
    laden: lesen,
    anhaengen(entry) {
      const voll = [...lesen(), entry];
      localStorage.setItem(ARCHIV_KEY, JSON.stringify(voll));
      void (async () => {
        const alt = await vaultTx<{ id: string; entries: Learning[] } | undefined>(
          'lernjournalarchiv',
          'readonly',
          (s) => s.get('archiv') as IDBRequest<{ id: string; entries: Learning[] } | undefined>,
        );
        const bekannt = new Set(voll.map((e) => `${e.ts}|${e.context}`));
        const nurAlt = (alt?.entries ?? []).filter((e) => !bekannt.has(`${e.ts}|${e.context}`));
        await vaultTx('lernjournalarchiv', 'readwrite', (s) =>
          s.put({ id: 'archiv', entries: [...nurAlt, ...voll] }),
        );
      })().catch(() => undefined);
    },
  };
}

/** Einmal beim App-Start: leeres localStorage aus dem Spiegel füllen. */
export async function hydriereJournal(): Promise<void> {
  try {
    const lokal = localStorage.getItem(KEY);
    if (lokal && lokal !== '[]') return;
    const spiegel = await vaultTx<{ id: string; entries: Learning[] } | undefined>(
      'lernjournal',
      'readonly',
      (s) => s.get('journal') as IDBRequest<{ id: string; entries: Learning[] } | undefined>,
    );
    if (spiegel && spiegel.entries.length > 0) {
      localStorage.setItem(KEY, JSON.stringify(spiegel.entries));
    }
  } catch {
    /* Spiegel ist Komfort — nie blockieren */
  }
}
