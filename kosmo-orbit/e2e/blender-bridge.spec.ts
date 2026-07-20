import { expect, test, type Page } from '@playwright/test';

/**
 * PBL2-089 (`docs/V089-SPEZ.md` §9 E10/E11/E13, Matrix C-14/C-15/C-17) —
 * «Blender-Client: Sonnenstunden-Insel + Line-Art + Label-Kette». Läuft
 * gegen `:5174` (dieses Pakets Preview-Port) + die Fake-Bridge `:8600`
 * (`tools/homestation-bridge/kosmo_bridge/main.py --fake`), Skip-Guard nach
 * Muster `e2e/sim/bausteine.ts`s `bridgeVerfuegbar`/`BRIDGE_FEHLT_HINWEIS`
 * (Regel R7: tote Bridge → ehrlicher Skip, NIE ein stiller Pass).
 *
 * `test.use({ storageState: { cookies: [], origins: [] } })` — wie
 * `e2e/vis-island.spec.ts`: nur ein leerer Kontext beweist den echten
 * Produktions-Default `visOberflaeche:'island'` ohne den globalen
 * `kosmo.ui.v1`-Manuell-Seed (`playwright.config.ts`/`e2e/helpers/
 * manuell-seed.ts`) — die SONNE-Insel existiert nur im Island-Modus.
 *
 * Deckt:
 * (a) Sonne-Insel ohne Projektstandort → ehrlicher Hinweis, Knopf aus.
 * (b) Mit Standort (per `__kosmo.run('design.standortSetzen', …)` geseedet):
 *     Job senden → Status endet als `kein-blender-worker`, Bridge-`message`
 *     wortgleich sichtbar — ERWARTETES Verhalten (kein Fehler-/Rot-Zustand).
 * (c) Line-Art: Netzwerk-Intercept (`page.route` auf `**​/jobs`) beweist im
 *     tatsächlich gesendeten JSON `style.mode==='lineart'` UND
 *     `vis.skip===true`.
 * (d) Label-Regression (E13 hält die E7/V088-Garantie): ein Fake-Render
 *     trägt aufs Blatt weiterhin «Vorschau (Fake-Render)» — Muster
 *     `e2e/vis-publish-bild.spec.ts`.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          byKind: (k: string) => Array<{
            id: string;
            nodes?: { id: string; typ: string }[];
            bilder?: { id: string; assetId: string | null; title?: string }[];
          }>;
          toJSON: () => unknown;
        };
      };
      open: (s: string) => void;
    };
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

const BRIDGE = 'http://127.0.0.1:8600';

/** Muster `e2e/sim/bausteine.ts` Baustein 15 (`bridgeVerfuegbar`) — eigene,
 *  lokale Kopie (keine Import-Abhängigkeit auf eine Datei ausserhalb des
 *  Pakets nötig, gleiches Verhalten). */
async function bridgeVerfuegbar(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE}/health`);
    if (!res.ok) return false;
    const daten = (await res.json()) as { ok?: boolean };
    return daten.ok === true;
  } catch {
    return false;
  }
}

const BRIDGE_FEHLT_HINWEIS =
  'HomeStation-Bridge :8600 nicht erreichbar — mit `--fake` starten ' +
  '(siehe CLAUDE.md): setsid python3 tools/homestation-bridge/kosmo_bridge/main.py --fake --port 8600';

let bridgeOk = false;

test.beforeAll(async () => {
  bridgeOk = await bridgeVerfuegbar();
  if (!bridgeOk) {
    // eslint-disable-next-line no-console
    console.warn(`[blender-bridge] ${BRIDGE_FEHLT_HINWEIS}`);
  }
});

const ZUERICH_STANDORT = {
  label: 'Hohlstrasse 42, Zürich-Aussersihl (Parzelle AS-2231)',
  lat: 47.3755,
  lon: 8.5217,
  e: 2_681_800,
  n: 1_247_800,
  hoeheM: 408,
};

/** Muster `e2e/vis-island.spec.ts`s `oeffneVisIsland` — vis-Station im
 *  Island-Default öffnen, Bridge-URL seeden. */
async function oeffneVisIsland(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.vis.onboarded', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
  });
  await page.reload();
  await page.click('[data-testid="module-vis"]');
}

/** Hover statt Klick öffnet die Leiste (Muster `e2e/vis-island.spec.ts`s
 *  `oeffneInsel`), dann Klick aufs Werkzeug öffnet das Stufe2-Popup. */
async function oeffneVisWerkzeug(page: Page, island: string, werkzeugId: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-werkzeug-${werkzeugId}"]`)).toBeVisible();
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
}

