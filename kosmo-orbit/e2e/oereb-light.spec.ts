import { expect, test } from '@playwright/test';

/**
 * v0.8.7 PB1 (`docs/V087-SPEZ.md` E6/D7/C-11/C-12) — ÖREB light: nach einem
 * gewählten StandortSuche-Treffer (`e2e/standort-persistenz.spec.ts`-Muster)
 * läuft NACHGELAGERT ein zweiter, asynchroner Abruf — GetEGRID → ÖREB-
 * Extract → `design.oerebAuszugSetzen` (eigener Undo-Schritt, s. Kommentar
 * in `DesignWorkspace.tsx` `StandortSuche`/`oerebAbrufen`).
 *
 * **Fixture-first, Fixture-Vertrag** (definiert hier, nicht live gegen
 * swisstopo verifiziert — D7/E6 erlauben das ausdrücklich):
 * (a) GetEGRID: `https://api.geo.admin.ch/rest/services/ech/SearchServer
 * ?searchText=<e>,<n>&type=locations&origins=parcel&sr=2056` — dieselbe
 * SearchServer-Form wie die bestehende Adresssuche (api3, unverändert),
 * nur mit Koordinaten statt Text und `origins=parcel`; die Antwort trägt
 * `results[0].attrs.egrid` (öffentlich dokumentiert: eCH-Suche liefert das
 * EGRID für den Origin `parcel`, https://api3.geo.admin.ch/services/
 * sdiservices.html).
 * (b) ÖREB-Extract: `https://api.geo.admin.ch/rest/services/oereb/extract/
 * json/<egrid>?sr=2056` — Pfadmuster NICHT live verifiziert (kantonale
 * ÖREB-Webservices sind föderiert), die Antwortform `ConcernedTheme`/
 * `NotConcernedTheme` (`Code` + mehrsprachiger `Text`) stammt dagegen aus
 * der öffentlich dokumentierten ÖREB-Transferstruktur — das IST bereits die
 * reine Themencode-Betroffenheitsliste (kein zusätzlicher Reissleinen-Abbau
 * nötig).
 *
 * Beide Endpunkte liegen unter der freigegebenen CSP-Domain
 * `api.geo.admin.ch` (Sanktion 7, Fable-Commit 033ac18).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          settings: {
            standortAdresse: { adresse: string } | null;
            oerebAuszug: {
              egrid: string;
              abgerufenAm: string;
              quelle: string;
              themen: { code: string; titel: string; betroffen: boolean }[];
            } | null;
          };
        };
        undo: () => void;
      };
      open: (s: string) => void;
    };
  }
}

const THEMEN_JSON = {
  results: [{ attrs: { egrid: 'CH113928077734' } }],
};

const EXTRACT_JSON = {
  GetExtractByIdResponse: {
    extract: {
      ConcernedTheme: [
        { Code: 'ContaminatedSites', Text: [{ Language: 'de', Text: 'Belastete Standorte' }] },
        { Code: 'GroundwaterProtectionZones', Text: [{ Language: 'de', Text: 'Grundwasserschutzzonen' }] },
      ],
      NotConcernedTheme: [{ Code: 'ForestPerimeters', Text: [{ Language: 'de', Text: 'Waldgrenzen' }] }],
    },
  },
};

async function standortPanelOeffnenUndSuchen(page: import('@playwright/test').Page) {
  await page.route('**/rest/services/api/SearchServer**', (route) =>
    route.fulfill({
      json: { results: [{ attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }] },
    }),
  );
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
  await page.click('[data-testid="sonne-toggle"]');
  await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
  await page.click('[data-testid="standort-suchen"]');
  await expect(page.locator('[data-testid="standort-treffer"] button')).toBeVisible();
}

test('Standortsuche → ÖREB-Abruf: Betroffenheitsliste + Pflicht-Hinweis sichtbar (C-11)', async ({ page }) => {
  await standortPanelOeffnenUndSuchen(page);
  await page.route('**/rest/services/ech/SearchServer**', (route) => route.fulfill({ json: THEMEN_JSON }));
  await page.route('**/rest/services/oereb/extract/json/**', (route) => route.fulfill({ json: EXTRACT_JSON }));

  await page.click('[data-testid="standort-treffer"] button');

  // Ladezustand ist benannt (kein Spinner-Silence) — erscheint kurz, dann
  // die Themenliste. Auf das Doc-Feld pollen ist der robuste Beweis
  // (Ladezustand kann je nach Containerlast zu kurz für einen Screenshot
  // sein). WICHTIG: `?? null` — das optionale Setting ist VOR dem ersten
  // Schreiben `undefined`, und `expect(undefined).not.toBeNull()` bestünde
  // sofort, ohne den asynchronen Abruf abzuwarten (Fable-Gate-Fund PB1).
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug ?? null))
    .not.toBeNull();

  const auszug = await page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug);
  expect(auszug?.egrid).toBe('CH113928077734');
  expect(auszug?.quelle).toBe('oereb-bund');
  expect(auszug?.themen).toEqual([
    { code: 'ContaminatedSites', titel: 'Belastete Standorte', betroffen: true },
    { code: 'GroundwaterProtectionZones', titel: 'Grundwasserschutzzonen', betroffen: true },
    { code: 'ForestPerimeters', titel: 'Waldgrenzen', betroffen: false },
  ]);

  // Betroffenheitsliste im Standort-Panel sichtbar (Code + Titel + Marker).
  const liste = page.locator('[data-testid="oereb-themenliste"]');
  await expect(liste).toBeVisible();
  await expect(page.locator('[data-testid="oereb-thema-ContaminatedSites"]')).toContainText('Belastete Standorte');
  await expect(page.locator('[data-testid="oereb-thema-ContaminatedSites"]')).toContainText('betroffen');
  await expect(page.locator('[data-testid="oereb-thema-ForestPerimeters"]')).toContainText('Waldgrenzen');
  await expect(page.locator('[data-testid="oereb-thema-ForestPerimeters"]')).toContainText('nicht betroffen');

  // Pflicht-Hinweis (Sanktion 7).
  await expect(page.locator('[data-testid="oereb-hinweis"]')).toContainText('Auszug light — kein rechtsgültiger ÖREB-Auszug.');

  await page.screenshot({ path: 'e2e-results/pb1-087-oereb-liste.png' });
});

