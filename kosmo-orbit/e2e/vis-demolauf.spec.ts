import { expect, test } from '@playwright/test';

/**
 * v0.8.4 PC2 (`docs/V084-SPEZ.md` E6/C-18) — «Kosmo-Demolauf»: der komplette
 * User-Weg Graph→Kamera→Stimmung→Rendern→Blatt AUSSCHLIESSLICH über
 * `window.__kosmo.run(commandId, params)` (dieselbe Naht, über die
 * `commandTools()`/Kosmo jeden Command auslöst — kein UI-Klick ersetzt einen
 * dieser Schritte). Jeder Schritt per Command ist der Beweis, dass Kosmo den
 * kompletten Vis-Demolauf selbst fahren kann, ohne einen Menschen, der einen
 * Knopf drückt:
 *
 *   1. `vis.graphErstellen`                    — Graph
 *   2. `vis.nodeSetzen` (modell/kamera/stimmung/render) — Nodes
 *   3. `vis.verbinden` ×3                       — Kamera-Node verdrahtet
 *   4. `vis.nodeParametrieren` (preset: abend)  — Stimmung parametriert
 *   5. `vis.render` (kameraWahl:auto, stimmungPreset:abend) — DER Render-Auftrag
 *
 * Ab hier übernimmt die App-Laufzeit (Executor-Watcher in `VisWorkspace.tsx`,
 * `sendeGraphRenderAuftrag()` in `vis-jobs.ts`) — EHRLICH: das ist die
 * `--fake-worker`-Bridge (`tools/homestation-bridge/kosmo_bridge/main.py
 * --fake-worker`), kein echtes Cycles/GPU. Das Ergebnisbild erscheint am Node
 * (`BridgeBild`, `data-testid="render-bild"`), zuletzt legt ein Blatt-Node +
 * `publish.blattErstellen`/`publish.bildFuellen` (unter der Haube des
 * bestehenden «Aufs Blatt»-Knopfs, Muster `visgraph.spec.ts`) das Bild aufs
 * Blatt — derselbe Kernel-Command-Weg wie überall sonst in der App.
 *
 * Bridge: seit dem PC2-CORS-Fix (main.py kennt 5174–5183) läuft diese Spec
 * gegen die GETEILTE :8600-Fake-Bridge wie alle anderen — sie startet KEINE
 * eigene Bridge (der frühere Kopfkommentar behauptete das fälschlich,
 * PE3-Fund C-18: es gab nie einen spawn-Aufruf, nur den /health-Check
 * unten). `kosmo.bridge` wird explizit auf `:8600` gesetzt.
 */
const BRIDGE = 'http://localhost:8600';

