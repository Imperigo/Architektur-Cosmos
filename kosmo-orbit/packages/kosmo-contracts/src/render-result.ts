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
  // Matrix-C-1-Fund (v0.9.0, 22.07.2026): der ComfyUI-Worker schreibt diesen
  // ehrlichen Status seit E-R (kein Checkpoint/ComfyUI nicht erreichbar) —
  // er fehlte hier aber, wodurch `RenderJob.safeParse` in der App JEDE
  // solche Antwort ablehnte und der Poll den Zustand still verschluckte.
  // Gleiches Muster wie `kein-blender-worker` in `blender-sim.ts`.
  'kein-render-worker',
]);

/**
 * Fortschritts-Etappe eines laufenden Jobs. Der Worker schreibt sie in den
 * Record; der Client zeigt Phase/Prozent am Node. `pct` in 0..1.
 */
export const RenderJobProgress = z.object({
  phase: z.string(),
  pct: z.number().min(0).max(1),
});
export type RenderJobProgress = z.infer<typeof RenderJobProgress>;

export const RenderJob = z.object({
  job_id: z.string().regex(/^vis-\d+-[0-9a-f]{6}$/),
  status: RenderJobStatus,
  scene: z.string().describe('Pfad zur render-scene.json'),
  approval_token: z.string().startsWith('CONFIRMED_RENDER_').optional(),
  idle_window_only: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string().optional(),
  error: z.string().optional(),
  // V2-Technik Block 1 (additiv, alle optional — die heutige Bridge liefert
  // sie noch nicht, echte/erweiterte Worker tragen sie ein):
  /** Wer den Job übernommen hat, z. B. "fake-worker" oder ein echter Worker. */
  worker: z.string().optional(),
  /** Laufende Etappe; der Client zeigt Phase + Prozent. */
  progress: RenderJobProgress.optional(),
  /** Was BESTELLT wurde (nicht was gerendert wurde) — Cycles vs. KI-Veredelung. */
  requested_engine: z.enum(['cycles', 'ki']).optional(),
  /** Hält fest, was BESTELLT wurde (nicht was gerendert wurde) — der
   * style.mode-Wert aus der render-scene.json, additiv analog
   * requested_engine (v0.8.9 §9 E9). Optional, weil die heutige Bridge es
   * noch nicht liefert — alte Records bleiben wortgleich gültig. */
  requested_style: z.enum(['none', 'redux', 'ipadapter', 'lora', 'lineart']).optional(),
  /** Menschlicher Zusatztext (z. B. Abbruch-/Wartegrund), UI-lesbar. */
  message: z.string().optional(),
  /** Das eingebettete Ergebnis, sobald `done` — `GET /jobs/{id}` liefert es
   * mit (die Bridge bettet `render-result.json` in den Record ein). Ohne
   * dieses Feld würde `RenderJob.parse()` es stumm strippen (Fable-Review-1). */
  result: RenderResult.optional(),
});

export type RenderJob = z.infer<typeof RenderJob>;
export type RenderJobStatus = z.infer<typeof RenderJobStatus>;
