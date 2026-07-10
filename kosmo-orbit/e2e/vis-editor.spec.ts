import { expect, test, type Page } from '@playwright/test';
import { viewportAufnahme } from './sim/bausteine';

/**
 * v0.6.7 Stream V1 (Nachtkampagne) — der neue Node-Editor-Feinschliff:
 * Mehrfachauswahl (Marquee/Shift-Klick), Gruppen-Drag mit EINEM Undo-Schritt,
 * Grid-Snap, Ausrichten/Verteilen (Commit 1); orthogonales Kanten-Routing und
 * echter Node-Kollaps (Commit 2). Ausserdem die H-32/H-36-Regressionsbeweise
 * (docs/SIM-BEFUNDE.md) — Auflage 0 und Auflage H-36 an diese Welle.
 *
 * Bootstrap-Muster wie e2e/vis-oberflaeche.spec.ts: eigene Fake-Worker-Bridge
 * auf Port 8600, kein Port fest verdrahtet (KOSMO_E2E_PORT/playwright.config.ts).
 * Jeder Fall startet FRISCH (eigener `test()`, eigener `page.goto('/')`).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      open: (s: string) => void;
      state: () => {
        doc: {
          byKind: (k: string) => Array<{
            id: string;
            nodes?: { id: string; typ: string; x: number; y: number; collapsed?: boolean }[];
            edges?: { id: string; from: string; to: string }[];
          }>;
        };
        undo: () => void;
      };
    };
  }
}

async function oeffneVis(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
}

/** Frischer, leerer Graph — Grundlage für die deterministischen Editor-Tests
 * (keine Kanten/Ketten-Nodes im Weg, im Gegensatz zu «Drei Stimmungen»). */
async function neuerLeererGraph(page: Page): Promise<void> {
  await oeffneVis(page);
  await page.click('[data-testid="graph-neu"]');
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
}

async function knotenSetzen(page: Page, typ: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ typ, x, y }) => {
      const k = window.__kosmo;
      const graph = k.state().doc.byKind('visgraph')[0]!;
      k.run('vis.nodeSetzen', { graphId: graph.id, typ, x, y });
    },
    { typ, x, y },
  );
}

async function knotenPosition(page: Page, typ: string): Promise<{ x: number; y: number }> {
  return page.evaluate((typ) => {
    const graph = window.__kosmo.state().doc.byKind('visgraph')[0]!;
    const n = graph.nodes!.find((n) => n.typ === typ)!;
    return { x: n.x, y: n.y };
  }, typ);
}

/**
 * Umgebungs-Eigenheit dieser Chromium/Playwright-Kombination (reproduziert
 * SOGAR am unveränderten Bestandscode, nicht durch diese Welle verursacht):
 * ein ZWEITES echtes Mehrschritt-Pointer-Drag im selben Testlauf liefert
 * KEINE Folge-Events mehr, wenn ihm nicht irgendeine `.fill()`-artige
 * Eingabefeld-Interaktion vorausgeht (genau das Muster, das
 * visgraph.spec.ts «Node-Canvas-Handwerk» bereits nutzt: Port-Drag → `fill`
 * → Klick(30,30) → Node-Drag). Dieser Helfer reproduziert das Muster
 * zwischen zwei Drag-Gesten im selben Test — reine Testumgebungs-Massnahme,
 * keine Produktänderung.
 */
async function dragReset(page: Page, promptNode: import('@playwright/test').Locator): Promise<void> {
  await promptNode.locator('[data-testid="prompt-text"]').fill('reset');
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 30 } });
}

test('Mehrfachauswahl: Shift-Marquee wählt mehrere Nodes, Akzent-Rahmen sichtbar, Escape leert', async ({ page }) => {
  await neuerLeererGraph(page);
  await knotenSetzen(page, 'prompt', 100, 100);
  await knotenSetzen(page, 'zahl', 100, 320);
  await knotenSetzen(page, 'material', 100, 540);

  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  const zahlNode = page.locator('[data-testid="vis-node-zahl"]');
  const materialNode = page.locator('[data-testid="vis-node-material"]');
  await expect(promptNode).toBeVisible();
  await expect(zahlNode).toBeVisible();
  await expect(materialNode).toBeVisible();

  const boxen = await Promise.all([promptNode, zahlNode, materialNode].map((n) => n.boundingBox()));
  const minX = Math.min(...boxen.map((b) => b!.x)) - 15;
  const minY = Math.min(...boxen.map((b) => b!.y)) - 15;
  const maxX = Math.max(...boxen.map((b) => b!.x + b!.width)) + 15;
  const maxY = Math.max(...boxen.map((b) => b!.y + b!.height)) + 15;

  // Marquee NUR mit Shift (ohne Shift bliebe das ein Pan) — Escape leert danach.
  await page.mouse.move(minX, minY);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(maxX, maxY, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  await expect(page.locator('[data-testid="vis-node-ausgewaehlt"]')).toHaveCount(3);

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="vis-node-ausgewaehlt"]')).toHaveCount(0);

  // Der historische Canvas-Testpunkt (30,30) bleibt frei/klickbar — die neue
  // Marquee-Logik greift nur mit Shift, ein normaler Klick pannt wie bisher.
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 30 } });
});

