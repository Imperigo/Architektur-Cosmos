import { describe, expect, it } from 'vitest';
import { KosmoProjectManifest, RenderJob, RenderResult, RenderScene } from '../src';

describe('render-scene/v1', () => {
  it('akzeptiert das Minimum (geometry + out) und füllt Defaults', () => {
    const scene = RenderScene.parse({
      geometry: { path: 'model/model.glb', format: 'glb' },
      out: 'renders/job-001',
    });
    expect(scene.schema).toBe('kosmovis.render-scene/v1');
    expect(scene.cameras).toBe('auto');
    expect(scene.render.faithful).toBe(0.8);
    expect(scene.vis.backbone).toBe('qwen');
  });

  it('verweigert faithful ausserhalb 0..1', () => {
    expect(() =>
      RenderScene.parse({
        geometry: { path: 'm.glb', format: 'glb' },
        out: 'x',
        render: { faithful: 1.4 },
      }),
    ).toThrow();
  });
});

describe('render-result/v2', () => {
  it('parst ein Doppel-QA-Resultat', () => {
    const res = RenderResult.parse({
      job_id: 'vis-1751400000-a1b2c3',
      images: ['renders/cam-01.png'],
      qa: {
        style: { style_score: 0.42, passed: true },
        geometry: {
          geometry_fidelity: 0.81,
          spearman: 0.9,
          geom_iou: 0.73,
          passed: true,
        },
        verdict: { passed: true },
      },
    });
    expect(res.qa.geometry?.threshold).toBe(0.65);
    expect(res.qa.style?.method).toBe('dinov3');
  });

  it('erzwingt das Job-ID-Format des HomeStation-Job-Stores', () => {
    expect(() =>
      RenderJob.parse({
        job_id: 'render-42',
        status: 'queued',
        scene: 's.json',
        created_at: '2026-07-02T08:00:00Z',
      }),
    ).toThrow();
    const job = RenderJob.parse({
      job_id: 'vis-1751400000-a1b2c3',
      status: 'awaiting_approval',
      scene: 's.json',
      created_at: '2026-07-02T08:00:00Z',
    });
    expect(job.idle_window_only).toBe(true);
  });
});

describe('kosmo.project/v1', () => {
  it('setzt Review-Gates konservativ (Owner-Kultur: nichts ungefragt nach aussen)', () => {
    const m = KosmoProjectManifest.parse({
      id: 'tkb-hoenggerberg',
      name: 'Bibliothek Hönggerberg',
      created_at: '2026-07-02T08:00:00Z',
      updated_at: '2026-07-02T08:00:00Z',
    });
    expect(m.review_gates.public_release.enabled).toBe(false);
    expect(m.review_gates.paid_cloud_job.requires_human_approval).toBe(true);
    expect(m.contents.model).toBe('model/model.json');
  });
});

describe('bridge embed (E3)', () => {
  it('validiert Request/Response und weist Leeres ab', async () => {
    const { EmbedRequest, EmbedResponse, bridgeRoutes } = await import('../src');
    expect(bridgeRoutes.embed).toBe('/embed');
    expect(EmbedRequest.parse({ texts: ['Beton nach SIA'] }).texts).toHaveLength(1);
    expect(() => EmbedRequest.parse({ texts: [] })).toThrow();
    const res = EmbedResponse.parse({ vectors: [[0.1, 0.2]], model: 'bge-m3' });
    expect(res.vectors[0]).toHaveLength(2);
    expect(() => EmbedResponse.parse({ vectors: [] })).toThrow();
  });
});

