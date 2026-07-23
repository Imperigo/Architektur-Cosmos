import { expect, test, type Page } from '@playwright/test';

/**
 * V1-Finish P2: KosmoVis Node-Tree — die Kette Graph bauen → Render über
 * den Fake-Worker → Bild am Node → Aufs Blatt, plus das Canvas-Handwerk
 * (Ports per Drag verbinden, Node schieben = EIN Command).
 *
 * W1-Anpassung (Begründung): dieser Worktree-Stream läuft mit einer EIGENEN
 * Fake-Worker-Bridge auf Port 8600 (Hauptbaum-Default; die Stream-Isolation der W1-Phase ist mit der Integration beendet), damit
 * parallele Streams sich nicht in die Quere kommen — `kosmo.bridge` wird
 * darum explizit gesetzt, die render-scene.json-Polls zeigen auf denselben
 * Port. Reine Testumgebungs-Anpassung, keine Vertragsänderung.
 *
 * v0.8.10 / P-B1 (`docs/V0810-SPEZ.md` §2 E2, Matrix C-4/C-5) — Bootstrap auf
 * die Island-UI umgestellt: `test.use({ storageState: { cookies: [],
 * origins: [] } })` (Muster `e2e/blender-bridge.spec.ts:49`) beweist den
 * echten Produktions-Default `visOberflaeche:'island'` ohne den globalen
 * Manuell-Seed (`playwright.config.ts`/`e2e/helpers/manuell-seed.ts`, NICHT
 * geändert — der Seed-Flip selbst ist P-B2). Graph/Node-Bootstrap läuft ab
 * hier über die GRAPH-/STIMMUNG-Inseln (`visisl-graph-erstellen`,
 * `island-palette-eintrag-<typ>`, `island-drei-stimmungen`) statt der alten
 * `graph-neu`/`node-hinzu`/`drei-stimmungen`-Werkzeugzeile — die Node-Ebene
 * (`vis-node-*`/`port-*`/`render-ausfuehren`/…) bleibt UNVERÄNDERT
 * (NodeCanvas ist in beiden Modi dieselbe Komponente, Sanktion 6).
 */

test.use({ storageState: { cookies: [], origins: [] } });

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          byKind: (k: string) => {
            id: string;
            nodes?: { id: string; typ: string; x: number; y: number }[];
            bilder?: unknown[];
          }[];
        };
      };
    };
  }
}

/** Muster `e2e/blender-bridge.spec.ts`s `oeffneVisWerkzeug` — Hover öffnet
 *  die Insel-Leiste, Klick aufs Werkzeug öffnet das Stufe2-Popup. */
async function oeffneVisWerkzeug(page: Page, island: string, werkzeugId: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-werkzeug-${werkzeugId}"]`)).toBeVisible();
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
}

/** GRAPH-Insel Node-Palette: EIN Node-Typ hinzufügen (Ersatz für die alte
 *  `waehleOption(page, 'node-hinzu', typ)`-KSelect-Auswahl). */
async function islandNodeHinzu(page: Page, typ: string): Promise<void> {
  await oeffneVisWerkzeug(page, 'graph', 'palette');
  const eintrag = page.locator(`[data-testid="island-palette-eintrag-${typ}"]`);
  await expect(eintrag).toBeVisible();
  await eintrag.click();
}

test('Node-Tree-Kette: Drei Stimmungen → Ausführen → Bild am Node → Aufs Blatt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');

  // Der Teilgraph steht: 3 Render-Nodes, Kombinierer zeigt den finalen Prompt LIVE
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(15);
  await expect(page.locator('[data-testid="kombinierer-prompt"]').first()).toContainText('Morgenlicht');

  // Render nur auf Knopf — Fake-Worker antwortet, das Bild hängt am Node
  await page.locator('[data-testid="render-ausfuehren"]').first().click();
  await expect(page.locator('[data-testid="render-status"]').first()).not.toHaveText('bereit');
  await expect(page.locator('[data-testid="render-bild"]').first()).toBeVisible({ timeout: 25000 });
  // HS3-Auflage 1: das Bild kommt jetzt als geladene blob:-URL (CSP img-src
  // blockte den direkten http-src still) — naturalWidth > 0 beweist echtes
  // Bild statt kaputtem 16×16-Kästchen, tötet den grünen Schein.
  const bildBreite = await page
    .locator('[data-testid="render-bild"]')
    .first()
    .evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(bildBreite).toBeGreaterThan(0);

  // Blatt-Node ansetzen und verbinden (präziser Befehl — wie Kosmo es täte)
  await islandNodeHinzu(page, 'blatt');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0]!;
    const render = graph.nodes!.find((n) => n.typ === 'render')!;
    const blatt = graph.nodes!.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: render.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
    // ins Sichtfeld rücken (das Raster setzt späte Nodes weiter unten ab)
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: blatt.id, x: 620, y: 320 });
  });
  await page.locator('[data-testid="blatt-ablegen"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Render liegt auf', { timeout: 15000 });
  const bilder = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('sheet').flatMap((s) => s.bilder ?? []).length,
  );
  expect(bilder).toBeGreaterThan(0);
  await page.screenshot({ path: 'e2e-results/visgraph-kette.png' });
});

