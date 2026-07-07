import { exportGlb, type Sheet } from '@kosmo/kernel';
import { RenderJob, bridgeRoutes } from '@kosmo/contracts';
import { useProject } from '../../state/project-store';
import type { NodeLaufStatus } from './vis-runtime';

/**
 * Bridge-Jobs für KosmoVis (P2/HS3) — ein Weg für Graph UND Einfach-Ansicht:
 * Modell als GLB an /jobs (render-scene/v1), Status holen, Bild aufs Blatt.
 * Alle Antworten laufen durch den `@kosmo/contracts`-Vertrag (`safeParse` statt
 * blindem `as`-Cast); jeder Bridge-Fetch trägt den Token konditional.
 */

export type JobQa = NonNullable<RenderJob['result']>['qa'];
/** Der validierte Job-Record — der Vertrag ist die EINE Wahrheit (HS1). */
export type JobRecord = RenderJob;

/**
 * Typisierter HTTP-Fehler der Bridge (KLEIN 8). Ein blankes `new Error(status)`
 * verschluckt die Ursache: der Poll fängt es still weg und ein falscher Token
 * (401/403) tauchte früher NUR als 10-Minuten-Timeout auf. Mit dem `status`-Feld
 * kann der Aufrufer einen Auth-Fehler sofort von einem transienten Netzfehler
 * trennen und ehrlich anzeigen.
 */
export class BridgeHttpError extends Error {
  readonly status: number;
  constructor(status: number, kontext: string) {
    super(`${kontext}: ${status}`);
    this.name = 'BridgeHttpError';
    this.status = status;
  }
}

/** True, wenn der Fehler eine Ablehnung wegen Token/Rechten ist (401/403). */
export function istAuthFehler(err: unknown): err is BridgeHttpError {
  return err instanceof BridgeHttpError && (err.status === 401 || err.status === 403);
}

/**
 * True, wenn die konfigurierte Bridge-URL eine LAN-IP ist, die die CSP
 * (`connect-src`) nicht deckt (KLEIN 9). Erlaubt sind nur `localhost`/
 * `127.0.0.1`; eine IPv4 wie `192.168.x.x` wird still geblockt und sieht dann
 * wie «offline» aus. Die CSP kennt keine CIDR-/Oktett-Wildcards ohne weites
 * Aufreissen — darum wird sie NICHT geschwächt, sondern der Fall benannt.
 */
export function bridgeVermutlichCspGeblockt(): boolean {
  try {
    const host = new URL(bridgeBase()).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  } catch {
    return false;
  }
}

export function bridgeBase(): string {
  return (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
}

/**
 * Bridge-Token aus dem lokalen Speicher (`kosmo.bridge.token`). Ist die Bridge
 * token-geschützt und der Client sendet keinen Header, sperrt sie die eigene
 * App aus (HS1-Befund) — darum hängt `bridgeFetch` ihn an JEDEN Aufruf.
 */
export function bridgeToken(): string {
  return (localStorage.getItem('kosmo.bridge.token') ?? '').trim();
}

/** Ein Fetch mit konditionalem `X-Kosmo-Token`-Header — die einzige Naht. */
export function bridgeFetch(pfad: string, init?: RequestInit): Promise<Response> {
  const token = bridgeToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('X-Kosmo-Token', token);
  return fetch(`${bridgeBase()}${pfad}`, { ...init, headers });
}

/**
 * EIN gemeinsamer Status-Mapper (HS3) für beide Poll-Stellen — die frühere
 * Doppelung in NodeCanvas und VisWorkspace stirbt hier. Übersetzt den
 * Bridge-Job-Zustand ehrlich in den Client-Lebenszyklus.
 */
export function mappeJobStatus(record: { status: string; result?: unknown }): NodeLaufStatus {
  if (record.result) return 'fertig';
  switch (record.status) {
    case 'awaiting_approval':
      return 'wartetFreigabe';
    case 'queued':
      return 'wartetGpu';
    case 'running':
      return 'rendert';
    case 'done':
      return 'fertig';
    case 'error':
      return 'fehler';
    case 'cancelled':
      return 'abgebrochen';
    default:
      // Unbekannter/neuer Bridge-Status: ein Wartezustand ist ehrlicher als
      // «rendert» — wir behaupten keine laufende Rechnung (Fable-Auflage 7).
      return 'wartetGpu';
  }
}

/** Render-Job senden — Szene kommt aus dem Graphen (Prompt, Treue, Samples). */
export async function postRenderJob(params: {
  prompt: string;
  faithful: number;
  samples: number;
  nurCycles?: boolean;
}): Promise<JobRecord> {
  const { doc } = useProject.getState();
  const glb = exportGlb(doc, doc.settings.projectName);
  const scene = {
    schema: 'kosmovis.render-scene/v1',
    cameras: 'auto',
    render: { resolution: [1600, 1000], samples: params.samples, faithful: params.faithful },
    style: { mode: 'none', refs: [], prompt: params.prompt },
    // HS5: «Nur Cycles» → vis.skip: true (reines Cycles, keine KI-Veredelung).
    // Die Bridge leitet das in requested_engine "cycles" ab (HS2).
    vis: { skip: params.nurCycles === true, backbone: 'qwen', upscale: false },
    out: '',
    geometry: { path: '', format: 'glb' },
  };
  const form = new FormData();
  form.append('scene', JSON.stringify(scene));
  form.append('model', new Blob([glb], { type: 'model/gltf-binary' }), 'model.glb');
  const res = await bridgeFetch(bridgeRoutes.jobs, { method: 'POST', body: form });
  if (!res.ok) throw new BridgeHttpError(res.status, 'Bridge antwortet mit');
  return parseJob(await res.json());
}

export async function holeJob(jobId: string): Promise<JobRecord> {
  const res = await bridgeFetch(bridgeRoutes.job(jobId));
  if (!res.ok) throw new BridgeHttpError(res.status, `Job ${jobId}`);
  return parseJob(await res.json());
}

/** Wartenden Job freigeben (nur bei aktiver Freigabe-Pflicht) — braucht den
 * approval_token aus dem Create-Response. */
export async function freigebenJob(jobId: string, approvalToken: string): Promise<JobRecord> {
  const res = await bridgeFetch(bridgeRoutes.jobApprove(jobId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_token: approvalToken }),
  });
  if (!res.ok) throw new BridgeHttpError(res.status, `Freigabe ${jobId}`);
  return parseJob(await res.json());
}

