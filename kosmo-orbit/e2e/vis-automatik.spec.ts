import { expect, test } from '@playwright/test';

/**
 * Owner-Befund K20/A10 — KosmoVis-Automatik: Auto-Kamera (deterministisch aus
 * den Modell-Bounds) + Cycles-Presets (Datentabelle) im Node-Tree. Kette:
 * TKB laden → Vis öffnen → Drei Stimmungen (Basisgraph) → Kamera vorschlagen
 * (Auto-Kamera-Node + Verbindung zu jedem Render-Node) → Preset wählen →
 * Ausführen (Fake-Worker) → Render-Bild erscheint.
 *
 * HINWEIS für den Koordinator: NICHT im Batch-Worktree laufen lassen (Ports
 * gehören dem Hauptbaum) — braucht den laufenden Preview-Build + die
 * Fake-Worker-Bridge (`kosmo-bridge --fake --port 8600`), analog zu
 * e2e/visgraph.spec.ts, dessen Bootstrap-Muster dieser Test übernimmt.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      open: (s: string) => void;
      state: () => {
        doc: {
          byKind: (k: string) => { id: string; nodes?: { id: string; typ: string }[]; edges?: unknown[] }[];
        };
      };
    };
  }
}

test('KosmoVis-Automatik: Auto-Kamera-Node + Cycles-Preset am Render-Node, Fake-Render liefert ein Bild', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));

  // TKB laden (Beispielprojekt) — nicht leer, damit Auto-Kamera echte Bounds hat
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();

  // Vis öffnen (der Home-Kachelweg ist nach dem TKB-Laden nicht mehr sichtbar —
  // derselbe __kosmo.open()-Weg wie in e2e/module.spec.ts)
  await page.evaluate(() => window.__kosmo.open('vis'));
  await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible();

  // Drei Stimmungen legt den Basisgraphen an: 3 Render-Nodes, 15 Kanten
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(15);

  // Kamera vorschlagen: legt EINEN Auto-Kamera-Node an und verbindet ihn mit
  // JEDEM Render-Node ohne bestehende Kamera-Verbindung (+3 Kanten)
  await page.click('[data-testid="vis-auto-kamera"]');
  await expect(page.locator('[data-testid="vis-node-kamera"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(18);
  // Ehrliche Anzeige am Node — reine Ableitung, keine KI-Wahl
  const kameraListe = page.locator('[data-testid="vis-node-kamera"] [data-testid="vis-auto-kamera-liste"]');
  await expect(kameraListe).toContainText('Eingang');
  await expect(kameraListe).toContainText('Vorschlag aus dem Modell');

  // Preset am ERSTEN Render-Node wählen (bestehender vis.nodeParametrieren-Weg)
  const ersterRenderNode = page.locator('[data-testid="vis-node-render"]').first();
  await ersterRenderNode.locator('[data-testid="vis-preset-select"]').selectOption('praesentation');

  // Ausführen — Fake-Worker beantwortet den Job, das Bild hängt am Node
  await ersterRenderNode.locator('[data-testid="render-ausfuehren"]').click();
  await expect(ersterRenderNode.locator('[data-testid="render-status"]')).not.toHaveText('bereit');
  await expect(ersterRenderNode.locator('[data-testid="render-bild"]')).toBeVisible({ timeout: 25000 });
  const bildBreite = await ersterRenderNode
    .locator('[data-testid="render-bild"]')
    .evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(bildBreite).toBeGreaterThan(0);

  // Beweis aus der render-scene.json: das Präsentations-Preset (1920×1200,
  // Sonne 200°/32°) kam tatsächlich im Job an — kein reines UI-Vorgeben.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const jobs = (await (await fetch('http://localhost:8600/jobs')).json()) as { job_id: string }[];
          for (const j of jobs) {
            try {
              const scene = (await (
                await fetch(`http://localhost:8600/jobs/${j.job_id}/artifacts/render-scene.json`)
              ).json()) as { render?: { resolution?: number[]; sun?: { elevation?: number } } };
              if (scene.render?.resolution?.[0] === 1920 && scene.render?.sun?.elevation === 32) return true;
            } catch {
              /* nicht jeder Job hat eine render-scene.json (z.B. vsplat) — überspringen */
            }
          }
          return false;
        }),
      { timeout: 15000 },
    )
    .toBe(true);

  await page.screenshot({ path: 'e2e-results/vis-automatik.png' });
});