test('Node-Canvas-Handwerk: Port-Drag verbindet typisiert, Node-Drag committet, Trennen räumt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
  await oeffneVisWerkzeug(page, 'graph', 'palette');
  await page.click('[data-testid="visisl-graph-erstellen"]');
  await islandNodeHinzu(page, 'prompt');
  await islandNodeHinzu(page, 'kombinierer');

  // Erst warten, bis beide Nodes wirklich gelayoutet sind — sonst liefert
  // boundingBox() Vor-Layout-Koordinaten und der Drag verfehlt den Port (flaky).
  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  const kombNode = page.locator('[data-testid="vis-node-kombinierer"]');
  await expect(promptNode).toBeVisible();
  await expect(kombNode).toBeVisible();
  const ausPort = promptNode.locator('[data-testid="port-out-prompt"]');
  const einPort = kombNode.locator('[data-testid="port-in-stil"]');
  await expect(ausPort).toBeVisible();
  await expect(einPort).toBeVisible();

  // Port-Drag: prompt.prompt → kombinierer.stil (mit Zwischenschritt, damit die
  // Pending-Edge dem Pointer folgt und sauber am Ziel-Port einrastet).
  const aus = (await ausPort.boundingBox())!;
  const ein = (await einPort.boundingBox())!;
  await page.mouse.move(aus.x + aus.width / 2, aus.y + aus.height / 2);
  await page.mouse.down();
  await page.mouse.move((aus.x + ein.x) / 2, (aus.y + ein.y) / 2, { steps: 6 });
  await page.mouse.move(ein.x + ein.width / 2, ein.y + ein.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(1, { timeout: 5000 });

  // Prompt tippen → Kombinierer zeigt ihn live
  await page.locator('[data-testid="prompt-text"]').fill('Blick vom Quai');
  // Island-Hotspot (Muster `e2e/blender-bridge.spec.ts` Kopfkommentar zum
  // KSwitch-Fall): der Insel-Kopf («Zur Zentrale»-Logo, seit P-F2
  // `island-kopf-logo-design` — vorher `island-kopf-logo-orbit`, s.
  // `island.css` `left:14px`/ein ~38px-Kreis, dieselbe Position/Grösse)
  // schwebt fix oben-links über dem Node-Canvas und überdeckt den alten
  // Testpunkt (30,30), den es im Manuell-Modus nicht gab. `force:true` wäre
  // hier FALSCH (es klickt das oberste Element am Punkt trotzdem real an —
  // träfe also das Logo und navigierte zur Zentrale, gemessen im ersten
  // Anlauf dieser Migration) — der Testpunkt wandert darum auf (30,260),
  // klar unterhalb des Logo-Kreises, weiterhin ein echter Canvas-
  // Hintergrund-Klick ohne Produktcode-Fix (PB1/PC0-Hotspot ausserhalb
  // dieses Dateikreises).
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 260 } });
  await expect(page.locator('[data-testid="kombinierer-prompt"]')).toContainText('Blick vom Quai');

  // Node-Drag: Kopfzeile ziehen — die Position landet als EIN vis.nodeSchieben im Modell
  const vorherY = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('visgraph')[0]!.nodes!.find((n) => n.typ === 'prompt')!.y,
  );
  const node = (await promptNode.boundingBox())!;
  await page.mouse.move(node.x + 70, node.y + 12);
  await page.mouse.down();
  await page.mouse.move(node.x + 70, node.y + 90, { steps: 4 });
  await page.mouse.move(node.x + 70, node.y + 180, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__kosmo.state().doc.byKind('visgraph')[0]!.nodes!.find((n) => n.typ === 'prompt')!.y,
      ),
    )
    .not.toBe(vorherY);

  // W1-Anpassung (Begründung): Trenn-✕ ist jetzt NUR bei Hover der Kante
  // sichtbar (CSS-Opazität, Element bleibt im DOM — UI-KONZEPT-065 §5). Vor
  // dem Klick wird darum gehovert, sonst träfe der Klick einen unsichtbaren
  // Knopf (funktional noch klickbar, aber nicht mehr das reale Nutzer-Verhalten).
  const kante = page.locator('[data-testid="vis-edge"]').first();
  await kante.hover({ force: true });
  await kante.locator('[data-testid="edge-trennen"]').click({ force: true });
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(0, { timeout: 5000 });
  await page.screenshot({ path: 'e2e-results/visgraph-handwerk.png' });
});

