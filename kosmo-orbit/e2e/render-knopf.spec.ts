import { expect, test, type Page } from '@playwright/test';
import { bridgeVerfuegbar } from './sim/bausteine';

/**
 * V-M1 (v0.6.6 Welle 2 / Stream D, UI-SELBSTKRITIK-065 Restliste Priorität 1)
 * — Render-Knopf direkt im 3D-Viewport. Prüft, dass der Knopf DIESELBE
 * KosmoVis-Render-Kette anstösst wie die Vis-Station (Fake-Worker-Bridge,
 * Muster `visgraph.spec.ts`): Knopf sichtbar → Klick startet Job → Status
 * wandert ehrlich weiter → Ergebnisbild erscheint → «Aufs Blatt legen»
 * (Weiterleitung) legt es auf ein Publish-Blatt.
 *
 * Fake-Worker-Bridge auf :8600 (Hauptbaum-Default; die Stream-Isolation der
 * W2-Phase ist mit der Integration beendet — Muster visgraph.spec.ts).
 * `kosmo.bridge` wird explizit gesetzt.
 *
 * v0.7.7 Stream A2 — Timing-Härtung (kein App-Regress, Beleg: alle drei
 * Ziel-Specs fielen auch auf v0.7.5 flakig): der Fake-Worker
 * (`tools/homestation-bridge/kosmo_bridge/main.py` `_fake_worker_pass`)
 * schiebt einen Job höchstens EINEN Lebenszyklus-Schritt pro 1s-Durchlauf
 * weiter (queued→running→done), das Frontend pollt im 2.5s-Takt
 * (`Viewport3D.tsx` Zeile ~395). Unter Last (geteilte Jobstores aus
 * parallelen Specs) braucht die volle Kette gesendet→wartet auf
 * GPU-Leerlauf→rendert→fertig länger als die alten harten 5-25s-Timeouts —
 * gehärtet durch: (1) deterministische Bridge-Bereitschaft vor dem Klick,
 * (2) `expect.poll` auf den echten Render-Status-Endzustand statt fixer
 * Bild-Sichtbarkeits-Timeouts, (3) grosszügigere Job-Timeouts.
 */

const BRIDGE = 'http://localhost:8600';

async function bootstrapDesign3D(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide fängt sonst Klicks unter seiner Karte ab (Muster freemesh.spec.ts).
    localStorage.setItem('kosmo.starterGuide.done', '1');
  }, undefined);
  await page.evaluate((bridge) => localStorage.setItem('kosmo.bridge', bridge), BRIDGE);
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG, Default-Ansicht 'split' zeigt den 3D-Viewport
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
}

test('Render-Knopf im 3D-Viewport: sichtbar, Klick startet Job, Ergebnisbild + Weiterleitung aufs Blatt', async ({
  page,
}) => {
  // Summe der gehärteten Einzel-Timeouts unten übersteigt das globale
  // 90s-Playwright-Default (playwright.config.ts) im Worst Case unter Last —
  // eigenes Budget analog module.spec.ts «Vis → Blatt» (Muster Zeile ~579).
  test.setTimeout(150_000);

  await bootstrapDesign3D(page);

  // Deterministische Bridge-Bereitschaft VOR dem Render-Klick (Baustein 15,
  // e2e/sim/bausteine.ts — Muster sim-*.spec.ts) statt stillschweigend
  // anzunehmen, dass :8600 im selben Moment schon voll hochgefahren ist. Kein
  // Skip hier (Hauptbaum-Default erwartet die Bridge, Muster-Docstring oben)
  // — bricht ehrlich mit klarer Meldung ab, wenn sie es nach 20s nicht ist.
  await expect
    .poll(() => bridgeVerfuegbar(), {
      timeout: 20_000,
      message: 'Fake-Worker-Bridge :8600 antwortet nicht auf /health',
    })
    .toBe(true);

  // Ruhezustand: der Knopf ist da, das Status-/Ergebnis-Panel (noch) nicht —
  // «unaufdringlich» heisst auch: kein Panel ohne aktiven/abgeschlossenen Lauf.
  const knopf = page.locator('[data-testid="viewport-render-knopf"]');
  await expect(knopf).toBeVisible();
  await expect(page.locator('[data-testid="viewport-render-panel"]')).toHaveCount(0);

  await knopf.click();

  // Der Knopf zeigt ehrlich den Zustand: Status wandert von «bereit» weg
  // (eigene testid — die Vis-Station-Texte an `render-status` bleiben unberührt).
  const status = page.locator('[data-testid="viewport-render-status"]');
  await expect(status).not.toHaveText('bereit', { timeout: 20_000 });

  // Auf den ECHTEN Endzustand pollen statt auf eine kurze Bild-Sichtbarkeit zu
  // hoffen: der Fake-Render-Job durchläuft mehrere Lebenszyklus-Schritte
  // (gesendet → wartet auf GPU-Leerlauf → rendert → fertig), jeder Schritt
  // vom Fake-Worker nur alle 1s um höchstens einen weitergeschoben und vom
  // Frontend im 2.5s-Takt gepollt — unter Last (viele Jobordner aus
  // parallelen Specs, Muster Zeile ~605 unten) braucht das mehr als kurze
  // Timeouts. Bricht ehrlich ab statt den Fehlerpfad zu verschlucken: landet
  // der Job auf «fehler», scheitert die folgende `toBe('fertig')`-Assertion
  // mit klarer Meldung statt in einem stillen Timeout zu verschwinden.
  await expect
    .poll(async () => (await status.textContent()) ?? '', {
      timeout: 60_000,
      message: 'Render-Job kam nicht in einen Endzustand (fertig/fehler)',
    })
    .toMatch(/^(fertig|fehler)$/);
  expect(await status.textContent(), 'Fake-Render-Job endete mit Fehler statt fertig').toBe('fertig');

  // Fake-Worker liefert ein Bild — dieselbe Kette wie visgraph.spec.ts. Sobald
  // der Status oben «fertig» ist, hat derselbe Store-Patch (Viewport3D.tsx
  // `patchLauf(..., { status: 'fertig', bild, qa })`) auch `bild` gesetzt —
  // die Sichtbarkeit selbst braucht darum keinen langen Timeout mehr.
  const bild = page.locator('[data-testid="viewport-render-bild"]');
  await expect(bild).toBeVisible({ timeout: 10_000 });
  const bildBreite = await bild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(bildBreite).toBeGreaterThan(0);
  await expect(status).toHaveText('fertig');

  // Weiterleitung: «Aufs Blatt legen» ruft denselben `bildAufsBlatt`-Weg wie
  // die Vis-Station — der globale Erfolgs-Toast ist ein Shell-Vertrag
  // (bereits in visgraph.spec.ts geprüft), keine Vis-Stations-testid.
  await page.locator('[data-testid="viewport-render-blatt"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('Render liegt auf', {
    timeout: 20_000,
  });

  await page.screenshot({ path: 'e2e-results/render-knopf.png' });
});
