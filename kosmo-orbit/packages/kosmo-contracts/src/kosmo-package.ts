import { z } from 'zod';

/**
 * .kosmo-Projektpaket — das universelle Austauschformat (Zip).
 * Kompatibel gedacht zur kosmo.project.json-Kultur des bestehenden
 * examples/kosmo-projects/kosmo-demo-001 (Module, review_gates, rights_status).
 */

export const ReviewGate = z.object({
  enabled: z.boolean().default(false),
  requires_human_approval: z.boolean().default(true),
});

export const KosmoProjectManifest = z.object({
  schema: z.literal('kosmo.project/v1').default('kosmo.project/v1'),
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  location: z
    .object({
      address: z.string().optional(),
      canton: z.string().optional(),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
  phase: z
    .enum(['wettbewerb', 'vorprojekt', 'baueingabe', 'bauprojekt', 'ausfuehrung'])
    .default('wettbewerb'),
  modules: z
    .object({
      prepare: z.boolean().default(true),
      design: z.boolean().default(true),
      data: z.boolean().default(true),
      vis: z.boolean().default(true),
      publish: z.boolean().default(true),
    })
    .prefault({}),
  review_gates: z
    .object({
      public_release: ReviewGate.default({ enabled: false, requires_human_approval: true }),
      external_upload: ReviewGate.default({ enabled: false, requires_human_approval: true }),
      paid_cloud_job: ReviewGate.default({ enabled: true, requires_human_approval: true }),
    })
    .prefault({}),
  /** Dateien im Paket, relativ zum Zip-Root. */
  contents: z
    .object({
      model: z.string().default('model/model.json'),
      journal: z.string().default('memory/journal.jsonl'),
      brief: z.string().optional(),
      ifc: z.string().optional(),
      assets_dir: z.string().default('assets/'),
      plans_dir: z.string().default('plans/'),
      renders_dir: z.string().default('renders/'),
    })
    .prefault({}),
});
export type KosmoProjectManifest = z.infer<typeof KosmoProjectManifest>;
