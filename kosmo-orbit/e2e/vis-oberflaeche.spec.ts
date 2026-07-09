import { expect, test } from '@playwright/test';

/**
 * W1 (v0.6.5, UI-KONZEPT-065 §5) — KosmoVis-Oberfläche: die vier neuen
 * Bedienelemente/-eigenschaften, die visgraph.spec.ts/vis-automatik.spec.ts
 * nicht abdecken: Zoom-Steuerleiste, Fit nach Pan, überlappungsfreies
 * «Drei Stimmungen»-Layout, SK-V3-Klapptext (Karte wächst NICHT von selbst).
 *
 * Bootstrap-Muster wie e2e/visgraph.spec.ts. Eigene Fake-Worker-Bridge auf
 * Port 8600 (Hauptbaum-Bridge) — hier nicht gebraucht (keine Render-Jobs
 * in dieser Suite), `kosmo.bridge` wird trotzdem gesetzt, damit ein zufälliger
 * Poll (Timeout-Wächter im NodeCanvas) nie gegen den Hauptbaum-Port 8600 läuft.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          byKind: (k: string) => { id: string; nodes?: { id: string; typ: string; x: number; y: number }[] }[];
        };
      };
    };
  }
}

/** viewBox="x y w h" → { w, h } — für Zoom-/Fit-Vergleiche. */
function parseViewBox(vb: string): { x: number; y: number; w: number; h: number } {
  const [x, y, w, h] = vb.split(' ').map(Number);
  return { x: x!, y: y!, w: w!, h: h! };
}

async function oeffneVis(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
}

test('Zoom-Steuerleiste: Plus/Minus ändern die viewBox-Skalierung', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  const canvas = page.locator('[data-testid="node-canvas"]');
  const vbVorher = parseViewBox((await canvas.getAttribute('viewBox'))!);

  // Plus verkleinert die viewBox (mehr Zoom → weniger Canvas-Fläche sichtbar).
  await page.click('[data-testid="vis-zoom-plus"]');
  const vbNachPlus = parseViewBox((await canvas.getAttribute('viewBox'))!);
  expect(vbNachPlus.w).toBeLessThan(vbVorher.w);

  // Minus (zweimal, um den Plus-Schritt zu überholen) vergrössert sie wieder.
  await page.click('[data-testid="vis-zoom-minus"]');
  await page.click('[data-testid="vis-zoom-minus"]');
  const vbNachMinus = parseViewBox((await canvas.getAttribute('viewBox'))!);
  expect(vbNachMinus.w).toBeGreaterThan(vbNachPlus.w);
});

test('Fit nach manuellem Pan zentriert die Ansicht wieder auf die Nodes', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  const canvas = page.locator('[data-testid="node-canvas"]');
  // Referenz-Fit EINMAL per Klick auslesen (nicht den Mount-Auto-Fit direkt
  // nehmen: die Canvas-Fläche kann sich kurz nach dem Mount noch per
  // ResizeObserver nachjustieren — ein Klick auf «Fit» liest sie IMMER frisch,
  // das ist der stabile Vergleichspunkt für «vorher/nachher»).
  await page.click('[data-testid="vis-zoom-fit"]');
  const vbSoll = (await canvas.getAttribute('viewBox'))!;

  // Manuell wegpannen (wie die F6-Tests in visgraph.spec.ts).
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2, { steps: 8 });
  await page.mouse.up();
  const vbNachPan = (await canvas.getAttribute('viewBox'))!;
  expect(vbNachPan).not.toBe(vbSoll);

  // «Fit» ruft dieselbe Einpass-Funktion wie der Mount-Auto-Fit — bei
  // unveränderter Nodemenge und Canvas-Fläche ist das Ergebnis identisch.
  await page.click('[data-testid="vis-zoom-fit"]');
  await expect(canvas).toHaveAttribute('viewBox', vbSoll);
});