test('HS5: «Nur Cycles» bestellt vis.skip: true — beweisbar aus der render-scene.json', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]').first()).toBeVisible();

  // Schalter an, dann rendern
  await page.locator('[data-testid="render-nur-cycles"]').first().check();
  await page.locator('[data-testid="render-ausfuehren"]').first().click();
  await expect(page.locator('[data-testid="render-status"]').first()).not.toHaveText('bereit');

  // Irgendein Render-Job der Default-Bridge trägt vis.skip: true in seiner
  // render-scene.json (per Artefakt-GET beweisbar — kein UI-Vorgeben). Da NUR
  // dieser Test den Schalter setzt (alle anderen Render-Aufrufe: skip false)
  // und der Store frisch startete, ist ein Treffer eindeutig unser Job.
  // (Über `jobs[0]` allein wäre es flaky: parallele Specs legen vsplat-/vis-
  // Jobs an, deren Reihenfolge/Fehlen von render-scene.json variiert.)
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const jobs = (await (await fetch('http://localhost:8600/jobs')).json()) as { job_id: string }[];
          for (const j of jobs) {
            try {
              const scene = await (
                await fetch(`http://localhost:8600/jobs/${j.job_id}/artifacts/render-scene.json`)
              ).json();
              if ((scene as { vis?: { skip?: boolean } }).vis?.skip === true) return true;
            } catch {
              /* vsplat-/bsim-Jobs haben keine render-scene.json — überspringen */
            }
          }
          return false;
        }),
      { timeout: 15000 },
    )
    .toBe(true);
});

/**
 * v0.6.4 / F6 — Owner-Befund (Live-Test 0.6.3-Desktop): «KosmoVis ist auf
 * einen Fehler gelaufen» beim Pannen des Node-Trees. Ursache in
 * NodeCanvas.tsx (onPointerMove): der Hintergrund-Pan liest `panning.current`
 * (ein Ref, mutierbar in Echtzeit) NICHT beim Event, sondern LAZY innerhalb
 * der `setView(v => ...)`-Updater-Funktion. Feuert dazwischen ein pointerup
 * (setzt `panning.current = null` — z.B. bei einer schnellen Los-Geste, oder
 * wenn der Browser mehrere pointermove/-up im selben Batch verarbeitet, bevor
 * React den noch ausstehenden Updater tatsächlich aufruft), liest der
 * Updater den Ref als `null` — «Cannot read properties of null (reading
 * 'cx')», von der KFehlerzone gefangen. Fix: den Zustand beim Event in eine
 * lokale Konstante schnappen, statt ihn im Updater erneut vom Ref zu lesen.
 *
 * Diese Suite prüft zwei Ebenen:
 * 1. Ein normaler Maus-Pan (down/move/up) + Wheel-Zoom nach «Drei
 *    Stimmungen» — die im Auftrag verlangte Alltags-Geste.
 * 2. Eine deterministische Nachstellung der Race (synchrones
 *    down→move…→up ohne Event-Loop-Yield dazwischen, direkt per
 *    PointerEvent) — das ist der Pfad, der den Fehler VOR dem Fix
 *    zuverlässig auslöste; ein reiner Maus-Pan trifft die Race nur
 *    gelegentlich (Timing-abhängig), die direkte Nachstellung IMMER.
 */
test('F6: Pannen des Node-Trees stürzt nicht ab (Drei Stimmungen) — Maus-Pan + Wheel', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  const canvas = page.locator('[data-testid="node-canvas"]');
  const box = (await canvas.boundingBox())!;

  // Maus-Pan: down → mehrere move → up, über den ganzen sichtbaren Canvas.
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.85);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();

  // Wheel-Zoom obendrauf — beide Gesten zusammen, wie im Owner-Repro.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -300);
  await page.mouse.wheel(0, 300);

  await expect(page.locator('[data-testid="fehlerzone"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
});

test('F6: schnelles down→move…→up (synchrone Race) stürzt den Node-Tree nicht ab', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  // Feuert down → 40× move → up als NATIVE PointerEvents, synchron in einem
  // JS-Turn (kein Yield an die Event-Loop dazwischen) — genau das Timing,
  // das den panning.current-Ref VOR dem Fix als null erwischen konnte,
  // während ein bereits gequeuter setView-Updater noch aussteht.
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="node-canvas"]') as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.8;
    const cy = rect.top + rect.height * 0.8;
    const fire = (type: string, x: number, y: number) => {
      svg.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
        }),
      );
    };
    for (let round = 0; round < 10; round++) {
      fire('pointerdown', cx, cy);
      for (let i = 1; i <= 40; i++) fire('pointermove', cx - i * 4, cy - i * 3);
      fire('pointerup', cx - 160, cy - 120);
    }
  });

  expect(consoleErrors.filter((m) => m.includes('reading') || m.includes('null'))).toHaveLength(0);
  await expect(page.locator('[data-testid="fehlerzone"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
});
