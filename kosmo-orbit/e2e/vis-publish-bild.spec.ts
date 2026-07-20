import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.10 / P-B1 (`docs/V0810-SPEZ.md` §2 E2, Matrix C-4/C-5) — Bootstrap auf
 * die Island-UI umgestellt: `test.use({ storageState: { cookies: [],
 * origins: [] } })` (Muster `e2e/blender-bridge.spec.ts:49`). Graph-/Node-
 * Bootstrap läuft über GRAPH-/STIMMUNG-Insel statt `graph-neu`/`node-hinzu`/
 * `drei-stimmungen`; die Node-Ebene bleibt unverändert (Sanktion 6). Der
 * dritte Test («C-11-Matrix-Fund») prüft ABSICHTLICH den ALTEN Manuell/
 * Einfach-Codepfad (er bleibt bis P-B2 stehen, `docs/V0810-SPEZ.md` §2 E3)
 * — er betritt Manuell darum bewusst über den Island-Rückweg
 * (`island-werkzeug-manuell`, Muster `e2e/vis-island.spec.ts`s «Manuell
 * schaltet zurück»-Test), NICHT über einen Seed.
 *
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
 *
 * **v0.8.9 §9 E13 Nachtrag (`docs/V089-SPEZ.md`, PBL2-089):** die feste
 * `BILD_LABEL_FAKE_RENDER`-Konstante wurde durch `bildLabel()` ersetzt —
 * `aufnahmeAufsBlatt` trägt seither das EIGENE, ehrliche Label «Aufnahme
 * (Viewport)» statt des Fake-Render-Labels (ein Screenshot war nie ein
 * Fake-Render). Der erste Test unten (Aufnahme→Blatt-Pfad) wurde auf diese
 * NEUE, korrekte Semantik umgeschrieben; die drei übrigen Tests (Render-Job-
 * Pfad, C-11-Matrix-Fund, Deckel) bleiben unverändert bei
 * `LABEL_FAKE_RENDER` — sie hängen alle am Render-Job-Pfad
 * (`bildAufsBlatt`/`platziereBildAufsBlatt` ohne Herkunft), für den die E7/
 * V088-Garantie unverändert gilt.
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

test.use({ storageState: { cookies: [], origins: [] } });

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

/** Muster `e2e/blender-bridge.spec.ts`s `oeffneVisWerkzeug`. */
async function oeffneVisWerkzeug(page: Page, island: string, werkzeugId: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-werkzeug-${werkzeugId}"]`)).toBeVisible();
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
}

/** GRAPH-Insel Node-Palette (Ersatz für `waehleOption(page, 'node-hinzu', typ)`). */
async function islandNodeHinzu(page: Page, typ: string): Promise<void> {
  await oeffneVisWerkzeug(page, 'graph', 'palette');
  const eintrag = page.locator(`[data-testid="island-palette-eintrag-${typ}"]`);
  await expect(eintrag).toBeVisible();
  await eintrag.click();
}

async function docLaenge(page: Page): Promise<number> {
  return page.evaluate(() => JSON.stringify(window.__kosmo.state().doc.toJSON()).length);
}

