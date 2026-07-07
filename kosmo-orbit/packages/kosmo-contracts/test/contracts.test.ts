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

  it('parst einen done-Record MIT eingebettetem Ergebnis (GET /jobs/{id})', () => {
    // Form des Fake-Workers (main.py: record + eingebettetes render-result.json):
    const done = RenderJob.parse({
      job_id: 'vis-1783414811-ab095c',
      status: 'done',
      scene: 's.json',
      created_at: '2026-07-07T08:00:00Z',
      updated_at: '2026-07-07T08:00:03Z',
      worker: 'fake-worker',
      result: {
        schema: 'kosmovis.render-result/v2',
        job_id: 'vis-1783414811-ab095c',
        images: ['cam-01.png'],
        ai_variant: 'cam-01.png',
        qa: {
          style: { style_score: 0.42, threshold: 0.3, passed: true, method: 'dinov3' },
          geometry: {
            geometry_fidelity: 0.87,
            spearman: 0.93,
            geom_iou: 0.81,
            threshold: 0.65,
            passed: true,
            method: 'fake-worker',
          },
          verdict: { passed: true, reason: 'Fake-Worker (Demo ohne GPU)' },
        },
      },
    });
    // Ohne das `result`-Feld hätte zod es stumm gestrippt (Fable-Review-1):
    expect(done.result?.qa.verdict.passed).toBe(true);
    expect(done.result?.qa.geometry?.method).toBe('fake-worker');
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

  it('nimmt awaiting_approval + approval_token an (Freigabe-Pflicht, HS3-Auflage 4)', async () => {
    const { VideoSplatJob } = await import('../src');
    const job = VideoSplatJob.parse({
      job_id: 'vsplat-1783414062-a2c3b1',
      status: 'awaiting_approval',
      approval_token: 'CONFIRMED_SPLAT_1c214b97',
      created_at: '2026-07-07T08:00:00Z',
    });
    expect(job.status).toBe('awaiting_approval');
    expect(job.approval_token).toBe('CONFIRMED_SPLAT_1c214b97');
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

  it('nimmt awaiting_approval + approval_token an (Freigabe-Pflicht, HS3-Auflage 4)', async () => {
    const { BlenderSimJob } = await import('../src');
    const job = BlenderSimJob.parse({
      job_id: 'bsim-1783414062-a2c3b1',
      status: 'awaiting_approval',
      approval_token: 'CONFIRMED_SIM_1c214b97',
      art: 'wind',
      scene: 'blender-sim.json',
      created_at: '2026-07-07T08:00:00Z',
    });
    expect(job.status).toBe('awaiting_approval');
    expect(job.approval_token).toBe('CONFIRMED_SIM_1c214b97');
  });
});

describe('kosmodev.workorder/v1 (Block 2 / AB1)', () => {
  const auftrag = {
    id: 'auftrag-abc123-x1',
    ts: '2026-07-07T09:00:00Z',
    text: 'Der Wand-Dialog soll den letzten Aufbau vorschlagen',
    quelle: 'getippt',
    station: 'KosmoDesign',
  };

  it('parst eine Workorder und füllt das Schema-Literal als Default', async () => {
    const { Workorder } = await import('../src');
    const wo = Workorder.parse({
      projekt: 'TKB Bibliothek Hönggerberg',
      erzeugt_um: '2026-07-07T09:05:00Z',
      auftraege: [auftrag, { ...auftrag, id: 'auftrag-abc123-x2', quelle: 'kosmo', ort: 'Werkzeugleiste' }],
    });
    expect(wo.schema).toBe('kosmodev.workorder/v1');
    expect(wo.auftraege).toHaveLength(2);
    expect(wo.auftraege[1]?.ort).toBe('Werkzeugleiste');
  });

  it('verweigert eine leere Workorder (min 1 Auftrag) und unbekannte Quellen', async () => {
    const { Workorder } = await import('../src');
    expect(() =>
      Workorder.parse({ projekt: 'P', erzeugt_um: 'x', auftraege: [] }),
    ).toThrow();
    expect(() =>
      Workorder.parse({
        projekt: 'P',
        erzeugt_um: 'x',
        auftraege: [{ ...auftrag, quelle: 'telepathisch' }],
      }),
    ).toThrow();
  });

  it('erzwingt das dev-Präfix am Job-Record (kein Vermischen mit vis-/bsim-)', async () => {
    const { DevJob } = await import('../src');
    const job = DevJob.parse({
      job_id: 'dev-1783414062-a2c3b1',
      status: 'queued',
      created_at: '2026-07-07T09:05:00Z',
      anzahl_auftraege: 2,
    });
    expect(job.kind).toBe('dev-workorder');
    expect(() =>
      DevJob.parse({
        job_id: 'vis-1783414062-a2c3b1',
        status: 'queued',
        created_at: 'x',
        anzahl_auftraege: 1,
      }),
    ).toThrow();
  });

  it('kennt bewusst KEIN awaiting_approval — Absenden ist die Owner-Handlung (E2)', async () => {
    const { DevJobStatus } = await import('../src');
    expect(DevJobStatus.options).toEqual(['queued', 'running', 'done', 'error', 'cancelled']);
    expect(DevJobStatus.safeParse('awaiting_approval').success).toBe(false);
  });

  it('Result verlangt den Worker-Namen — «Simulation» bleibt sichtbar (E5)', async () => {
    const { DevJobResult } = await import('../src');
    expect(() =>
      DevJobResult.parse({
        abgeschlossen_um: '2026-07-07T10:00:00Z',
        ergebnisse: [{ auftrag_id: 'a1', umgesetzt: false }],
      }),
    ).toThrow();
    const fake = DevJobResult.parse({
      worker: 'fake-worker',
      abgeschlossen_um: '2026-07-07T10:00:00Z',
      ergebnisse: [
        { auftrag_id: 'a1', umgesetzt: false, notiz: 'Simulation — keine echte Umsetzung' },
      ],
    });
    expect(fake.ergebnisse[0]?.commit).toBeUndefined();
  });

  it('ein echtes Ergebnis trägt den Commit-Beleg', async () => {
    const { DevJob } = await import('../src');
    const job = DevJob.parse({
      job_id: 'dev-1783414062-a2c3b1',
      status: 'done',
      created_at: '2026-07-07T09:05:00Z',
      updated_at: '2026-07-07T11:00:00Z',
      anzahl_auftraege: 1,
      worker: 'claude-code@homestation',
      result: {
        worker: 'claude-code@homestation',
        abgeschlossen_um: '2026-07-07T11:00:00Z',
        ergebnisse: [
          { auftrag_id: 'a1', umgesetzt: true, commit: 'ab12cd3', notiz: 'Dialog merkt sich den Aufbau' },
        ],
      },
    });
    expect(job.result?.ergebnisse[0]?.umgesetzt).toBe(true);
    expect(job.result?.ergebnisse[0]?.commit).toBe('ab12cd3');
  });

  it('die Dev-Routen sind additiv in bridgeRoutes verankert', async () => {
    const { bridgeRoutes } = await import('../src');
    expect(bridgeRoutes.jobsDev).toBe('/jobs/dev');
    expect(bridgeRoutes.jobDev('dev-1-abcdef')).toBe('/jobs/dev/dev-1-abcdef');
    expect(bridgeRoutes.jobDevClaim('x')).toBe('/jobs/dev/x/claim');
    expect(bridgeRoutes.jobDevResult('x')).toBe('/jobs/dev/x/result');
    expect(bridgeRoutes.jobDevCancel('x')).toBe('/jobs/dev/x/cancel');
  });
});
