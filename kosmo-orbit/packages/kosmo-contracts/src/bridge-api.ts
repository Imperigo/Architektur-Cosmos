import { z } from 'zod';

/**
 * Kosmo-Bridge — HTTP-API des HomeStation-Servers (tools/homestation-bridge).
 * Die Bridge ist die einzige Naht zwischen KosmoOrbit (Desktop/iPad) und der
 * lokalen Pipeline: Render-Job-Store, Whisper-STT, TTS, Ollama-Proxy,
 * IFC-Validierung. Token-geschützt, nur Büronetz.
 */

export const BridgeHealth = z.object({
  ok: z.boolean(),
  version: z.string(),
  services: z.object({
    jobstore: z.boolean(),
    ollama: z.boolean(),
    stt: z.boolean(),
    tts: z.boolean(),
  }),
  gpu: z
    .object({
      name: z.string().optional(),
      idle: z.boolean().optional(),
    })
    .optional(),
});
export type BridgeHealth = z.infer<typeof BridgeHealth>;

export const SttResponse = z.object({
  text: z.string(),
  /** Roh-Transkript vor der Normalisierung (CH-Dialekt-Hypothese). */
  raw: z.string().optional(),
  language: z.string().optional(),
  duration_s: z.number().optional(),
});
export type SttResponse = z.infer<typeof SttResponse>;

export const TtsRequest = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().default('kosmo-de'),
  speed: z.number().min(0.5).max(2).default(1),
});
export type TtsRequest = z.infer<typeof TtsRequest>;

export const IfcValidationResult = z.object({
  valid: z.boolean(),
  schema: z.string().optional(),
  element_counts: z.record(z.string(), z.number()).optional(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type IfcValidationResult = z.infer<typeof IfcValidationResult>;

/** Pfade der Bridge-Endpoints — eine Quelle für Client UND Server-Tests. */
export const bridgeRoutes = {
  health: '/health',
  jobs: '/jobs',
  job: (id: string) => `/jobs/${id}`,
  jobArtifact: (id: string, name: string) => `/jobs/${id}/artifacts/${name}`,
  stt: '/stt',
  tts: '/tts',
  ollama: '/ollama',
  validateIfc: '/validate-ifc',
} as const;
