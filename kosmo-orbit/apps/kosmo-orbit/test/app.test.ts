import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { chunkText } from '../src/modules/prepare/knowledge';
import { werkzeugeFuer, WERKZEUGE } from '../src/state/werkzeuge';

describe('Werkzeug-Manifest (Setup-Assistent)', () => {
  it('Standard braucht Ollama + Modell + Bridge als Kern, VPN/Claude nicht', () => {
    const ids = werkzeugeFuer('standard').map((w) => w.id);
    expect(ids).toContain('ollama');
    expect(ids).toContain('llm-modell');
    expect(ids).toContain('bridge');
    expect(ids).not.toContain('vpn');
    expect(ids).not.toContain('claude-key');
  });
  it('Remote enthält zusätzlich das VPN, als Pflicht', () => {
    const vpn = werkzeugeFuer('remote').find((w) => w.id === 'vpn');
    expect(vpn?.pflicht).toBe(true);
  });
  it('Cloud braucht nur den Claude-Schlüssel, keine lokalen Dienste', () => {
    const ids = werkzeugeFuer('cloud').map((w) => w.id);
    expect(ids).toEqual(['claude-key']);
  });
  it('Pflicht-Werkzeuge stehen vor den optionalen', () => {
    const liste = werkzeugeFuer('standard');
    const ersterOptional = liste.findIndex((w) => !w.pflicht);
    const letzterPflicht = liste.map((w) => w.pflicht).lastIndexOf(true);
    expect(letzterPflicht).toBeLessThan(ersterOptional);
  });
  it('jedes Werkzeug trägt einen Hol-Hinweis', () => {
    for (const w of WERKZEUGE) expect(w.holen.length).toBeGreaterThan(4);
  });
});

describe('KosmoPrepare Chunking', () => {
  it('teilt an Absatzgrenzen um die Zielgrösse', () => {
    const absatz = 'Ein Satz über Schweizer Hochbau, Normen und Flächen. '.repeat(8).trim();
    const text = Array.from({ length: 6 }, () => absatz).join('\n\n');
    const chunks = chunkText(text, 1200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1200 * 1.6);
    // nichts geht verloren (Whitespace-normalisiert)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toContain('Schweizer Hochbau');
  });

  it('teilt überlange Einzelabsätze hart, aber an Wortgrenzen', () => {
    const lang = 'wort '.repeat(800).trim();
    const chunks = chunkText(lang, 1000);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.endsWith('wor')).toBe(false);
  });

  it('leerer Text ergibt keine Chunks', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });
});

describe('Varianten-Archiv (Vision A5)', () => {
  it('archiviert den Stand mit Kennzahlen + Thumb und listet neuste zuerst', async () => {
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { archiviereVariante, listeVarianten, loescheVariante } = await import('../src/state/variant-archive');
    loadTkbDemo();
    const v1 = await archiviereVariante('Stand A');
    expect(v1.kennzahlen.find((k) => k.label === 'NGF')?.wert).toMatch(/m²/);
    expect(v1.thumbSvg).toContain('<svg');
    const v2 = await archiviereVariante('Stand B');
    const liste = await listeVarianten();
    expect(liste.length).toBeGreaterThanOrEqual(2);
    expect(liste.findIndex((v) => v.id === v2.id)).toBeLessThan(liste.findIndex((v) => v.id === v1.id));
    await loescheVariante(v1.id);
    await loescheVariante(v2.id);
  });

  it('öffnet eine Variante als NEUES Projekt — Original bleibt eingefroren', async () => {
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { useProject } = await import('../src/state/project-store');
    const { aktivesProjektId } = await import('../src/state/project-vault');
    const { archiviereVariante, oeffneVariante, listeVarianten, loescheVariante } = await import('../src/state/variant-archive');
    loadTkbDemo();
    const vorherElemente = useProject.getState().doc.entities.size;
    const v = await archiviereVariante('Einfrieren');
    const vorherId = aktivesProjektId();
    await oeffneVariante(v.id);
    expect(aktivesProjektId()).not.toBe(vorherId); // frische Projekt-ID
    expect(useProject.getState().doc.entities.size).toBe(vorherElemente); // Inhalt identisch geladen
    for (const rest of await listeVarianten()) await loescheVariante(rest.id);
  });
});

describe('BM25-Relevanz (Vision E3)', () => {
  it('IDF drückt Allerweltswörter, Phrase gewinnt, Länge normalisiert', async () => {
    const { bm25Scores } = await import('../src/modules/prepare/knowledge');
    const texte = [
      'Beton Beton Beton Beton Beton Beton und nochmals Beton überall im Rohbau.',
      'Beton mit Trittschalldämmung unter dem Unterlagsboden nach SIA 251.',
      'Holzbau mit Brettsperrholz, ganz ohne das graue Material.',
      'Beton und Trittschalldämmung: die Trittschalldämmung liegt auf der Rohdecke.',
    ];
    const scores = bm25Scores(texte, 'Beton Trittschalldämmung');
    // Der seltene Term (Trittschalldämmung, idf hoch) schlägt das Beton-Spam-Chunk
    expect(scores[3]).toBeGreaterThan(scores[0]!);
    expect(scores[1]).toBeGreaterThan(scores[0]!);
    expect(scores[2]).toBe(0); // kein Query-Term ≥ 3 Zeichen enthalten
    // Sättigung: 7× «Beton» bringt nicht 7× den Score eines 1×-Chunks
    const nurBeton = bm25Scores(texte, 'Beton');
    expect(nurBeton[0]!).toBeLessThan(nurBeton[1]! * 3);
    // Exakte Phrase gewinnt gegen verstreute Terme
    const phrase = bm25Scores(
      ['die Dämmung liegt wo anders, Rohdecke gibt es', 'die Trittschalldämmung liegt auf der Rohdecke'],
      'Trittschalldämmung liegt auf der Rohdecke',
    );
    expect(phrase[1]!).toBeGreaterThan(phrase[0]!);
  });
});

