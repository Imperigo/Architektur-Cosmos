import { describe, expect, it, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';

/**
 * PC5 (v0.8.4, `docs/V084-SPEZ.md` §8 C-21) — «KosmoData: Bilder für eigene
 * Referenzen + Dossier-Verknüpfung».
 *
 * Deckt (Laufzeit ≠ Modell, IndexedDB `kosmo-eigene-referenzen`, additiver
 * `bilder`-Store neben dem bestehenden `referenzen`-Store):
 *
 *  1. `pruefeEigenesBild`: Typ-/Grössen-Prüfung, ehrliche Fehlermeldungen.
 *  2. `speichereEigenesBild`/`ladeEigenesBildInRuntime`/`entferneEigenesBild`:
 *     Schreiben, Laufzeit-Store-Update, Persistenz-Beweis über einen
 *     simulierten Reload (frischer Laufzeit-Store, derselbe IndexedDB-Inhalt),
 *     Entfernen räumt sowohl IndexedDB als auch den Laufzeit-Store auf.
 *  3. Der bestehende `referenzen`-Store (P9) bleibt von der Version-2-DB
 *     unberührt — kein Datenverlust durch den additiven Store.
 *  4. Gedächtnis-/Wissens-Verknüpfung (`gedaechtnisQuerverweise`) ist
 *     source-agnostisch — eine eigene Referenz (`quelle:'eigen'`) bekommt
 *     exakt dieselben Treffer wie eine Seed-Referenz, sobald ein
 *     Gedächtnis-Eintrag ihre `id` als `refId` trägt.
 */

async function frischeEigeneReferenzenDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('kosmo-eigene-referenzen');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

/** `File` existiert unter jsdom, aber `fake-indexeddb` braucht keinen echten
 *  Byteinhalt — ein einfacher Blob-Wrapper reicht für Typ-/Grössen-Prüfung
 *  UND für den Store-Roundtrip (Blob wird 1:1 zurückgegeben). */
function bildDatei(bytes: number, type: string, name = 'bild.jpg'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('data-runtime.ts — pruefeEigenesBild (PC5)', () => {
  it('akzeptiert jpg/png/webp unterhalb des Limits', async () => {
    const { pruefeEigenesBild } = await import('../src/modules/data/data-runtime');
    expect(pruefeEigenesBild(bildDatei(1024, 'image/jpeg'))).toEqual({ ok: true });
    expect(pruefeEigenesBild(bildDatei(1024, 'image/png'))).toEqual({ ok: true });
    expect(pruefeEigenesBild(bildDatei(1024, 'image/webp'))).toEqual({ ok: true });
  });

  it('lehnt einen nicht unterstützten Dateityp ehrlich ab (Grund benannt)', async () => {
    const { pruefeEigenesBild } = await import('../src/modules/data/data-runtime');
    const ergebnis = pruefeEigenesBild(bildDatei(1024, 'image/gif'));
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toContain('image/gif');
      expect(ergebnis.fehler).toContain('JPG');
    }
  });

  it('lehnt eine zu grosse Datei ehrlich ab (Grössenangabe in der Meldung)', async () => {
    const { pruefeEigenesBild, EIGENES_BILD_MAX_BYTES } = await import('../src/modules/data/data-runtime');
    const ergebnis = pruefeEigenesBild(bildDatei(EIGENES_BILD_MAX_BYTES + 1, 'image/png'));
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toContain('MB');
      expect(ergebnis.fehler).toContain('2 MB');
    }
  });

  it('akzeptiert eine Datei genau am Limit', async () => {
    const { pruefeEigenesBild, EIGENES_BILD_MAX_BYTES } = await import('../src/modules/data/data-runtime');
    expect(pruefeEigenesBild(bildDatei(EIGENES_BILD_MAX_BYTES, 'image/png')).ok).toBe(true);
  });
});