async function bridgeVerfuegbar(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE}/health`);
    if (!res.ok) return false;
    const daten = (await res.json()) as { ok?: boolean };
    return daten.ok === true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        doc: {
          byKind: (k: string) => {
            id: string;
            nodes?: { id: string; typ: string; x: number; y: number }[];
            bilder?: unknown[];
            settings?: unknown;
          }[];
          settings: {
            visRenderAuftrag?: {
              graphId: string;
              nodeId: string;
              kameraWahl: string;
              stimmungPreset?: string;
            } | null;
          };
        };
      };
    };
  }
}

test('Kosmo-Demolauf: Graph → Kamera → Material/Kombinierer → Stimmung (abend) → vis.render (backbone flux2-klein) → Fake-Bridge-Job → Bild → aufs Blatt — ALLES über Commands', async ({
  page,
}) => {
  test.setTimeout(150_000);

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate((bridge) => localStorage.setItem('kosmo.bridge', bridge), BRIDGE);
  await page.click('[data-testid="module-vis"]');

  // Deterministische Bridge-Bereitschaft VOR dem Render-Auftrag (Baustein 15,
  // Muster `render-knopf.spec.ts`) — bricht ehrlich ab statt still zu hängen,
  // wenn die --fake-worker-Bridge auf :8600 nicht erreichbar ist.
  await expect
    .poll(() => bridgeVerfuegbar(), {
      timeout: 20_000,
      message: 'Fake-Worker-Bridge :8600 antwortet nicht auf /health — mit --fake-worker starten (Spec-Kopfkommentar).',
    })
    .toBe(true);

  // Schritt 1-4: Graph + Nodes + Verdrahtung + Stimmung — JEDER Schritt ein
  // `window.__kosmo.run(...)`, keine UI-Interaktion. Rückgabewerte kommen
  // NUR aus den Commands selbst (Muster `visgraph.spec.ts`).
  const aufbau = await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.run('vis.graphErstellen', { name: 'Demolauf' }).patches[0]!.id;
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'modell', x: 0, y: 0 });
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'kamera', x: 0, y: 220 });
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'stimmung', x: 260, y: 0, params: { preset: 'morgen' } });
    // PE3-Fix C-18: der Auftrag verlangt Kamera→MATERIAL→Cycles — Material
    // läuft im Graphen über den Kombinierer (Muster `vis-graph-aktionen.ts`:
    // material→kombinierer.material, stimmung→kombinierer.stimmung,
    // kombinierer.prompt→render.prompt).
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'material', x: 260, y: 220 });
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'kombinierer', x: 390, y: 100 });
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'render', x: 520, y: 100 });
    const nodes = k.state().doc.byKind('visgraph')[0]!.nodes!;
    const modell = nodes.find((n) => n.typ === 'modell')!.id;
    const kamera = nodes.find((n) => n.typ === 'kamera')!.id;
    const stimmung = nodes.find((n) => n.typ === 'stimmung')!.id;
    const material = nodes.find((n) => n.typ === 'material')!.id;
    const komb = nodes.find((n) => n.typ === 'kombinierer')!.id;
    const render = nodes.find((n) => n.typ === 'render')!.id;
    // Schritt 3 — Kamera + Material verdrahten (neben Szene/Prompt).
    k.run('vis.verbinden', { graphId: graph, from: modell, fromPort: 'szene', to: render, toPort: 'szene' });
    k.run('vis.verbinden', { graphId: graph, from: kamera, fromPort: 'kameras', to: render, toPort: 'kameras' });
    k.run('vis.verbinden', { graphId: graph, from: material, fromPort: 'material', to: komb, toPort: 'material' });
    k.run('vis.verbinden', { graphId: graph, from: stimmung, fromPort: 'prompt', to: komb, toPort: 'stimmung' });
    k.run('vis.verbinden', { graphId: graph, from: komb, fromPort: 'prompt', to: render, toPort: 'prompt' });
    // Schritt 4 — Stimmung parametrieren (preset: abend), EXPLIZIT als
    // eigener `vis.nodeParametrieren`-Aufruf (Auftragstext).
    k.run('vis.nodeParametrieren', { graphId: graph, nodeId: stimmung, params: { preset: 'abend' } });
    return { graph, render, stimmung };
  });

  // Beweis: die Stimmung ist wirklich «abend» im Doc, nicht nur im UI-Klick.
  const stimmungParams = await page.evaluate(
    ({ graph, stimmung }) => {
      const g = window.__kosmo.state().doc.byKind('visgraph').find((x) => x.id === graph)!;
      return (g.nodes!.find((n) => n.id === stimmung) as unknown as { params: { preset: string } }).params.preset;
    },
    aufbau,
  );
  expect(stimmungParams).toBe('abend');

  // Schritt 5 — DER Render-Auftrag: kein Knopf, nur der Kernel-Command.
  await page.evaluate(({ graph, render }) => {
    window.__kosmo.run('vis.render', {
      graphId: graph,
      nodeId: render,
      kameraWahl: 'auto',
      stimmungPreset: 'abend',
      // PE3-Fix C-18: der AI-Slot wird EXPLIZIT ausgeübt statt still auf
      // dem 'qwen'-Default zu liegen — der Auftragstext nennt den AI-Slot
      // als eigenen Demolauf-Schritt.
      backbone: 'flux2-klein',
    });
  }, aufbau);

  // Der Auftrag steht ehrlich im Doc (SettingsPatch, Kosmo-Werkzeug-Beweis
  // C-18) — geprüft VOR jeder Job-Erwartung, damit ein Fehlschlag hier klar
  // von einem Bridge-/Netz-Problem unterscheidbar bleibt.
  const wunsch = await page.evaluate(() => window.__kosmo.state().doc.settings.visRenderAuftrag);
  expect(wunsch).not.toBeNull();
  expect(wunsch?.kameraWahl).toBe('auto');
  expect(wunsch?.stimmungPreset).toBe('abend');
  expect(wunsch?.backbone).toBe('flux2-klein');

  // Der Executor-Watcher in `VisWorkspace.tsx` beobachtet genau dieses Feld
  // und stösst `sendeGraphRenderAuftrag()` an — DIESELBE Kette wie ein Klick
  // auf «Ausführen» am Node (`NodeCanvas.tsx`, unverändert), nur ohne Klick.
  const status = page.locator('[data-testid="render-status"]').first();
  await expect(status).not.toHaveText('bereit', { timeout: 20_000 });

  // Auf den ECHTEN Endzustand pollen (Muster `render-knopf.spec.ts`): der
  // --fake-Worker durchläuft mehrere Schritte, ehrlich benannt (kein
  // Cycles/GPU-Vortäuschen, Sanktion 4).
  await expect
    .poll(async () => (await status.textContent()) ?? '', {
      timeout: 60_000,
      message: 'Render-Job kam nicht in einen Endzustand (fertig/fehler)',
    })
    .toMatch(/^(fertig|fehler)$/);
  expect(await status.textContent(), 'Fake-Render-Job endete mit Fehler statt fertig').toBe('fertig');

  // Ergebnisbild erscheint (BridgeBild, HS3-Auflage 1: blob:-URL statt totem
  // http-src — naturalWidth > 0 beweist ein echtes Bild).
  const bild = page.locator('[data-testid="render-bild"]').first();
  await expect(bild).toBeVisible({ timeout: 10_000 });
  const bildBreite = await bild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(bildBreite).toBeGreaterThan(0);

  // Letzter Schritt: Blatt-Node ansetzen und verbinden (weiterer Command,
  // Muster `visgraph.spec.ts`), dann «Aufs Blatt» — das legt das Bild über
  // `publish.blattErstellen`/`publish.bildFuellen` (`vis-jobs.ts`
  // `bildAufsBlatt`) auf ein echtes Publish-Blatt, derselbe Kernel-Command-
  // Weg, den `commandTools()` auch Kosmo direkt gäbe.
  await page.evaluate(({ graph, render }) => {
    const k = window.__kosmo;
    k.run('vis.nodeSetzen', { graphId: graph, typ: 'blatt', x: 780, y: 100 });
    const nodes = k.state().doc.byKind('visgraph').find((g) => g.id === graph)!.nodes!;
    const blatt = nodes.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph, from: render, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
    k.run('vis.nodeSchieben', { graphId: graph, nodeId: blatt.id, x: 780, y: 120 });
  }, aufbau);

  await page.locator('[data-testid="blatt-ablegen"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Render liegt auf', { timeout: 15000 });

  const blaetterMitBild = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('sheet').flatMap((s) => s.bilder ?? []).length,
  );
  expect(blaetterMitBild).toBeGreaterThan(0);

  await page.screenshot({ path: 'e2e-results/vis-demolauf.png', fullPage: true });
});