describe('KosmoData Live-Sync (Vision E2)', () => {
  it('Live füllt den Cache; fällt das Netz, kommt der letzte gute Stand', async () => {
    const { ladeReferenzenLive } = await import('@kosmo/data');
    const daten = [{ id: 'x', title: 'Testhaus' }];
    const okFetch = (async () => ({ ok: true, json: async () => daten })) as unknown as typeof fetch;
    const failFetch = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const live = await ladeReferenzenLive(okFetch);
    expect(live?.quelle).toBe('live');
    expect(live?.eintraege[0]?.title).toBe('Testhaus');
    const cache = await ladeReferenzenLive(failFetch);
    expect(cache?.quelle).toBe('cache');
    expect(cache?.eintraege).toHaveLength(1);
    expect(cache?.stand).toBe(live?.stand);
  });
});

describe('searchKnowledge-Mischung (Review-Fixes Vision F1)', () => {
  it('Semantik findet ohne wörtlichen Treffer; vektorlose Alt-Chunks bleiben per BM25 auffindbar', async () => {
    // Umgebung: localStorage + Bridge-Fetch stubben (Query-Embedding = [1, 0])
    const g = globalThis as Record<string, unknown>;
    g['localStorage'] ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
    const origFetch = globalThis.fetch;
    g['fetch'] = (async (_url: unknown, init?: { body?: string }) => ({
      ok: true,
      json: async () => ({ vectors: (JSON.parse(init?.body ?? '{}').texts as string[]).map(() => [1, 0]) }),
    })) as unknown as typeof fetch;
    try {
      // Wissensbasis säen: 1 Chunk MIT Vektor, 1 alt aufgenommener OHNE
      await new Promise<void>((res, rej) => {
        const req = indexedDB.open('kosmo-wissen', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('chunks')) {
            db.createObjectStore('chunks', { keyPath: 'id' }).createIndex('docId', 'docId');
          }
        };
        req.onsuccess = () => {
          const tx = req.result.transaction('chunks', 'readwrite');
          tx.objectStore('chunks').put({
            id: 'neu-0', docId: 'neu', seq: 0, vector: [1, 0],
            text: 'Schallschutz von Wohnungstrennwänden nach SIA 181.',
          });
          tx.objectStore('chunks').put({
            id: 'alt-0', docId: 'alt', seq: 0,
            text: 'Die Trittschalldämmung liegt auf der Rohdecke.',
          });
          tx.oncomplete = () => { req.result.close(); res(); };
          tx.onerror = () => rej(tx.error);
        };
        req.onerror = () => rej(req.error);
      });
      const { searchKnowledge } = await import('../src/modules/prepare/knowledge');
      // Befund 4: kein Query-Wort steht wörtlich in einem Chunk — Semantik muss trotzdem finden
      const synonym = await searchKnowledge('Lärmdämmung Trennbauteil');
      expect(synonym.map((h) => h.id)).toContain('neu-0');
      // Befund 3: wörtlicher Treffer liegt NUR im vektorlosen Alt-Chunk — BM25-Pfad trägt ihn
      const alt = await searchKnowledge('Trittschalldämmung Rohdecke');
      expect(alt.map((h) => h.id)).toContain('alt-0');
    } finally {
      g['fetch'] = origFetch;
    }
  });
});

