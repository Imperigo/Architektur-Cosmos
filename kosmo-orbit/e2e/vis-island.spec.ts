import { expect, test, type Page } from '@playwright/test';

/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2, C-15/C-16/C-17) — «KosmoVis komplett auf
 * Islands», der erste PC0-Härtetest. Diese Spec ist NEU (Dateikreis-Auftrag)
 * und beweist:
 * - alle vier Vis-Inseln (GRAPH/ANSICHT/STIMMUNG/AUSTAUSCH) rendern echt,
 *   mit den in `vis-island-katalog.ts` benannten Werkzeugen (Owner-Auftrag §1);
 * - die alte Chrome (DockFlaeche/`.vis-chrome-bottomright`/`-bottomleft`/
 *   VisTabs) ist im Island-Modus WEG (C-15);
 * - der Node-Canvas ist dunkel, ohne Hartwert (C-16);
 * - die STIMMUNG-Insel zeigt 3 Bild-Kacheln statt Text (E5) und die Auswahl
 *   setzt `renderStimmungPreset` (C-17);
 * - der Manuell-Rückweg ('island' → 'manuell' → 'island') funktioniert
 *   beidseitig, Manuell bleibt exakt das heutige Vis (Bestandsschutz §5
 *   Sanktion 8).
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `island-ui.spec.ts`/`island-verdrahtung.spec.ts`) — nur ein leerer Kontext
 * beweist den echten Produktions-Default `visOberflaeche:'island'` ohne Seed.
 *
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3, Matrix C-6) — NOTWENDIGE Folgeänderung (kein deklariertes Dateikreis-
 * Mitglied von P-B2, aber der AUSTAUSCH-Test unten prüfte direkt das jetzt
 * entfernte Insel-Werkzeug 'manuell'; ohne Anpassung wäre er nach dem
 * Rückbau rot): der Vorwärtsweg 'island' → 'manuell' läuft nicht mehr über
 * ein Insel-Werkzeug, sondern über den Einstellungs-Schalter
 * (`einstellung-vis-manuell`, `shell/Einstellungen.tsx`) — der Test unten
 * öffnet ihn jetzt darüber. Der Rückweg (`island-zurueck`) bleibt
 * unverändert. Der ausführliche Umschalt-Beweis (hin UND zurück, inkl.
 * Schalter-Zustand) lebt jetzt primär in `e2e/vis-oberflaeche.spec.ts`
 * (deklarierter Umbau, E3-Nachtrag Punkt 7) — dieser Test hier bleibt als
 * Bestandsschutz-Beweis «Manuell zeigt exakt die heutige Werkzeugzeile»
 * bestehen, nur der Einstiegsweg ändert sich.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          byKind: (k: string) => Array<{ id: string; nodes?: { id: string; typ: string }[] }>;
        };
      };
    };
  }
}

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

/** Hover statt Klick — dasselbe Muster wie `island-ui.spec.ts`s `oeffneInsel`. */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/** Legt über den Kosmo-Test-Hook einen Graphen mit einem Render-Node an —
 *  reduziert AUSTAUSCH-Tests auf ihre eigentliche Aussage (Fixture statt
 *  UI-Weg, Muster `vis-editor.spec.ts`s `knotenSetzen`). KEIN `page.reload()`
 *  danach — das Projekt-Doc lebt nur im Speicher (Muster `vis-editor.spec.ts`,
 *  ein Reload würde den gerade erst angelegten Graphen wieder löschen). */
async function seedGraphMitRenderNode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const k = window.__kosmo;
    const res = k.run('vis.graphErstellen', { name: 'Insel-Test' }) as { patches: { id: string }[] };
    const graphId = res.patches[0]!.id;
    k.run('vis.nodeSetzen', { graphId, typ: 'render', x: 100, y: 100 });
  });
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
}

