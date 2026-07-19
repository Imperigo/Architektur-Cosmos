import { exportGlb, type KosmoDoc } from '@kosmo/kernel';
import { BakeJob, bridgeRoutes } from '@kosmo/contracts';
import { speichereGlb, type KosmoAsset } from '../../state/asset-bibliothek';
import { pruefeGlbHeader } from '../../state/glb-guard';

/**
 * Bake-Rückweg (PBL4-089, `docs/V089-SPEZ.md` §9 E9/E17, Sanktion 12) —
 * post/hole/laden für den `kosmo.bake-job/v1`-Vertrag (Smart-UV-Unwrap +
 * AO-Bake, `packages/kosmo-contracts/src/bake-job.ts`). BEWUSST kein Import
 * aus `vis-jobs.ts` (das Paket ist parallel PBL2s Dateikreis) — ein eigener,
 * kleiner `bakeFetch`-Helfer spiegelt nur, was für DIESEN Job gebraucht wird
 * (Token-Header, JSON/Multipart), keine geteilte Naht.
 *
 * Ehrlichkeitsgrenze (Sanktion 12, `bake-job.ts`-Kommentar): ein Bake ist
 * eine GEOMETRIE-Klasse mit Optimierungs-Behauptung — anders als ein
 * sichtbar markiertes Platzhalter-Bild wäre ein unverändertes GLB, das als
 * «gebackt» im Vault landet, eine UNSICHTBARE Falschbehauptung. Darum
 * schreibt `ladeBakeErgebnis` NUR bei `status === 'done'` einen Asset — bei
 * JEDEM anderen Status (insbesondere `kein-blender-worker`) passiert am
 * Vault NICHTS (kein-op, kein Throw — der Aufrufer entscheidet, wie er den
 * Status sonst anzeigt).
 */

/** Bridge-Basis-URL — dieselbe `localStorage`-Naht wie `vis-jobs.ts`, aber
 * eine eigene, unabhängige Kopie (kein Import, s. Dateikopf). */
