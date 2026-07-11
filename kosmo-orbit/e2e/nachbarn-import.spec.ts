import { expect, test } from '@playwright/test';

/**
 * Nachbarn-Import (v0.7.1 E2/2B, `docs/V071-KONZEPT.md` Abschnitt E2): zweiter
 * identify-Aufruf im Standort-Panel (Schattenstudie-Leiste, `sonne-toggle`),
 * Layer-Verdikt `ch.swisstopo.vec25-gebaeude` (Envelope ±60 m um das
 * Parzellen-Zentrum). Gemockter Ablauf: SearchServer (Adresse) → identify
 * (Parzelle, Punkt-Geometrie, wie `module.spec.ts` «CH-Standort») → identify
 * (Nachbarn, Envelope-Geometrie, `vec25-gebaeude` im Query) → «Nachbarn
 * übernehmen».
 *
 * Fixture-Geometrie: Die Parzelle ist ein Rechteck
 * (2681500,1224500)–(2681530,1224520) → `parzelleZuOutline` errechnet daraus
 * (Mittelwert über die 5 Ringpunkte inkl. dupliziertem Schlusspunkt, s.
 * `derive/standort.ts`) ein Zentrum von exakt (2681512, 1224508) — die drei
 * gemockten Nachbarn-Gebäude sind so gelegt, dass GENAU ein Ring
 * («eigenes Gebäude») dieses Zentrum umschliesst und zwei weitere Ringe
 * («echte Nachbarn») ausserhalb liegen.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        activeStoreyId: string | null;
        undo: () => void;
        doc: { byKind: (k: string) => { id: string; zonenArt?: string }[] };
      };
      open: (s: string) => void;
    };
  }
}

test('Nachbarn übernehmen (E2/2B): 2 echte Nachbarn, eigenes Gebäude ausgeschlossen, idempotent, Undo räumt weg', async ({ page }) => {
  await page.route('**/rest/services/api/SearchServer**', (route) =>
    route.fulfill({
      json: { results: [{ attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }] },
    }),
  );

  await page.route('**/rest/services/api/MapServer/identify**', (route) => {
    const url = route.request().url();
    if (url.includes('vec25-gebaeude')) {
      // Nachbarn-Antwort (esriGeometryEnvelope-Aufruf): 3 Gebäude — 2 echte
      // Nachbarn + 1 Ring, der das Parzellen-Zentrum (2681512/1224508)
      // umschliesst = eigenes Gebäude (muss NICHT importiert werden).
      route.fulfill({
        json: {
          results: [
            {
              featureId: 1,
              geometry: {
                rings: [[
                  [2681505, 1224500], [2681525, 1224500], [2681525, 1224515], [2681505, 1224515], [2681505, 1224500],
                ]],
              },
            },
            {
              featureId: 2,
              geometry: {
                rings: [[
                  [2681455, 1224455], [2681470, 1224455], [2681470, 1224470], [2681455, 1224470], [2681455, 1224455],
                ]],
              },
            },
            {
              featureId: 3,
              geometry: {
                rings: [[
                  [2681550, 1224550], [2681565, 1224550], [2681565, 1224565], [2681550, 1224565], [2681550, 1224550],
                ]],
              },
            },
          ],
        },
      });
    } else {
      // Parzellen-identify (esriGeometryPoint-Aufruf, bestehendes Muster aus
      // `module.spec.ts` «CH-Standort»).
      route.fulfill({
        json: {
          results: [{ geometry: { rings: [[
            [2681500, 1224500], [2681530, 1224500], [2681530, 1224520], [2681500, 1224520], [2681500, 1224500],
          ]] } }],
        },
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="sonne-toggle"]'); // Standort-Panel öffnen

  // Adresse suchen → Standort setzen → Parzelle importieren.
  await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
  await page.click('[data-testid="standort-suchen"]');
  await page.click('[data-testid="standort-treffer"] button');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBe(0);
  await page.click('[data-testid="parzelle-import"]');
  await expect(page.locator('[data-testid="standort-meldung"]')).toContainText('Parzelle importiert');

  // Ehrlichkeits-Fussnote erscheint erst, sobald eine Parzelle da ist (=
  // Zentrum als Anker für den Nachbarn-Import verfügbar).
  await expect(page.locator('[data-testid="nachbarn-fussnote"]')).toContainText('VECTOR25');
  await expect(page.locator('[data-testid="nachbarn-fussnote"]')).toContainText('~2008');

  const zonenArten = () =>
    page.evaluate(() => window.__kosmo.state().doc.byKind('zone').map((z) => z.zonenArt));

  // Nachbarn übernehmen: genau 2 Zonen zonenArt 'nachbar' — das eigene
  // Gebäude (Ring enthält das Parzellen-Zentrum) fehlt.
  await page.click('[data-testid="nachbarn-uebernehmen"]');
  await expect(page.locator('[data-testid="standort-meldung"]')).toContainText('2 Nachbargebäude übernommen');
  await expect.poll(() => zonenArten().then((a) => a.filter((x) => x === 'nachbar').length)).toBe(2);

  // Idempotenz: zweiter Klick ersetzt die Nachbar-Zonen desselben Geschosses
  // — immer noch genau 2, nicht 4.
  await page.click('[data-testid="nachbarn-uebernehmen"]');
  await expect(page.locator('[data-testid="standort-meldung"]')).toContainText('2 Nachbargebäude übernommen');
  await expect.poll(() => zonenArten().then((a) => a.filter((x) => x === 'nachbar').length)).toBe(2);

  // Undo: JEDER Klick auf «Nachbarn übernehmen» ist EIN Undo-Schritt (Löschen
  // + Anlegen im selben Patch-Array, s. `design.nachbarnUebernehmen`). Der
  // erste Undo hebt den ZWEITEN (idempotenten) Re-Import auf — das stellt die
  // Nachbar-Zonen des ERSTEN Imports wieder her (weiterhin 2, nicht 0). Der
  // zweite Undo hebt auch den ersten Import auf → 0.
  await page.click('[data-testid="undo"]');
  await expect.poll(() => zonenArten().then((a) => a.filter((x) => x === 'nachbar').length)).toBe(2);
  await page.click('[data-testid="undo"]');
  await expect.poll(() => zonenArten().then((a) => a.filter((x) => x === 'nachbar').length)).toBe(0);
});
