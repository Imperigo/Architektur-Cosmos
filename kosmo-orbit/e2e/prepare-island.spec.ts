import { expect, test, type Page } from '@playwright/test';

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — «KosmoPrepare auf Islands +
 * dediziertes Design», die kleinste Rollout-Station. Diese Spec ist NEU
 * (Dateikreis-Auftrag) und beweist:
 * - alle vier Prepare-Inseln (AUFNAHME/WISSEN/BESTAND/AUSTAUSCH) rendern
 *   echt, mit den in `prepare-island-katalog.ts` benannten Werkzeugen
 *   (Owner-Auftrag-Schnitt);
 * - die klassische Werkzeugleiste/Dokumentliste ist im Island-Modus WEG
 *   (Default `prepareOberflaeche:'island'`);
 * - der Ausbau (Owner-Auftrag Punkt 2): Ingest-Ergebnis JE Datei — echte
 *   Abschnittszahl bei Erfolg, echter Fehlertext bei Misserfolg, statt
 *   eines einzigen, überschriebenen Fehlerfelds;
 * - Suche/Basis-Import/Vektorisieren (WISSEN), Dokumentliste+Entfernen/
 *   Chunk-Ansicht (BESTAND) und die ehrliche Deep-Link-Grenze +
 *   Manuell-Rückweg (AUSTAUSCH) funktionieren;
 * - der Manuell-Rückweg ('island' → 'manuell' → 'island') funktioniert
 *   beidseitig, Manuell bleibt exakt das heutige Prepare (Bestandsschutz
 *   §5 Sanktion 8).
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `island-verdrahtung.spec.ts`/`vis-island.spec.ts`) — nur ein leerer
 * Kontext beweist den echten Produktions-Default `prepareOberflaeche:
 * 'island'` ohne Seed.
 */

test.use({ storageState: { cookies: [], origins: [] } });

async function oeffnePrepareIsland(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
  });
  await page.reload();
  await page.click('[data-testid="module-prepare"]');
  await expect(page.locator('[data-testid="prepare-island-fuellen"]')).toBeVisible();
}

/**
 * Hover statt Klick — dasselbe Muster wie `vis-island.spec.ts`s `oeffneInsel`
 * (`.click()` würde vor dem eigentlichen Klick schon per Hover die Pill
 * durch die Leiste ersetzen, der Klick träfe danach ins Leere). Hover auf
 * `-root` (NICHT `-pill`) — `-root` existiert IMMER (jede Stufe), `-pill`
 * NUR in Stufe `pill`; ein zweiter `oeffneInsel`-Aufruf auf dieselbe Insel
 * INNERHALB eines Tests (z. B. zwei Werkzeuge nacheinander, Insel bleibt
 * nach dem ersten Popup in Stufe `popup`/`leiste`) fände sonst keine Pill
 * mehr (vis-island.spec.ts's exaktes Muster für genau diesen Fall).
 */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/** Nimmt eine reine Text-Datei über den echten `filechooser`-Weg auf (kein
 *  Fixture-File nötig — Playwright akzeptiert einen Buffer direkt). */
async function nimmDateiAuf(page: Page, name: string, text: string): Promise<void> {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="island-dateien-waehlen"]'),
  ]);
  await chooser.setFiles([{ name, mimeType: 'text/plain', buffer: Buffer.from(text) }]);
}

