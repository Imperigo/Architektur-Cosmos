import { expect, test } from '@playwright/test';

/**
 * V1-Finish P2: KosmoVis Node-Tree — die Kette Graph bauen → Render über
 * den Fake-Worker → Bild am Node → Aufs Blatt, plus das Canvas-Handwerk
 * (Ports per Drag verbinden, Node schieben = EIN Command).
 */

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

test('Node-Tree-Kette: Drei Stimmungen → Ausführen → Bild am Node → Aufs Blatt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="drei-stimmungen"]');

  // Der Teilgraph steht: 3 Render-Nodes, Kombinierer zeigt den finalen Prompt LIVE
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(15);
  await expect(page.locator('[data-testid="kombinierer-prompt"]').first()).toContainText('Morgenlicht');

  // Render nur auf Knopf — Fake-Worker antwortet, das Bild hängt am Node
  await page.locator('[data-testid="render-ausfuehren"]').first().click();
  await expect(page.locator('[data-testid="render-status"]').first()).not.toHaveText('bereit');
  await expect(page.locator('[data-testid="render-bild"]').first()).toBeVisible({ timeout: 25000 });

  // Blatt-Node ansetzen und verbinden (präziser Befehl — wie Kosmo es täte)
  await page.selectOption('[data-testid="node-hinzu"]', 'blatt');
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
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="graph-neu"]');
  await page.selectOption('[data-testid="node-hinzu"]', 'prompt');
  await page.selectOption('[data-testid="node-hinzu"]', 'kombinierer');

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
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 30 } });
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

  // Kante wählen und trennen
  await page.locator('[data-testid="vis-edge"] path').first().click({ force: true });
  await page.locator('[data-testid="edge-trennen"]').click({ force: true });
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(0, { timeout: 5000 });
  await page.screenshot({ path: 'e2e-results/visgraph-handwerk.png' });
});
