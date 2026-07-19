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
      /**
       * v0.8.4 W0 (docs/V084-SPEZ.md, E-HDRI): Umgebungslicht/Stimmung als
       * ADDITIVES Schwester-Feld von `sun` — zod ist non-strict, alte
       * Payloads bleiben wortgleich gültig, das Schema-Literal bleibt `/v1`.
       * `preset` spiegelt die drei bestehenden Stimmungs-Presets
       * (kosmo-kernel derive/visgraph.ts VIS_STIMMUNGEN); `hdri` ist eine
       * OPTIONALE URI/Kennung, die erst die HomeStation gegen ihre lokal
       * liegenden Voll-HDRIs auflöst — die App verschifft KEINE .hdr-Assets
       * (prozedurale Previews, ehrliche Container-Grenze).
       */
      environment: z
        .object({
          preset: z.enum(['morgen', 'abend', 'weiss']),
          hdri: z.string().optional(),
          intensitaet: z.number().min(0).max(10).default(1),
          rotationGrad: z.number().min(0).max(360).default(0),
        })
        .optional(),
    })
    .prefault({}),
  style: z
    .object({
      // v0.8.9 §9 E9/E10: 'lineart' additiv — eine Strichzeichnung ist kein
      // KI-Stil-Transfer, sondern Cycles/Freestyle- bzw. Grease-Pencil-
      // Rendering. Vertragskopplung (die Erzwingung selbst baut PBL2 in
      // vis-jobs.ts, hier wird nur der Vertrag dokumentiert): jeder Client,
      // der `mode:'lineart'` sendet, MUSS zugleich `vis.skip:true` setzen —
      // eine Strichzeichnung wartet nie auf einen KI-Veredelungs-Schritt.
      mode: z.enum(['none', 'redux', 'ipadapter', 'lora', 'lineart']).default('none'),
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