describe('data-runtime.ts — speichereEigenesBild / ladeEigenesBildInRuntime / entferneEigenesBild (PC5)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await frischeEigeneReferenzenDb();
  });

  it('speichert ein Bild, setzt sofort den Laufzeit-Zustand auf lokal, hatEigenesBild bestätigt die Persistenz', async () => {
    const { speichereEigenesBild, useDataRuntime, hatEigenesBild } = await import('../src/modules/data/data-runtime');
    expect(await hatEigenesBild('eigen-1')).toBe(false);

    await speichereEigenesBild('eigen-1', bildDatei(2048, 'image/jpeg'));

    const zustand = useDataRuntime.getState().bilder['eigen-1'];
    expect(zustand?.status).toBe('lokal');
    expect(await hatEigenesBild('eigen-1')).toBe(true);
  });

  it('weist eine ungültige Datei ehrlich zurück (throw), OHNE etwas zu speichern', async () => {
    const { speichereEigenesBild, hatEigenesBild } = await import('../src/modules/data/data-runtime');
    await expect(speichereEigenesBild('eigen-2', bildDatei(1024, 'image/gif'))).rejects.toThrow(/image\/gif/);
    expect(await hatEigenesBild('eigen-2')).toBe(false);
  });

  it('Persistenz über einen simulierten Reload: neuer Laufzeit-Store, dieselbe IndexedDB liefert das Bild über ladeEigenesBildInRuntime zurück', async () => {
    const { speichereEigenesBild } = await import('../src/modules/data/data-runtime');
    await speichereEigenesBild('eigen-3', bildDatei(4096, 'image/webp'));

    // Ein Reload lädt alle Module frisch — der In-Memory-Laufzeit-Store ist
    // leer, aber `fake-indexeddb`s globale `indexedDB` überlebt (sie wird
    // NICHT gelöscht, anders als in `frischeEigeneReferenzenDb()`).
    vi.resetModules();
    const { ladeEigenesBildInRuntime, useDataRuntime: frischerStore } = await import('../src/modules/data/data-runtime');
    expect(frischerStore.getState().bilder['eigen-3']).toBeUndefined();

    await ladeEigenesBildInRuntime('eigen-3');
    expect(frischerStore.getState().bilder['eigen-3']?.status).toBe('lokal');
  });

  it('ladeEigenesBildInRuntime bleibt für eine unbekannte id ehrlich leer (kein Fehler, kein Eintrag)', async () => {
    const { ladeEigenesBildInRuntime, useDataRuntime } = await import('../src/modules/data/data-runtime');
    await ladeEigenesBildInRuntime('nie-hochgeladen');
    expect(useDataRuntime.getState().bilder['nie-hochgeladen']).toBeUndefined();
  });

  it('entferneEigenesBild räumt IndexedDB UND Laufzeit-Store auf', async () => {
    const { speichereEigenesBild, entferneEigenesBild, hatEigenesBild, useDataRuntime } = await import(
      '../src/modules/data/data-runtime'
    );
    await speichereEigenesBild('eigen-4', bildDatei(1024, 'image/png'));
    expect(await hatEigenesBild('eigen-4')).toBe(true);
    expect(useDataRuntime.getState().bilder['eigen-4']?.status).toBe('lokal');

    await entferneEigenesBild('eigen-4');

    expect(await hatEigenesBild('eigen-4')).toBe(false);
    expect(useDataRuntime.getState().bilder['eigen-4']).toBeUndefined();
  });

  it('entferneEigenesBild ist ein No-Op, wenn nie ein Bild hochgeladen wurde', async () => {
    const { entferneEigenesBild, hatEigenesBild } = await import('../src/modules/data/data-runtime');
    await expect(entferneEigenesBild('nie-existiert')).resolves.toBeUndefined();
    expect(await hatEigenesBild('nie-existiert')).toBe(false);
  });

  it('ein Ersatz-Upload überschreibt den vorherigen Laufzeit-Zustand mit der neuen Objekt-URL', async () => {
    const { speichereEigenesBild, useDataRuntime } = await import('../src/modules/data/data-runtime');
    await speichereEigenesBild('eigen-5', bildDatei(1024, 'image/png'));
    const ersteUrl = useDataRuntime.getState().bilder['eigen-5'];
    await speichereEigenesBild('eigen-5', bildDatei(2048, 'image/jpeg'));
    const zweiteUrl = useDataRuntime.getState().bilder['eigen-5'];
    expect(zweiteUrl?.status).toBe('lokal');
    expect(zweiteUrl).not.toEqual(ersteUrl);
  });
});

