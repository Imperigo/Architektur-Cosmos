import { afterEach, describe, expect, it, vi } from 'vitest';
import { RENDER_PRESETS, visPresetById } from '@kosmo/kernel';
import { memoKey } from '../src/modules/vis/vis-runtime';

/**
 * Owner-Befund K20/A10 — KosmoVis-Automatik, App-Seite: Cycles-Preset-Tabelle
 * (Kernel) fliesst unverändert in den render-scene/v1-Job (`postRenderJob`,
 * s. `src/modules/vis/vis-jobs.ts`); ohne Preset/Kamera-Node bleibt der Job
 * byte-identisch zum Stand vor K20/A10 (1600×1000, `cameras: 'auto'`).
 */

function setzeLocalStorage(werte: Record<string, string> = {}): void {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => werte[k] ?? null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
}

describe('RENDER_PRESETS (Kernel-Datentabelle, App-seitig konsumiert)', () => {
  it('drei Presets, jedes mit Samples/Auflösung/Sonne/Komposition/Licht-Beschreibung', () => {
    expect(RENDER_PRESETS).toHaveLength(3);
    for (const p of RENDER_PRESETS) {
      expect(p.render.samples).toBeGreaterThan(0);
      expect(p.render.resolution).toHaveLength(2);
      expect(typeof p.render.sun.azimuth).toBe('number');
      expect(typeof p.render.sun.elevation).toBe('number');
      expect(p.komposition.seitenverhaeltnis).toBeGreaterThan(0);
      expect(p.komposition.brennweiteMm).toBeGreaterThan(0);
      expect(p.licht.length).toBeGreaterThan(0);
    }
  });

  it('«Nacht» hat spürbar mehr Samples als «Entwurf schnell» (Qualität vs. Tempo)', () => {
    expect(visPresetById('nacht').render.samples).toBeGreaterThan(visPresetById('entwurf-schnell').render.samples);
  });
});

describe('postRenderJob — Szene-Payload (byte-identisch ohne Preset, additiv mit)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ohne presetId/resolution/sun/komposition/kameras: Payload identisch zum bisherigen Stand', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    let gesendeteSzene: Record<string, unknown> | null = null;
    vi.stubGlobal('fetch', (async (_url: unknown, init?: RequestInit) => {
      const form = init!.body as FormData;
      gesendeteSzene = JSON.parse(String(form.get('scene')));
      return {
        ok: true,
        json: async () => ({ job_id: 'vis-1751400000-a1b2c3', status: 'queued', scene: 's.json', created_at: '2026-07-08T00:00:00Z', idle_window_only: true }),
      };
    }) as unknown as typeof fetch);

    const { postRenderJob } = await import('../src/modules/vis/vis-jobs');
    await postRenderJob({ prompt: 'Testprompt', faithful: 0.8, samples: 128 });

    expect(gesendeteSzene).not.toBeNull();
    const szene = gesendeteSzene as unknown as {
      cameras: string;
      render: Record<string, unknown>;
      komposition?: unknown;
    };
    expect(szene.cameras).toBe('auto');
    expect(szene.render['resolution']).toEqual([1600, 1000]);
    expect(szene.render['sun']).toBeUndefined();
    expect(szene.komposition).toBeUndefined();
  });

  it('mit Preset + Auto-Kamera-Standpunkten: Resolution/Sonne/Komposition/Kameras fliessen in den Job', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    let gesendeteSzene: Record<string, unknown> | null = null;
    vi.stubGlobal('fetch', (async (_url: unknown, init?: RequestInit) => {
      const form = init!.body as FormData;
      gesendeteSzene = JSON.parse(String(form.get('scene')));
      return {
        ok: true,
        json: async () => ({ job_id: 'vis-1751400000-a1b2c3', status: 'queued', scene: 's.json', created_at: '2026-07-08T00:00:00Z', idle_window_only: true }),
      };
    }) as unknown as typeof fetch);

    const preset = visPresetById('praesentation');
    const { postRenderJob } = await import('../src/modules/vis/vis-jobs');
    await postRenderJob({
      prompt: 'Abendstimmung',
      faithful: 0.8,
      samples: preset.render.samples,
      resolution: preset.render.resolution,
      sun: preset.render.sun,
      komposition: preset.komposition,
      kameras: [
        { name: 'Eingang', position: [5, 1.6, 8], target: [5, 1.2, -3], fov: 55, begruendung: 'Vorschlag aus dem Modell' },
      ],
    });

    const szene = gesendeteSzene as unknown as {
      cameras: { name: string; position: number[]; target: number[]; fov: number }[];
      render: { resolution: number[]; sun: { azimuth: number; elevation: number } };
      komposition: { seitenverhaeltnis: number; brennweiteMm: number; horizontlinie: number };
    };
    expect(szene.render.resolution).toEqual([1920, 1200]);
    expect(szene.render.sun).toEqual({ azimuth: 200, elevation: 32 });
    expect(szene.komposition).toEqual({ seitenverhaeltnis: 1.6, brennweiteMm: 50, horizontlinie: 0.42 });
    expect(szene.cameras).toEqual([{ name: 'Eingang', position: [5, 1.6, 8], target: [5, 1.2, -3], fov: 55 }]);
    // Ehrlichkeit: keine `begruendung` im Job — die ist reine UI-Erklärung.
    expect(szene.cameras[0]).not.toHaveProperty('begruendung');
  });
});

describe('memoKey mit presetId (K20/A10 — sonst zeigt der Node nach Preset-Wechsel fälschlich «aktuell»)', () => {
  const basis = { prompt: 'Morgenlicht', faithful: 0.8, samples: 128 };

  it('ändert sich, wenn presetId wechselt', () => {
    const ohne = memoKey(basis);
    const mit = memoKey({ ...basis, presetId: 'praesentation' });
    expect(ohne).not.toBe(mit);
  });

  it('fehlendes presetId verhält sich wie kein Preset (rückwärtskompatibel)', () => {
    expect(memoKey(basis)).toBe(memoKey({ ...basis, presetId: undefined }));
  });

  it('zwei verschiedene Presets ergeben verschiedene Schlüssel', () => {
    expect(memoKey({ ...basis, presetId: 'entwurf-schnell' })).not.toBe(memoKey({ ...basis, presetId: 'nacht' }));
  });
});