describe('Tresor-Migration v1→v2 (Vision F1)', () => {
  it('voller v1-Tresor überlebt das Upgrade; der varianten-Store kommt verlustfrei dazu', async () => {
    // Sauber starten, dann einen ECHTEN v1-Tresor bauen (nur Store «projekte»)
    await new Promise<void>((res, rej) => {
      const req = indexedDB.deleteDatabase('kosmo-projekte');
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
    const dbV1 = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open('kosmo-projekte', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('projekte', { keyPath: 'id' });
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    expect(Array.from(dbV1.objectStoreNames)).toEqual(['projekte']);
    const eintraege = ['Altbau A', 'Altbau B', 'Altbau C'].map((name, i) => ({
      id: `alt-${i}`,
      name,
      updatedAt: new Date(2026, 0, i + 1).toISOString(),
      elemente: i * 10,
      json: { schema: 'kosmo.model/v1', settings: { projectName: name }, entities: [] },
    }));
    await new Promise<void>((res, rej) => {
      const t = dbV1.transaction('projekte', 'readwrite');
      for (const e of eintraege) t.objectStore('projekte').put(e);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
    dbV1.close();
    // Erster Zugriff über den Tresor öffnet v2 → onupgradeneeded ergänzt «varianten»
    const { listeProjekte, vaultTx } = await import('../src/state/project-vault');
    const liste = await listeProjekte();
    expect(liste.map((p) => p.name)).toEqual(['Altbau C', 'Altbau B', 'Altbau A']); // neuste zuerst, nichts verloren
    // Der neue Store funktioniert im migrierten Tresor
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { archiviereVariante, listeVarianten, loescheVariante } = await import('../src/state/variant-archive');
    loadTkbDemo();
    const v = await archiviereVariante('Nach Migration');
    expect((await listeVarianten()).some((x) => x.id === v.id)).toBe(true);
    await loescheVariante(v.id);
    // Alte Projekte sind nach der Varianten-Nutzung weiterhin da (kein Store-Reset)
    expect((await vaultTx<unknown[]>('projekte', 'readonly', (s) => s.getAll() as IDBRequest<unknown[]>)).length).toBe(3);
  });
});

describe('TKB-Demo v2 (Abendbatch C1)', () => {
  it('lädt Bibliothek + Wohnhof-Kette: Wände, Fenster, Treppenhaus, keine Fluchtweg-Fehler', async () => {
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { useProject } = await import('../src/state/project-store');
    const { pruefeGrundriss } = await import('@kosmo/kernel');
    loadTkbDemo();
    const { doc, activeStoreyId } = useProject.getState();
    expect(doc.settings.projectName).toContain('TKB');
    expect(doc.byKind('wall').length).toBeGreaterThan(10);
    const fenster = doc.byKind('opening').filter((o) => (o as { openingType: string }).openingType === 'fenster');
    expect(fenster.length).toBeGreaterThanOrEqual(8);
    expect(doc.byKind('zone').filter((z) => (z as { raumTyp?: string }).raumTyp === 'treppenhaus')).toHaveLength(1);
    expect(doc.byKind('stair')).toHaveLength(1);
    // Fluchtweg: kein Fehler-Befund auf dem EG
    const befunde = pruefeGrundriss(doc, activeStoreyId!);
    expect(befunde.filter((b) => b.regel === 'Fluchtweg' && b.schwere === 'fehler')).toHaveLength(0);
  });
});

// ── V1-Finish P3: Auftragsbuch — Workorder-Export ────────────────────

describe('Auftragsbuch (P3)', () => {
  it('alsWorkorderMd gruppiert offene Aufträge nach Station und lässt erledigte weg', async () => {
    const { alsWorkorderMd } = await import('../src/state/auftragsbuch');
    const md = alsWorkorderMd(
      [
        { id: '1', ts: '2026-07-04T10:00:00Z', text: 'Türanschlag wählbar machen', quelle: 'gesprochen', station: 'KosmoDesign', ort: 'Werkzeugleiste', status: 'offen' },
        { id: '2', ts: '2026-07-04T11:00:00Z', text: 'Blattliste sortierbar', quelle: 'kosmo', station: 'KosmoPublish', status: 'offen' },
        { id: '3', ts: '2026-07-04T12:00:00Z', text: 'Schon gemacht', quelle: 'getippt', station: 'KosmoDesign', status: 'erledigt' },
      ],
      '2026-07-04',
      'TKB',
    );
    expect(md).toContain('# Verbesserungsaufträge — 2026-07-04');
    expect(md).toContain('## KosmoDesign');
    expect(md).toContain('## KosmoPublish');
    expect(md).toContain('- [ ] Türanschlag wählbar machen — _wo: Werkzeugleiste_');
    expect(md).toContain('via Kosmo strukturiert');
    expect(md).not.toContain('Schon gemacht');
    expect(md).toContain('2 offene Aufträge');
  });
});

// ── V1-Finish P4: QR-Encoder — jsQR als Testorakel ───────────────────

describe('QR-Encoder (P4)', () => {
  it('Round-Trip: jsQR liest die Pairing-URL exakt zurück (alle Versionsstufen)', async () => {
    const { qrEncode } = await import('../src/state/qr');
    const jsQR = (await import('jsqr')).default;
    const texte = [
      'kurz',
      'https://kosmo.local/#sync=ws%3A%2F%2F192.168.1.20%3A8700&raum=projekt-1&token=geheim',
      'https://kosmo-orbit.example.ch/app/#sync=wss%3A%2F%2Fbuero.example.ch%3A8700&raum=wettbewerb-tkb-bibliothek&token=' + 'a'.repeat(64),
      'x'.repeat(250), // zwingt in die hohen Versionen
    ];
    for (const text of texte) {
      const { matrix, groesse } = qrEncode(text);
      // Matrix → Pixel (Skalierung 4, Ruhezone 4 Module) für jsQR
      const skala = 4;
      const rand = 4 * skala;
      const kante = groesse * skala + 2 * rand;
      const pixel = new Uint8ClampedArray(kante * kante * 4).fill(255);
      for (let y = 0; y < groesse; y++) {
        for (let x = 0; x < groesse; x++) {
          if (!matrix[y]![x]) continue;
          for (let dy = 0; dy < skala; dy++) {
            for (let dx = 0; dx < skala; dx++) {
              const i = ((y * skala + dy + rand) * kante + x * skala + dx + rand) * 4;
              pixel[i] = 0; pixel[i + 1] = 0; pixel[i + 2] = 0;
            }
          }
        }
      }
      const gelesen = jsQR(pixel, kante, kante);
      expect(gelesen?.data, `Text (${text.length} Zeichen) nicht dekodierbar`).toBe(text);
    }
  });

  it('lehnt zu lange Texte ehrlich ab und liefert SVG mit Ruhezone', async () => {
    const { qrEncode, qrSvg } = await import('../src/state/qr');
    expect(() => qrEncode('x'.repeat(400))).toThrow(/zu lang/);
    const svg = qrSvg('https://kosmo.local/#raum=1');
    expect(svg).toContain('<svg');
    expect(svg).toContain('crispEdges');
  });
});

// ── Härtetest-Runde 4 (P6): Tresor-Migration v2 → v3 ─────────────────

describe('Tresor-Migration (H4c)', () => {
  it('alter v2-Tresor (nur projekte/varianten) migriert verlustfrei auf v3', async () => {
    // Frisch beginnen — andere Tests haben den Tresor evtl. schon auf v3 geöffnet
    await new Promise<void>((resolve, reject) => {
      const del = indexedDB.deleteDatabase('kosmo-projekte');
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
    });
    // Alten Stand von Hand anlegen — wie ein Gerät, das seit Vision A5 nicht mehr auf war
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('kosmo-projekte', 2);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('projekte', { keyPath: 'id' });
        req.result.createObjectStore('varianten', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const t = req.result.transaction('projekte', 'readwrite');
        t.objectStore('projekte').put({ id: 'alt-1', name: 'Altbestand', updatedAt: '2026-07-01', elemente: 3, json: { entities: [], settings: {} } });
        t.oncomplete = () => {
          req.result.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
      req.onerror = () => reject(req.error);
    });
    // Erster Zugriff über den Tresor löst das Upgrade aus
    const { vaultTx } = await import('../src/state/project-vault');
    const auftraege = await vaultTx('auftraege', 'readonly', (s) => s.count());
    expect(auftraege).toBe(0); // neuer Store existiert
    const projekte = await vaultTx<{ id: string; name: string }[]>('projekte', 'readonly', (s) => s.getAll() as IDBRequest<{ id: string; name: string }[]>);
    expect(projekte.some((p) => p.id === 'alt-1' && p.name === 'Altbestand')).toBe(true); // alte Daten intakt
  });
});

// ── Codex-Übernahme Batch 3: KosmoAsset-Datenmodell + Migration v3 → v4 ──

describe('KosmoAsset-Bibliothek (Batch 3): Datenmodell + Tresor-Migration v3 → v4', () => {
  it('alter GLB-Record (v3-Shape) migriert verlustfrei auf das reiche KosmoAsset-Manifest — Blob bleibt erhalten', async () => {
    // Frisch beginnen — andere Tests haben den Tresor evtl. schon auf die aktuelle Version geöffnet
    await new Promise<void>((resolve, reject) => {
      const del = indexedDB.deleteDatabase('kosmo-projekte');
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
    });
    // Alten v3-Tresor von Hand anlegen: «objekte» im reinen GLB-Blob-Format
    const altesBlob = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('kosmo-projekte', 3);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('projekte', { keyPath: 'id' });
        req.result.createObjectStore('varianten', { keyPath: 'id' });
        req.result.createObjectStore('auftraege', { keyPath: 'id' });
        req.result.createObjectStore('objekte', { keyPath: 'id' });
        req.result.createObjectStore('lernjournal', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const t = req.result.transaction('objekte', 'readwrite');
        t.objectStore('objekte').put({
          id: 'glb-alt-1',
          name: 'Alter Baum',
          createdAt: '2026-01-01T00:00:00.000Z',
          bytes: 8,
          daten: altesBlob,
        });
        t.oncomplete = () => {
          req.result.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
      req.onerror = () => reject(req.error);
    });
    // Erster Zugriff über die Bibliothek löst das v3→v4-Upgrade aus
    const { listeGlb } = await import('../src/state/asset-bibliothek');
    const alle = await listeGlb();
    expect(alle).toHaveLength(1);
    const migriert = alle[0]!;
    expect(migriert.id).toBe('glb-alt-1');
    expect(migriert.title).toBe('Alter Baum'); // name → title
    expect(migriert.asset_type).toBe('glb_model');
    expect(migriert.category).toBe('component');
    expect(migriert.tags).toEqual([]);
    expect(migriert.formats).toEqual([{ format: 'glb', bytes: 8, status: 'ready' }]);
    expect(migriert.rights_status).toBe('generated_needs_review');
    expect(migriert.public_use_allowed).toBe(false);
    expect(migriert.visibility).toBe('private');
    expect(migriert.kosmodata_refs).toEqual([]);
    expect(migriert.createdAt).toBe('2026-01-01T00:00:00.000Z');
    // Blob verlustfrei — byteweise identisch mit dem Original
    expect(new Uint8Array(migriert.daten)).toEqual(new Uint8Array(altesBlob));
  });

  it('neuer Asset-Import: round-trip über speichereGlb/listeGlb/loescheGlb', async () => {
    const { speichereGlb, listeGlb, loescheGlb } = await import('../src/state/asset-bibliothek');
    const bytes = new Uint8Array([9, 9, 9, 9]);
    const datei = new File([bytes], 'stuetze.glb', { type: 'model/gltf-binary' });
    const gespeichert = await speichereGlb(datei);
    expect(gespeichert.title).toBe('stuetze'); // Default-Titel aus Dateiname, ohne Endung
    expect(gespeichert.formats[0]).toEqual({ format: 'glb', bytes: 4, status: 'ready' });

    const liste = await listeGlb();
    const gefunden = liste.find((a) => a.id === gespeichert.id);
    expect(gefunden).toBeDefined();
    expect(new Uint8Array(gefunden!.daten)).toEqual(bytes);

    await loescheGlb(gespeichert.id);
    expect((await listeGlb()).some((a) => a.id === gespeichert.id)).toBe(false);
  });

  it('Default-Werte: private Sichtbarkeit + generated_needs_review, optionale Metadaten übersteuern den Default', async () => {
    const { speichereGlb, loescheGlb } = await import('../src/state/asset-bibliothek');
    const standard = await speichereGlb(new File([new Uint8Array([1])], 'ohne-titel.glb'));
    expect(standard.visibility).toBe('private');
    expect(standard.rights_status).toBe('generated_needs_review');
    expect(standard.public_use_allowed).toBe(false);
    expect(standard.asset_type).toBe('glb_model');
    expect(standard.category).toBe('component');

    const benannt = await speichereGlb(new File([new Uint8Array([1])], 'ignoriert.glb'), {
      title: 'Sitzbank Eiche',
      category: 'furniture',
      tags: ['möbel', 'sitzbank'],
    });
    expect(benannt.title).toBe('Sitzbank Eiche');
    expect(benannt.category).toBe('furniture');
    expect(benannt.tags).toEqual(['möbel', 'sitzbank']);

    await loescheGlb(standard.id);
    await loescheGlb(benannt.id);
  });
});

// ── Codex-Übernahme Batch 5: Ref↔Asset-Verknüpfung («ein System») ────

describe('Ref↔Asset-Verknüpfung (Batch 5)', () => {
  it('verknuepfeAssetMitReferenz persistiert idempotent (kein Duplikat bei zweitem Aufruf)', async () => {
    const { speichereGlb, verknuepfeAssetMitReferenz, listeGlb, loescheGlb } = await import('../src/state/asset-bibliothek');
    const asset = await speichereGlb(new File([new Uint8Array([1, 2])], 'baum.glb'));
    expect(asset.kosmodata_refs).toEqual([]);

    const einmal = await verknuepfeAssetMitReferenz(asset.id, 'ref-villa-savoye');
    expect(einmal.kosmodata_refs).toHaveLength(1);
    expect(einmal.kosmodata_refs[0]).toMatchObject({
      entry_id: 'ref-villa-savoye',
      kind: 'reference_entry',
      relation: 'model_context',
      usage_policy: 'context_only',
      review_status: 'context_only',
    });

    // Zweiter Aufruf mit derselben Referenz-ID darf nichts verdoppeln.
    const zweimal = await verknuepfeAssetMitReferenz(asset.id, 'ref-villa-savoye');
    expect(zweimal.kosmodata_refs).toHaveLength(1);

    // Persistiert wirklich — Neuladen aus dem Tresor zeigt dieselbe Verknüpfung.
    const geladen = (await listeGlb()).find((a) => a.id === asset.id);
    expect(geladen?.kosmodata_refs).toHaveLength(1);

    // Meta-Override respektiert (z.B. eine strengere Prüf-Einstufung).
    const zweiteRef = await verknuepfeAssetMitReferenz(asset.id, 'ref-farnsworth', {
      relation: 'material_context',
      review_status: 'needs_human_review',
      notes: 'Fassadenmaterial als Vorbild',
    });
    expect(zweiteRef.kosmodata_refs).toHaveLength(2);
    const farnsworth = zweiteRef.kosmodata_refs.find((r) => r.entry_id === 'ref-farnsworth');
    expect(farnsworth).toMatchObject({ relation: 'material_context', review_status: 'needs_human_review', notes: 'Fassadenmaterial als Vorbild' });

    await loescheGlb(asset.id);
  });

  it('entferneAssetReferenz löst nur die genannte Verknüpfung, lässt andere unberührt', async () => {
    const { speichereGlb, verknuepfeAssetMitReferenz, entferneAssetReferenz, listeGlb, loescheGlb } = await import(
      '../src/state/asset-bibliothek'
    );
    const asset = await speichereGlb(new File([new Uint8Array([3])], 'stuhl.glb'));
    await verknuepfeAssetMitReferenz(asset.id, 'ref-a');
    await verknuepfeAssetMitReferenz(asset.id, 'ref-b');

    const nachEntfernen = await entferneAssetReferenz(asset.id, 'ref-a');
    expect(nachEntfernen.kosmodata_refs.map((r) => r.entry_id)).toEqual(['ref-b']);

    // Entfernen einer nicht (mehr) vorhandenen Referenz ist kein Fehler (idempotent).
    const nochmal = await entferneAssetReferenz(asset.id, 'ref-a');
    expect(nochmal.kosmodata_refs.map((r) => r.entry_id)).toEqual(['ref-b']);

    const geladen = (await listeGlb()).find((a) => a.id === asset.id);
    expect(geladen?.kosmodata_refs.map((r) => r.entry_id)).toEqual(['ref-b']);

    await loescheGlb(asset.id);
  });
});

// ── D1: KosmoData-Dach — vereinheitlichter Adapter über die fünf Sammlungen ──

describe('visibility-Default (D1): Alt-Daten ohne Feld gelten beim Lesen als "private"', () => {
  it('KnowledgeDoc ohne visibility wird von listDocs() als "private" normalisiert', async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('kosmo-wissen', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' }).createIndex('docId', 'docId');
        }
      };
      req.onsuccess = () => {
        const tx = req.result.transaction('docs', 'readwrite');
        tx.objectStore('docs').put({
          id: 'doc-alt-ohne-visibility',
          name: 'Altes Normen-PDF.pdf',
          source: 'lokal',
          addedAt: '2020-01-01T00:00:00.000Z',
          chunkCount: 0,
        });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    const { listDocs } = await import('../src/modules/prepare/knowledge');
    const alt = (await listDocs()).find((d) => d.id === 'doc-alt-ohne-visibility');
    expect(alt?.visibility).toBe('private');
  });

  it('ingestFile setzt visibility="private" direkt auf dem neuen Dokument', async () => {
    const origFetch = globalThis.fetch;
    // Bridge/Embeddings deterministisch aus — nur die Chunk-/Doc-Erzeugung wird geprüft.
    globalThis.fetch = (async () => {
      throw new Error('keine Bridge im Test');
    }) as unknown as typeof fetch;
    try {
      const { ingestFile, listDocs } = await import('../src/modules/prepare/knowledge');
      const datei = new File(['Ein frisch aufgenommenes Dokument mit genug Fliesstext.'], 'neu.txt', {
        type: 'text/plain',
      });
      const doc = await ingestFile(datei);
      expect(doc.visibility).toBe('private');
      const geladen = (await listDocs()).find((d) => d.id === doc.id);
      expect(geladen?.visibility).toBe('private');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('Learning ohne visibility wird von LearningJournal.all als "private" behandelt', async () => {
    const { LearningJournal } = await import('@kosmo/ai');
    const altbestand = [
      { ts: '2020-01-01T00:00:00.000Z', sentiment: 'gut' as const, context: 'Alter Eintrag ohne Sichtbarkeitsfeld' },
    ];
    const journal = new LearningJournal({ load: () => altbestand, save: () => undefined });
    expect(journal.all[0]?.visibility).toBe('private');
    // Neue, EXPLIZIT öffentlich markierte Einträge bleiben unangetastet.
    const oeffentlich = new LearningJournal({
      load: () => [{ ts: '2026-01-01T00:00:00.000Z', sentiment: 'gut' as const, context: 'Bewusst geteilt', visibility: 'public' as const }],
      save: () => undefined,
    });
    expect(oeffentlich.all[0]?.visibility).toBe('public');
  });
});

describe('KosmoData-Dach (D1): vereinheitlichter Adapter über die fünf Sammlungen', () => {
  it('sammlungen() zählt defensiv — eine tote Quelle (kein Netz) liefert 0 statt Absturz', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('kein Netz — Referenz-Seed nicht erreichbar');
    }) as unknown as typeof fetch;
    try {
      const { sammlungen } = await import('../src/state/kosmodata-dach');
      const zahlen = await sammlungen();
      expect(zahlen.referenz).toBe(0); // Quelle tot -> defensiv 0, kein Crash
      expect(typeof zahlen.asset).toBe('number');
      expect(typeof zahlen.wissen).toBe('number');
      expect(typeof zahlen.training).toBe('number');
      expect(typeof zahlen.gedaechtnis).toBe('number');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('sucheDach findet über mehrere Sammlungen (Referenz, Asset, Wissen, Training/Gedächtnis) und sortiert nach Score', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).includes('kosmodata-seed.json')) {
        return {
          ok: true,
          json: async () => ({
            entries: [
              { id: 'ref-beton-tkb', title: 'Terrassenhaus Bruchtobel', themes: ['Beton'], one_sentence: 'Ein Betonhaus am Hang.' },
            ],
          }),
        };
      }
      throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
    }) as unknown as typeof fetch;

    // Assets: ein GLB mit passendem Tag.
    const { speichereGlb, loescheGlb } = await import('../src/state/asset-bibliothek');
    const asset = await speichereGlb(new File([new Uint8Array([1])], 'betonstuetze.glb'), { tags: ['beton'] });

    // Wissen: ein Chunk direkt in kosmo-wissen seeden (wie im BM25-Mischungstest oben).
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('kosmo-wissen', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' }).createIndex('docId', 'docId');
        }
      };
      req.onsuccess = () => {
        const tx = req.result.transaction(['docs', 'chunks'], 'readwrite');
        tx.objectStore('docs').put({
          id: 'doc-betonnorm',
          name: 'Betonnorm.pdf',
          source: 'lokal',
          addedAt: '2026-01-01T00:00:00.000Z',
          chunkCount: 1,
        });
        tx.objectStore('chunks').put({
          id: 'doc-betonnorm-0',
          docId: 'doc-betonnorm',
          docName: 'Betonnorm.pdf',
          seq: 0,
          text: 'Beton nach SIA 262 braucht eine Expositionsklasse.',
        });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    // Training + Gedächtnis: dasselbe Lernjournal, per Notiz unterschieden — localStorage
    // braucht dafür einen ECHTEN (nicht nur no-op) Fake, sonst sieht sucheDach()s eigene
    // Journal-Instanz die eben hinzugefügten Einträge nicht.
    const g = globalThis as Record<string, unknown>;
    const backupLocalStorage = g['localStorage'];
    const laden: Record<string, string> = {};
    g['localStorage'] = {
      getItem: (k: string) => laden[k] ?? null,
      setItem: (k: string, v: string) => {
        laden[k] = v;
      },
      removeItem: (k: string) => {
        delete laden[k];
      },
    };
    const { journalStore } = await import('../src/state/journal-store');
    const { LearningJournal } = await import('@kosmo/ai');
    const journal = new LearningJournal(journalStore());
    journal.add({ sentiment: 'schlecht', context: 'Beton-Detail falsch vorgeschlagen', note: 'Beton nie ohne Gefälle vorschlagen' });
    journal.add({ sentiment: 'gut', context: 'Beton-Sichtbeton sauber ausgeführt' });

    try {
      const { sucheDach } = await import('../src/state/kosmodata-dach');
      const treffer = await sucheDach('beton');
      const sammlungen = new Set(treffer.map((t) => t.sammlung));
      expect(sammlungen.has('referenz')).toBe(true);
      expect(sammlungen.has('asset')).toBe(true);
      expect(sammlungen.has('wissen')).toBe(true);
      expect(sammlungen.has('training')).toBe(true);
      expect(sammlungen.has('gedaechtnis')).toBe(true);
      // Der Wissens-Treffer trägt die Default-Sichtbarkeit 'private' (Alt-Doc ohne Feld).
      const wissenTreffer = treffer.find((t) => t.sammlung === 'wissen');
      expect(wissenTreffer?.visibility).toBe('private');
      // Sortiert nach Score, absteigend.
      for (let i = 1; i < treffer.length; i++) {
        expect(treffer[i - 1]!.score ?? 0).toBeGreaterThanOrEqual(treffer[i]!.score ?? 0);
      }
    } finally {
      globalThis.fetch = origFetch;
      g['localStorage'] = backupLocalStorage;
      await loescheGlb(asset.id);
    }
  });
});

// ── D2: Wissen unter das KosmoData-Dach — erstklassiger Tab statt nur RAG-intern ──

describe('D2 (KosmoData-Dach): setzeDocVisibility — Sichtbarkeit eines vorhandenen Dokuments umschalten', () => {
  it('schaltet ein aufgenommenes Dokument von "private" auf "public" und zurück', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('keine Bridge im Test');
    }) as unknown as typeof fetch;
    try {
      const { ingestFile, listDocs, setzeDocVisibility } = await import('../src/modules/prepare/knowledge');
      const datei = new File(['Ein Dokument, dessen Sichtbarkeit D2 umschaltbar macht.'], 'sichtbarkeit-d2.txt', {
        type: 'text/plain',
      });
      const doc = await ingestFile(datei);
      expect(doc.visibility).toBe('private');

      await setzeDocVisibility(doc.id, 'public');
      expect((await listDocs()).find((d) => d.id === doc.id)?.visibility).toBe('public');

      await setzeDocVisibility(doc.id, 'private');
      expect((await listDocs()).find((d) => d.id === doc.id)?.visibility).toBe('private');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('wirft, wenn das Dokument nicht (mehr) existiert', async () => {
    const { setzeDocVisibility } = await import('../src/modules/prepare/knowledge');
    await expect(setzeDocVisibility('doc-d2-existiert-nicht', 'public')).rejects.toThrow();
  });
});

describe('D2 (KosmoData-Dach): Wissen-Treffer springen in den KosmoData-Wissen-Tab, nicht mehr nach KosmoPrepare', () => {
  it('sucheDach liefert für einen Wissen-Treffer sprung = { screen: "wissen" }', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).includes('kosmodata-seed.json')) {
        return { ok: true, json: async () => ({ entries: [] }) };
      }
      throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
    }) as unknown as typeof fetch;

    // Ein eindeutiger Chunk direkt in kosmo-wissen geseedet (wie im D1-Mischungstest oben).
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('kosmo-wissen', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' }).createIndex('docId', 'docId');
        }
      };
      req.onsuccess = () => {
        const tx = req.result.transaction(['docs', 'chunks'], 'readwrite');
        tx.objectStore('docs').put({
          id: 'doc-d2-sprungtest',
          name: 'D2-Sprungtest.pdf',
          source: 'lokal',
          addedAt: '2026-01-01T00:00:00.000Z',
          chunkCount: 1,
        });
        tx.objectStore('chunks').put({
          id: 'doc-d2-sprungtest-0',
          docId: 'doc-d2-sprungtest',
          docName: 'D2-Sprungtest.pdf',
          seq: 0,
          text: 'Xyloforschungsbegriff für den D2-Sprungtest, einzigartig genug für einen Treffer.',
        });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    try {
      const { sucheDach } = await import('../src/state/kosmodata-dach');
      const treffer = await sucheDach('xyloforschungsbegriff');
      const wissenTreffer = treffer.find((t) => t.sammlung === 'wissen');
      expect(wissenTreffer).toBeDefined();
      expect(wissenTreffer?.sprung).toEqual({ screen: 'wissen' });
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ── D3: Training sichtbar & pflegbar — zwei Achsen (Architektur/Software) ──

describe('D3 (KosmoData-Dach): Trainings-Korpus, Achse Software — Kernel-Commands', () => {
  it('softwareKorpusCommands() liefert ein Beispiel je registriertem Command, alle achse="software"', async () => {
    // Registrierung geschieht als Import-Seiteneffekt — genau wie die App
    // (`@kosmo/kernel` bindet commands/design.ts, .../publish.ts, .../vis.ts ein).
    await import('@kosmo/kernel');
    const { softwareKorpusCommands } = await import('../src/state/training-korpus');
    const beispiele = softwareKorpusCommands();
    expect(beispiele.length).toBeGreaterThan(0);
    for (const b of beispiele) {
      expect(b.achse).toBe('software');
      expect(b.quelle.startsWith('command:')).toBe(true);
    }
    const geschoss = beispiele.find((b) => b.quelle === 'command:design.geschossErstellen');
    expect(geschoss).toBeDefined();
    expect(geschoss?.frage).toContain('design.geschossErstellen');
    expect(geschoss?.antwort.length).toBeGreaterThan(0);
    // Stabil sortiert nach cmd.id.
    const ids = beispiele.map((b) => b.quelle.replace('command:', ''));
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });
});

describe('D3 (KosmoData-Dach): Trainings-Korpus, Achse Architektur — kuratierte Lehren', () => {
  it('nimmt einen Journal-Eintrag MIT Notiz auf, ignoriert einen OHNE Notiz', async () => {
    const { LearningJournal } = await import('@kosmo/ai');
    const journal = new LearningJournal({
      load: () => [
        { ts: '2026-07-01T10:00:00.000Z', sentiment: 'schlecht' as const, context: 'Fenster zu tief vorgeschlagen', note: 'Nie Fenster unter 900 Brüstung vorschlagen' },
        { ts: '2026-07-02T10:00:00.000Z', sentiment: 'gut' as const, context: 'Ohne Notiz — bleibt Gedächtnis' },
      ],
      save: () => undefined,
    });
    const { architekturKorpus } = await import('../src/state/training-korpus');
    const beispiele = architekturKorpus(journal);
    expect(beispiele).toHaveLength(1);
    expect(beispiele[0]?.achse).toBe('architektur');
    expect(beispiele[0]?.antwort).toBe('Nie Fenster unter 900 Brüstung vorschlagen');
    expect(beispiele[0]?.quelle).toBe('journal:2026-07-01T10:00:00.000Z');
  });
});

describe('D3 (KosmoData-Dach): exportTrainingJsonl — LoRA-taugliches JSONL', () => {
  it('erzeugt pro Beispiel eine JSON.parse-bare Zeile mit user/assistant-Nachrichten; beide Achsen in meta.achse', async () => {
    const { exportTrainingJsonl } = await import('../src/state/training-korpus');
    const beispiele = [
      { achse: 'architektur' as const, id: 'a-1', frage: 'Wie hoch die Brüstung?', antwort: 'Mindestens 900 mm', quelle: 'journal:x', herkunft: 'KosmoTrain · Kuration' },
      { achse: 'software' as const, id: 's-1', frage: 'Was macht design.wandZeichnen?', antwort: 'Zeichnet eine Wand.', quelle: 'command:design.wandZeichnen', herkunft: 'KosmoOrbit · Commands' },
    ];
    const jsonl = exportTrainingJsonl(beispiele);
    const zeilen = jsonl.split('\n');
    expect(zeilen).toHaveLength(2);
    const geparst = zeilen.map((z) => JSON.parse(z) as { messages: { role: string; content: string }[]; meta: { achse: string } });
    for (const g of geparst) {
      expect(g.messages[0]?.role).toBe('user');
      expect(g.messages[1]?.role).toBe('assistant');
    }
    const achsen = new Set(geparst.map((g) => g.meta.achse));
    expect(achsen.has('architektur')).toBe(true);
    expect(achsen.has('software')).toBe(true);
  });
});

describe('D3 (KosmoData-Dach): sucheDach springt für Training in den KosmoData-Tab, für Gedächtnis in KosmoTrain', () => {
  it('ein Training-Treffer (Notiz gesetzt) liefert sprung={screen:"training"}, ein Gedächtnis-Treffer (ohne Notiz) sprung={screen:"train"}', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).includes('kosmodata-seed.json')) {
        return { ok: true, json: async () => ({ entries: [] }) };
      }
      throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
    }) as unknown as typeof fetch;

    const g = globalThis as Record<string, unknown>;
    const backupLocalStorage = g['localStorage'];
    const laden: Record<string, string> = {};
    g['localStorage'] = {
      getItem: (k: string) => laden[k] ?? null,
      setItem: (k: string, v: string) => {
        laden[k] = v;
      },
      removeItem: (k: string) => {
        delete laden[k];
      },
    };
    try {
      const { journalStore } = await import('../src/state/journal-store');
      const { LearningJournal } = await import('@kosmo/ai');
      const journal = new LearningJournal(journalStore());
      journal.add({ sentiment: 'schlecht', context: 'D3-Sprungtest-Training xyloforschung', note: 'D3-Sprungtest-Notiz xyloforschung' });
      journal.add({ sentiment: 'gut', context: 'D3-Sprungtest-Gedaechtnis xyloforschung' });

      const { sucheDach } = await import('../src/state/kosmodata-dach');
      const treffer = await sucheDach('xyloforschung');
      const trainingTreffer = treffer.find((t) => t.sammlung === 'training');
      const gedaechtnisTreffer = treffer.find((t) => t.sammlung === 'gedaechtnis');
      expect(trainingTreffer?.sprung).toEqual({ screen: 'training' });
      expect(gedaechtnisTreffer?.sprung).toEqual({ screen: 'train' });
    } finally {
      globalThis.fetch = origFetch;
      g['localStorage'] = backupLocalStorage;
    }
  });
});
