import { expect, test, type Page } from '@playwright/test';
import { waehleOptionInScope } from './helfer/waehleOption';

/**
 * Owner-Befund K20/A10 — KosmoVis-Automatik: Auto-Kamera (deterministisch aus
 * den Modell-Bounds) + Cycles-Presets (Datentabelle) im Node-Tree. Kette:
 * TKB laden → Vis öffnen → Drei Stimmungen (Basisgraph) → Kamera vorschlagen
 * (Auto-Kamera-Node + Verbindung zu jedem Render-Node) → Preset wählen →
 * Ausführen (Fake-Worker) → Render-Bild erscheint.
 *
 * HINWEIS für den Koordinator: braucht den laufenden Preview-Build + die
 * Fake-Worker-Bridge (`kosmo-bridge --fake-worker --port 8600`), analog zu
 * e2e/visgraph.spec.ts, dessen Bootstrap-Muster dieser Test übernimmt.
 *
 * W1-Anpassung (Begründung): dieser Worktree-Stream läuft mit einer EIGENEN
 * Fake-Worker-Bridge auf Port 8600 (Hauptbaum-Default) — `kosmo.bridge` wird darum
 * explizit gesetzt, die render-scene.json-Polls zeigen auf denselben Port.
 * Reine Testumgebungs-Anpassung, keine Vertragsänderung. (Die ursprüngliche
 * Koordinator-Warnung «nicht im Batch-Worktree» galt für den Fall EINES
 * geteilten Ports — mit eigenem Port pro Stream entfällt der Grund.)
 *
 * v0.8.10 / P-B1 (`docs/V0810-SPEZ.md` §2 E2, Matrix C-4/C-5) — BEIDE Tests
 * KREUZEN Design (`load-tkb`/`kennzahlen`) UND Vis, genau wie
 * `e2e/vis-editor.spec.ts`s H-36 — ein voll leerer `storageState` würde ALLE
 * vier Stationen auf Island kippen und damit in Design's Manuell-Modus
 * eingreifen (Sanktion 6). TEIL-Seed (design/publish/prepare bleiben
 * 'manuell', `visOberflaeche` fehlt bewusst → echter Produktions-Default
 * 'island' via `ui-zustand.ts`s Fehlertoleranz) statt des globalen
 * `manuell-seed.ts`-Helfers (bleibt unangetastet). Bootstrap auf die GRAPH-/
 * STIMMUNG-/AUSTAUSCH-Inseln umgestellt; die Node-Ebene bleibt unverändert
 * (Sanktion 6). **Deklarierte Assertion-Änderung:** `tab-graph` → `vis-
 * island-fuellen` (Tab-System existiert im Island-Modus nicht mehr, C-15).
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

const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: `http://localhost:${PORT}`,
        localStorage: [
          {
            name: 'kosmo.ui.v1',
            value: JSON.stringify({
              version: 1,
              modusAutomatik: false,
              modusFesthalten: false,
              phasenFokus: null,
              designOberflaeche: 'manuell',
              publishOberflaeche: 'manuell',
              prepareOberflaeche: 'manuell',
            }),
          },
          {
            name: 'kosmo.leistung.v1',
            value: JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: false }),
          },
          { name: 'kosmo.dock.presetInit.v1', value: '1' },
        ],
      },
    ],
  },
});

/** Muster `e2e/blender-bridge.spec.ts`s `oeffneVisWerkzeug`. */
async function oeffneVisWerkzeug(page: Page, island: string, werkzeugId: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-werkzeug-${werkzeugId}"]`)).toBeVisible();
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
}

