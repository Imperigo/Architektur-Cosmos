import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisGraph } from '@kosmo/kernel';
import { useProject } from '../src/state/project-store';

/**
 * v0.8.4 PC2 (`docs/V084-SPEZ.md` E6/C-18) — Executor-Seite von `vis.render`:
 * `postRenderJob`s additive `kameraWahl`/`backbone`-Parameter und
 * `sendeGraphRenderAuftrag`s additive `opts` (Extraktion in `vis-jobs.ts`),
 * die der neue `VisWorkspace.tsx`-Watcher aus `doc.settings.visRenderAuftrag`
 * durchreicht. Die eigentliche React-Effekt-Verdrahtung (Ref-Vergleich,
 * «frischer Auftrag löst genau einmal aus») ist bewusst NICHT hier
 * komponentengetestet — dieses Repo prüft `VisWorkspace.tsx` durchgehend per
 * E2E (`e2e/visgraph.spec.ts`, `render-knopf.spec.ts`, NEU
 * `e2e/vis-demolauf.spec.ts`), nie per isoliertem Component-Mount (kein
 * Präzedenzfall in diesem Test-Ordner) — dieselbe Testphilosophie wie
 * `vis-preset-job.test.ts` (K20/A10): die PURE/isolierbare Logik bekommt den
 * Unit-Test, die UI-Verdrahtung den echten Browser-Lauf.
 */

function setzeLocalStorage(werte: Record<string, string> = {}): void {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => werte[k] ?? null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
}

function stubFetchErfasseSzene(): { gesehen: () => Record<string, unknown> | null } {
  let gesehen: Record<string, unknown> | null = null;
  vi.stubGlobal('fetch', (async (_url: unknown, init?: RequestInit) => {
    const form = init!.body as FormData;
    gesehen = JSON.parse(String(form.get('scene')));
    return {
      ok: true,
      json: async () => ({
        job_id: 'vis-1751400000-a1b2c3',
        status: 'queued',
        scene: 's.json',
        created_at: '2026-07-18T00:00:00Z',
        idle_window_only: true,
      }),
    };
  }) as unknown as typeof fetch);
  return { gesehen: () => gesehen };
}

describe('postRenderJob — additive kameraWahl/backbone (PC2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('kameraWahl «saved» ohne Auto-Kamera-Node: cameras wird das Literal «saved»', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { postRenderJob } = await import('../src/modules/vis/vis-jobs');
    await postRenderJob({ prompt: 'Testprompt', faithful: 0.8, samples: 128, kameraWahl: 'saved' });
    expect((gesehen() as { cameras: unknown }).cameras).toBe('saved');
  });

  it('ein Auto-Kamera-Node (kameras-Array) gewinnt weiterhin gegen kameraWahl «saved»', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { postRenderJob } = await import('../src/modules/vis/vis-jobs');
    await postRenderJob({
      prompt: 'Testprompt',
      faithful: 0.8,
      samples: 128,
      kameraWahl: 'saved',
      kameras: [{ name: 'Eingang', position: [5, 1.6, 8], target: [5, 1.2, -3], fov: 55, begruendung: 'x' }],
    });
    expect((gesehen() as { cameras: unknown[] }).cameras).toEqual([
      { name: 'Eingang', position: [5, 1.6, 8], target: [5, 1.2, -3], fov: 55 },
    ]);
  });

  it('ohne kameraWahl bleibt cameras «auto» — byte-identisch zum Stand vor v0.8.4 PC2', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { postRenderJob } = await import('../src/modules/vis/vis-jobs');
    await postRenderJob({ prompt: 'Testprompt', faithful: 0.8, samples: 128 });
    expect((gesehen() as { cameras: unknown }).cameras).toBe('auto');
  });

  it('backbone-Override fliesst in vis.backbone; fehlend bleibt «qwen»', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen: gesehenMit } = stubFetchErfasseSzene();
    const { postRenderJob } = await import('../src/modules/vis/vis-jobs');
    await postRenderJob({ prompt: 'x', faithful: 0.8, samples: 128, backbone: 'flux-krea' });
    expect((gesehenMit() as { vis: { backbone: string } }).vis.backbone).toBe('flux-krea');

    vi.unstubAllGlobals();
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen: gesehenOhne } = stubFetchErfasseSzene();
    await postRenderJob({ prompt: 'x', faithful: 0.8, samples: 128 });
    expect((gesehenOhne() as { vis: { backbone: string } }).vis.backbone).toBe('qwen');
  });
});

