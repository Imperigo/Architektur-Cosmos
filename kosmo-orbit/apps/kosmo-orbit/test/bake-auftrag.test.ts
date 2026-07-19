import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';
import { KosmoDoc } from '@kosmo/kernel';
import type { BakeJob } from '@kosmo/contracts';
import { listeGlb } from '../src/state/asset-bibliothek';

/** Frischer «kosmo-projekte»-Tresor je Test (Muster `pc5-data-bilder.test.ts`)
 * — sonst zählen die Vault-Assertions über Testgrenzen hinweg falsch. */
async function frischerProjektTresor(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('kosmo-projekte');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

/**
 * PBL4-089 (`docs/V089-SPEZ.md` §9 E9/E17, Sanktion 12) — Bake-Rückweg:
 * `starteBakeAuftrag`/`holeBakeAuftrag` gegen einen gemockten `fetch`
 * (Muster `vis-preset-job.test.ts`), `ladeBakeErgebnis` gegen die reale
 * `fake-indexeddb`-Bibliothek (Muster `project-vault-haerte.test.ts`).
 *
 * Kern-Beweis der Sanktion: bei JEDEM Status ausser `done` schreibt
 * `ladeBakeErgebnis` NICHTS in den Vault — insbesondere nicht bei
 * `kein-blender-worker`, dem einzigen Endzustand, den der Fake-/Container-
 * Betrieb tatsächlich erreicht (`main.py::_fake_worker_step`, `kind:'bake'`).
 * Der `done`-Weg ist im Container nie live erreichbar (kein Blender-Worker
 * angeschlossen) — er wird hier mit einem KÜNSTLICHEN `BakeJob` + einem
 * künstlichen GLB-Blob bewiesen; ein echter Worker-Lauf bleibt ein
 * Geräte-Termin auf der HomeStation (Owner-Rahmen, §9 Nachtrag).
 */

function setzeLocalStorage(werte: Record<string, string> = {}): void {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => werte[k] ?? null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
}

/** Minimal gültiges GLB (Muster `e2e/kosmoasset-bibliothek.spec.ts::miniGlb`, hier als ArrayBuffer). */
function miniGlbBytes(): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 }));
  const pad = (4 - (json.length % 4)) % 4;
  const jsonChunk = new Uint8Array(json.length + pad);
  jsonChunk.set(json);
  jsonChunk.fill(0x20, json.length);
  const total = 12 + 8 + jsonChunk.length;
  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  dv.setUint32(0, 0x46546c67, true); // 'glTF'
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonChunk.length, true);
  dv.setUint32(16, 0x4e4f534a, true); // 'JSON'
  new Uint8Array(buf, 20).set(jsonChunk);
  return buf;
}

function bakeJobFixture(overrides: Partial<BakeJob> = {}): BakeJob {
  return {
    job_id: 'bake-1752900000-abcdef',
    status: 'queued',
    kind: 'bake',
    scene: '/tmp/bake-1752900000-abcdef/bake-job.json',
    created_at: '2026-07-19T12:00:00.000Z',
    ...overrides,
  };
}