test('Gruppen-Drag: verschiebt alle ausgewählten Nodes gemeinsam, EIN Undo macht alle rückgängig', async ({ page }) => {
  await neuerLeererGraph(page);
  await knotenSetzen(page, 'prompt', 100, 100);
  await knotenSetzen(page, 'zahl', 100, 320);
  await knotenSetzen(page, 'material', 100, 540);

  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  const zahlNode = page.locator('[data-testid="vis-node-zahl"]');
  const materialNode = page.locator('[data-testid="vis-node-material"]');
  await expect(promptNode).toBeVisible();
  await expect(zahlNode).toBeVisible();
  await expect(materialNode).toBeVisible();

  // Einzelauswahl (ersetzt) + zwei Shift-Klicks (toggeln dazu) — die Gruppe
  // steht ohne Marquee, wie die Owner-Auflage es beschreibt.
  await promptNode.click({ position: { x: 70, y: 12 } });
  await zahlNode.click({ position: { x: 70, y: 12 }, modifiers: ['Shift'] });
  await materialNode.click({ position: { x: 70, y: 12 }, modifiers: ['Shift'] });
  await expect(page.locator('[data-testid="vis-node-ausgewaehlt"]')).toHaveCount(3);

  // Snap aus: die drei Nodes haben verschiedene y-Reste modulo 24 (100/320/540)
  // — mit Snap AN rundet jeder Node unabhängig, was den EINEN gemeinsamen
  // Rohversatz leicht verfälscht (kein Bug, reine Rasterrundung je Node).
  // Dieser Test prüft den reinen Gruppen-Effekt; Grid-Snap hat sein eigenes Test.
  await page.click('[data-testid="vis-snap-toggle"]');
  await dragReset(page, promptNode);

  const vor = {
    prompt: await knotenPosition(page, 'prompt'),
    zahl: await knotenPosition(page, 'zahl'),
    material: await knotenPosition(page, 'material'),
  };

  // Drag am Kopf EINES ausgewählten Nodes bewegt die ganze Gruppe.
  const box = (await promptNode.boundingBox())!;
  await page.mouse.move(box.x + 70, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + 70, box.y + 12 + 60, { steps: 4 });
  await page.mouse.move(box.x + 70, box.y + 12 + 130, { steps: 4 });
  await page.mouse.up();

  const nach = {
    prompt: await knotenPosition(page, 'prompt'),
    zahl: await knotenPosition(page, 'zahl'),
    material: await knotenPosition(page, 'material'),
  };
  const dyPrompt = nach.prompt.y - vor.prompt.y;
  expect(dyPrompt).not.toBe(0);
  expect(nach.zahl.y - vor.zahl.y).toBe(dyPrompt);
  expect(nach.material.y - vor.material.y).toBe(dyPrompt);

  // EIN Undo-Schritt macht ALLE drei rückgängig (beginGroup/endGroup-Batch).
  await page.evaluate(() => window.__kosmo.state().undo());
  const nachUndo = {
    prompt: await knotenPosition(page, 'prompt'),
    zahl: await knotenPosition(page, 'zahl'),
    material: await knotenPosition(page, 'material'),
  };
  expect(nachUndo.prompt).toEqual(vor.prompt);
  expect(nachUndo.zahl).toEqual(vor.zahl);
  expect(nachUndo.material).toEqual(vor.material);
});

