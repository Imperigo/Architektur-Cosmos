import { describe, expect, it, vi } from 'vitest';
import { bauteilkatalog, materialkatalog } from '@kosmo/data';
import { kosmoDataSyncBadge } from '../src/modules/data/DataWorkspace';

/**
 * F8 (Owner-Befund v0.6.4, Live-Test 0.6.3-Desktop): «Wieso sehe ich
 * KosmoData-Daten nicht, es steht offline seed.»
 *
 * Diagnose (siehe DataWorkspace.tsx): die Badge-Aufschrift im Standardzustand
 * (noch kein Sync versucht) war der blosse String «Offline-Seed» — ehrlich
 * im Sinn, aber kryptisch: sie sagt weder, dass die eingebauten Referenzdaten
 * (Referenz-Kanon C1) VOLL sichtbar sind, noch WARUM kein Live-Sync
 * stattfindet (Website-Sync/architekturkosmos.ch im Desktop-Build nicht
 * erreichbar/konfiguriert). CH-Bauteilkatalog und Materialkatalog hängen gar
 * nicht am Sync-Zustand — sie kommen synchron aus `@kosmo/data` und sind
 * daher unabhängig von jedem Sync-/Seed-Ladezustand immer vollständig.
 */
describe('KosmoData — Offline-Badge ehrlich statt kryptisch (F8, Owner-Befund v0.6.4)', () => {
  it('roter Repro (Verhalten VOR dem Fix): der Standardzustand hiess nur "Offline-Seed" — kein Hinweis auf vollständige Daten oder den Grund', () => {
    const badge = kosmoDataSyncBadge({ seedFehler: false, syncState: 'seed', quelle: 'seed', entriesCount: 112 });
    // Die alte, kryptische Aufschrift darf nicht mehr vorkommen.
    expect(badge.text).not.toBe('Offline-Seed');
    expect(badge.text + ' ' + badge.titel).not.toMatch(/^Offline-Seed$/);
  });

  it('Standardzustand (noch kein Sync versucht) benennt ehrlich: offline, eingebaute Referenzdaten, Website-Sync nicht erreichbar', () => {
    const badge = kosmoDataSyncBadge({ seedFehler: false, syncState: 'seed', quelle: 'seed', entriesCount: 112 });
    expect(badge.text).toMatch(/eingebaute Referenzdaten/i);
    expect(badge.titel).toMatch(/Website-Sync nicht erreichbar/i);
  });

  it('nach einem gescheiterten Sync-Versuch bleibt der Ton honest UND sagt, dass die eingebauten Daten sichtbar bleiben', () => {
    const badge = kosmoDataSyncBadge({ seedFehler: false, syncState: 'fehler', quelle: 'seed', entriesCount: 112 });
    expect(badge.text).toMatch(/Website-Sync nicht erreichbar/i);
    expect(badge.text).toMatch(/eingebaute Referenzdaten bleiben sichtbar/i);
  });

  it('scheitert das Laden des eingebauten Seeds selbst, ist das klar von "kein Sync" unterschieden und nennt einen Wiederholen-Hinweis', () => {
    const badge = kosmoDataSyncBadge({ seedFehler: true, syncState: 'seed', quelle: 'seed', entriesCount: 0 });
    expect(badge.text).toMatch(/nicht ladbar/i);
    expect(badge.titel).toMatch(/Erneut versuchen/i);
  });

  it('Live-Sync-Erfolg und Cache-Fallback bleiben unverändert lesbar', () => {
    const live = kosmoDataSyncBadge({ seedFehler: false, syncState: 'synced', quelle: 'live', entriesCount: 130 });
    expect(live.text).toBe('Live · 130');
    const cache = kosmoDataSyncBadge({ seedFehler: false, syncState: 'synced', quelle: 'cache', entriesCount: 120 });
    expect(cache.text).toContain('Cache (letzter Stand) · 120');
  });
});

describe('loadReferences() — eingebauter Seed bleibt vollständig, Fehler werden nicht verschluckt (F8)', () => {
  it('liefert bei Erfolg den vollen eingebauten Referenz-Kanon (112 Einträge aus dem Repo-Seed)', async () => {
    vi.resetModules();
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).includes('kosmodata-seed.json')) {
        return { ok: true, json: async () => ({ entries: Array.from({ length: 112 }, (_, i) => ({ id: `ref-${i}`, title: `Ref ${i}` })) }) };
      }
      throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
    }) as unknown as typeof fetch;
    try {
      const { loadReferences } = await import('../src/modules/data/DataWorkspace');
      const entries = await loadReferences();
      expect(entries).toHaveLength(112);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('roter Repro (Verhalten VOR dem Fix): schlägt der Seed-Abruf fehl, lehnt loadReferences() ehrlich ab statt eine leere Liste stillschweigend als Erfolg zu melden', async () => {
    vi.resetModules();
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('offline — Seed-Abruf nicht möglich');
    }) as unknown as typeof fetch;
    try {
      const { loadReferences } = await import('../src/modules/data/DataWorkspace');
      // Die Ablehnung MUSS beim Aufrufer ankommen (DataWorkspace fängt sie mit
      // .catch() ab und setzt seedFehler statt einer leeren "0 von 0"-Liste
      // ohne Erklärung).
      await expect(loadReferences()).rejects.toThrow();
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('eine Nicht-OK-Antwort (z.B. HTTP 404 auf die lokale Seed-Datei) wird als Fehler erkannt, nicht als leerer Erfolg', async () => {
    vi.resetModules();
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    try {
      const { loadReferences } = await import('../src/modules/data/DataWorkspace');
      await expect(loadReferences()).rejects.toThrow(/404/);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('CH-Bauteilkatalog / Materialkatalog — unabhängig von Sync-/Seed-Zustand immer voll sichtbar (F8)', () => {
  it('bauteilkatalog und materialkatalog sind synchrone, nicht-leere Kataloge ohne Netzabhängigkeit', () => {
    expect(bauteilkatalog.length).toBeGreaterThan(0);
    expect(materialkatalog.length).toBeGreaterThan(0);
  });
});
