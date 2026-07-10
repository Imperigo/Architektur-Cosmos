import { expect, test } from '@playwright/test';
import { viewportAufnahme } from './sim/bausteine';
import { waehleOption } from './helfer/waehleOption';

/**
 * v0.6.7 Phase 0 — Viewport-Aufnahme-Node (Typ `aufnahme`, Kategorie Quelle).
 * Echte lokale Bildquelle aus dem 3D-Viewport: «Für Vis aufnehmen»
 * (Viewport3D.tsx, testid `viewport-aufnahme`) legt einen Schnappschuss in
 * `vis-runtime.aufnahmen`; der `aufnahme`-Node in KosmoVis zeigt ihn — kein
 * Rendering, kein Bridge-Job, funktioniert ohne HomeStation.
 *
 * Kette (Owner-Vorgabe, Briefing v0.6.7 P0): (a) Design öffnen, TKB laden,
 * «Für Vis aufnehmen» → Vis: aufnahme-Node zeigt das Bild; (b) aufnahme→
 * vergleich verbinden funktioniert; (c) aufnahme→blatt: Bild landet auf
 * einem Blatt (sheet.bilder-Delta). Jeder Fall startet FRISCH (eigener
 * `test()`, eigener `page.goto('/')`) — reproduzierbar isoliert lauffähig.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      open: (s: string) => void;
      state: () => {
        doc: {
          byKind: (k: string) => {
            id: string;
            nodes?: { id: string; typ: string }[];
            edges?: unknown[];
            bilder?: unknown[];
          }[];
        };
      };
    };
  }
}

/** TKB laden (Beispielprojekt — nicht leer, damit der Viewport echte
 * Geometrie zeigt) + «Für Vis aufnehmen» + zurück zu KosmoVis. */
async function aufnahmeVorbereiten(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="load-tkb"]'); // [Quelle: vis-automatik.spec.ts Z.43]
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible(); // [Quelle: vis-automatik.spec.ts Z.44]

  await viewportAufnahme(page); // Design → 3D → renderOnce → «Für Vis aufnehmen» → zurück zu Vis
  await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible(); // [Quelle: vis-automatik.spec.ts Z.49]

  // Ohne Graph ist `node-hinzu` disabled (`disabled={!graphId}`, VisWorkspace.tsx
  // Z.327) — erst einen leeren Graph anlegen (Muster vis-oberflaeche.spec.ts Z.156-157).
  await page.click('[data-testid="graph-neu"]');
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
}

test('Viewport-Aufnahme: TKB laden → «Für Vis aufnehmen» → aufnahme-Node zeigt das Bild', async ({ page }) => {
  await aufnahmeVorbereiten(page);

  await waehleOption(page, 'node-hinzu', 'aufnahme'); // [Quelle: VisWorkspace.tsx Z.326, Katalog additiv 11→12]
  await expect(page.locator('[data-testid="vis-node-aufnahme"]')).toHaveCount(1);

  const bild = page.locator('[data-testid="vis-node-aufnahme"] [data-testid="aufnahme-bild"]');
  await expect(bild).toBeVisible();
  // Echtes Bild statt kaputtem Platzhalter — dieselbe naturalWidth-Probe wie
  // visgraph.spec.ts Z.52-56 für die Bridge-Bilder.
  const breite = await bild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(breite).toBeGreaterThan(0);
});

test('aufnahme → vergleich: verbinden funktioniert, das Bild erscheint in der Vergleichsfläche', async ({ page }) => {
  await aufnahmeVorbereiten(page);

  await waehleOption(page, 'node-hinzu', 'aufnahme');
  await waehleOption(page, 'node-hinzu', 'vergleich');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0]!;
    const aufnahme = graph.nodes!.find((n) => n.typ === 'aufnahme')!;
    const vergleich = graph.nodes!.find((n) => n.typ === 'vergleich')!;
    k.run('vis.verbinden', { graphId: graph.id, from: aufnahme.id, fromPort: 'bild', to: vergleich.id, toPort: 'bild1' });
    // Ins Sichtfeld rücken — spät erzeugte Nodes landen weiter unten (Muster visgraph.spec.ts Z.67).
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: vergleich.id, x: 620, y: 40 });
  });
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(1);

  const vergleichBild = page.locator('[data-testid="vergleich-bilder"] img').first();
  await expect(vergleichBild).toBeVisible();
  const breite = await vergleichBild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(breite).toBeGreaterThan(0);
});

test('aufnahme → blatt: das Bild landet auf einem Blatt (sheet.bilder-Delta)', async ({ page }) => {
  await aufnahmeVorbereiten(page);

  await waehleOption(page, 'node-hinzu', 'aufnahme');
  await waehleOption(page, 'node-hinzu', 'blatt');

  const bilderVorher = await page.evaluate(() =>
    window.__kosmo
      .state()
      .doc.byKind('sheet')
      .reduce((s, sh) => s + ((sh.bilder as unknown[] | undefined)?.length ?? 0), 0),
  ); // [Quelle: renderUeberBridge-Baustein, e2e/sim/bausteine.ts]

  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0]!;
    const aufnahme = graph.nodes!.find((n) => n.typ === 'aufnahme')!;
    const blatt = graph.nodes!.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: aufnahme.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: blatt.id, x: 620, y: 320 });
  }); // [Quelle: visgraph.spec.ts Z.58-68]

  await page.locator('[data-testid="blatt-ablegen"]').click();
  // `hasText`-Filter statt nacktem Locator: der «aufgenommen»-Erfolgs-Toast
  // der Aufnahme kann noch sichtbar sein — zwei meldung-erfolg-Elemente
  // verletzen sonst den strict mode.
  await expect(
    page.locator('[data-testid="meldung-erfolg"]', { hasText: 'Render liegt auf' }),
  ).toBeVisible({ timeout: 15000 }); // [Quelle: vis-jobs.ts platziereBildAufsBlatt-Aufrufer]

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__kosmo
          .state()
          .doc.byKind('sheet')
          .reduce((s, sh) => s + ((sh.bilder as unknown[] | undefined)?.length ?? 0), 0),
      ),
    )
    .toBeGreaterThan(bilderVorher);
});