test.describe('Sonne-Insel (E11) — Datum, Standort, Sonnenstunden-Job', () => {
  test('ohne Projektstandort: ehrlicher Hinweis, Berechnen-Knopf deaktiviert', async ({ page }) => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);
    await oeffneVisIsland(page);
    await oeffneVisWerkzeug(page, 'sonne', 'sonnenstunden');
    await expect(page.locator('[data-testid="island-sonnenstunden-stufe2"]')).toBeVisible();

    const hinweis = page.locator('[data-testid="island-sonnenstunden-standort-fehlt"]');
    await expect(hinweis).toBeVisible();
    await expect(hinweis).toContainText('Kein Projektstandort gesetzt — zuerst in KosmoDesign die Adresse suchen.');
    await expect(page.locator('[data-testid="island-sonnenstunden-standort"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="island-sonnenstunden-berechnen"]')).toBeDisabled();

    await page.screenshot({ path: 'e2e-results/blender-bridge-sonne-ohne-standort.png' });
  });

  test('mit Standort: Job senden → endet als kein-blender-worker, Bridge-message wortgleich sichtbar (erwartet, kein Fehler-Zustand)', async ({
    page,
  }) => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);
    await oeffneVisIsland(page);
    await page.evaluate((standort) => window.__kosmo.run('design.standortSetzen', standort), ZUERICH_STANDORT);

    await oeffneVisWerkzeug(page, 'sonne', 'sonnenstunden');
    await expect(page.locator('[data-testid="island-sonnenstunden-standort"]')).toContainText(ZUERICH_STANDORT.label);

    const knopf = page.locator('[data-testid="island-sonnenstunden-berechnen"]');
    await expect(knopf).toBeEnabled();
    await knopf.click();

    // Fake-Worker-Loop läuft alle 1s (main.py `_fake_worker_loop`) — queued →
    // kein-blender-worker ist der EINZIGE erreichbare Endzustand (Sanktion 12-
    // Nachbarschaft, nie running/done im Container).
    const status = page.locator('[data-testid="island-sonnenstunden-status"]');
    await expect(status).toContainText('kein-blender-worker', { timeout: 20_000 });

    const hinweis = page.locator('[data-testid="island-sonnenstunden-hinweis"]');
    await expect(hinweis).toBeVisible();
    // WORTGLEICH die main.py-Begründung (`_fake_worker_step`, `kind:'blender-sim'`-Zweig).
    await expect(hinweis).toContainText(
      'Diese Bridge hat keinen Blender-Worker angeschlossen — Wind/Sonnenstunden/Energie brauchen Blender headless auf der HomeStation (5090). Physik wird nicht erfunden.',
    );

    // ERWARTETES Verhalten, nicht rot: kein Fehler-Feld, kein "für immer"
    // laufender Abbrechen-Knopf (der Job ist terminal).
    await expect(page.locator('[data-testid="island-sonnenstunden-fehler"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="island-sonnenstunden-abbrechen"]')).toHaveCount(0);
    // Keine erfundene Zahl: das Ergebnis-Feld bleibt aus.
    await expect(page.locator('[data-testid="island-sonnenstunden-ergebnis"]')).toHaveCount(0);

    await page.screenshot({ path: 'e2e-results/blender-bridge-sonne-kein-worker.png' });
  });
});

