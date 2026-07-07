import { z } from 'zod';

/**
 * kosmo.blender-sim/v1 — Eingabevertrag für eine Blender-Simulation auf der
 * HomeStation (Wind / Sonnenstunden / Gebäude-Energie). Getrennt vom
 * Render-Vertrag, weil hier eine HARTE Ehrlichkeitsgrenze gilt: ein
 * Platzhalter-BILD ist sichtbar ein Platzhalter (markiert), eine
 * Platzhalter-SIMULATIONSZAHL sähe aus wie ein Analyseergebnis und könnte
 * eine Bau-Entscheidung verseuchen. Darum wird Physik NIE gefakt — ohne
 * Blender-Worker endet der Job beweisbar als `kein-blender-worker`
 * (siehe `BlenderSimJobStatus` + tools/homestation-bridge).
 */

export const BlenderSimArt = z.enum(['wind', 'sonnenstunden', 'gebaeude-energie']);
export type BlenderSimArt = z.infer<typeof BlenderSimArt>;

export const BlenderSimScene = z.object({
  schema: z.literal('kosmo.blender-sim/v1').default('kosmo.blender-sim/v1'),
  art: BlenderSimArt,
  geometry: z.object({
    path: z.string(),
    format: z.literal('glb').default('glb'),
  }),
  /** Art-spezifische Parameter (z. B. Windrichtung, Datum/Ort). Generisch,
   * damit neue Simulationsarten ohne Schema-Bruch andocken. */
  params: z.record(z.string(), z.unknown()).default({}),
  out: z.string(),
});
export type BlenderSimScene = z.infer<typeof BlenderSimScene>;

/**
 * Job-Record der Blender-Simulation. Eigenes Präfix `bsim-` (die `vis-`-Regex
 * von RenderJob bleibt unangetastet). `kein-blender-worker` ist die ehrliche
 * Grenze im Container/ohne HomeStation — kein vorgetäuschtes Ergebnis.
 */
export const BlenderSimJobStatus = z.enum([
  'queued',
  'running',
  'done',
  'error',
  'cancelled',
  'kein-blender-worker',
]);
export type BlenderSimJobStatus = z.infer<typeof BlenderSimJobStatus>;

export const BlenderSimJob = z.object({
  job_id: z.string().regex(/^bsim-\d+-[0-9a-f]{6}$/),
  status: BlenderSimJobStatus,
  /** Job-Art-Marker; der Fake-Worker dispatcht über `kind` (Symmetrie zu
   * VideoSplatJob, Fable-Review-1). */
  kind: z.literal('blender-sim').default('blender-sim'),
  art: BlenderSimArt,
  scene: z.string().describe('Pfad zur blender-sim.json'),
  created_at: z.string(),
  updated_at: z.string().optional(),
  error: z.string().optional(),
  /** Ehrliche Begründung, v. a. bei `kein-blender-worker`. */
  message: z.string().optional(),
  worker: z.string().optional(),
});
export type BlenderSimJob = z.infer<typeof BlenderSimJob>;
