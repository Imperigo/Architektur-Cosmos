import { exportGlb, type AutoKameraStandpunkt, type Sheet } from '@kosmo/kernel';
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

/**
 * Render-Job senden — Szene kommt aus dem Graphen (Prompt, Treue, Samples).
 * K20/A10: `presetId`/`resolution`/`sun`/`komposition` kommen NUR mit, wenn
 * der Render-Node ein Cycles-Preset trägt; `kameras` NUR, wenn ein
 * Auto-Kamera-Node verbunden ist — sonst bleibt der Job byte-identisch zum
 * bisherigen Stand (1600×1000, `cameras: 'auto'`, keine Sonne).
 */
export async function postRenderJob(params: {
  prompt: string;
  faithful: number;
  samples: number;
  nurCycles?: boolean;
  resolution?: readonly [number, number];
  sun?: { azimuth: number; elevation: number };
  komposition?: { seitenverhaeltnis: number; brennweiteMm: number; horizontlinie: number };
  kameras?: AutoKameraStandpunkt[];
}): Promise<JobRecord> {
  const { doc } = useProject.getState();
  const glb = exportGlb(doc, doc.settings.projectName);
  const kameras = params.kameras && params.kameras.length > 0 ? params.kameras : undefined;
  const scene = {
    schema: 'kosmovis.render-scene/v1',
    cameras: kameras
      ? kameras.map((k) => ({ name: k.name, position: k.position, target: k.target, fov: k.fov }))
      : 'auto',
    render: {
      resolution: params.resolution ?? [1600, 1000],
      samples: params.samples,
      faithful: params.faithful,
      ...(params.sun ? { sun: params.sun } : {}),
    },
    style: { mode: 'none', refs: [], prompt: params.prompt },
    // HS5: «Nur Cycles» → vis.skip: true (reines Cycles, keine KI-Veredelung).
    // Die Bridge leitet das in requested_engine "cycles" ab (HS2).
    vis: { skip: params.nurCycles === true, backbone: 'qwen', upscale: false },
    ...(params.komposition ? { komposition: params.komposition } : {}),
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

/**
 * V-H4 (W1, UI-KONZEPT-065 §5) — semantisches Render-Formular: Fassade / Szene
 * / Jahreszeit / Personen / Freitext sind flache Render-Node-`params` (wie
 * `nurCycles`/`preset`), gesetzt über das bestehende `vis.nodeParametrieren`.
 * Diese zwei Funktionen sind die EINE Naht, die den Formular-Zusatz an den
 * eingehenden Prompt hängt — dieselbe Zusammenführung speist sowohl die
 * sichtbare Anzeige (`render-final-prompt`) als auch den tatsächlichen
 * Bridge-Auftrag (Ehrlichkeit/V8: kein stiller Unterschied zwischen Anzeige
 * und Job). KEINE Änderung am render-scene/v1-Vertrag — nur Prompt-Inhalt.
 */
const RENDER_FORMULAR_FELDER = ['formFassade', 'formSzene', 'formJahreszeit', 'formPersonen', 'formFreitext'] as const;

/**
 * H-30 (`docs/SIM-BEFUNDE.md`, 0.6.8) — Szene/Jahreszeit/Personen trugen als
 * Options-`value` bislang die deutschen Prompt-Langtexte selbst (fragil für
 * Automatisierung/Übersetzung, jede Value-Änderung war ein stiller
 * Vertragsbruch). Jetzt: stabile Schlüssel als `value` (NodeCanvas.tsx
 * Render-Formular), diese Anzeige-Map übersetzt zurück in den Prompt-Text —
 * `formFassade` (modellabgeleitet) und `formFreitext` (frei) bleiben
 * unübersetzt. Unbekannte/alte Werte (z.B. aus einem vor H-30 gespeicherten
 * Projekt) fallen ehrlich auf den rohen gespeicherten Text zurück, statt
 * einen kryptischen Schlüssel zu senden.
 */
const RENDER_FORMULAR_UEBERSETZUNG: Partial<Record<(typeof RENDER_FORMULAR_FELDER)[number], Record<string, string>>> = {
  formSzene: {
    strasse: 'Aussenansicht von der Strasse',
    hof: 'Aussenansicht vom Hof',
    vogel: 'Vogelperspektive',
    innen: 'Innenraumansicht',
  },
  formJahreszeit: {
    sommer: 'Sommer',
    winter: 'Winter',
    herbst: 'Herbst',
  },
  formPersonen: {
    keine: 'keine Personen',
    wenige: 'wenige Personen',
    belebt: 'belebte Szene, viele Personen',
  },
};

/** Übersetzt EINEN Formular-Wert (Schlüssel → Prompt-Text) — auch für Stellen
 * ausserhalb von `formularZusatz`, die einen einzelnen Feldwert anzeigen
 * (z.B. die Kuratier-Karten-Bildunterschrift, NodeCanvas.tsx). */
export function formularFeldText(feld: string, wert: string): string {
  return RENDER_FORMULAR_UEBERSETZUNG[feld as (typeof RENDER_FORMULAR_FELDER)[number]]?.[wert] ?? wert;
}

export function formularZusatz(params: Record<string, string | number | boolean>): string {
  return RENDER_FORMULAR_FELDER.map((f) => {
    const roh = String(params[f] ?? '').trim();
    return roh ? formularFeldText(f, roh) : '';
  })
    .filter((t) => t.length > 0)
    .join(', ');
}

/** Eingehender Prompt (aus der bestehenden Prompt-Leitung) + Formular-Zusatz. */
export function kombiniertePrompt(eingang: string, zusatz: string): string {
  return [eingang, zusatz].filter((t) => t.trim().length > 0).join(', ');
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
 * Gemeinsamer Kern von `bildAufsBlatt`/`aufnahmeAufsBlatt` — leerer Bild-Slot
 * zuerst, sonst neuer Slot; ohne Blatt entsteht eines. Alles EIN Undo-Schritt.
 * Gibt den Blattnamen zurück. Nimmt eine FERTIGE dataURL: der Bridge-Weg
 * (`bildAufsBlatt`) holt sie erst per Fetch, der Aufnahme-Weg
 * (`aufnahmeAufsBlatt`) hat sie schon (Viewport-Screenshot, kein Bridge-Job).
 */
function platziereBildAufsBlatt(dataUrl: string, titel: string): string {
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

/**
 * Bild als Blatt-Bürger nach KosmoPublish (C1) — Bridge-Artefakt (Render-Job).
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
  return platziereBildAufsBlatt(dataUrl, titel);
}

/**
 * v0.6.7 P0: Viewport-Aufnahme als Blatt-Bürger — dieselbe Ablage wie
 * `bildAufsBlatt`, aber OHNE Bridge-Fetch (die dataURL liegt schon lokal vor,
 * `vis-runtime.Aufnahme.dataUrl`). Async wie `bildAufsBlatt` (einheitlicher
 * Aufrufer-Weg, `.then().catch()`), auch wenn hier nichts zu awaiten ist.
 * Gibt den Blattnamen zurück.
 */
export async function aufnahmeAufsBlatt(dataUrl: string, titel: string): Promise<string> {
  return platziereBildAufsBlatt(dataUrl, titel);
}
