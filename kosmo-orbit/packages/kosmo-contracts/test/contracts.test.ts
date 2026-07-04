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