function bridgeBase(): string {
  return (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
}

/** Bridge-Token — eigene Kopie derselben `localStorage`-Naht wie oben. */
function bridgeToken(): string {
  return (localStorage.getItem('kosmo.bridge.token') ?? '').trim();
}

/** Typisierter HTTP-Fehler der Bridge — eigene, schlanke Kopie von
 * `vis-jobs.ts::BridgeHttpError` (kein Import, s. Dateikopf): der `status`
 * lässt einen Aufrufer 401/403 von einem transienten Netzfehler trennen. */
export class BakeBridgeHttpError extends Error {
  readonly status: number;
  constructor(status: number, kontext: string) {
    super(`${kontext}: ${status}`);
    this.name = 'BakeBridgeHttpError';
    this.status = status;
  }
}

/** Ein Fetch mit konditionalem `X-Kosmo-Token`-Header — die einzige Naht
 * dieses Moduls zur Bridge. */
function bakeFetch(pfad: string, init?: RequestInit): Promise<Response> {
  const token = bridgeToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('X-Kosmo-Token', token);
  return fetch(`${bridgeBase()}${pfad}`, { ...init, headers });
}

/** Validiert eine Bridge-Antwort gegen den `BakeJob`-Vertrag — `safeParse`
 * statt eines blinden `as`-Casts. */
function parseBakeJob(raw: unknown): BakeJob {
  const geprueft = BakeJob.safeParse(raw);
  if (!geprueft.success) {
    throw new Error('Bridge-Antwort passt nicht zum Bake-Job-Vertrag (kosmo.bake-job/v1)');
  }
  return geprueft.data;
}

export interface BakeAuftragParams {
  /** Zielgrösse der gebackenen Textur (Pixel, quadratisch) — optional, Bridge/Worker wählen sonst einen Default. */
  textureSize?: number;
  /** Decimate-Verhältnis 0–1 (0 = keine Reduktion) — optional. */
  decimateRatio?: number;
}

/**
 * Sendet das aktuelle Modell (`exportGlb`) als Bake-Auftrag — Smart-UV-
 * Unwrap + AO-Bake, optional mit Textur-Grösse/Decimate-Verhältnis. Der
 * Job startet bei `awaiting_approval`/`queued`; im Container-/Fake-Betrieb
 * endet er SOFORT (nächster Poll) auf `kein-blender-worker` (Sanktion 12,
 * `main.py::_fake_worker_step`, `kind:'bake'`-Zweig).
 */
export async function starteBakeAuftrag(doc: KosmoDoc, params: BakeAuftragParams = {}): Promise<BakeJob> {
  const glb = exportGlb(doc);
  const scene = {
    schema: 'kosmo.bake-job/v1',
    geometry: { path: '', format: 'glb' },
    params: {
      unwrap: 'smart-uv',
      ...(params.textureSize !== undefined ? { textureSize: params.textureSize } : {}),
      ...(params.decimateRatio !== undefined ? { decimateRatio: params.decimateRatio } : {}),
    },
    out: '',
  };
  const form = new FormData();
  form.append('szene', JSON.stringify(scene));
  form.append('model', new Blob([glb], { type: 'model/gltf-binary' }), 'model.glb');
  const res = await bakeFetch(bridgeRoutes.jobsBake, { method: 'POST', body: form });
  if (!res.ok) throw new BakeBridgeHttpError(res.status, 'Bake-Auftrag: Bridge antwortet mit');
  return parseBakeJob(await res.json());
}

/** Aktuellen Job-Stand holen (Poll-Grundlage für den Aufrufer). */
export async function holeBakeAuftrag(jobId: string): Promise<BakeJob> {
  const res = await bakeFetch(bridgeRoutes.job(jobId));
  if (!res.ok) throw new BakeBridgeHttpError(res.status, `Bake-Auftrag ${jobId}`);
  return parseBakeJob(await res.json());
}

/** Kooperativer Abbruch — greift, solange der Job noch `awaiting_approval`/
 * `queued`/`running` ist (Bridge-Vertrag, `bridgeRoutes.jobCancel`). */
export async function abbrechenBakeAuftrag(jobId: string): Promise<BakeJob> {
  const res = await bakeFetch(bridgeRoutes.jobCancel(jobId), { method: 'POST' });
  if (!res.ok) throw new BakeBridgeHttpError(res.status, `Bake-Abbruch ${jobId}`);
  return parseBakeJob(await res.json());
}

/**
 * Übernimmt das Bake-Ergebnis in die Asset-Bibliothek — SANKTION 12: nur bei
 * `status === 'done'` UND vorhandenem `result.baked_glb`. Bei jedem anderen
 * Status (insbesondere `kein-blender-worker`) passiert NICHTS — kein Fetch,
 * kein `speichereGlb`, kein Vault-Schreiben — die Funktion gibt `null`
 * zurück statt zu werfen, damit ein Poll-Loop sie gefahrlos nach jedem
 * Status-Wechsel aufrufen kann. Das Artefakt läuft durch denselben
 * `pruefeGlbHeader`-Wächter wie ein manueller GLB-Import (B7-Härtung) — ein
 * abgeschnittenes/gefälschtes Artefakt schreibt ebenfalls nichts.
 *
 * Titel-Konvention: `Bake-Ergebnis · <ISO-Datum aus job.created_at>`:
 * `asset_type` bleibt der bestehende Default aus `speichereGlb`
 * (`'glb_model'`) — dieselbe Konvention wie jedes andere importierte GLB,
 * nichts Neues erfunden.
 */
export async function ladeBakeErgebnis(job: BakeJob): Promise<KosmoAsset | null> {
  if (job.status !== 'done' || !job.result?.baked_glb) return null;
  const res = await bakeFetch(bridgeRoutes.jobArtifact(job.job_id, job.result.baked_glb), { cache: 'no-store' });
  if (!res.ok) throw new BakeBridgeHttpError(res.status, `Bake-Artefakt ${job.result.baked_glb}`);
  const bytes = await res.arrayBuffer();
  const guard = pruefeGlbHeader(bytes);
  if (!guard.ok) {
    throw new Error(`Bake-Ergebnis abgelehnt: ${guard.fehler}`);
  }
  const datum = new Date(job.created_at).toISOString().slice(0, 10);
  const datei = new File([bytes], `${job.job_id}.glb`, { type: 'model/gltf-binary' });
  return speichereGlb(datei, { title: `Bake-Ergebnis · ${datum}` });
}
