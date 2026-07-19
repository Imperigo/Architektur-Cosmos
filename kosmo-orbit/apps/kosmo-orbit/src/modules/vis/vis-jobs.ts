import { evaluiereGraph, exportGlb, type AutoKameraStandpunkt, type Sheet, type VisGraph } from '@kosmo/kernel';
import { RenderJob, bridgeRoutes } from '@kosmo/contracts';
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
}): Promise<JobRecord> {
  const { doc } = useProject.getState();
  const glb = exportGlb(doc, doc.settings.projectName);
  const kameras = params.kameras && params.kameras.length > 0 ? params.kameras : undefined;
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
    style: { mode: 'none', refs: [], prompt: params.prompt },
    // HS5: «Nur Cycles» → vis.skip: true (reines Cycles, keine KI-Veredelung).
    // Die Bridge leitet das in requested_engine "cycles" ab (HS2).
    vis: { skip: params.nurCycles === true, backbone: params.backbone ?? 'qwen', upscale: false },
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
 * E7 (V088-SPEZ §3, Sanktion 8): JEDES Bild, das über diesen Weg aufs Blatt
 * kommt, stammt aus dem Fake-Bridge-Betrieb dieser Version (keine echte
 * HomeStation-Render-Strecke existiert bislang, `echte-Render-Grössenstrategie`
 * ist ehrlicher Nicht-Ziel-Punkt) — der Slot-Titel trägt darum IMMER dieses
 * Label, unabhängig vom aufrufer-seitigen `titel`-Argument.
 */
const BILD_LABEL_FAKE_RENDER = 'Vorschau (Fake-Render)';

/**
 * Gemeinsamer Kern von `bildAufsBlatt`/`aufnahmeAufsBlatt` — leerer Bild-Slot
 * zuerst, sonst neuer Slot; ohne Blatt entsteht eines. Alles EIN Undo-Schritt.
 * Gibt den Blattnamen zurück. Nimmt eine FERTIGE dataURL: der Bridge-Weg
 * (`bildAufsBlatt`) holt sie erst per Fetch, der Aufnahme-Weg
 * (`aufnahmeAufsBlatt`) hat sie schon (Viewport-Screenshot, kein Bridge-Job).
 *
 * `titel` bleibt als Parameter erhalten (Aufrufer in KuratierFlaeche.tsx/
 * island/inhalte/austausch.tsx ausserhalb dieses Pakets bleiben unverändert),
 * bestimmt aber NICHT mehr das Slot-Label — E7 zwingt `BILD_LABEL_FAKE_RENDER`
 * (Sanktion 8: Fake-Bild ohne Kennzeichnung = ungültig).
 */
export function platziereBildAufsBlatt(dataUrl: string, _titel: string): string {
  pruefeBildDeckel(dataUrl); // wirft VOR jedem Doc-Zugriff — kein Command läuft an
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
      runCommand('publish.bildAnpassen', { sheetId: sheet.id, bildId: leer.id, title: BILD_LABEL_FAKE_RENDER });
    } else {
      runCommand('publish.bildPlatzieren', {
        sheetId: sheet.id,
        x: 40,
        y: 40,
        w: 160,
        dataUrl,
        title: BILD_LABEL_FAKE_RENDER,
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