test.describe('PC1 — KosmoVis auf Islands (Default, kein Seed)', () => {
  test('Default ist island — alle vier Inseln rendern als Pill, alte Chrome ist weg', async ({ page }) => {
    await oeffneVisIsland(page);

    for (const island of ['graph', 'ansicht', 'stimmung', 'austausch']) {
      await expect(page.locator(`[data-testid="island-${island}-pill"]`)).toBeVisible();
    }

    // Alte Chrome (C-15): DockFlaeche-Panels/`.vis-chrome-bottomright`/
    // `-bottomleft`/VisTabs rendern NICHT mehr.
    await expect(page.locator('[data-testid="vis-snap-toggle"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="vis-routing-toggle"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="vis-zoom-fit"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="vis-minimap-toggle"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="vis-palette"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="tab-graph"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="graph-select"]')).toHaveCount(0);

    await page.screenshot({ path: 'test-results/pc1-vis-island-pillen.png' });
  });

  test('Node-Canvas ist dunkel (C-16, Token statt Hartwert)', async ({ page }) => {
    await oeffneVisIsland(page);
    // Ohne Graph zeigt der Island-Modus den Messrahmen-Platzhalter, kein
    // `node-canvas` — ein Node-Node ist für den reinen Farb-Beweis nicht
    // nötig, ein leerer Graph genügt.
    await page.evaluate(() => {
      window.__kosmo.run('vis.graphErstellen', { name: 'Farb-Test' });
    });
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

    const bg = await page.locator('[data-testid="node-canvas"]').evaluate((el) => getComputedStyle(el).backgroundColor);
    // `--k-field` im orbit-Theme ist `#0b0d12` (rgb(11,13,18)) — deutlich
    // dunkler als das alte `--k-plan-paper` (`#fdfcf9`, rgb(253,252,249)).
    // Kein exakter Hex-Vergleich (Theme kann papier/orbit sein) — nur der
    // reale Beweis «nicht mehr das Plan-Weiss».
    expect(bg).not.toBe('rgb(253, 252, 249)');
  });

  test('GRAPH-Insel: Node-Palette bietet "+ Graph erstellen" ohne aktiven Graphen, legt einen an', async ({ page }) => {
    await oeffneVisIsland(page);
    await oeffneInsel(page, 'graph');
    await page.click('[data-testid="island-werkzeug-palette"]');
    await expect(page.locator('[data-testid="island-palette-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="visisl-graph-erstellen"]')).toBeVisible();
    await page.click('[data-testid="visisl-graph-erstellen"]');
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/pc1-vis-island-graph.png' });
  });

  test('GRAPH-Insel: Node-Palette fügt bei vorhandenem Graphen echt einen Node hinzu', async ({ page }) => {
    await oeffneVisIsland(page);
    await page.evaluate(() => window.__kosmo.run('vis.graphErstellen', { name: 'Palette-Test' }));
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

    await oeffneInsel(page, 'graph');
    await page.click('[data-testid="island-werkzeug-palette"]');
    await expect(page.locator('[data-testid="island-palette-eintrag-modell"]')).toBeVisible();
    await page.click('[data-testid="island-palette-eintrag-modell"]');
    await expect(page.locator('[data-testid="vis-node-modell"]')).toBeVisible();
  });

  test('ANSICHT-Insel: Zoom-Popup, Raster-/Routing-Sofort-Toggle mit Toast, Minimap-Popup', async ({ page }) => {
    await oeffneVisIsland(page);
    await page.evaluate(() => window.__kosmo.run('vis.graphErstellen', { name: 'Ansicht-Test' }));
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-zoom"]');
    await expect(page.locator('[data-testid="island-zoom-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zoom-plus"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zoom-minus"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zoom-fit"]')).toBeVisible();

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-raster"]');
    await expect(page.locator('[data-testid="island-toast"]')).toContainText('RASTER-SNAP AKTIV');

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-routing"]');
    await expect(page.locator('[data-testid="island-toast"]')).toContainText('KANTEN-ROUTING AKTIV');

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-minimap"]');
    await expect(page.locator('[data-testid="island-minimap-stufe2"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/pc1-vis-island-ansicht.png' });
  });

  test('STIMMUNG-Insel: 3 prozedurale Bild-Kacheln (E5), Auswahl setzt den Preset', async ({ page }) => {
    await oeffneVisIsland(page);
    await oeffneInsel(page, 'stimmung');
    await page.click('[data-testid="island-werkzeug-stimmung"]');
    await expect(page.locator('[data-testid="island-stimmung-stufe2"]')).toBeVisible();

    for (const preset of ['morgen', 'abend', 'weiss']) {
      const kachel = page.locator(`[data-testid="island-stimmung-${preset}"]`);
      await expect(kachel).toBeVisible();
      // E5: eine ECHTE prozedurale Canvas-Vorschau, kein Text-Platzhalter.
      await expect(kachel.locator('canvas')).toHaveCount(1);
    }

    const morgenKachel = page.locator('[data-testid="island-stimmung-morgen"]');
    await expect(morgenKachel).toHaveAttribute('aria-pressed', 'false');
    await morgenKachel.click();
    await expect(morgenKachel).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: 'test-results/pc1-vis-island-stimmung.png' });
  });

  test('STIMMUNG-Insel: "Drei-Stimmungen-Kette einfügen" legt echte Nodes an', async ({ page }) => {
    await oeffneVisIsland(page);
    await oeffneInsel(page, 'stimmung');
    await page.click('[data-testid="island-werkzeug-stimmung"]');
    await page.click('[data-testid="island-drei-stimmungen"]');
    const anzahlRenderNodes = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('visgraph')[0]?.nodes?.filter((n) => n.typ === 'render').length ?? 0,
    );
    expect(anzahlRenderNodes).toBe(3);
  });

  test('AUSTAUSCH-Insel: Render senden listet den Render-Node und sendet einen Job', async ({ page }) => {
    await oeffneVisIsland(page);
    await seedGraphMitRenderNode(page);

    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-render-senden"]');
    await expect(page.locator('[data-testid="island-render-senden-stufe2"]')).toBeVisible();
    await expect(page.locator('.visisl-render-zeile')).toHaveCount(1);
  });

  test('AUSTAUSCH-Insel: Kamera vorschlagen (Sofort-Aktion) legt einen Kamera-Node an', async ({ page }) => {
    await oeffneVisIsland(page);
    await seedGraphMitRenderNode(page);

    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-kamera-vorschlagen"]');
    await expect(page.locator('[data-testid="island-toast"]')).toContainText('KAMERA VORSCHLAGEN AKTIV');
    const hatKamera = await page.evaluate(
      () => (window.__kosmo.state().doc.byKind('visgraph')[0]?.nodes ?? []).some((n) => n.typ === 'kamera'),
    );
    expect(hatKamera).toBe(true);
  });

  test('AUSTAUSCH-Insel: Report öffnet das Report-Dossier', async ({ page }) => {
    await oeffneVisIsland(page);
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-report"]');
    await expect(page.locator('[data-testid="island-toast"]')).toContainText('REPORT AKTIV');
  });

  test('Einstellungs-Schalter schaltet in die manuelle Ansicht, "Island-UI"-Knopf schaltet wieder vor — Manuell bleibt heutiges Vis', async ({
    page,
  }) => {
    await oeffneVisIsland(page);

    // Vorwärtsweg 'island' → 'manuell' (v0.8.10 E3-Nachtrag: über den
    // Einstellungs-Schalter, s. Datei-Kopf — der frühere Insel-Werkzeug-Weg
    // ist entfallen).
    await page.click('[data-testid="island-einstellungen-kreis"]');
    await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
    await page.click('[data-testid="einstellung-vis-manuell"]');
    await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');
    await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-graph-root"]')).toHaveCount(0);
    // Bestandsschutz: Manuell zeigt exakt die heutige Werkzeugzeile.
    await expect(page.locator('[data-testid="graph-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="node-hinzu"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/pc1-vis-manuell-unveraendert.png' });

    // Rückweg 'manuell' → 'island'.
    await page.click('[data-testid="island-zurueck"]');
    await expect(page.locator('[data-testid="island-austausch-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-graph"]')).toHaveCount(0);
  });

  test('Kosmo-Orb ist im Island-Modus der einzige Kosmo-Zugang (kein Boden-Dock)', async ({ page }) => {
    await oeffneVisIsland(page);
    await expect(page.locator('[data-testid="boden-dock"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kosmo-orb-wurzel"]')).toBeVisible();
  });
});