describe('starteBakeAuftrag — Multipart-Payload gegen kosmo.bake-job/v1', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sendet szene (JSON) + model (Blob) an bridgeRoutes.jobsBake, mit Token-Header', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600', 'kosmo.bridge.token': 'geheim-123' });
    let gesendetePfad: string | null = null;
    let gesendeteHeaders: Headers | null = null;
    let gesendeteSzene: Record<string, unknown> | null = null;
    let hatModell = false;
    vi.stubGlobal(
      'fetch',
      (async (url: unknown, init?: RequestInit) => {
        gesendetePfad = String(url);
        gesendeteHeaders = new Headers(init?.headers);
        const form = init!.body as FormData;
        gesendeteSzene = JSON.parse(String(form.get('szene')));
        hatModell = form.get('model') instanceof Blob;
        return {
          ok: true,
          json: async () => bakeJobFixture(),
        };
      }) as unknown as typeof fetch,
    );

    const { starteBakeAuftrag } = await import('../src/modules/asset/bake-auftrag');
    const job = await starteBakeAuftrag(new KosmoDoc(), { textureSize: 2048, decimateRatio: 0.5 });

    expect(gesendetePfad).toBe('http://localhost:8600/jobs/bake');
    expect(gesendeteHeaders!.get('X-Kosmo-Token')).toBe('geheim-123');
    expect(hatModell).toBe(true);
    expect(gesendeteSzene).toMatchObject({
      schema: 'kosmo.bake-job/v1',
      params: { unwrap: 'smart-uv', textureSize: 2048, decimateRatio: 0.5 },
    });
    expect(job.job_id).toBe('bake-1752900000-abcdef');
    expect(job.status).toBe('queued');
  });

  it('ohne textureSize/decimateRatio: params trägt nur unwrap (byte-schlank, keine erfundenen Defaults)', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    let gesendeteSzene: Record<string, unknown> | null = null;
    vi.stubGlobal(
      'fetch',
      (async (_url: unknown, init?: RequestInit) => {
        const form = init!.body as FormData;
        gesendeteSzene = JSON.parse(String(form.get('szene')));
        return { ok: true, json: async () => bakeJobFixture() };
      }) as unknown as typeof fetch,
    );

    const { starteBakeAuftrag } = await import('../src/modules/asset/bake-auftrag');
    await starteBakeAuftrag(new KosmoDoc(), {});

    expect((gesendeteSzene as unknown as { params: Record<string, unknown> }).params).toEqual({ unwrap: 'smart-uv' });
  });

  it('eine nicht-ok-Antwort wirft BakeBridgeHttpError mit dem HTTP-Status', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    vi.stubGlobal('fetch', (async () => ({ ok: false, status: 413 })) as unknown as typeof fetch);

    const { starteBakeAuftrag, BakeBridgeHttpError } = await import('../src/modules/asset/bake-auftrag');
    await expect(starteBakeAuftrag(new KosmoDoc(), {})).rejects.toThrow(BakeBridgeHttpError);
  });
});

describe('holeBakeAuftrag — Status-Poll', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parst eine gültige Bridge-Antwort gegen den BakeJob-Vertrag', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    vi.stubGlobal(
      'fetch',
      (async (url: unknown) => {
        expect(String(url)).toBe('http://localhost:8600/jobs/bake-1752900000-abcdef');
        return { ok: true, json: async () => bakeJobFixture({ status: 'kein-blender-worker', message: 'x' }) };
      }) as unknown as typeof fetch,
    );

    const { holeBakeAuftrag } = await import('../src/modules/asset/bake-auftrag');
    const job = await holeBakeAuftrag('bake-1752900000-abcdef');
    expect(job.status).toBe('kein-blender-worker');
  });
});

