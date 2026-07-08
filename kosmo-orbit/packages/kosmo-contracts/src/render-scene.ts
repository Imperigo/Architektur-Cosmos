import { z } from 'zod';

/**
 * kosmovis.render-scene/v1 — Eingabevertrag für einen KosmoVis-Render-Job.
 * Quelle: KosmoVis-ETH-Bericht §5.2 (docs/RENDER_SCENE_CONTRACT.md auf der
 * HomeStation). Minimum = geometry + out; alles andere hat Defaults.
 */

export const GeometryFormat = z.enum(['glb', 'gltf', 'fbx', 'blend', 'ifc']);

export const CameraSpec = z.object({
  name: z.string().optional(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
  fov: z.number().min(10).max(120).default(50),
});

export const RenderScene = z.object({
  schema: z.literal('kosmovis.render-scene/v1').default('kosmovis.render-scene/v1'),
  geometry: z.object({
    path: z.string(),
    format: GeometryFormat,
  }),
  out: z.string(),
  cameras: z
    .union([z.literal('auto'), z.literal('saved'), z.array(CameraSpec).min(1)])
    .default('auto'),
  render: z
    .object({
      resolution: z.tuple([z.number().int().positive(), z.number().int().positive()]).default([1600, 1000]),
      samples: z.number().int().positive().default(128),
      /** 0..1 — ControlNet-Strength: wie streng folgt die KI der Geometrie. */
      faithful: z.number().min(0).max(1).default(0.8),
      sun: z
        .object({
          azimuth: z.number().min(0).max(360),
          elevation: z.number().min(-90).max(90),
        })
        .optional(),
    })
    .prefault({}),
  style: z
    .object({
      mode: z.enum(['none', 'redux', 'ipadapter', 'lora']).default('none'),
      refs: z.array(z.string()).default([]),
      prompt: z.string().default(''),
    })
    .prefault({}),
  vis: z
    .object({
      skip: z.boolean().default(false),
      backbone: z.enum(['qwen', 'flux2-klein', 'flux-krea', 'sdxl']).default('qwen'),
      upscale: z.boolean().default(false),
    })
    .prefault({}),
  /**
   * Bildkomposition (Owner-Befund K20/A10) — Metadaten des angewandten
   * Cycles-Presets (kosmo-kernel derive/render-presets.ts), NUR gesetzt wenn
   * ein Preset aktiv ist. Ehrliche Transparenz statt Blackbox: Seitenverhältnis/
   * Brennweiten-Äquivalent/Horizontlinie fliessen so in den Render-Prompt/Job.
   */
  komposition: z
    .object({
      seitenverhaeltnis: z.number().positive(),
      brennweiteMm: z.number().positive(),
      horizontlinie: z.number().min(0).max(1),
    })
    .optional(),
});

export type RenderScene = z.infer<typeof RenderScene>;
export type CameraSpec = z.infer<typeof CameraSpec>;
