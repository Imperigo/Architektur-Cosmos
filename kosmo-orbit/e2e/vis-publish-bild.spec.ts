import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * PB2-088 (V088-SPEZ.md §3 E7, §6 Sanktion 8, §7 C-11) — «Vis→Publish-
 * Bildkette: Fake-Aufnahme aufs Blatt». IST-Analyse (siehe Bericht): der
 * «Aufs Blatt»-Weg (NodeCanvas.tsx `case 'blatt'` → `aufnahmeAufsBlatt`/
 * `bildAufsBlatt` in vis-jobs.ts → `publish.bildFuellen`/`bildPlatzieren`,
 * Kernel UNVERÄNDERT) existierte bereits UND füllte `SheetImage.assetId`
 * (bewiesen von `visgraph.spec.ts:33`) — es fehlten aber ZWEI Dinge: das
 * Pflicht-Label «Vorschau (Fake-Render)» (weder `bildFuellen` noch der
 * Aufrufer erzwangen es) und ein Grössen-Deckel (jede dataURL ging
 * ungeprüft ins Doc). Diese Suite beweist die Härtung in
 * `vis-jobs.ts::platziereBildAufsBlatt` (gemeinsamer Kern beider Pfade).
 *
 * Eigene Fake-Bridge auf Port 8600 (Hauptbaum-Default, Muster
 * `visgraph.spec.ts`-Dateikopf) — reine Testumgebungs-Anpassung.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          byKind: (k: string) => {
            id: string;
            typ?: string;
            nodes?: { id: string; typ: string; x: number; y: number }[];
            bilder?: { id: string; assetId: string | null; title?: string }[];
          }[];
          toJSON: () => unknown;
        };
        undo: () => void;
      };
      open: (s: string) => void;
    };
    __kosmoVisRuntime: {
      fuegeAufnahmeHinzu: (a: { id: string; dataUrl: string; zeit: number; kamera: string }) => void;
    };
  }
}

const LABEL_FAKE_RENDER = 'Vorschau (Fake-Render)';

// Winziges valides 1×1-PNG (Bestandsmuster e2e/vis-ansichten.spec.ts) — weit
// unter dem ~1-MiB-Deckel.
const KLEINES_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

// Künstlich übergross (>1 MiB Base64-Zeichen, Owner-Deckel §3 E7) — kein
// Bridge-Fetch nötig, der «Testhook/eigener Weg» ist der bestehende
// `window.__kosmoVisRuntime`-Seed-Hook (Muster e2e/vis-ansichten.spec.ts).
const UEBERGROSSES_BILD = 'data:image/png;base64,' + 'A'.repeat(1_100_000);

async function oeffneVisMitBridge(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.vis.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
  });
  await page.goto('/');
  await page.click('[data-testid="module-vis"]');
}

async function docLaenge(page: Page): Promise<number> {
  return page.evaluate(() => JSON.stringify(window.__kosmo.state().doc.toJSON()).length);
}