// v0.8.10 / P-B1: DIESER Test kreuzt Vis UND Publish (Schritt 4: Inspector-
// Input `bild-titel`, PublishWorkspace.tsx) — ein voll leerer `storageState`
// (wie der Datei-Default oben) würde auch Publish auf Island kippen und
// damit in dessen Manuell-Modus eingreifen (Sanktion 6, dasselbe Muster wie
// `e2e/vis-editor.spec.ts`s H-36/`e2e/vis-automatik.spec.ts`). TEIL-Seed:
// design/publish/prepare bleiben 'manuell', `visOberflaeche` fehlt bewusst.
test.describe('Happy-Path (kreuzt KosmoVis + KosmoPublish)', () => {
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

test('Fake-Render via Bridge → Aufnahme → Aufs Blatt: Asset gesetzt, Pflicht-Label in der Publish-Ansicht sichtbar', async ({
  page,
}) => {
  await oeffneVisMitBridge(page);

  // 1) Fake-Render via Bridge — derselbe geprüfte Weg wie visgraph.spec.ts:33
  // (Preset baut Modell→Render, «Ausführen» spricht die echte --fake-Bridge
  // auf :8600 an; naturalWidth-Beweis dort bereits erbracht, hier reicht
  // «sichtbar», um die Bridge-Strecke ehrlich mitzubeweisen statt zu simulieren).
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  await page.locator('[data-testid="render-ausfuehren"]').first().click();
  await expect(page.locator('[data-testid="render-bild"]').first()).toBeVisible({ timeout: 25000 });

  // 2) Aufnahme — via Test-Hook geseedet (Bestandsmuster e2e/vis-ansichten.spec.ts:
  // der echte Aufnahme-Knopf sitzt in Viewport3D.tsx, anderes Paket/Cluster A).
  await islandNodeHinzu(page, 'aufnahme');
  await islandNodeHinzu(page, 'blatt');
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
  // v0.8.9 §9 E13 (`docs/V089-SPEZ.md`, PBL2-089) ändert diese EINE
  // Erwartung bewusst: der `blatt`-Node in diesem Test ist mit dem
  // AUFNAHME-Node verbunden (Schritt 2 oben), NICHT mit dem Render-Node aus
  // Schritt 1 (der nur die Bridge-Strecke separat mitbeweist) — «Aufs Blatt»
  // läuft für ihn also über `aufnahmeAufsBlatt`, nicht über `bildAufsBlatt`.
  // Vor E13 trugen BEIDE Pfade dieselbe feste `BILD_LABEL_FAKE_RENDER`-
  // Konstante (E7/V088-SPEZ Sanktion 8) — ein Viewport-Screenshot wurde damit
  // fälschlich als «Fake-Render» beschriftet, obwohl er nie einer war. E13
  // macht das ehrlich: der Aufnahme-Pfad trägt jetzt sein EIGENES Label
  // «Aufnahme (Viewport)» (`vis-jobs.ts::aufnahmeAufsBlatt`), unabhängig von
  // `bildLabel()`. Die Render-Pfad-Garantie (E7 Sanktion 8 bleibt für ECHTE
  // Bridge-Jobs scharf) bleibt unverändert und ist unten in `C-11-Matrix-
  // Fund`/`Deckel`-Test weiter mit `LABEL_FAKE_RENDER` bewiesen.
  expect(sheetInfo.title).toBe('Aufnahme (Viewport)');

  // 4) Station wechseln: das Label muss in der ECHTEN Publish-Ansicht auftauchen,
  // nicht nur im Doc-Feld (Inspector-Input `bild-titel`, PublishWorkspace.tsx).
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.locator(`[data-testid="blatt-bild-${sheetInfo.bildId}"]`).click();
  await expect(page.locator('[data-testid="bild-titel"]')).toHaveValue('Aufnahme (Viewport)');
  await page.screenshot({ path: 'e2e-results/vis-publish-bild-label.png' });
});

}); // Ende 'Happy-Path (kreuzt KosmoVis + KosmoPublish)'

test('Undo nach Aufs Blatt leert den Slot UND räumt den Asset (GC) — window.__kosmo.state()-Beweis', async ({
  page,
}) => {
  await oeffneVisMitBridge(page);
  await oeffneVisWerkzeug(page, 'graph', 'palette');
  await page.click('[data-testid="visisl-graph-erstellen"]');
  await islandNodeHinzu(page, 'aufnahme');
  await islandNodeHinzu(page, 'blatt');
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
  // Absichtlich in Manuell wechseln (s. Datei-Kopf) — dieser Test beweist
  // GENAU den alten Codepfad, kein Bootstrap-Nebeneffekt.
  await oeffneVisWerkzeug(page, 'austausch', 'manuell');
  await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible();
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
  await oeffneVisWerkzeug(page, 'graph', 'palette');
  await page.click('[data-testid="visisl-graph-erstellen"]');
  await islandNodeHinzu(page, 'aufnahme');
  await islandNodeHinzu(page, 'blatt');
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
