import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';
import { validiereRefImportBatch } from '@kosmo/data';

/**
 * v0.8.3/P9 (`docs/V083-SPEZ.md` §6.5/E6e, §12.1 C-5) — Import eigener
 * Referenzen als JSON im Referenzen-Tab. Vier Beweise:
 *
 *  1. `data-runtime.ts`s eigener IndexedDB-Store: importieren/listen/
 *     entfernen, `quelle:'eigen'` gesetzt, In-Memory-Cache stabil bis zur
 *     nächsten Änderung (Grundlage für Punkt 3).
 *  2. `DataWorkspace.tsx`s `loadReferences()`: Merge mit dem Seed —
 *     112+N-Mengen-Beweis, Seed-Datei/Seed-Cache selbst unangetastet.
 *  3. `state/referenz-index.ts`: ein Import/Entfernen invalidiert den
 *     BM25-Cache automatisch (neue Array-Referenz von `loadReferences()`),
 *     eigene Referenzen landen im Suchkorpus.
 *  4. Kollisions-Guard: eine eigene Referenz mit einer bereits vorhandenen
 *     id (Seed oder eigene Bibliothek) wird ehrlich abgelehnt, nicht still
 *     überschrieben.
 *
 * Jeder Test importiert die Module dynamisch NACH dem Setzen des
 * fetch-Mocks (`vi.resetModules()` zuerst) — dasselbe Muster wie
 * `test/kosmodata-offline-badge.test.ts` — damit der modulweite
 * `loadReferences()`-Seed-Cache pro Test frisch ist.
 *
 * v0.8.5 / PB4 (D12/C-21, `docs/V085-SPEZ.md` §2/§7, ROADMAP 471) —
 * Fetch-Mock-Leck-Fix: die ursprüngliche Fassung setzte/restorte
 * `globalThis.fetch` PRO TEST in einem lokalen `try/finally` — sauber
 * innerhalb dieser Datei, aber reihenfolge-abhängig fragil im vollen
 * Vitest-Batch (`«Failed to parse URL from ./kosmodata-seed.json»`, ein
 * Nachbar-Test traf auf den ECHTEN globalen `fetch`, weil dessen
 * Wiederherstellung nicht garantiert VOR dem nächsten Testlauf abgeschlossen
 * war). Jetzt zentral: `installiereSeedFetch()` merkt sich den Original-
 * `fetch` EINMAL je Test in `laufendeRestore`, ein modulweiter `afterEach`
 * (unten) restort ihn UNBEDINGT nach jedem einzelnen Test — unabhängig
 * davon, ob/wie der Test selbst durchläuft. Tests rufen nur noch
 * `installiereSeedFetch(entries)` auf, kein eigenes `try/finally` mehr.
 */

/**
 * `fake-indexeddb/auto` stellt EINE globale, prozessweite `indexedDB`
 * bereit — `vi.resetModules()` leert nur die JS-Modul-Registry (frische
 * `eigeneCache`-Variable), NICHT die gespeicherten Datensätze selbst. Jeder
 * Test braucht darum zusätzlich eine frische Datenbank (Muster
 * `test/knowledge-basis-embed.test.ts`s `frischeDb()`), sonst bluten
 * eigene Referenzen aus einem früheren Test in den nächsten Test hinein.
 */
async function frischeEigeneReferenzenDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('kosmo-eigene-referenzen');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

/** Hält die Original-`fetch`-Wiederherstellung für den GERADE laufenden
 * Test — von `installiereSeedFetch()` gesetzt, vom modulweiten `afterEach`
 * unten unbedingt aufgerufen (s. Kopfkommentar «Fetch-Mock-Leck-Fix»). */
// v0.8.5 / W2-Gate-Fund (Fable, 19.07.): die Tests dieser Datei importieren
// den kompletten DataWorkspace-Modulgraphen NACH `vi.resetModules()` frisch —
// der Graph ist mit v0.8.5 gewachsen (Glyphen-Namensräume, Lauf-Runtime) und
// der Transform reisst unter Container-Volllast die 5s-Default-Grenze
// (isoliert reproduziert: 5s rot, 30s grün). 20s ist Budget für DENSELBEN
// schnellen Test unter Last, keine Verhaltensänderung.
vi.setConfig({ testTimeout: 20_000 });

let laufendeRestore: (() => void) | null = null;

function installiereSeedFetch(entries: Array<Record<string, unknown>>): void {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    if (String(url).includes('kosmodata-seed.json')) {
      return { ok: true, json: async () => ({ entries }) };
    }
    throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
  }) as unknown as typeof fetch;
  laufendeRestore = () => {
    globalThis.fetch = origFetch;
  };
}