describe('ladeBakeErgebnis — Sanktion 12 (nur `done` schreibt in den Vault)', () => {
  beforeEach(() => frischerProjektTresor());
  afterEach(() => vi.unstubAllGlobals());

  it('kein-blender-worker: no-op — kein Fetch-Aufruf, kein Vault-Eintrag', async () => {
    const vorLeer = await listeGlb();
    expect(vorLeer).toHaveLength(0);

    let fetchAufrufe = 0;
    vi.stubGlobal('fetch', (async () => {
      fetchAufrufe++;
      throw new Error('darf nicht aufgerufen werden');
    }) as unknown as typeof fetch);

    const { ladeBakeErgebnis } = await import('../src/modules/asset/bake-auftrag');
    const job = bakeJobFixture({
      status: 'kein-blender-worker',
      message:
        'Diese Bridge hat keinen Blender-Worker angeschlossen — der Smart-UV-Unwrap + AO-Bake braucht Blender headless auf der HomeStation (5090). Ein unverändertes Modell wird nicht als gebackt ausgegeben.',
    });

    const ergebnis = await ladeBakeErgebnis(job);

    expect(ergebnis).toBeNull();
    expect(fetchAufrufe).toBe(0);
    expect(await listeGlb()).toHaveLength(0);
  });

  it('queued/running/awaiting_approval/error/cancelled: ebenfalls no-op, kein Fetch', async () => {
    vi.stubGlobal('fetch', (async () => {
      throw new Error('darf nicht aufgerufen werden');
    }) as unknown as typeof fetch);
    const { ladeBakeErgebnis } = await import('../src/modules/asset/bake-auftrag');

    for (const status of ['awaiting_approval', 'queued', 'running', 'error', 'cancelled'] as const) {
      const ergebnis = await ladeBakeErgebnis(bakeJobFixture({ status }));
      expect(ergebnis).toBeNull();
    }
    expect(await listeGlb()).toHaveLength(0);
  });

  it('done OHNE result (Vertragslücke) bleibt no-op statt zu raten', async () => {
    vi.stubGlobal('fetch', (async () => {
      throw new Error('darf nicht aufgerufen werden');
    }) as unknown as typeof fetch);
    const { ladeBakeErgebnis } = await import('../src/modules/asset/bake-auftrag');

    const ergebnis = await ladeBakeErgebnis(bakeJobFixture({ status: 'done' }));
    expect(ergebnis).toBeNull();
    expect(await listeGlb()).toHaveLength(0);
  });

  it('done + result.baked_glb: holt das Artefakt, prüft den GLB-Header, speichert mit der Bake-Titel-Konvention ' +
    '(künstlicher Job/Blob — Container hat keinen echten Blender-Worker, s. Dateikopf)', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    let gesuchterPfad: string | null = null;
    vi.stubGlobal(
      'fetch',
      (async (url: unknown) => {
        gesuchterPfad = String(url);
        return { ok: true, arrayBuffer: async () => miniGlbBytes() };
      }) as unknown as typeof fetch,
    );

    const { ladeBakeErgebnis } = await import('../src/modules/asset/bake-auftrag');
    const job = bakeJobFixture({
      status: 'done',
      created_at: '2026-07-19T12:00:00.000Z',
      // Bare Dateiname wie bei render-result.json ("cam-01.png") — die Bridge
      // serviert Artefakte relativ zum Job-Ordner, kein Pfad-Segment.
      result: { schema: 'kosmo.bake-result/v1', baked_glb: 'model-baked.glb', method: 'smart-uv+ao (worker)' },
    });

    const asset = await ladeBakeErgebnis(job);

    expect(gesuchterPfad).toBe('http://localhost:8600/jobs/bake-1752900000-abcdef/artifacts/model-baked.glb');
    expect(asset).not.toBeNull();
    expect(asset!.title).toBe('Bake-Ergebnis · 2026-07-19');
    // Bestehende Konvention: `speichereGlb` ohne `asset_type` bleibt 'glb_model'
    // (dieselbe Einordnung wie jedes andere importierte GLB) — nichts Neues erfunden.
    expect(asset!.asset_type).toBe('glb_model');

    const bibliothek = await listeGlb();
    expect(bibliothek).toHaveLength(1);
    expect(bibliothek[0]!.id).toBe(asset!.id);
  });

  it('done + abgeschnittenes/gefälschtes Artefakt: pruefeGlbHeader lehnt ab, wirft STATT zu speichern', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    vi.stubGlobal(
      'fetch',
      (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })) as unknown as typeof fetch,
    );

    const { ladeBakeErgebnis } = await import('../src/modules/asset/bake-auftrag');
    const job = bakeJobFixture({
      status: 'done',
      result: { schema: 'kosmo.bake-result/v1', baked_glb: 'kaputt.glb', method: 'smart-uv+ao (worker)' },
    });

    await expect(ladeBakeErgebnis(job)).rejects.toThrow(/abgeschnitten|Bake-Ergebnis abgelehnt/);
    expect(await listeGlb()).toHaveLength(0);
  });
});