/** Kooperativer Abbruch — awaiting_approval/queued/running → cancelled. */
export async function abbrechenJob(jobId: string): Promise<JobRecord> {
  const res = await bridgeFetch(bridgeRoutes.jobCancel(jobId), { method: 'POST' });
  if (!res.ok) throw new BridgeHttpError(res.status, `Abbruch ${jobId}`);
  return parseJob(await res.json());
}

/** Validiert eine Bridge-Antwort gegen den Vertrag; `safeParse` statt `as`. */
function parseJob(raw: unknown): JobRecord {
  const geprueft = RenderJob.safeParse(raw);
  if (!geprueft.success) {
    throw new Error('Bridge-Antwort passt nicht zum Render-Job-Vertrag');
  }
  return geprueft.data;
}

export function bildUrl(jobId: string, imageName: string): string {
  return `${bridgeBase()}${bridgeRoutes.jobArtifact(jobId, imageName)}`;
}

/**
 * Artefakt-Bild als Blob holen — über `bridgeFetch` (trägt den Token, liegt im
 * connect-src der CSP). Ein direktes `<img src="http://…">` scheitert doppelt:
 * es kann keinen Token-Header tragen UND wird von `img-src` der CSP geblockt
 * (HS3-Nachbesserung/Fable-Auflage 1). Der Aufrufer macht daraus eine
 * `blob:`-URL (img-src erlaubt `blob:`) oder eine dataURL.
 */
export async function bildBlob(jobId: string, imageName: string): Promise<Blob> {
  const res = await bridgeFetch(bridgeRoutes.jobArtifact(jobId, imageName), { cache: 'no-store' });
  if (!res.ok) throw new BridgeHttpError(res.status, `Bild ${imageName}`);
  return res.blob();
}

/**
 * Bild als Blatt-Bürger nach KosmoPublish (C1) — leerer Bild-Slot zuerst,
 * sonst neuer Slot; ohne Blatt entsteht eines. Alles EIN Undo-Schritt.
 * Gibt den Blattnamen zurück.
 */
export async function bildAufsBlatt(jobId: string, imageName: string, titel: string): Promise<string> {
  // Über bridgeFetch (Token-Header + connect-src) statt rohem fetch — sonst
  // sperrt eine token-geschützte Bridge das Blatt-Einbetten aus (Fable-Auflage 1).
  const blob = await bildBlob(jobId, imageName);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Bild nicht lesbar'));
    r.readAsDataURL(blob);
  });
  const { doc, runCommand, history } = useProject.getState();
  history.beginGroup();
  try {
    const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
    let sheet = sheets.find((s) => (s.bilder ?? []).some((b) => !b.assetId)) ?? sheets[0];
    if (!sheet) {
      const res = runCommand('publish.blattErstellen', { name: 'Renderblatt', format: 'A1', orientation: 'quer' });
      sheet = doc.get<Sheet>((res.patches[0] as { id: string }).id)!;
    }
    const leer = (sheet.bilder ?? []).find((b) => !b.assetId);
    if (leer) {
      runCommand('publish.bildFuellen', { sheetId: sheet.id, bildId: leer.id, dataUrl });
    } else {
      runCommand('publish.bildPlatzieren', { sheetId: sheet.id, x: 40, y: 40, w: 160, dataUrl, title: titel });
    }
    return sheet.name;
  } finally {
    history.endGroup();
  }
}
