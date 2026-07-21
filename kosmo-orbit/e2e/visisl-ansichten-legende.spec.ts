import { expect, test, type Page } from '@playwright/test';
import { visManuellStorageState } from './helpers/manuell-seed';

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
    };
    __kosmoVisRuntime: {
      fuegeAufnahmeHinzu: (a: { id: string; dataUrl: string; zeit: number; kamera: string }) => void;
    };
  }
}

/**
 * P-B1/E4 (`docs/V0811-SPEZ.md` §2 E4, Owner-Wahl «Ansichten + Legende») —
 * die zwei letzten P-B1-Audit-Funde ohne Insel-Äquivalent (`GespeicherteAn
 * sichten`/Porttyp-Legende, `wissen/training/claude/lehren/v0.8.10.md` §2)
 * bekommen ihr Insel-Äquivalent in der ANSICHT-Insel
 * (`island/inhalte/ansichten.tsx` NEU, `island/inhalte/legende.tsx` NEU).
 *
 * Diese Spec beweist BEIDE Seiten von Matrix C-6:
 * - Island-only (Default, KEIN Seed — dieselbe `test.use`-Ausserkraftsetzung
 *   wie `e2e/vis-island.spec.ts`): Ansicht speichern → Popup schliessen/neu
 *   öffnen → Wert steht; Legende öffnen → Inhalt sichtbar, geordnet nach dem
 *   im Graphen tatsächlich verwendeten Porttyp.
 * - Manuell-Weg (`visManuellStorageState()`-Seed, Muster `e2e/vis-ansichten.
 *   spec.ts`/`e2e/vis-token.spec.ts`): BEIDE Features zeigen sich UNVERÄNDERT
 *   (Bestandsschutz, Sanktion 4 — kein NodeCanvas.tsx/VisWorkspace.tsx-Edit
 *   in diesem Paket).
 */

const WINZIGES_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('P-B1/E4 — Island: Gespeicherte Ansichten + Legende (Default, kein Seed)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  async function oeffneVisIsland(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
      localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
    });
    await page.reload();
    await page.click('[data-testid="module-vis"]');
  }

  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-root"]`);
    await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
  }

  test('Gespeicherte Ansichten: leer ohne Aufnahme, speichert nach Seed, überlebt Popup schliessen/neu öffnen', async ({
    page,
  }) => {
    await oeffneVisIsland(page);

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-ansichten"]');
    await expect(page.locator('[data-testid="visisl-ansichten-stufe2"]')).toBeVisible();
    // Dieselbe Komponente/testids wie im Manuell-Chrome (`GespeicherteAnsichten.tsx`,
    // unverändert importiert) — leer ohne jede Aufnahme.
    await expect(page.locator('[data-testid="gespeicherte-ansichten"]')).toBeVisible();
    await expect(page.locator('[data-testid="ansicht-slot-iso-leer"]')).toHaveText('Kein Snapshot gespeichert');
    await expect(page.locator('[data-testid="ansicht-slot-iso-speichern"]')).toBeDisabled();

    // Aufnahme seeden (derselbe additive Test-Hook wie `e2e/vis-ansichten.spec.ts`
    // — der echte Aufnahme-Knopf sitzt in `Viewport3D.tsx`, ausserhalb dieses
    // Dateikreises).
    await page.evaluate(
      (url) => window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'insel-snap-1', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
      WINZIGES_PNG,
    );
    await expect(page.locator('[data-testid="ansicht-slot-iso-speichern"]')).toBeEnabled();
    await page.click('[data-testid="ansicht-slot-iso-speichern"]');
    await expect(page.locator('[data-testid="ansicht-slot-iso-autosave"]')).toHaveText('AUTOSAVE · v001');
    await expect(page.locator('[data-testid="ansicht-slot-iso-bild"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/pb1-visisl-ansichten.png' });

    // Popup schliessen (Klick ausserhalb) und wieder aufrufen — «Ansicht
    // speichern → wieder aufrufen» (Bauauftrag Punkt 5): der Runtime-Zustand
    // (`useVisRuntime`) lebt unabhängig vom Popup-Mount, der Slot bleibt gefüllt.
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="visisl-ansichten-stufe2"]')).toHaveCount(0);

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-ansichten"]');
    await expect(page.locator('[data-testid="visisl-ansichten-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="ansicht-slot-iso-autosave"]')).toHaveText('AUTOSAVE · v001');
    await expect(page.locator('[data-testid="ansicht-slot-iso-bild"]')).toBeVisible();
  });

  test('Legende: kein Porttyp ohne Graph, füllt sich mit den echten Porttypen eines Render-Nodes', async ({ page }) => {
    await oeffneVisIsland(page);
    const graphId = await page.evaluate(() => {
      const res = window.__kosmo.run('vis.graphErstellen', { name: 'Legende-Insel-Test' }) as { patches: { id: string }[] };
      return res.patches[0]!.id;
    });
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-legende"]');
    await expect(page.locator('[data-testid="island-legende-stufe2"]')).toBeVisible();
    // Frischer Graph ohne Nodes: noch kein Porttyp — weder im Popup noch als
    // Overlay unten links (K35: das Overlay zeigt die Legende datengetrieben,
    // `vis-island-legende`, NodeCanvas.tsx).
    await expect(page.locator('[data-testid="vis-legende"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="vis-island-legende"]')).toHaveCount(0);

    // Ein Render-Node bringt seine Input-/Output-Ports mit (Muster
    // `e2e/vis-island.spec.ts`s `seedGraphMitRenderNode`) — die Legende zeigt
    // exakt die Porttypen, die dieser Node-Katalog-Eintrag deklariert
    // (`VIS_NODE_KATALOG.render`, `derive/visgraph.ts`). DERSELBE Graph
    // (nicht ein zweiter) — `aktiverGraphId` folgt dem von `NodeCanvas.tsx`
    // gemounteten Graphen, ein zweiter `vis.graphErstellen`-Aufruf würde ohne
    // UI-Wechsel am ERSTEN (leeren) Graphen hängen bleiben.
    await page.evaluate((gid) => window.__kosmo.run('vis.nodeSetzen', { graphId: gid, typ: 'render', x: 100, y: 100 }), graphId);
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

    // K35 (Owner-Korrekturen 2026-07, S.14/K36 «legende ist gut»): sobald der
    // Graph Nodes mit Porttypen trägt, steht die Legende zusätzlich als
    // eigenständiges Overlay unten links (vormals Minimap-Begleiter — die
    // Minimap selbst ist entfernt). Die Assertions aufs Popup sind darum auf
    // den Stufe-2-Container gescopet (zwei `vis-legende`-Instanzen sind
    // seither gleichzeitig sichtbar).
    await expect(page.locator('[data-testid="vis-island-legende"]')).toBeVisible();
    await expect(page.locator('[data-testid="vis-island-legende"] .vis-legende-zeile', { hasText: 'Szene' })).toBeVisible();

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-legende"]');
    const stufe2 = page.locator('[data-testid="island-legende-stufe2"]');
    await expect(stufe2).toBeVisible();
    await expect(stufe2.locator('[data-testid="vis-legende"]')).toBeVisible();
    await expect(stufe2.locator('.vis-legende-zeile')).not.toHaveCount(0);
    // «Szene» ist der Eingangsport jedes Render-Nodes (`VIS_NODE_KATALOG`) —
    // muss in der Legende auftauchen.
    await expect(stufe2.locator('.vis-legende-zeile', { hasText: 'Szene' })).toBeVisible();

    await page.screenshot({ path: 'test-results/pb1-visisl-legende.png' });
  });
});