describe('sendeGraphRenderAuftrag — opts (kameraWahl/backbone/aufloesung) fliessen durch (PC2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function graphMitRenderNode(): { graphId: string; renderNodeId: string } {
    const { runCommand, doc } = useProject.getState();
    const g = runCommand('vis.graphErstellen', { name: 'PC2-Executor-Test' });
    const graphId = (g.patches[0] as { id: string }).id;
    runCommand('vis.nodeSetzen', { graphId, typ: 'modell', x: 0, y: 0 });
    const modellNodeId = doc.get<VisGraph>(graphId)!.nodes.at(-1)!.id;
    runCommand('vis.nodeSetzen', { graphId, typ: 'render', x: 200, y: 0 });
    const renderNodeId = doc.get<VisGraph>(graphId)!.nodes.at(-1)!.id;
    runCommand('vis.verbinden', { graphId, from: modellNodeId, fromPort: 'szene', to: renderNodeId, toPort: 'szene' });
    return { graphId, renderNodeId };
  }

  it('kameraWahl/backbone/aufloesung (als resolution) landen im gesendeten Job', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { sendeGraphRenderAuftrag } = await import('../src/modules/vis/vis-jobs');
    const { graphId, renderNodeId } = graphMitRenderNode();

    sendeGraphRenderAuftrag(graphId, renderNodeId, { preset: 'abend' }, {
      kameraWahl: 'saved',
      backbone: 'sdxl',
      aufloesung: [2400, 1600],
    });
    await vi.waitFor(() => expect(gesehen()).not.toBeNull());

    const szene = gesehen() as {
      cameras: unknown;
      render: { resolution: number[]; environment?: { preset: string } };
      vis: { backbone: string };
    };
    expect(szene.cameras).toBe('saved');
    expect(szene.render.resolution).toEqual([2400, 1600]);
    expect(szene.render.environment).toEqual({ preset: 'abend' });
    expect(szene.vis.backbone).toBe('sdxl');
  });

  it('ohne opts bleibt der Job byte-identisch zum bisherigen Aufruf (Bestandsschutz NodeCanvas/austausch.tsx)', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { sendeGraphRenderAuftrag } = await import('../src/modules/vis/vis-jobs');
    const { graphId, renderNodeId } = graphMitRenderNode();

    sendeGraphRenderAuftrag(graphId, renderNodeId);
    await vi.waitFor(() => expect(gesehen()).not.toBeNull());

    const szene = gesehen() as { cameras: unknown; render: { resolution: number[] }; vis: { backbone: string } };
    expect(szene.cameras).toBe('auto');
    expect(szene.render.resolution).toEqual([1600, 1000]);
    expect(szene.vis.backbone).toBe('qwen');
  });
});

/**
 * v0.8.11 Z4 (`docs/V0810-SPEZ.md` §5, Ein-Quellen-Entscheid aus der
 * V0810-Z4-Schuld): Line-Art ist kein transientes `opts.mode` mehr —
 * `sendeGraphRenderAuftrag` liest es DIREKT aus dem persistenten
 * `node.params.lineart` (gesetzt über `vis.nodeParametrieren`, EXAKT wie
 * `nurCycles`/`preset`). Diese Suite beweist den kompletten Weg: Param im
 * Doc → Job trägt `style.mode:'lineart'` UND `vis.skip:true` (hart
 * erzwungen, unabhängig von `nurCycles`); ohne den Param bleibt der Job
 * byte-identisch (`mode:'none'`, `vis.skip:false`).
 */