describe('V2-Technik Block 1 — Job-Lebenszyklus (additiv, kein Breaking Change)', () => {
  it('parst eine HEUTIGE Bridge-Job-Antwort unverändert (keine neuen Pflichtfelder)', () => {
    // Fixture aus einem Live-Lauf der Fake-Bridge (POST /jobs):
    const heute = RenderJob.parse({
      job_id: 'vis-1783414811-ab095c',
      status: 'queued',
      scene: '/tmp/kosmo-jobs/vis-1783414811-ab095c/render-scene.json',
      approval_token: 'CONFIRMED_RENDER_1c214b97',
      idle_window_only: true,
      created_at: '2026-07-07T08:00:00Z',
    });
    expect(heute.worker).toBeUndefined();
    expect(heute.progress).toBeUndefined();
    expect(heute.requested_engine).toBeUndefined();
  });

  it('nimmt die neuen Lebenszyklus-Felder an (worker/progress/requested_engine/message)', () => {
    const job = RenderJob.parse({
      job_id: 'vis-1783414811-ab095c',
      status: 'running',
      scene: 's.json',
      created_at: '2026-07-07T08:00:00Z',
      worker: 'fake-worker',
      progress: { phase: 'rendern', pct: 0.5 },
      requested_engine: 'cycles',
      message: 'läuft',
    });
    expect(job.progress?.pct).toBe(0.5);
    expect(job.requested_engine).toBe('cycles');
  });

  it('weist ungültigen Fortschritt (pct > 1) und unbekannte Engine ab', async () => {
    const { RenderJobProgress } = await import('../src');
    expect(() => RenderJobProgress.parse({ phase: 'x', pct: 1.4 })).toThrow();
    expect(() =>
      RenderJob.parse({
        job_id: 'vis-1-abcdef',
        status: 'queued',
        scene: 's.json',
        created_at: 'x',
        requested_engine: 'blender',
      }),
    ).toThrow();
  });

  it('kennt approve/cancel/blender-sim-Routen', async () => {
    const { bridgeRoutes } = await import('../src');
    expect(bridgeRoutes.jobApprove('vis-1-abcdef')).toBe('/jobs/vis-1-abcdef/approve');
    expect(bridgeRoutes.jobCancel('vis-1-abcdef')).toBe('/jobs/vis-1-abcdef/cancel');
    expect(bridgeRoutes.jobsBlenderSim).toBe('/jobs/blender-sim');
  });

  it('BridgeHealth parst mit UND ohne embed-Service (rückwärtskompatibel)', async () => {
    const { BridgeHealth } = await import('../src');
    const mit = BridgeHealth.parse({
      ok: true,
      version: '1.0.0',
      services: { jobstore: true, ollama: false, stt: true, tts: true, embed: true },
    });
    expect(mit.services.embed).toBe(true);
    const ohne = BridgeHealth.parse({
      ok: true,
      version: '1.0.0',
      services: { jobstore: true, ollama: false, stt: true, tts: true },
    });
    expect(ohne.services.embed).toBeUndefined();
  });
});

describe('V2-Technik Block 1 — video-splat (eigenes Schema, kein-sfm-worker ehrlich)', () => {
  it('parst den ehrlichen kein-sfm-worker-Record', async () => {
    const { VideoSplatJob } = await import('../src');
    const job = VideoSplatJob.parse({
      job_id: 'vsplat-1783414062-a2c3b1',
      status: 'kein-sfm-worker',
      created_at: '2026-07-07T08:00:00Z',
      message: 'Video→Splat braucht einen SfM-Worker auf der HomeStation.',
    });
    expect(job.kind).toBe('video-splat');
    expect(job.status).toBe('kein-sfm-worker');
  });

  it('weist die vis-/bsim-Job-ID beim video-splat-Record ab', async () => {
    const { VideoSplatJob } = await import('../src');
    expect(() =>
      VideoSplatJob.parse({ job_id: 'vis-1-abcdef', status: 'queued', created_at: 'x' }),
    ).toThrow();
  });
});

describe('kosmo.blender-sim/v1 — Physik wird nie gefakt', () => {
  it('akzeptiert eine Wind-Simulationsszene und füllt Defaults', async () => {
    const { BlenderSimScene } = await import('../src');
    const s = BlenderSimScene.parse({
      art: 'wind',
      geometry: { path: 'model/model.glb' },
      out: 'sims/bsim-001',
    });
    expect(s.schema).toBe('kosmo.blender-sim/v1');
    expect(s.geometry.format).toBe('glb');
    expect(s.params).toEqual({});
  });

  it('verweigert eine unbekannte Simulationsart', async () => {
    const { BlenderSimScene } = await import('../src');
    expect(() =>
      BlenderSimScene.parse({ art: 'erdbeben', geometry: { path: 'm.glb' }, out: 'x' }),
    ).toThrow();
  });

  it('parst den kein-blender-worker-Record und erzwingt das bsim-Präfix', async () => {
    const { BlenderSimJob } = await import('../src');
    const job = BlenderSimJob.parse({
      job_id: 'bsim-1783414062-a2c3b1',
      status: 'kein-blender-worker',
      art: 'sonnenstunden',
      scene: 'blender-sim.json',
      created_at: '2026-07-07T08:00:00Z',
      message: 'Braucht Blender headless auf der HomeStation.',
    });
    expect(job.status).toBe('kein-blender-worker');
    expect(() =>
      BlenderSimJob.parse({
        job_id: 'vis-1-abcdef',
        status: 'queued',
        art: 'wind',
        scene: 's.json',
        created_at: 'x',
      }),
    ).toThrow();
  });
});