test('Fake-Render via Bridge → Aufnahme → Aufs Blatt: Asset gesetzt, Pflicht-Label in der Publish-Ansicht sichtbar', async ({
  page,
}) => {
  await oeffneVisMitBridge(page);

  // 1) Fake-Render via Bridge — derselbe geprüfte Weg wie visgraph.spec.ts:33
  // (Preset baut Modell→Render, «Ausführen» spricht die echte --fake-Bridge
  // auf :8600 an; naturalWidth-Beweis dort bereits erbracht, hier reicht
  // «sichtbar», um die Bridge-Strecke ehrlich mitzubeweisen statt zu simulieren).
  await page.click('[data-testid="drei-stimmungen"]');
  await page.locator('[data-testid="render-ausfuehren"]').first().click();
  await expect(page.locator('[data-testid="render-bild"]').first()).toBeVisible({ timeout: 25000 });

  // 2) Aufnahme — via Test-Hook geseedet (Bestandsmuster e2e/vis-ansichten.spec.ts:
  // der echte Aufnahme-Knopf sitzt in Viewport3D.tsx, anderes Paket/Cluster A).
  await waehleOption(page, 'node-hinzu', 'aufnahme');
  await waehleOption(page, 'node-hinzu', 'blatt');
  await page.evaluate(
    (url) =>
      window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'pb2-088-happy', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
    KLEINES_PNG,
  );
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0]!;
    const aufnahme = graph.nodes!.find((n) => n.typ === 'aufnahme')!;
    const blatt = graph.nodes!.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: aufnahme.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: blatt.id, x: 620, y: 420 });
  });

  // 3) Aufs Blatt — Grössenmessung (d) unmittelbar um den Doc-schreibenden Klick.
  const vorLaenge = await docLaenge(page);
  await page.locator('[data-testid="blatt-ablegen"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Render liegt auf', { timeout: 15000 });
  const nachLaenge = await docLaenge(page);
  // eslint-disable-next-line no-console
  console.log(
    `[vis-publish-bild] Doc-JSON-Zeichenlänge vor Aufs-Blatt=${vorLaenge}, nach=${nachLaenge} (Δ+${nachLaenge - vorLaenge})`,
  );
  expect(nachLaenge).toBeGreaterThan(vorLaenge);

  const sheetInfo = await page.evaluate(() => {
    const sheet = window.__kosmo.state().doc.byKind('sheet')[0]!;
    const bild = sheet.bilder!.find((b) => b.assetId)!;
    return { bildId: bild.id, assetId: bild.assetId, title: bild.title };
  });
  expect(sheetInfo.assetId).not.toBeNull();
  // E7 Sanktion 8: Titel ist ZWINGEND das Fake-Render-Label — unabhängig vom
  // `titel`-Node-Param («Visualisierung»), den der Aufrufer sonst gesetzt hätte.
  expect(sheetInfo.title).toBe(LABEL_FAKE_RENDER);

  // 4) Station wechseln: das Label muss in der ECHTEN Publish-Ansicht auftauchen,
  // nicht nur im Doc-Feld (Inspector-Input `bild-titel`, PublishWorkspace.tsx).
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.locator(`[data-testid="blatt-bild-${sheetInfo.bildId}"]`).click();
  await expect(page.locator('[data-testid="bild-titel"]')).toHaveValue(LABEL_FAKE_RENDER);
  await page.screenshot({ path: 'e2e-results/vis-publish-bild-label.png' });
});

test('Undo nach Aufs Blatt leert den Slot UND räumt den Asset (GC) — window.__kosmo.state()-Beweis', async ({
  page,
}) => {
  await oeffneVisMitBridge(page);
  await page.click('[data-testid="graph-neu"]');
  await waehleOption(page, 'node-hinzu', 'aufnahme');
  await waehleOption(page, 'node-hinzu', 'blatt');
  await page.evaluate(
    (url) =>
      window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'pb2-088-undo', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
    KLEINES_PNG,
  );
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0]!;
    const aufnahme = graph.nodes!.find((n) => n.typ === 'aufnahme')!;
    const blatt = graph.nodes!.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: aufnahme.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
  });

  const vorLaenge = await docLaenge(page);
  const assetsVor = await page.evaluate(() => window.__kosmo.state().doc.byKind('imageasset').length);

  await page.locator('[data-testid="blatt-ablegen"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Render liegt auf', { timeout: 15000 });

  const gefuellt = await page.evaluate(() => {
    const sheet = window.__kosmo.state().doc.byKind('sheet')[0]!;
    const bild = sheet.bilder!.find((b) => b.assetId)!;
    return { sheetIdx: 0, bildId: bild.id, assetId: bild.assetId as string, assetCount: window.__kosmo.state().doc.byKind('imageasset').length };
  });
  expect(gefuellt.assetId).not.toBeNull();
  expect(gefuellt.assetCount).toBe(assetsVor + 1);
  const zwischenLaenge = await docLaenge(page);

  // EIN Undo (`useProject.getState().undo()`, dieselbe Funktion, die ein
  // «Rückgängig»-Knopf aufriefe — KosmoVis selbst trägt keinen eigenen,
  // s. Bericht §1) — leert den Slot UND lässt die GC-Patch-Inverse den
  // frisch angelegten Asset mit entfernen (bestehende Kernel-Mechanik, hier
  // NICHT verändert).
  await page.evaluate(() => window.__kosmo.state().undo());

  const zustandNachUndo = await page.evaluate(
    ({ bildId, assetId }) => {
      const sheets = window.__kosmo.state().doc.byKind('sheet');
      const bild = sheets.flatMap((s) => s.bilder ?? []).find((b) => b.id === bildId);
      const assets = window.__kosmo.state().doc.byKind('imageasset');
      return {
        slotLeer: !bild || bild.assetId === null,
        assetCount: assets.length,
        // GC-Beweis: GENAU der Asset, den «Aufs Blatt» eben anlegte, ist weg
        // — nicht nur irgendein Zähler-Rückgang.
        assetNochDa: assets.some((a) => a.id === assetId),
      };
    },
    { bildId: gefuellt.bildId, assetId: gefuellt.assetId },
  );
  expect(zustandNachUndo.slotLeer).toBe(true);
  expect(zustandNachUndo.assetCount).toBe(assetsVor);
  expect(zustandNachUndo.assetNochDa).toBe(false);

  const nachLaenge = await docLaenge(page);
  // eslint-disable-next-line no-console
  console.log(
    `[vis-publish-bild] Doc-JSON-Zeichenlänge vor=${vorLaenge}, gefüllt=${zwischenLaenge}, nach Undo=${nachLaenge}`,
  );
  expect(nachLaenge).toBeLessThan(zwischenLaenge);
});