describe('sendeGraphRenderAuftrag — Line-Art aus node.params.lineart (v0.8.11 Z4)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function graphMitRenderNode(): { graphId: string; renderNodeId: string } {
    const { runCommand, doc } = useProject.getState();
    const g = runCommand('vis.graphErstellen', { name: 'Z4-Executor-Test' });
    const graphId = (g.patches[0] as { id: string }).id;
    runCommand('vis.nodeSetzen', { graphId, typ: 'modell', x: 0, y: 0 });
    const modellNodeId = doc.get<VisGraph>(graphId)!.nodes.at(-1)!.id;
    runCommand('vis.nodeSetzen', { graphId, typ: 'render', x: 200, y: 0 });
    const renderNodeId = doc.get<VisGraph>(graphId)!.nodes.at(-1)!.id;
    runCommand('vis.verbinden', { graphId, from: modellNodeId, fromPort: 'szene', to: renderNodeId, toPort: 'szene' });
    return { graphId, renderNodeId };
  }

  it('node.params.lineart:true → Job trägt style.mode «lineart» und vis.skip:true', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { sendeGraphRenderAuftrag } = await import('../src/modules/vis/vis-jobs');
    const { runCommand } = useProject.getState();
    const { graphId, renderNodeId } = graphMitRenderNode();

    runCommand('vis.nodeParametrieren', { graphId, nodeId: renderNodeId, params: { lineart: true } });
    sendeGraphRenderAuftrag(graphId, renderNodeId);
    await vi.waitFor(() => expect(gesehen()).not.toBeNull());

    const szene = gesehen() as { style: { mode: string }; vis: { skip: boolean } };
    expect(szene.style.mode).toBe('lineart');
    expect(szene.vis.skip).toBe(true);
  });

  it('vis.skip bleibt hart true, auch wenn nurCycles auf dem Node false ist', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { sendeGraphRenderAuftrag } = await import('../src/modules/vis/vis-jobs');
    const { runCommand } = useProject.getState();
    const { graphId, renderNodeId } = graphMitRenderNode();

    runCommand('vis.nodeParametrieren', {
      graphId,
      nodeId: renderNodeId,
      params: { lineart: true, nurCycles: false },
    });
    sendeGraphRenderAuftrag(graphId, renderNodeId);
    await vi.waitFor(() => expect(gesehen()).not.toBeNull());

    expect((gesehen() as { vis: { skip: boolean } }).vis.skip).toBe(true);
  });

  it('ohne lineart-Param bleibt der Job byte-identisch (mode:none, vis.skip:false)', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { sendeGraphRenderAuftrag } = await import('../src/modules/vis/vis-jobs');
    const { graphId, renderNodeId } = graphMitRenderNode();

    sendeGraphRenderAuftrag(graphId, renderNodeId);
    await vi.waitFor(() => expect(gesehen()).not.toBeNull());

    const szene = gesehen() as { style: { mode: string }; vis: { skip: boolean } };
    expect(szene.style.mode).toBe('none');
    expect(szene.vis.skip).toBe(false);
  });

  it('lineart:false am Node → Job bleibt style.mode «none» (Undo-Fall/expliziter Rückbau)', async () => {
    setzeLocalStorage({ 'kosmo.bridge': 'http://localhost:8600' });
    const { gesehen } = stubFetchErfasseSzene();
    const { sendeGraphRenderAuftrag } = await import('../src/modules/vis/vis-jobs');
    const { runCommand, undo } = useProject.getState();
    const { graphId, renderNodeId } = graphMitRenderNode();

    // Setzen, dann per Undo wieder zurücknehmen — beweist, dass der Param
    // (und damit Line-Art) ein normaler, undo-barer Patch ist, kein
    // Sonderfall (V0810-SPEZ Z4: "undo-bar" ist Teil des Auftrags).
    runCommand('vis.nodeParametrieren', { graphId, nodeId: renderNodeId, params: { lineart: true } });
    undo();

    sendeGraphRenderAuftrag(graphId, renderNodeId);
    await vi.waitFor(() => expect(gesehen()).not.toBeNull());

    const szene = gesehen() as { style: { mode: string }; vis: { skip: boolean } };
    expect(szene.style.mode).toBe('none');
    expect(szene.vis.skip).toBe(false);
  });
});