test('Drei Stimmungen: alle Node-Bounding-Boxen sind paarweise disjunkt (kein Overlap)', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  // 2 Quellen (Modell/Material) + 3× (Stimmung/Kombinierer/Render) + Vergleich = 12
  const nodes = page.locator(
    '[data-testid="vis-node-modell"], [data-testid="vis-node-material"], [data-testid="vis-node-stimmung"], [data-testid="vis-node-kombinierer"], [data-testid="vis-node-render"], [data-testid="vis-node-vergleich"]',
  );
  const anzahl = await nodes.count();
  expect(anzahl).toBe(12);

  const boxen: { x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < anzahl; i++) {
    const b = await nodes.nth(i).boundingBox();
    expect(b).not.toBeNull();
    boxen.push(b!);
  }
  const ueberlappt = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      expect(ueberlappt(boxen[i]!, boxen[j]!), `Node ${i} und ${j} überlappen`).toBe(false);
    }
  }
});

test('SK-V3 Prompt-Clamp: langer Text lässt die Karte NICHT wachsen, node-expand zeigt den vollen Text', async ({
  page,
}) => {
  await oeffneVis(page);
  await page.click('[data-testid="graph-neu"]');
  await page.selectOption('[data-testid="node-hinzu"]', 'prompt');
  await page.selectOption('[data-testid="node-hinzu"]', 'kombinierer');

  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  const kombNode = page.locator('[data-testid="vis-node-kombinierer"]');
  await expect(promptNode).toBeVisible();
  await expect(kombNode).toBeVisible();

  // Basis-Höhe VOR dem langen Text (Kombinierer ist noch leer/kurz).
  const hoeheLeer = (await kombNode.boundingBox())!.height;

  // prompt.prompt → kombinierer.stil verbinden (Port-Drag, wie in
  // visgraph.spec.ts «Node-Canvas-Handwerk»).
  const ausPort = promptNode.locator('[data-testid="port-out-prompt"]');
  const einPort = kombNode.locator('[data-testid="port-in-stil"]');
  const aus = (await ausPort.boundingBox())!;
  const ein = (await einPort.boundingBox())!;
  await page.mouse.move(aus.x + aus.width / 2, aus.y + aus.height / 2);
  await page.mouse.down();
  await page.mouse.move((aus.x + ein.x) / 2, (aus.y + ein.y) / 2, { steps: 6 });
  await page.mouse.move(ein.x + ein.width / 2, ein.y + ein.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(1, { timeout: 5000 });

  // Ein langer Stil-Text — der Kombinierer-Prompt reicht weit über 3 Zeilen.
  const langerText = Array.from({ length: 24 }, (_, i) => `Merkmal ${i + 1}`).join(', ');
  await promptNode.locator('[data-testid="prompt-text"]').fill(langerText);
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 30 } });
  await expect(kombNode.locator('[data-testid="kombinierer-prompt"]')).toContainText('Merkmal 1,');

  // Die Karte wächst NICHT von selbst — 3-Zeilen-Clamp hält die Höhe fest
  // (kleine Toleranz für Sub-Pixel-Rundung zwischen zwei Messungen).
  const hoeheMitLangText = (await kombNode.boundingBox())!.height;
  expect(Math.abs(hoeheMitLangText - hoeheLeer)).toBeLessThan(1.5);

  // node-expand klappt den Node auf — die Karte wächst SICHTBAR, und der
  // Knopf-Text wechselt (Beweis: der volle Text ist jetzt ungeklammert).
  const mehrKnopf = kombNode.locator('[data-testid="node-expand"]');
  await expect(mehrKnopf).toHaveText('… mehr');
  await mehrKnopf.click();
  await expect(mehrKnopf).toHaveText('weniger');
  const hoeheOffen = (await kombNode.boundingBox())!.height;
  expect(hoeheOffen).toBeGreaterThan(hoeheMitLangText + 10);
  // Der volle Text steht im DOM (nicht nur ein CSS-Clamp-Trick auf Teiltext).
  await expect(kombNode.locator('[data-testid="kombinierer-prompt"]')).toContainText('Merkmal 24');
});