/** Modulweiter Sicherheitsnetz-Hook — läuft nach JEDEM Test in dieser Datei
 * (auch Tests, die `installiereSeedFetch()` nie aufrufen: `laufendeRestore`
 * bleibt dann `null`, No-Op). Ersetzt die vormals pro Test verantwortete
 * `restore()` aus einem lokalen `try/finally` — die Wiederherstellung ist
 * damit garantiert, unabhängig vom Testausgang. */
afterEach(() => {
  laufendeRestore?.();
  laufendeRestore = null;
});

const SEED_112 = Array.from({ length: 112 }, (_, i) => ({ id: `seed-${i}`, title: `Seed ${i}` }));

describe('data-runtime.ts — eigener Referenz-Store (P9)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await frischeEigeneReferenzenDb();
  });

  it('startet leer, importiert, listet neueste zuerst, entfernt wieder', async () => {
    const { listeEigeneReferenzen, importiereEigeneReferenzen, entferneEigeneReferenz, istEigeneReferenz } = await import(
      '../src/modules/data/data-runtime'
    );
    expect(await listeEigeneReferenzen()).toEqual([]);

    const importiert = await importiereEigeneReferenzen([
      { id: 'eigene-villa', title: 'Eigene Villa' },
      { id: 'eigenes-museum', title: 'Eigenes Museum' },
    ]);
    expect(importiert).toBe(2);

    const liste = await listeEigeneReferenzen();
    expect(liste).toHaveLength(2);
    expect(liste.every((e) => e.quelle === 'eigen')).toBe(true);
    expect(liste.every((e) => istEigeneReferenz(e))).toBe(true);
    expect(liste.every((e) => typeof e.importiertAm === 'string' && e.importiertAm.length > 0)).toBe(true);

    await entferneEigeneReferenz('eigene-villa');
    const nachEntfernen = await listeEigeneReferenzen();
    expect(nachEntfernen.map((e) => e.id)).toEqual(['eigenes-museum']);
  });

  it('Cache-Identität: liefert dieselbe Array-Referenz, solange sich nichts geändert hat; eine neue nach Import/Entfernen', async () => {
    const { listeEigeneReferenzen, importiereEigeneReferenzen, entferneEigeneReferenz } = await import('../src/modules/data/data-runtime');
    const erst = await listeEigeneReferenzen();
    const zweit = await listeEigeneReferenzen();
    expect(zweit).toBe(erst); // kein Import dazwischen — dieselbe Referenz

    await importiereEigeneReferenzen([{ id: 'x', title: 'X' }]);
    const nachImport = await listeEigeneReferenzen();
    expect(nachImport).not.toBe(erst); // Import ändert die Referenz
    const nachImportNochmal = await listeEigeneReferenzen();
    expect(nachImportNochmal).toBe(nachImport); // wieder stabil bis zur nächsten Änderung

    await entferneEigeneReferenz('x');
    const nachEntfernen = await listeEigeneReferenzen();
    expect(nachEntfernen).not.toBe(nachImport);
  });

  it('ein leerer Import-Batch ist ein No-Op (0 zurück, keine Store-Änderung)', async () => {
    const { listeEigeneReferenzen, importiereEigeneReferenzen } = await import('../src/modules/data/data-runtime');
    const anzahl = await importiereEigeneReferenzen([]);
    expect(anzahl).toBe(0);
    expect(await listeEigeneReferenzen()).toEqual([]);
  });
});

describe('DataWorkspace.loadReferences() — Merge mit dem 112er-Seed (P9, §12.1 C-5)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await frischeEigeneReferenzenDb();
  });

  it('ohne eigene Referenzen bleibt es exakt der Seed (112) — Seed-Cache-Identität unverändert', async () => {
    installiereSeedFetch(SEED_112);
    const { loadReferences } = await import('../src/modules/data/DataWorkspace');
    const erst = await loadReferences();
    expect(erst).toHaveLength(112);
    const zweit = await loadReferences();
    expect(zweit).toBe(erst); // keine eigene Referenz → dieselbe Array-Referenz
  });

  it('112+N-Mengen-Beweis: importierte eigene Referenzen erscheinen zusätzlich zum Seed, mit quelle:"eigen"', async () => {
    installiereSeedFetch(SEED_112);
    const { loadReferences } = await import('../src/modules/data/DataWorkspace');
    const { importiereEigeneReferenzen, istEigeneReferenz } = await import('../src/modules/data/data-runtime');

    const vorSeed = await loadReferences();
    expect(vorSeed).toHaveLength(112);

    await importiereEigeneReferenzen([
      { id: 'eigen-1', title: 'Eigene Referenz 1' },
      { id: 'eigen-2', title: 'Eigene Referenz 2' },
      { id: 'eigen-3', title: 'Eigene Referenz 3' },
    ]);

    const nachImport = await loadReferences();
    expect(nachImport).toHaveLength(115); // 112 + 3 — der Mengen-Beweis
    expect(nachImport).not.toBe(vorSeed); // Import invalidiert die gemergte Referenz

    const eigene = nachImport.filter(istEigeneReferenz);
    expect(eigene.map((e) => e.id).sort()).toEqual(['eigen-1', 'eigen-2', 'eigen-3']);
    // Der Seed-Teil selbst bleibt unverändert (dieselben 112 ids, keine Mutation).
    const seedIds = nachImport.filter((e) => !istEigeneReferenz(e)).map((e) => e.id);
    expect(seedIds).toEqual(SEED_112.map((e) => e.id));
  });

  it('Entfernen einer eigenen Referenz reduziert die Gesamtmenge wieder — der Seed bleibt unberührt', async () => {
    installiereSeedFetch(SEED_112);
    const { loadReferences } = await import('../src/modules/data/DataWorkspace');
    const { importiereEigeneReferenzen, entferneEigeneReferenz } = await import('../src/modules/data/data-runtime');

    await importiereEigeneReferenzen([{ id: 'eigen-x', title: 'Eigen X' }]);
    expect(await loadReferences()).toHaveLength(113);

    await entferneEigeneReferenz('eigen-x');
    const nachEntfernen = await loadReferences();
    expect(nachEntfernen).toHaveLength(112);
    expect(nachEntfernen.map((e) => e.id)).toEqual(SEED_112.map((e) => e.id));
  });
});

