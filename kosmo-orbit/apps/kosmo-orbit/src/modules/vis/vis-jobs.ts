import { z } from 'zod';
import { evaluiereGraph, exportGlb, type AutoKameraStandpunkt, type Sheet, type VisGraph } from '@kosmo/kernel';
import { RenderJob, BlenderSimJob, BakeJob, bridgeRoutes, type BlenderSimArt } from '@kosmo/contracts';
import { melde, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { memoKey, useVisRuntime, type NodeLaufStatus } from './vis-runtime';

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
  /**
   * PC1 (`docs/V084-SPEZ.md` §5 W2, C-17) — additiv, spiegelt den seit W0
   * erweiterten `render-scene/v1`-Vertrag (`kosmo-contracts` `render.
   * environment`, E4). Kommt NUR mit, wenn die STIMMUNG-Insel einen Preset
   * gewählt hat — ohne Auswahl bleibt der Job byte-identisch zum bisherigen
   * Stand (kein `environment`-Feld, wie vor v0.8.4).
   */
  environment?: { preset: 'morgen' | 'abend' | 'weiss' };
  /**
   * v0.8.4 PC2 (`docs/V084-SPEZ.md` E6/C-18) — additiv, spiegelt
   * `kosmo-contracts` `RenderScene.cameras`s Literal-Modi. Kommt NUR zum
   * Tragen, wenn KEIN `kameras`-Array vorliegt (ein Auto-Kamera-Node am
   * Render-Node gewinnt weiterhin, wie bisher) UND explizit `'saved'`
   * gewählt ist — ohne diesen Parameter bleibt der Job byte-identisch zum
   * bisherigen Stand (`cameras: 'auto'`).
   */
  kameraWahl?: 'auto' | 'saved';
  /**
   * v0.8.4 PC2 — additiv, spiegelt `RenderScene.vis.backbone`. Ohne
   * Parameter bleibt der Job byte-identisch zum bisherigen Stand
   * (`backbone: 'qwen'`, wie vor v0.8.4).
   */
  backbone?: 'qwen' | 'flux2-klein' | 'flux-krea' | 'sdxl';
  /**
   * v0.8.9 §9 E9/E10 (Line-Art, `docs/V089-SPEZ.md`) — additiv, spiegelt
   * `RenderScene.style.mode`s neuen Wert `'lineart'`. Ohne Parameter bleibt
   * der Job byte-identisch zum bisherigen Stand (`mode: 'none'`, wie vor
   * v0.8.9). Der Vertragskommentar (`render-scene.ts`) ist hier bindend:
   * «jeder Client, der `mode:'lineart'` sendet, MUSS zugleich `vis.skip:true`
   * setzen — eine Strichzeichnung wartet nie auf einen KI-Veredelungs-
   * Schritt.» Darum HART erzwungen (nicht optional/überschreibbar durch
   * `nurCycles`): eine Strichzeichnung ist Cycles/Freestyle-Rendering, kein
   * KI-Stil-Transfer, egal was `nurCycles` sagt.
   *
   * v0.8.11 Z4: `sendeGraphRenderAuftrag` leitet diesen Wert seither aus dem
   * persistenten `node.params.lineart` ab (statt einem transienten
   * `opts.mode`) — dieser Parameter hier bleibt unverändert die einzige Naht
   * zur Bridge, nur die Quelle beim EINEN Aufrufer hat sich verschoben.
   */
  mode?: 'none' | 'lineart';
}): Promise<JobRecord> {
  const { doc } = useProject.getState();
  const glb = exportGlb(doc, doc.settings.projectName);
  const kameras = params.kameras && params.kameras.length > 0 ? params.kameras : undefined;
  const lineArt = params.mode === 'lineart';
  const scene = {
    schema: 'kosmovis.render-scene/v1',
    cameras: kameras
      ? kameras.map((k) => ({ name: k.name, position: k.position, target: k.target, fov: k.fov }))
      : (params.kameraWahl ?? 'auto'),
    render: {
      resolution: params.resolution ?? [1600, 1000],
      samples: params.samples,
      faithful: params.faithful,
      ...(params.sun ? { sun: params.sun } : {}),
      ...(params.environment ? { environment: params.environment } : {}),
    },
    style: { mode: lineArt ? 'lineart' : 'none', refs: [], prompt: params.prompt },
    // HS5: «Nur Cycles» → vis.skip: true (reines Cycles, keine KI-Veredelung).
    // Die Bridge leitet das in requested_engine "cycles" ab (HS2). E10:
    // `lineArt` gewinnt HART über `nurCycles` — s. Kommentar an `mode` oben.
    vis: { skip: lineArt || params.nurCycles === true, backbone: params.backbone ?? 'qwen', upscale: false },
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

/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2, C-15) — Extraktion von `NodeCanvas.tsx`s
 * bisherigem `ausfuehren()`-Closure (unverändertes Verhalten, nur ortsneutral
 * gemacht): der Render-Node-«Ausführen»-Weg braucht NICHTS NodeCanvas-
 * Lokales (nur `doc`/`runCommand`-freie Werte + `evaluiereGraph`, beides pur/
 * exportiert) — darum jetzt hier, aufrufbar SOWOHL vom Node selbst
 * (unverändert) ALS AUCH von der neuen AUSTAUSCH-Insel («Render senden»,
 * `island/inhalte/austausch.tsx`), ohne die Logik zweimal zu schreiben.
 * `environment` kommt aus der STIMMUNG-Insel (`vis-runtime.ts`
 * `renderStimmungPreset`) — der Aufrufer entscheidet, ob er ihn mitgibt.
 *
 * `opts` (v0.8.4 PC2, `docs/V084-SPEZ.md` E6/C-18) — additiv: der
 * `vis.render`-Kernel-Command-Executor (`VisWorkspace.tsx`) reicht
 * `kameraWahl`/`backbone`/`aufloesung` aus dem im Doc gespeicherten
 * Render-Wunsch (`doc.settings.visRenderAuftrag`) durch. Beide bestehenden
 * Aufrufer (`NodeCanvas.tsx`s Ausführen-Knopf, `island/inhalte/
 * austausch.tsx`) lassen `opts` weg — der Job bleibt für sie byte-identisch
 * zum bisherigen Stand.
 *
 * Line-Art (v0.8.11, `docs/V0810-SPEZ.md` §5 Z4, Ein-Quellen-Entscheid): KEIN
 * `opts.mode`-Feld mehr — der frühere transiente Weg (Insel-`useState`,
 * gefallen mit `island/inhalte/austausch.tsx`) ist ersatzlos weg. `mode`
 * kommt jetzt AUSSCHLIESSLICH aus dem PERSISTENTEN Render-Node-Parameter
 * `node.params.lineart` (boolean, gesetzt über `vis.nodeParametrieren` —
 * NodeCanvas-Checkbox UND der AUSTAUSCH-Insel-Switch schreiben beide
 * dorthin). Damit ist Line-Art undo-bar, überlebt Insel-Remounts und hat
 * genau EINE Quelle der Wahrheit, egal über welchen Weg der Job ausgelöst
 * wird (Knopf am Node, Insel-Knopf, `vis.render`-Kosmo-Tool).
 */
export function sendeGraphRenderAuftrag(
  graphId: string,
  nodeId: string,
  environment?: { preset: 'morgen' | 'abend' | 'weiss' },
  opts?: {
    kameraWahl?: 'auto' | 'saved';
    backbone?: 'qwen' | 'flux2-klein' | 'flux-krea' | 'sdxl';
    aufloesung?: readonly [number, number];
  },
): void {
  const { doc } = useProject.getState();
  const graph = doc.get<VisGraph>(graphId);
  if (!graph) return;
  const auswertung = evaluiereGraph(doc, graph);
  const roh = auswertung.renderAuftraege.get(nodeId);
  if (!roh) return;
  if (!roh.hatSzene) {
    melde('Der Render-Node braucht eine Szene — verbinde den Modell-Node.', { ton: 'fehler' });
    return;
  }
  const node = graph.nodes.find((n) => n.id === nodeId);
  const zusatz = formularZusatz(node?.params ?? {});
  const auftrag = { ...roh, prompt: kombiniertePrompt(roh.prompt, zusatz) };
  // v0.8.11 Z4: Line-Art liest DIREKT den persistenten Node-Parameter — EIN
  // Quellen-Ort, s. Kommentar oben.
  const mode: 'none' | 'lineart' = node?.params?.['lineart'] === true ? 'lineart' : 'none';
  const key = memoKey(auftrag);
  const { setzeLauf, patchLauf } = useVisRuntime.getState();
  setzeLauf(nodeId, { status: 'gesendet', memoKey: key, gestartetUm: Date.now() });
  void postRenderJob({
    ...auftrag,
    ...(environment ? { environment } : {}),
    ...(opts?.kameraWahl !== undefined ? { kameraWahl: opts.kameraWahl } : {}),
    ...(opts?.backbone !== undefined ? { backbone: opts.backbone } : {}),
    // `aufloesung` spiegelt denselben Job-Parameter wie das bestehende
    // `resolution` (K20/A10-Presets nutzen ihn schon) — kein Zweitfeld.
    ...(opts?.aufloesung !== undefined ? { resolution: opts.aufloesung } : {}),
    mode,
  })
    .then((j) =>
      patchLauf(nodeId, {
        jobId: j.job_id,
        status: mappeJobStatus(j),
        ...(j.approval_token !== undefined ? { approvalToken: j.approval_token } : {}),
      }),
    )
    .catch((err) => {
      // TypeError = fetch-Netzfehler → ehrliche Offline-Meldung (§2.1.5),
      // nicht der kryptische «Failed to fetch»-Rohtext. KLEIN 9: Ist die
      // Bridge-URL eine LAN-IP, ist der «Netzfehler» in Wahrheit oft die CSP
      // — das wird benannt, damit niemand vergeblich die Firewall sucht.
      const offline = err instanceof TypeError;
      const cspGeblockt = offline && bridgeVermutlichCspGeblockt();
      patchLauf(nodeId, {
        status: 'fehler',
        fehler: cspGeblockt
          ? 'Bridge-Adresse ist eine LAN-IP, die die CSP nicht erlaubt (nur localhost/127.0.0.1) — am selben Gerät über localhost ansprechen. (Offline)'
          : offline
            ? 'Bridge nicht erreichbar — läuft die HomeStation-Bridge? (Offline)'
            : err instanceof Error
              ? err.message
              : String(err),
      });
      meldeFehler(err);
    });
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

// ─────────────────────────────────────────────────────────────────────────
// Blender-Sim-/Bake-Jobs (v0.8.9 §9 E9/E11, PBL2) — EIGENE Verträge
// (`BlenderSimJob`/`BakeJob`, NICHT `RenderJob`), eigene Präfixe (`bsim-`/
// `bake-`) und eigene Endpoints (`bridgeRoutes.jobsBlenderSim`/`jobsBake`).
// Physik/Geometrie-Optimierung werden NIE gefakt — der Fake-Betrieb endet
// beweisbar auf `kein-blender-worker` (s. `blender-sim.ts`/`bake-job.ts`-
// Kopfkommentare, Sanktion 12).
// ─────────────────────────────────────────────────────────────────────────

/**
 * Client-seitiges Shape der `art:'sonnenstunden'`-Params (v0.8.9 §9 E11) —
 * die Bridge selbst erzwingt hier NICHTS (`BlenderSimScene.params` ist ein
 * offenes `z.record(z.string(), z.unknown())`, s. `blender-sim.ts`
 * Kopfkommentar); ein Tippfehler (z.B. `lng` statt `lon`) fiele sonst erst
 * am echten Blender-Worker auf der HomeStation auf, nicht am Client. Prüft
 * NUR den Sonnenstunden-Shape — `wind`/`gebaeude-energie` haben eigene
 * Params, die diese Version clientseitig (noch) nicht validiert (kein
 * Client dafür in 0.8.9).
 */
export const SonnenstundenParams = z.object({
  lat: z.number(),
  lon: z.number(),
  datum: z.string().min(1),
  kriteriumStunden: z.number().optional(),
});
export type SonnenstundenParams = z.infer<typeof SonnenstundenParams>;

/** Validiert eine Bridge-Antwort gegen den Blender-Sim-Job-Vertrag. */
function parseBlenderSimJob(raw: unknown): BlenderSimJob {
  const geprueft = BlenderSimJob.safeParse(raw);
  if (!geprueft.success) {
    throw new Error('Bridge-Antwort passt nicht zum Blender-Sim-Job-Vertrag');
  }
  return geprueft.data;
}

/** Validiert eine Bridge-Antwort gegen den Bake-Job-Vertrag. */
function parseBakeJob(raw: unknown): BakeJob {
  const geprueft = BakeJob.safeParse(raw);
  if (!geprueft.success) {
    throw new Error('Bridge-Antwort passt nicht zum Bake-Job-Vertrag');
  }
  return geprueft.data;
}

/**
 * Blender-Simulation senden (Wind/Sonnenstunden/Gebäude-Energie) — multipart
 * an `bridgeRoutes.jobsBlenderSim`, Antwort gegen `BlenderSimJob.safeParse`
 * (NICHT `RenderJob`). Für `art:'sonnenstunden'` wird `params` VOR dem Senden
 * gegen `SonnenstundenParams` geprüft — ein ungültiges Shape wirft, BEVOR
 * überhaupt ein Netzwerk-Request losgeht.
 */
export async function postBlenderSimJob(
  art: BlenderSimArt,
  params: Record<string, unknown>,
  glbBytes: BlobPart,
): Promise<BlenderSimJob> {
  if (art === 'sonnenstunden') {
    const geprueft = SonnenstundenParams.safeParse(params);
    if (!geprueft.success) {
      throw new Error(
        `Sonnenstunden-Parameter ungültig: ${geprueft.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }
  }
  const scene = {
    schema: 'kosmo.blender-sim/v1',
    art,
    geometry: { path: '', format: 'glb' },
    params,
    out: '',
  };
  const form = new FormData();
  // WICHTIG: die Bridge erwartet hier das Feld `szene` (deutsch), NICHT
  // `scene` wie beim generischen Render-Endpoint `/jobs` (main.py
  // `create_job(scene: str = Form(...))` vs. `create_blender_sim_job(szene:
  // str = Form(...))`) — unterschiedliche Feldnamen an zwei Endpoints
  // desselben Servers, wörtlich gegen main.py verifiziert.
  form.append('szene', JSON.stringify(scene));
  form.append('model', new Blob([glbBytes], { type: 'model/gltf-binary' }), 'model.glb');
  const res = await bridgeFetch(bridgeRoutes.jobsBlenderSim, { method: 'POST', body: form });
  if (!res.ok) throw new BridgeHttpError(res.status, 'Bridge antwortet mit');
  return parseBlenderSimJob(await res.json());
}

export async function holeBlenderSimJob(jobId: string): Promise<BlenderSimJob> {
  const res = await bridgeFetch(bridgeRoutes.job(jobId));
  if (!res.ok) throw new BridgeHttpError(res.status, `Job ${jobId}`);
  return parseBlenderSimJob(await res.json());
}

/** Wartenden Blender-Sim-Job freigeben (nur bei aktiver Freigabe-Pflicht). */
export async function freigebenBlenderSimJob(jobId: string, approvalToken: string): Promise<BlenderSimJob> {
  const res = await bridgeFetch(bridgeRoutes.jobApprove(jobId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_token: approvalToken }),
  });
  if (!res.ok) throw new BridgeHttpError(res.status, `Freigabe ${jobId}`);
  return parseBlenderSimJob(await res.json());
}

/** Kooperativer Abbruch — awaiting_approval/queued/running → cancelled. */
export async function abbrechenBlenderSimJob(jobId: string): Promise<BlenderSimJob> {
  const res = await bridgeFetch(bridgeRoutes.jobCancel(jobId), { method: 'POST' });
  if (!res.ok) throw new BridgeHttpError(res.status, `Abbruch ${jobId}`);
  return parseBlenderSimJob(await res.json());
}

/**
 * Textur-Bake senden (Smart-UV-Unwrap + AO-Bake) — multipart an
 * `bridgeRoutes.jobsBake`, Antwort gegen `BakeJob.safeParse`. Endet im
 * Fake-/Container-Betrieb IMMER auf `kein-blender-worker` (Sanktion 12) —
 * dieser Client-Helfer täuscht nichts vor, er reicht nur ehrlich durch.
 */
export async function postBakeJob(
  glbBytes: BlobPart,
  params: { textureSize?: number; unwrap?: 'smart-uv'; decimateRatio?: number },
): Promise<BakeJob> {
  const scene = {
    schema: 'kosmo.bake-job/v1',
    geometry: { path: '', format: 'glb' },
    params: { unwrap: 'smart-uv' as const, ...params },
    out: '',
  };
  const form = new FormData();
  // Dasselbe Feldnamen-Detail wie bei `postBlenderSimJob` (s. dortigen
  // Kommentar): `/jobs/bake` erwartet `szene` (main.py `create_bake_job`).
  form.append('szene', JSON.stringify(scene));
  form.append('model', new Blob([glbBytes], { type: 'model/gltf-binary' }), 'model.glb');
  const res = await bridgeFetch(bridgeRoutes.jobsBake, { method: 'POST', body: form });
  if (!res.ok) throw new BridgeHttpError(res.status, 'Bridge antwortet mit');
  return parseBakeJob(await res.json());
}

export async function holeBakeJob(jobId: string): Promise<BakeJob> {
  const res = await bridgeFetch(bridgeRoutes.job(jobId));
  if (!res.ok) throw new BridgeHttpError(res.status, `Job ${jobId}`);
  return parseBakeJob(await res.json());
}

/** Wartenden Bake-Job freigeben (nur bei aktiver Freigabe-Pflicht). */
export async function freigebenBakeJob(jobId: string, approvalToken: string): Promise<BakeJob> {
  const res = await bridgeFetch(bridgeRoutes.jobApprove(jobId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_token: approvalToken }),
  });
  if (!res.ok) throw new BridgeHttpError(res.status, `Freigabe ${jobId}`);
  return parseBakeJob(await res.json());
}

/** Kooperativer Abbruch — awaiting_approval/queued/running → cancelled. */
export async function abbrechenBakeJob(jobId: string): Promise<BakeJob> {
  const res = await bridgeFetch(bridgeRoutes.jobCancel(jobId), { method: 'POST' });
  if (!res.ok) throw new BridgeHttpError(res.status, `Abbruch ${jobId}`);
  return parseBakeJob(await res.json());
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
 * E7-Deckel (V088-SPEZ §3 E7, Sanktion 8): Base64-Text einer aufs Blatt
 * gelegten dataURL über ~1 MiB → ehrliche Fehlerzone STATT Doc-Schreiben.
 * Prüfung läuft VOR `useProject.getState()`/jedem `runCommand` in
 * `platziereBildAufsBlatt` — bei Überschreitung passiert am Doc NICHTS.
 */
const BILD_DECKEL_BASE64_ZEICHEN = 1_048_576; // ~1 MiB Base64-Zeichen (Owner-Deckel «~1 MB»)

function pruefeBildDeckel(dataUrl: string): void {
  const komma = dataUrl.indexOf(',');
  const b64 = komma >= 0 ? dataUrl.slice(komma + 1) : dataUrl;
  if (b64.length > BILD_DECKEL_BASE64_ZEICHEN) {
    throw new Error('Bild zu gross — verkleinern (Base64 über 1 MB)');
  }
}

/**
 * E13 (`docs/V089-SPEZ.md` §9, PBL2) — Herkunfts-Label eines Bildes, das aufs
 * Blatt kommt. Ersetzt die frühere feste `BILD_LABEL_FAKE_RENDER`-Konstante
 * (E7/V088-SPEZ) durch eine echte Herkunftsprüfung:
 *  - `worker` fehlt ODER ist `'fake-worker'` → «Vorschau (Fake-Render)»
 *    (Sanktion 8/V088: Fake-Bild ohne Kennzeichnung = ungültig — bleibt die
 *    Default-Antwort, damit JEDER Aufrufer ohne Herkunftsangabe weiter
 *    ehrlich als Fake gekennzeichnet wird).
 *  - `requestedStyle === 'lineart'` (und ein ECHTER Worker) → «Strichzeichnung
 *    (Line-Art)» (E10).
 *  - sonst (echter Worker, kein Line-Art) → «Render (Cycles)».
 *
 * WICHTIG (Container-Grenze, wörtlich): der `worker`-Wert kommt IMMER von der
 * Fake-Bridge (`tools/homestation-bridge/kosmo_bridge/main.py`
 * `_fake_worker_step`, setzt `record["worker"] = "fake-worker"`) — der
 * `'Render (Cycles)'`-Zweig dieser Funktion ist im Container-Betrieb NIE
 * erreichbar, weil hier nie ein anderer `worker`-String ankommt. Er wird
 * AUSSCHLIESSLICH per Unit-Test mit einem künstlichen `JobRecord` bewiesen
 * (`apps/kosmo-orbit/test/blender-label.test.ts`) und bleibt bis zu einer
 * echten HomeStation-Abnahme (0.8.10+, Owner-Termin) ein unbewiesener
 * Live-Pfad — genau so dokumentiert, nicht stillschweigend als «getestet»
 * behauptet.
 */
export function bildLabel(h: { worker?: string; requestedStyle?: string }): string {
  if (!h.worker || h.worker === 'fake-worker') return 'Vorschau (Fake-Render)';
  if (h.requestedStyle === 'lineart') return 'Strichzeichnung (Line-Art)';
  return 'Render (Cycles)';
}

/**
 * Gemeinsamer Kern von `bildAufsBlatt`/`aufnahmeAufsBlatt` — leerer Bild-Slot
 * zuerst, sonst neuer Slot; ohne Blatt entsteht eines. Alles EIN Undo-Schritt.
 * Gibt den Blattnamen zurück. Nimmt eine FERTIGE dataURL: der Bridge-Weg
 * (`bildAufsBlatt`) holt sie erst per Fetch, der Aufnahme-Weg
 * (`aufnahmeAufsBlatt`) hat sie schon (Viewport-Screenshot, kein Bridge-Job).
 *
 * `titel` bleibt als Parameter erhalten (Aufrufer in KuratierFlaeche.tsx/
 * island/inhalte/austausch.tsx ausserhalb dieses Pakets bleiben unverändert),
 * bestimmt aber NICHT das Slot-Label.
 *
 * `label` ist NEU (E13) und OPTIONAL: `bildAufsBlatt` berechnet ihn aus dem
 * Job-Record (`bildLabel`), `aufnahmeAufsBlatt` erzwingt sein eigenes Label
 * fest. Fehlt `label` (jeder Aufrufer AUSSERHALB dieses Pakets, s.o.), bleibt
 * das Verhalten byte-identisch zum bisherigen Stand: `bildLabel({})` liefert
 * ohne Herkunftsangabe immer «Vorschau (Fake-Render)» (Sanktion 8 bleibt
 * scharf, auch ohne den neuen Parameter).
 */
export function platziereBildAufsBlatt(dataUrl: string, _titel: string, label?: string): string {
  pruefeBildDeckel(dataUrl); // wirft VOR jedem Doc-Zugriff — kein Command läuft an
  const slotLabel = label ?? bildLabel({});
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
      // `bildFuellen` kennt kein `title`-Param (Kernel-Vertrag bleibt
      // unverändert) — das Pflicht-Label kommt über den bestehenden
      // `bildAnpassen`-Command, in DERSELBEN Undo-Gruppe.
      runCommand('publish.bildAnpassen', { sheetId: sheet.id, bildId: leer.id, title: slotLabel });
    } else {
      runCommand('publish.bildPlatzieren', {
        sheetId: sheet.id,
        x: 40,
        y: 40,
        w: 160,
        dataUrl,
        title: slotLabel,
      });
    }
    return sheet.name;
  } finally {
    history.endGroup();
  }
}

/**
 * Bild als Blatt-Bürger nach KosmoPublish (C1) — Bridge-Artefakt (Render-Job).
 * Gibt den Blattnamen zurück.
 *
 * E13: holt `worker`/`requested_style` aus dem echten Job-Record
 * (`holeJob`) und berechnet daraus das Label — dieselbe Quelle, die den Job
 * auch sonst beschreibt, keine zweite Wahrheit. Schlägt der Zusatz-Fetch
 * fehl (Netz-Aussetzer o.ä.), fällt das Label ehrlich auf `bildLabel({})`
 * zurück («Vorschau (Fake-Render)») — NIE ein erfundenes «Render (Cycles)».
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
  let label = bildLabel({});
  try {
    const job = await holeJob(jobId);
    label = bildLabel({
      ...(job.worker !== undefined ? { worker: job.worker } : {}),
      ...(job.requested_style !== undefined ? { requestedStyle: job.requested_style } : {}),
    });
  } catch {
    // Ehrlicher Rückfall auf das Fake-Render-Label (s. Kommentar oben) —
    // ein gescheiterter Zusatz-Fetch darf das Platzieren selbst nicht kippen.
  }
  return platziereBildAufsBlatt(dataUrl, titel, label);
}

/**
 * v0.6.7 P0: Viewport-Aufnahme als Blatt-Bürger — dieselbe Ablage wie
 * `bildAufsBlatt`, aber OHNE Bridge-Fetch (die dataURL liegt schon lokal vor,
 * `vis-runtime.Aufnahme.dataUrl`). Async wie `bildAufsBlatt` (einheitlicher
 * Aufrufer-Weg, `.then().catch()`), auch wenn hier nichts zu awaiten ist.
 * Gibt den Blattnamen zurück.
 *
 * E13: EIGENES, ehrliches Label «Aufnahme (Viewport)» — unabhängig von
 * `bildLabel()`/jedem Job-Record (ein Viewport-Screenshot hat keinen Bridge-
 * Job und war NIE ein Fake-Render, das «Vorschau (Fake-Render)»-Label wäre
 * hier selbst eine Falschbehauptung).
 */
export async function aufnahmeAufsBlatt(dataUrl: string, titel: string): Promise<string> {
  return platziereBildAufsBlatt(dataUrl, titel, 'Aufnahme (Viewport)');
}