test.describe('P-B1/E4 — Manuell-Weg zeigt beide Features unverändert (Bestandsschutz)', () => {
  test.use({ storageState: visManuellStorageState() });

  async function oeffneVisManuell(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.vis.onboarded', '1');
      localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
    });
    await page.reload();
    await page.click('[data-testid="module-vis"]');
  }

  test('Manuell: «Ansichten»-Tab zeigt GespeicherteAnsichten unverändert (byte-still)', async ({ page }) => {
    await oeffneVisManuell(page);
    await page.click('[data-testid="tab-ansichten"]');
    await expect(page.locator('[data-testid="gespeicherte-ansichten"]')).toBeVisible();
    for (const slot of ['iso', 'nord', 'detail']) {
      await expect(page.locator(`[data-testid="ansicht-slot-${slot}-leer"]`)).toHaveText('Kein Snapshot gespeichert');
    }

    await page.evaluate(
      (url) => window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'manuell-snap-1', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
      WINZIGES_PNG,
    );
    await page.click('[data-testid="ansicht-slot-detail-speichern"]');
    await expect(page.locator('[data-testid="ansicht-slot-detail-autosave"]')).toHaveText('AUTOSAVE · v001');
  });

  test('Manuell: Porttyp-Legende (NodeCanvas-Dock-Panel) zeigt sich unverändert, sobald ein Node im Graphen liegt', async ({
    page,
  }) => {
    await oeffneVisManuell(page);
    await page.evaluate(() => {
      const k = window.__kosmo;
      const res = k.run('vis.graphErstellen', { name: 'Manuell-Legende-Test' }) as { patches: { id: string }[] };
      const graphId = res.patches[0]!.id;
      k.run('vis.nodeSetzen', { graphId, typ: 'render', x: 100, y: 100 });
    });
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="vis-legende"]')).toBeVisible();
    await expect(page.locator('.vis-legende-zeile', { hasText: 'Szene' })).toBeVisible();
  });
});
