import { z } from 'zod';

/**
 * kosmovis.render-result/v2 — Ergebnisvertrag eines KosmoVis-Render-Jobs
 * inkl. Doppel-QA (Stil + Geometrie-Treue). Quelle: ETH-Bericht §5.2/§6.2:
 * verdict.passed nur wenn BEIDE Gates bestehen; Geometrie-Score =
 * sqrt(spearman × geom_iou) ≥ 0.65, Stil = DINOv3-Cosine ≥ 0.30.
 */

export const StyleQA = z.object({
  style_score: z.number(),
  threshold: z.number().default(0.3),
  passed: z.boolean(),
  method: z.string().default('dinov3'),
});

export const GeometryQA = z.object({
  geometry_fidelity: z.number(),
  spearman: z.number(),
  geom_iou: z.number(),
  threshold: z.number().default(0.65),
  passed: z.boolean(),
  method: z.string().default('depthanything-v2-redepth'),
});

export const RenderResult = z.object({
  schema: z.literal('kosmovis.render-result/v2').default('kosmovis.render-result/v2'),
  job_id: z.string(),
  images: z.array(z.string()),
  ai_variant: z.string().optional(),
  qa: z.object({
    style: StyleQA.optional(),
    geometry: GeometryQA.optional(),
    verdict: z.object({
      passed: z.boolean(),
      reason: z.string().optional(),
    }),
  }),
  timings: z.record(z.string(), z.number()).optional(),
});

export type RenderResult = z.infer<typeof RenderResult>;

/** Job-Record der Datei-Queue (render_job_store.py auf der HomeStation). */
export const RenderJobStatus = z.enum([
  'awaiting_approval',
  'queued',
  'running',
  'done',
  'error',
  'cancelled',
]);

export const RenderJob = z.object({
  job_id: z.string().regex(/^vis-\d+-[0-9a-f]{6}$/),
  status: RenderJobStatus,
  scene: z.string().describe('Pfad zur render-scene.json'),
  approval_token: z.string().startsWith('CONFIRMED_RENDER_').optional(),
  idle_window_only: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string().optional(),
  error: z.string().optional(),
});

export type RenderJob = z.infer<typeof RenderJob>;
export type RenderJobStatus = z.infer<typeof RenderJobStatus>;
