import { expect, test } from '@playwright/test';

/**
 * K6 (docs/OWNER-KORREKTUREN-2026-07.md, Owner wörtlich: «speicher öffnen
 * ist ebenfalls nur nötig wenn projekt geöffnet ist, wir speichern die
 * einzelnen projekte und nicht die ganze software. projektspeichern ist
 * default jeder schritt»):
 *
 * (a) auf der Zentrale (`screen === 'home'`) rendern `save-project`/
 *     `open-project` NICHT MEHR — die ProjektListe dort ist bereits die
 *     Projektverwaltung; die übrigen Alltags-Werkzeuge (Kosmo/Sync/?/⚙)
 *     bleiben unverändert erreichbar.
 * (b) auf jeder Station mit Kopfbalken (hier: module-data) bleiben beide
 *     Knöpfe da, sprechen aber Projekt- statt Software-Sprache
 *     («Weitergeben (.kosmo)» statt «Speichern» — der echte .kosmo-Export,
 *     im Einklang mit der ProjektListe-Erzählung «.kosmo bleibt fürs
 *     Weitergeben» und der Befehlspalette «Projekt speichern (.kosmo)»),
 *     daneben ein leiser Auto-Save-Indikator (`autosave-status`).
 * (c) der Indikator erzählt den echten Tresor-Zustand: «Auto-Save aktiv»
 *     vor der ersten Sicherung dieser Sitzung, «Auto-gesichert HH:MM» nach
 *     jeder erfolgreichen `sichern()`-Transaktion (`state/project-vault.ts`
 *     `beiAutosave`, entprellt 1200ms).
 *
 * Beide Änderungsorte: App.tsx `kopfWerkzeuge()` (Guard + Sprache +
 * Indikator) und `state/project-vault.ts` (`beiAutosave`-Hörer).
 */

async function ueberspringeOnboarding(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

test('Zentrale: Speichern/Öffnen NICHT im Eck-Werkzeug, übrige Alltags-Werkzeuge unverändert da', async ({
  page,
}) => {
  await ueberspringeOnboarding(page);

  await expect(page.locator('[data-testid="save-project"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="open-project"]')).toHaveCount(0);

  // P-F2 (Owner-Feedback 23.07. wörtlich: «auch rechts oben auf
  // hauptstartseite steht noch kosmo neben dem sync aus, das kann auch
  // weg»): `kosmo-toggle` ist ab jetzt die EINE bewusste Ausnahme von
  // «übrige Alltags-Werkzeuge unverändert» — auf der Zentrale ist der frei
  // schwebende Kosmo-Orb (`kosmo-symbol`, Doppelklick öffnet dasselbe
  // Panel) der einzige Kosmo-Zugang; der Kopfzeilen-Zwilling entfällt dort
  // ERSATZLOS (App.tsx `kopfWerkzeuge()`, `screen !== 'home'`-Guard). Auf
  // jeder Station (s. Test unten) bleibt er unverändert bestehen.
  await expect(page.locator('[data-testid="kosmo-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toBeVisible();
  await expect(page.locator('[data-testid="sync-toggle"]')).toBeVisible();
  await expect(page.locator('[data-testid="starter-guide-start"]')).toBeVisible();
  await expect(page.locator('[data-testid="einstellungen-oeffnen"]')).toBeVisible();
});

test('Station (KosmoData): `kosmo-toggle` bleibt dort unverändert vorhanden (P-F2 betrifft NUR die Zentrale)', async ({
  page,
}) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-data"]');
  await expect(page.locator('[data-testid="kosmo-toggle"]')).toBeVisible();
});

test('Datenstation: Speichern/Öffnen da mit Projekt-Sprache, Auto-Save-Indikator sichtbar', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-data"]');

  const speichern = page.locator('[data-testid="save-project"]');
  const oeffnen = page.locator('[data-testid="open-project"]');
  await expect(speichern).toBeVisible();
  await expect(oeffnen).toBeVisible();

  // Projekt- statt Software-Sprache: der echte .kosmo-Export, nicht «DAS
  // Speichern» (das übernimmt Auto-Save längst, s. Indikator daneben).
  await expect(speichern).toContainText('Weitergeben (.kosmo)');
  await expect(oeffnen).toContainText('Projekt öffnen');

  const status = page.locator('[data-testid="autosave-status"]');
  await expect(status).toBeVisible();
});

test('Auto-Save-Erzählung: nach echter Modelländerung wechselt der Indikator auf «Auto-gesichert»', async ({
  page,
}) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-data"]'); // bootstrappt das Projekt

  const status = page.locator('[data-testid="autosave-status"]');
  await expect(status).toBeVisible();
  await expect(status).toContainText('Auto-Save aktiv');

  // Echte Modelländerung — derselbe __kosmo.run-Weg wie in module.spec.ts
  // (Test-Hook für Playwright, App.tsx). Der Tresor sichert entprellt
  // 1200ms nach der Revision (state/project-vault.ts `initVault`).
  await page.evaluate(() =>
    window.__kosmo.run('design.projektNameSetzen', { name: 'K6 Autosave Beweis' }),
  );

  await expect(status).toContainText(/Auto-gesichert/, { timeout: 8_000 });
});