test.describe('PC4 — KosmoPrepare auf Islands (Default, kein Seed)', () => {
  test('Default ist island — alle vier Inseln rendern als Pill, klassische Fläche fehlt', async ({ page }) => {
    await oeffnePrepareIsland(page);

    for (const island of ['aufnahme', 'wissen', 'bestand', 'austausch']) {
      await expect(page.locator(`[data-testid="island-${island}-pill"]`)).toBeVisible();
    }

    // Klassische Werkzeugleiste/Dokumentliste rendert NICHT mehr im Island-Modus.
    await expect(page.locator('[data-testid="prepare-werkzeugleiste"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="ingest-zone"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="basis-sektion"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="dossier"]')).toHaveCount(0);

    await page.screenshot({ path: 'e2e-results/pc4-prepare-islands.png' });
  });

  test('Kosmo-Zugang/BodenDock: BodenDock ist im Island-Modus weg (ehrliche Grenze: kein Kosmo-Orb hier, s. Abschlussbericht)', async ({
    page,
  }) => {
    await oeffnePrepareIsland(page);
    await expect(page.locator('[data-testid="boden-dock"]')).toHaveCount(0);
    // PC4-Dateikreis erlaubt an App.tsx NUR die additive Guard-Zeile — die
    // `onKosmoOeffnen`-Prop-Verdrahtung (Muster VisWorkspace/App.tsx) bräuchte
    // mehr als das; der volle Orb-Rollout ist C-25 (PB4/W4). Diese Zeile
    // beweist den ehrlichen, dokumentierten Zwischenstand statt ihn zu
    // verschweigen: kein KosmoOrb UND kein BodenDock im Prepare-Island-Modus.
    await expect(page.locator('[data-testid="kosmo-orb-wurzel"]')).toHaveCount(0);
  });

  test('AUFNAHME-Insel: Dateien wählen zeigt Ergebnis JE Datei — echte Abschnittszahl bei Erfolg, echter Fehlertext statt stummen Scheiterns (Ausbau)', async ({
    page,
  }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'aufnahme');
    await page.click('[data-testid="island-werkzeug-dateien"]');
    await expect(page.locator('[data-testid="island-dateien-stufe2"]')).toBeVisible();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="island-dateien-waehlen"]'),
    ]);
    await chooser.setFiles([
      { name: 'gut.txt', mimeType: 'text/plain', buffer: Buffer.from('Ein Absatz mit genug Text für einen echten Abschnitt.') },
      // Whitespace-only → `ingestFile` wirft ECHT («enthält keinen lesbaren Text»,
      // `knowledge.ts`), kein gestelltes Fehlerbild.
      { name: 'leer.txt', mimeType: 'text/plain', buffer: Buffer.from('   ') },
    ]);

    await expect(page.locator('[data-testid="island-dateien-zusammenfassung"]')).toContainText(
      '1 Datei aufgenommen, 1 fehlgeschlagen',
    );
    await expect(page.locator('[data-testid="island-dateien-ergebnis-0"]')).toContainText('gut.txt');
    await expect(page.locator('[data-testid="island-dateien-ergebnis-0"]')).toContainText('✓ 1 Abschnitt');
    await expect(page.locator('[data-testid="island-dateien-ergebnis-1"]')).toContainText('leer.txt');
    await expect(page.locator('[data-testid="island-dateien-ergebnis-1"]')).toContainText('enthält keinen lesbaren Text');

    await page.screenshot({ path: 'e2e-results/pc4-prepare-ingest-ergebnis.png' });
  });

  test('AUFNAHME-Insel: OneDrive-Werkzeug zeigt den echten Anmelde-Weg (wiederverwendete OneDriveSection)', async ({ page }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'aufnahme');
    await page.click('[data-testid="island-werkzeug-onedrive"]');
    await expect(page.locator('[data-testid="island-onedrive-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="graph-client-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="graph-signin"]')).toBeVisible();
  });

  test('WISSEN-Insel: Suche findet ein zuvor über AUFNAHME aufgenommenes Dokument', async ({ page }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'aufnahme');
    await page.click('[data-testid="island-werkzeug-dateien"]');
    await nimmDateiAuf(page, 'brandschutz.txt', 'Brandschutz im Treppenhaus verlangt eine eigene Fluchtwegbreite von 1.2 Metern.');
    await expect(page.locator('[data-testid="island-dateien-ergebnis-0"]')).toContainText('✓');

    await oeffneInsel(page, 'wissen');
    await page.click('[data-testid="island-werkzeug-suche"]');
    await expect(page.locator('[data-testid="island-suche-stufe2"]')).toBeVisible();
    await page.fill('[data-testid="island-knowledge-search"]', 'Brandschutz Treppenhaus');
    await expect(page.locator('[data-testid="island-knowledge-hit"]')).toContainText('brandschutz.txt');
  });

  test('WISSEN-Insel: Basis-Import (Bauwissen-Bibliothek) + Nachträglich vektorisieren rendern die wiederverwendeten Bestandsabschnitte', async ({
    page,
  }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'wissen');
    await page.click('[data-testid="island-werkzeug-basis"]');
    await expect(page.locator('[data-testid="island-basis-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="basis-projektwissen"]')).toBeVisible();
    await page.click('[data-testid="basis-laden-projektwissen"]');
    await expect(page.locator('[data-testid="basis-projektwissen"]')).toContainText('geladen', { timeout: 20000 });

    await oeffneInsel(page, 'wissen');
    await page.click('[data-testid="island-werkzeug-vektorisieren"]');
    await expect(page.locator('[data-testid="island-vektorisieren-stufe2"]')).toBeVisible();
    await page.click('[data-testid="vektorisiere-fehlende"]');
    await expect(page.locator('[data-testid="vektorisieren-ergebnis"]')).toBeVisible({ timeout: 20000 });
  });

  test('BESTAND-Insel: Dokumentliste zeigt ein aufgenommenes Dokument und entfernt es echt', async ({ page }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'aufnahme');
    await page.click('[data-testid="island-werkzeug-dateien"]');
    await nimmDateiAuf(page, 'statik.txt', 'Statik-Notiz: Deckenspannweite über 6 Meter braucht eine Unterzugsprüfung.');
    await expect(page.locator('[data-testid="island-dateien-ergebnis-0"]')).toContainText('✓');

    await oeffneInsel(page, 'bestand');
    await page.click('[data-testid="island-werkzeug-dokumente"]');
    await expect(page.locator('[data-testid="island-dokumente-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-dokumente-liste"]')).toContainText('statik.txt');

    await page.click(`[aria-label="statik.txt entfernen"]`);
    await expect(page.locator('[data-testid="island-dokumente-liste"]')).toHaveCount(0);
  });

  test('BESTAND-Insel: Chunk-Ansicht zeigt den ehrlichen Leerzustand ohne Quellensprung', async ({ page }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'bestand');
    await page.click('[data-testid="island-werkzeug-chunk"]');
    await expect(page.locator('[data-testid="island-chunk-stufe2"]')).toContainText('Noch kein Quellensprung');
  });

  test('AUSTAUSCH-Insel: "Zu KosmoData" versucht die echte Stationsbrücke und zeigt die ehrliche Grenze', async ({ page }) => {
    await oeffnePrepareIsland(page);
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-zu-kosmodata"]');
    await expect(page.locator('[data-testid="island-zu-kosmodata-stufe2"]')).toBeVisible();
    await page.click('[data-testid="island-zu-kosmodata-versuchen"]');
    // Ehrlich: die Stations-Brücke (§8-4) ist ausserhalb dieses Pakets nur für
    // KosmoDesign registriert — kein vorgetäuschter Erfolg.
    await expect(page.locator('[data-testid="island-zu-kosmodata-hinweis"]')).toContainText('Nicht verdrahtet');
  });

  test('AUSTAUSCH-Insel: Manuell schaltet zurück, "Island-UI"-Knopf schaltet wieder vor — Manuell bleibt heutiges Prepare', async ({
    page,
  }) => {
    await oeffnePrepareIsland(page);

    // Vorwärtsweg 'island' → 'manuell'.
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');
    await expect(page.locator('[data-testid="prepare-werkzeugleiste"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-aufnahme-root"]')).toHaveCount(0);
    // Bestandsschutz: Manuell zeigt exakt die heutige Fläche.
    await expect(page.locator('[data-testid="ingest-zone"]')).toBeVisible();
    await expect(page.locator('[data-testid="pick-files"]')).toBeVisible();
    await expect(page.locator('[data-testid="basis-sektion"]')).toBeVisible();
    await expect(page.locator('[data-testid="dossier"]')).toBeVisible();
    await page.screenshot({ path: 'e2e-results/pc4-prepare-manuell-unveraendert.png' });

    // Rückweg 'manuell' → 'island'.
    await page.click('[data-testid="island-zurueck"]');
    await expect(page.locator('[data-testid="island-austausch-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="prepare-werkzeugleiste"]')).toHaveCount(0);
  });
});
