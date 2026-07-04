import type { Learning, MemoryStore } from '@kosmo/ai';
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
      void vaultTx('lernjournal', 'readwrite', (s) => s.put({ id: 'journal', entries: kurz })).catch(
        () => undefined,
      );
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