describe('state/referenz-index.ts — Cache-Invalidierung nimmt eigene Referenzen in den BM25-Korpus auf (P9)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await frischeEigeneReferenzenDb();
  });

  it('eine eigene Referenz mit einem einzigartigen Fachbegriff ist über sucheReferenzen() auffindbar, und der Heuhaufen wird nach dem Import neu gebaut', async () => {
    installiereSeedFetch([
      { id: 'seed-a', title: 'Seed A', one_sentence: 'Beton und Ziegel.' },
      { id: 'seed-b', title: 'Seed B', one_sentence: 'Holzbau ohne Beton.' },
    ]);
    const { sucheReferenzen, referenzIndexBauZaehlerFuerTests, resetReferenzIndexFuerTests } = await import('../src/state/referenz-index');
    const { importiereEigeneReferenzen } = await import('../src/modules/data/data-runtime');
    resetReferenzIndexFuerTests();

    // Vor dem Import: der einzigartige Fachbegriff aus der eigenen
    // Referenz taucht in KEINEM Seed-Text auf — kein Treffer.
    const vorImport = await sucheReferenzen('Quibbelwurstarchitektur');
    expect(vorImport).toEqual([]);
    expect(referenzIndexBauZaehlerFuerTests()).toBe(1);

    await importiereEigeneReferenzen([
      { id: 'eigen-fachbegriff', title: 'Eigene Referenz', one_sentence: 'Ein Bau im Stil der Quibbelwurstarchitektur.' },
    ]);

    const nachImport = await sucheReferenzen('Quibbelwurstarchitektur');
    expect(nachImport).toHaveLength(1);
    expect(nachImport[0]!.entry.id).toBe('eigen-fachbegriff');
    // Der Import hat eine neue `loadReferences()`-Array-Referenz erzeugt →
    // der Heuhaufen wurde ein zweites Mal gebaut (Cache-Invalidierung).
    expect(referenzIndexBauZaehlerFuerTests()).toBe(2);

    // Eine weitere, unveränderte Suche baut NICHT erneut (Cache hält).
    await sucheReferenzen('Beton');
    expect(referenzIndexBauZaehlerFuerTests()).toBe(2);
  });
});

describe('Kollisions-Guard — id-Duplikate werden ehrlich abgelehnt, nie still überschrieben (P9)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await frischeEigeneReferenzenDb();
  });

  it('eine eigene Referenz mit einer bereits vorhandenen Seed-id wird von validiereRefImportBatch abgelehnt (End-to-End über loadReferences)', async () => {
    installiereSeedFetch(SEED_112);
    const { loadReferences } = await import('../src/modules/data/DataWorkspace');
    const { importiereEigeneReferenzen } = await import('../src/modules/data/data-runtime');

    const entries = await loadReferences();
    const vorhandeneIds = new Set(entries.map((e) => e.id));
    const ergebnis = validiereRefImportBatch([{ id: 'seed-5', title: 'Duplikat von Seed 5' }], vorhandeneIds);

    expect(ergebnis.eintraege).toEqual([]);
    expect(ergebnis.fehler).toEqual([{ zeile: 1, grund: 'id "seed-5" existiert bereits (Seed oder vorheriger Import)' }]);

    // Nichts zu importieren → die Referenzbibliothek bleibt exakt beim Seed.
    const importiert = await importiereEigeneReferenzen(ergebnis.eintraege);
    expect(importiert).toBe(0);
    expect(await loadReferences()).toHaveLength(112);
  });
});