describe('data-runtime.ts — Version-2-DB lässt den bestehenden referenzen-Store unangetastet (PC5 vs. P9)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await frischeEigeneReferenzenDb();
  });

  it('eine eigene Referenz (P9-Store) bleibt lesbar, nachdem zusätzlich ein Bild (PC5-Store) geschrieben wurde', async () => {
    const { importiereEigeneReferenzen, speichereEigenesBild, listeEigeneReferenzen } = await import(
      '../src/modules/data/data-runtime'
    );
    await importiereEigeneReferenzen([{ id: 'eigen-6', title: 'Eigene Referenz 6' }]);
    await speichereEigenesBild('eigen-6', bildDatei(1024, 'image/png'));

    const liste = await listeEigeneReferenzen();
    expect(liste.map((e) => e.id)).toEqual(['eigen-6']);
    expect(liste[0]!.title).toBe('Eigene Referenz 6');
  });
});

describe('data-runtime.ts — gedaechtnisQuerverweise ist source-agnostisch (PC5 Dossier-Verknüpfung, C-21 Punkt 2)', () => {
  it('eine eigene Referenz (quelle:"eigen") bekommt denselben refId-Treffer wie eine Seed-Referenz', async () => {
    const { gedaechtnisQuerverweise } = await import('../src/modules/data/data-runtime');
    const eintraege = [
      { ts: '2026-07-01T00:00:00.000Z', sentiment: 'gut' as const, context: 'Feedback zur eigenen Referenz', refId: 'eigene-villa' },
      { ts: '2026-07-02T00:00:00.000Z', sentiment: 'gut' as const, context: 'Feedback zu einer Seed-Referenz', refId: 'seed-pantheon' },
    ];
    const eigeneReferenz = { id: 'eigene-villa', title: 'Eigene Villa', quelle: 'eigen' as const };
    const seedReferenz = { id: 'seed-pantheon', title: 'Pantheon' };

    const treffer = gedaechtnisQuerverweise(eintraege, eigeneReferenz);
    expect(treffer).toHaveLength(1);
    expect(treffer[0]!.matchArt).toBe('verknuepft');
    expect(treffer[0]!.context).toBe('Feedback zur eigenen Referenz');

    // Gegenprobe: derselbe Mechanismus, dieselbe Form des Treffers für eine
    // Seed-Referenz — kein Sonderpfad für `quelle:'eigen'` nötig.
    const seedTreffer = gedaechtnisQuerverweise(eintraege, seedReferenz);
    expect(seedTreffer).toHaveLength(1);
    expect(seedTreffer[0]!.matchArt).toBe('verknuepft');
  });

  it('Text-Match-Fallback funktioniert für eigene Referenzen genauso wie für Seed-Referenzen', async () => {
    const { gedaechtnisQuerverweise } = await import('../src/modules/data/data-runtime');
    const eintraege = [
      {
        ts: '2026-07-01T00:00:00.000Z',
        sentiment: 'gut' as const,
        context: 'Die Referenz «E2E Eigene Villa» taugt als Vorbild für die Fensterbank',
      },
    ];
    const eigeneReferenz = { id: 'e2e-eigene-villa', title: 'E2E Eigene Villa', quelle: 'eigen' as const };
    const treffer = gedaechtnisQuerverweise(eintraege, eigeneReferenz);
    expect(treffer).toHaveLength(1);
    expect(treffer[0]!.matchArt).toBe('text');
  });
});