test.describe('Line-Art (E10) — AUSTAUSCH-Insel-Schalter erzwingt vis.skip:true', () => {
  test('Netzwerk-Intercept beweist im gesendeten JSON style.mode==="lineart" UND vis.skip===true', async ({ page }) => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);
    await oeffneVisIsland(page);

    let gesendeteSzene: { style?: { mode?: string }; vis?: { skip?: boolean } } | null = null;
    await page.route('**/jobs', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postData() ?? '';
        // multipart/form-data: das "scene"-Feld liegt als eigener Teil vor
        // Playwright kennt keinen eingebauten Multipart-Parser für
        // `postData()` — Regex auf den bekannten Feldnamen (Muster: das
        // "scene"-Feld steht zwischen den `Content-Disposition`-Headern und
        // der nächsten Boundary).
        const match = body.match(/name="scene"\r?\n\r?\n([\s\S]*?)\r?\n--/);
        if (match) gesendeteSzene = JSON.parse(match[1]!);
      }
      await route.continue();
    });

    // Fertige Render-Kette (Muster `e2e/vis-publish-bild.spec.ts`): STIMMUNG-
    // Insel «+ Drei-Stimmungen-Kette einfügen» baut Modell+3×Render verbunden
    // — jeder Render-Node hat eine gültige Szene, `sendeGraphRenderAuftrag`
    // schickt darum sicher ab (kein früher Return wegen `!hatSzene`).
    await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
    await page.click('[data-testid="island-drei-stimmungen"]');

    await oeffneVisWerkzeug(page, 'austausch', 'render-senden');
    // v0.8.11 P-A2 (docs/V0811-SPEZ.md §2 E2, ROADMAP 554): Line-Art lebt
    // seit dem Ein-Quellen-Umbau als `node.params.lineart` PRO Render-Node
    // — die testid ist darum `island-render-lineart-<nodeId>` statt des
    // alten globalen `island-render-lineart` (diese Spec war der eine vom
    // P-A2-Gate übersehene Bestands-Konsument, Voll-E2E-Fund 20.07.).
    // Schalter und Ausführen-Knopf werden über DIESELBE Node-Id gekoppelt,
    // sonst schaltete der Test Node A und rendert Node B.
    const ausfuehren = page.locator('[data-testid^="island-render-ausfuehren-"]').first();
    await expect(ausfuehren).toBeVisible();
    const nodeId = (await ausfuehren.getAttribute('data-testid'))!.replace('island-render-ausfuehren-', '');
    await expect(page.locator(`[data-testid="island-render-lineart-${nodeId}"]`)).toBeVisible();
    // KSwitch hält das echte <input type="checkbox"> `position:absolute;
    // opacity:0`; unter `.isl-popup` (eigener Containing Block durch dessen
    // Eintritts-`transform`) fängt der sichtbare `.k-switch-strecke`-Track
    // den berechneten Klickpunkt ab («intercepts pointer events», bekannter
    // Fall — Muster `e2e/publish-toggles.spec.ts`s `klickSchalter`,
    // identische Ursache, PB1/PC0-Hotspot ausserhalb dieses Dateikreises).
    // `force:true` klickt das <input> direkt, kein Produktcode-Fix nötig.
    await page.locator(`[data-testid="island-render-lineart-${nodeId}"]`).click({ force: true });
    await ausfuehren.click();

    await expect.poll(() => gesendeteSzene !== null, { timeout: 10_000, message: 'kein POST /jobs beobachtet' }).toBe(true);
    expect(gesendeteSzene!.style?.mode).toBe('lineart');
    expect(gesendeteSzene!.vis?.skip).toBe(true);
  });
});

test.describe('Label-Kette (E13) — Regression zu vis-publish-bild.spec.ts', () => {
  test('Fake-Render aufs Blatt trägt weiterhin «Vorschau (Fake-Render)»', async ({ page }) => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);
    await oeffneVisIsland(page);

    await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
    await page.click('[data-testid="island-drei-stimmungen"]');

    await oeffneVisWerkzeug(page, 'austausch', 'render-senden');
    await page.locator('[data-testid^="island-render-ausfuehren-"]').first().click();

    // Wechsel auf AUFS-PLAKAT: die Liste zeigt einen Render-Node erst, sobald
    // sein Lauf `fertig` ist (`AufsPlakatStufe2`-Filter) — grosszügiges
    // Timeout wie `e2e/vis-publish-bild.spec.ts` (Fake-Worker braucht
    // mehrere 1s-Ticks bis `done`). WICHTIG: `[data-testid^="island-aufs-
    // plakat-"]` trifft OHNE Scope auch den Popup-Wrapper selbst
    // (`island-aufs-plakat-popup`/`-popup-schliessen`/`-stufe2`, alle IMMER
    // sichtbar sobald das Popup offen ist) — ein ungescopter `.first()` griff
    // darum sofort den Wrapper statt auf den echten Knopf zu warten (Fund
    // beim ersten Lauf dieser Spec). Der echte «Aufs Blatt»-Knopf lebt NUR
    // innerhalb einer `.visisl-render-zeile` (s. `AufsPlakatStufe2` in
    // `austausch.tsx`) — der Scope macht das Warten wieder ehrlich.
    await oeffneVisWerkzeug(page, 'austausch', 'aufs-plakat');
    const aufsBlattKnopf = page
      .locator('.visisl-render-zeile [data-testid^="island-aufs-plakat-"]:not([data-testid*="aufnahme"])')
      .first();
    await expect(aufsBlattKnopf).toBeVisible({ timeout: 30_000 });
    await aufsBlattKnopf.click();

    await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('liegt auf', { timeout: 15_000 });

    const sheetInfo = await page.evaluate(() => {
      const sheets = window.__kosmo.state().doc.byKind('sheet');
      const bild = sheets.flatMap((s) => s.bilder ?? []).find((b) => b.assetId);
      return bild ? { assetId: bild.assetId, title: bild.title } : null;
    });
    expect(sheetInfo).not.toBeNull();
    expect(sheetInfo!.assetId).not.toBeNull();
    // E13: der Echt-Zweig (`bildLabel`) ist im Container NIE erreichbar — die
    // Fake-Bridge liefert IMMER `worker:'fake-worker'`, das Label bleibt
    // darum wortgleich zum E7/V088-Bestand.
    expect(sheetInfo!.title).toBe('Vorschau (Fake-Render)');

    await page.screenshot({ path: 'e2e-results/blender-bridge-label-regression.png' });
  });
});