test('KosmoVis-Automatik: Auto-Kamera-Node + Cycles-Preset am Render-Node, Fake-Render liefert ein Bild', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));

  // TKB laden (Beispielprojekt) — nicht leer, damit Auto-Kamera echte Bounds hat
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  // Vis öffnen (der Home-Kachelweg ist nach dem TKB-Laden nicht mehr sichtbar —
  // derselbe __kosmo.open()-Weg wie in e2e/module.spec.ts)
  await page.evaluate(() => window.__kosmo.open('vis'));
  // Deklarierte Assertion-Änderung (s. Datei-Kopf): `vis-island-fuellen`
  // statt `tab-graph` — das Tab-System existiert im Island-Modus nicht mehr.
  await expect(page.locator('[data-testid="vis-island-fuellen"]')).toBeVisible();

  // Drei Stimmungen legt den Basisgraphen an: 3 Render-Nodes, 15 Kanten
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(15);

  // Kamera vorschlagen: legt EINEN Auto-Kamera-Node an und verbindet ihn mit
  // JEDEM Render-Node ohne bestehende Kamera-Verbindung (+3 Kanten) — AUSTAUSCH-
  // Insel-Sofort-Aktion, ruft dieselbe `kameraVorschlagenAktion` wie der alte
  // `vis-auto-kamera`-Knopf (`VisWorkspace.tsx`s `aktiviereVisIslandWerkzeug`).
  await oeffneVisWerkzeug(page, 'austausch', 'kamera-vorschlagen');
  await expect(page.locator('[data-testid="vis-node-kamera"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(18);
  // Ehrliche Anzeige am Node — reine Ableitung, keine KI-Wahl
  const kameraListe = page.locator('[data-testid="vis-node-kamera"] [data-testid="vis-auto-kamera-liste"]');
  await expect(kameraListe).toContainText('Eingang');
  await expect(kameraListe).toContainText('Vorschlag aus dem Modell');

  // Preset am ERSTEN Render-Node wählen (bestehender vis.nodeParametrieren-Weg)
  const ersterRenderNode = page.locator('[data-testid="vis-node-render"]').first();
  await waehleOptionInScope(ersterRenderNode, 'vis-preset-select', 'praesentation');

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

/**
 * v0.6.4 / F6 — Owner-Befund (Live-Test 0.6.3-Desktop): «KosmoVis ist auf
 * einen Fehler gelaufen» beim Pannen des Node-Trees, NACH «Kamera
 * vorschlagen» (A10-Kamera-Node im Graph). Ursache und Fix siehe
 * e2e/visgraph.spec.ts (NodeCanvas.tsx onPointerMove: `panning.current`
 * wurde lazy im setView-Updater gelesen statt beim Event geschnappt — ein
 * dazwischenfeuerndes pointerup konnte den Ref auf null setzen, bevor der
 * Updater lief). Dieser Test stellt dieselbe Nachstellung an, aber MIT dem
 * Auto-Kamera-Node im Graph (der Verdacht des Owner-Befunds: die neue
 * Node-Art als Renderer-Sonderfall) — Repro + Regression zugleich.
 */
test('F6: Pannen nach «Kamera vorschlagen» stürzt nicht ab (Maus-Pan + synchrone Race)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // W1: eigene Bridge (Begründung siehe Datei-Kopf)
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
  await page.evaluate(() => window.__kosmo.open('vis'));
  // Deklarierte Assertion-Änderung (s. Datei-Kopf): `vis-island-fuellen`
  // statt `tab-graph`.
  await expect(page.locator('[data-testid="vis-island-fuellen"]')).toBeVisible();

  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await oeffneVisWerkzeug(page, 'austausch', 'kamera-vorschlagen');
  await expect(page.locator('[data-testid="vis-node-kamera"]')).toHaveCount(1);

  const canvas = page.locator('[data-testid="node-canvas"]');
  const box = (await canvas.boundingBox())!;

  // Alltags-Geste: Maus-Pan + Wheel.
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.85);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, -300);
  await expect(page.locator('[data-testid="fehlerzone"]')).toHaveCount(0);

  // Deterministische Nachstellung der Race (siehe visgraph.spec.ts) — mit
  // dem Auto-Kamera-Node im Graph, exakt die vom Owner-Befund benannte
  // Konstellation (A10-Kamera-Node + Pan).
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
  await expect(page.locator('[data-testid="vis-node-kamera"]')).toBeVisible();
});