test('Reload: KosmoData zeigt die ÖREB-Zeile aus dem persistierten Doc (C-12)', async ({ page }) => {
  await standortPanelOeffnenUndSuchen(page);
  await page.route('**/rest/services/ech/SearchServer**', (route) => route.fulfill({ json: THEMEN_JSON }));
  await page.route('**/rest/services/oereb/extract/json/**', (route) => route.fulfill({ json: EXTRACT_JSON }));
  await page.click('[data-testid="standort-treffer"] button');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug))
    .not.toBeNull();

  // Autosave ist entprellt (project-vault.ts, 1200 ms, Muster
  // `standort-persistenz.spec.ts`) — abwarten, dann reload.
  await page.waitForTimeout(1600);
  await page.reload();

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug?.egrid ?? null))
    .toBe('CH113928077734');

  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-uebersicht"]');
  const oerebZeile = page.locator('[data-testid="data-projekt-oereb"]');
  await expect(oerebZeile).toBeVisible();
  await expect(oerebZeile).toContainText('2 von 3');
  await expect(oerebZeile).toContainText('CH113928077734');
});

test('Undo entfernt den ÖREB-Auszug wieder (eigener Undo-Schritt)', async ({ page }) => {
  await standortPanelOeffnenUndSuchen(page);
  await page.route('**/rest/services/ech/SearchServer**', (route) => route.fulfill({ json: THEMEN_JSON }));
  await page.route('**/rest/services/oereb/extract/json/**', (route) => route.fulfill({ json: EXTRACT_JSON }));
  await page.click('[data-testid="standort-treffer"] button');
  // `?? null` — s. Kommentar im C-11-Test: `undefined` bestünde den Poll
  // sofort und das Ctrl+Z träfe die Standort-Gruppe statt des Auszugs.
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug ?? null))
    .not.toBeNull();

  // Standort UND standortAdresse liefen als EINE history-Gruppe VOR dem
  // (asynchronen) ÖREB-Abruf — der ÖREB-Auszug ist der zuletzt
  // abgeschlossene Undo-Schritt, ein Ctrl+Z hebt NUR ihn auf.
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug ?? null))
    .toBeNull();
  // Der Standort-Treffer selbst (die history-Gruppe davor) bleibt erhalten.
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse?.adresse ?? null))
    .toBe('Musterstrasse 1 Zug');
  await expect(page.locator('[data-testid="oereb-block"]')).toHaveCount(0);
});

test('Fixture liefert 500: ehrliche Fehlermeldung, kein stiller Leerlauf, kein Setting geschrieben', async ({ page }) => {
  await standortPanelOeffnenUndSuchen(page);
  await page.route('**/rest/services/ech/SearchServer**', (route) =>
    route.fulfill({ status: 500, body: 'Serverfehler' }),
  );

  await page.click('[data-testid="standort-treffer"] button');

  await expect(page.locator('[data-testid="oereb-fehler"]')).toBeVisible();
  await expect(page.locator('[data-testid="oereb-fehler"]')).toContainText('Kein Netz');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug ?? null))
    .toBeNull();
  await expect(page.locator('[data-testid="oereb-block"]')).toHaveCount(0);
});

test('Fixture liefert kein EGRID: ehrliche Meldung statt stillem Extract-Aufruf', async ({ page }) => {
  await standortPanelOeffnenUndSuchen(page);
  await page.route('**/rest/services/ech/SearchServer**', (route) => route.fulfill({ json: { results: [] } }));
  let extractAufgerufen = false;
  await page.route('**/rest/services/oereb/extract/json/**', (route) => {
    extractAufgerufen = true;
    return route.fulfill({ json: EXTRACT_JSON });
  });

  await page.click('[data-testid="standort-treffer"] button');

  await expect(page.locator('[data-testid="oereb-fehler"]')).toBeVisible();
  await expect(page.locator('[data-testid="oereb-fehler"]')).toContainText('Kein EGRID');
  expect(extractAufgerufen).toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.oerebAuszug ?? null))
    .toBeNull();
});