test('Grid-Snap: Drag landet auf einer 24er-Koordinate; Toggle aus lässt eine krumme Koordinate stehen', async ({ page }) => {
  await neuerLeererGraph(page);
  await knotenSetzen(page, 'prompt', 101, 103);
  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  await expect(promptNode).toBeVisible();
  await expect(page.locator('[data-testid="vis-snap-toggle"]')).toHaveAttribute('aria-pressed', 'true');

  const box1 = (await promptNode.boundingBox())!;
  await page.mouse.move(box1.x + 70, box1.y + 12);
  await page.mouse.down();
  await page.mouse.move(box1.x + 70 + 137, box1.y + 12 + 89, { steps: 6 });
  await page.mouse.up();
  const nachSnap = await knotenPosition(page, 'prompt');
  expect(nachSnap.x % 24).toBe(0);
  expect(nachSnap.y % 24).toBe(0);

  // Snap ausschalten — derselbe Zug (137/89 px) landet jetzt auf einer
  // Koordinate, die NICHT auf beiden Achsen ein Vielfaches von 24 ist.
  await page.click('[data-testid="vis-snap-toggle"]');
  await expect(page.locator('[data-testid="vis-snap-toggle"]')).toHaveAttribute('aria-pressed', 'false');
  await dragReset(page, promptNode);
  const box2 = (await promptNode.boundingBox())!;
  await page.mouse.move(box2.x + 70, box2.y + 12);
  await page.mouse.down();
  await page.mouse.move(box2.x + 70 + 137, box2.y + 12 + 89, { steps: 6 });
  await page.mouse.up();
  const nachOhneSnap = await knotenPosition(page, 'prompt');
  expect(nachOhneSnap.x % 24 === 0 && nachOhneSnap.y % 24 === 0).toBe(false);
});

test('Ausrichten-links: setzt bei ≥2 ausgewählten Nodes dieselbe x (min-x aller)', async ({ page }) => {
  await neuerLeererGraph(page);
  await knotenSetzen(page, 'prompt', 100, 100);
  await knotenSetzen(page, 'zahl', 350, 300);
  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  const zahlNode = page.locator('[data-testid="vis-node-zahl"]');
  await expect(promptNode).toBeVisible();
  await expect(zahlNode).toBeVisible();
  await expect(page.locator('[data-testid="vis-ausrichten-leiste"]')).toHaveCount(0);

  await promptNode.click({ position: { x: 70, y: 12 } });
  await zahlNode.click({ position: { x: 70, y: 12 }, modifiers: ['Shift'] });
  await expect(page.locator('[data-testid="vis-node-ausgewaehlt"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="vis-ausrichten-leiste"]')).toBeVisible();

  await page.click('[data-testid="vis-ausrichten-links"]');

  const posPrompt = await knotenPosition(page, 'prompt');
  const posZahl = await knotenPosition(page, 'zahl');
  expect(posPrompt.x).toBe(posZahl.x);
  expect(posPrompt.x).toBe(100);
});

test('H-32-Regression: Formularfeld setzen, dann «Ausführen» zeigt das Render-Bild (nicht für immer «veraltet»)', async ({
  page,
}) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  const ersterRender = page.locator('[data-testid="vis-node-render"]').first();
  await expect(ersterRender).toBeVisible();

  await ersterRender.locator('[data-testid="render-formular-szene"]').selectOption('Aussenansicht vom Hof');
  await ersterRender.locator('[data-testid="render-formular-jahreszeit"]').selectOption('Winter');
  await ersterRender.locator('[data-testid="render-ausfuehren"]').click();

  // VOR dem Fix blieb der Status nach «fertig» als «veraltet» stehen und
  // render-bild wurde nie sichtbar (docs/SIM-BEFUNDE.md H-32).
  await expect(ersterRender.locator('[data-testid="render-status"]')).toHaveText('fertig', { timeout: 25000 });
  await expect(ersterRender.locator('[data-testid="render-bild"]')).toBeVisible();
  const breite = await ersterRender
    .locator('[data-testid="render-bild"]')
    .evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(breite).toBeGreaterThan(0);
});

test('H-36-Nachweis: Kuratier-Fläche nimmt auch einen aufnahme-Node mit vorhandenem Bild auf', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
  await viewportAufnahme(page);
  await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible();
  await page.click('[data-testid="graph-neu"]');
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

  await page.selectOption('[data-testid="node-hinzu"]', 'aufnahme');
  await expect(page.locator('[data-testid="vis-node-aufnahme"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="aufnahme-bild"]')).toBeVisible();

  await page.click('[data-testid="vis-kuratier-toggle"]');
  await expect(page.locator('[data-testid="vis-kuratier-flaeche"]')).toBeVisible();
  await expect(page.locator('[data-testid="vis-kuratier-karte"]')).toHaveCount(1);
});