test('C-11-Matrix-Fund: auch der Manuell/Einfach-Weg («Aufs Blatt» am Render-Job) trägt das Pflicht-Label', async ({ page }) => {
  // v0.8.8-Matrix-Fund: VisWorkspace.tsx trug eine EIGENE Platzierungs-Kopie
  // ohne E7-Deckel/Label — seit dem Fable-Fix läuft der Weg über denselben
  // gehärteten Kern (`platziereBildAufsBlatt`). Ablauf-Muster 1:1 aus
  // `module.spec.ts` (~:600ff, inkl. der dort begründeten Jobstore-
  // Akkumulations-Robustheit und des grosszügigen Fake-Worker-Timeouts).
  await oeffneVisMitBridge(page);
  await page.click('[data-testid="tab-einfach"]');
  await page.click('[data-testid="send-render"]');
  await page
    .locator('[data-testid="render-job"]')
    .getByText('Aufs Blatt')
    .first()
    .click({ timeout: 90_000 });
  await expect(page.locator('[data-testid="vis-hinweis"]')).toBeVisible();
  const bild = await page.evaluate(() => {
    const sheets = window.__kosmo.state().doc.byKind('sheet');
    return sheets.flatMap((s) => s.bilder ?? []).find((b) => b.assetId) ?? null;
  });
  expect(bild).not.toBeNull();
  // Kern-Beweis: der ältere Manuell-Weg erzwingt jetzt DASSELBE Label wie
  // der Node-Graph-Weg (Sanktion 8 gilt pfadunabhängig).
  expect(bild!.title).toBe(LABEL_FAKE_RENDER);
});

test('Deckel: Base64 über ~1 MB wirft eine ehrliche Fehlerzone STATT eines Doc-Schreibens', async ({ page }) => {
  await oeffneVisMitBridge(page);
  await page.click('[data-testid="graph-neu"]');
  await waehleOption(page, 'node-hinzu', 'aufnahme');
  await waehleOption(page, 'node-hinzu', 'blatt');
  await page.evaluate(
    (url) =>
      window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'pb2-088-deckel', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
    UEBERGROSSES_BILD,
  );
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0]!;
    const aufnahme = graph.nodes!.find((n) => n.typ === 'aufnahme')!;
    const blatt = graph.nodes!.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: aufnahme.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
  });

  const vorLaenge = await docLaenge(page);
  const sheetsVor = await page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length);

  await page.locator('[data-testid="blatt-ablegen"]').click();
  const fehlerToast = page.locator('[data-testid="meldung-fehler"]');
  await expect(fehlerToast).toBeVisible({ timeout: 5000 });
  await expect(fehlerToast).toContainText('Bild zu gross');
  await expect(fehlerToast).toContainText('verkleinern');

  const nachLaenge = await docLaenge(page);
  const sheetsNach = await page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length);
  // eslint-disable-next-line no-console
  console.log(`[vis-publish-bild] Deckel-Test: Doc-JSON-Zeichenlänge vor=${vorLaenge}, nach=${nachLaenge} (unverändert erwartet)`);
  expect(nachLaenge).toBe(vorLaenge);
  expect(sheetsNach).toBe(sheetsVor); // kein neues Blatt via `blattErstellen` entstanden
  await page.screenshot({ path: 'e2e-results/vis-publish-bild-deckel.png' });
});
