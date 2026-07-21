import { expect, test } from '@playwright/test';

/**
 * Serie K / Batch A4 (Owner-Befund K14, wörtlich): «Einstellungsmenüs:
 * zentral in der Übersicht + je Station (Design/Data/Kosmo/Büro/V2) —
 * Funktionen & Neues.» EIN Panel (`shell/Einstellungen.tsx`) für die ganze
 * App: die Kopfleiste öffnet es ungefiltert, jede Station öffnet dasselbe
 * Panel mit einem Filter-Prop (kein zweites Panel je Station).
 */

async function bootstrap(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

test('Einstellungen: Kopfleiste öffnet/schliesst das zentrale Panel', async ({ page }) => {
  await bootstrap(page);
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  // Kein Stations-Filter aus der Kopfleiste — der Titel bleibt ungefiltert.
  await expect(page.locator('[data-testid="einstellungen-neuigkeiten-station"]')).toHaveCount(0);
  // Escape schliesst (k-dialog-Muster).
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
});

test('Einstellungen: Thema-Wechsel wirkt sofort (data-theme am Wurzelelement)', async ({ page }) => {
  await bootstrap(page);
  const vorher = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  // v0.7.3 D7 (Owner-Entscheid: Tinte entfernt): der frühere Container-Klick-
  // Trick traf zuverlässig das mittlere von drei Segmenten («Tinte») — bei
  // jedem Ausgangsthema garantiert ein ANDERES Ziel. Mit nur noch zwei
  // Segmenten (Papier/Kosmos) läge ein Klick auf die Bounding-Box-Mitte des
  // Containers GENAU auf der Grenze zwischen beiden Buttons (unklares Ziel).
  // Wir klicken darum bewusst das Segment, das NICHT dem aktuellen Thema
  // entspricht — bleibt robust, egal welches Thema Ausgangspunkt ist.
  const ziel = vorher === 'orbit' ? 'einstellung-thema-paper' : 'einstellung-thema-orbit';
  await page.click(`[data-testid="${ziel}"]`);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .not.toBe(vorher);
});

test('Einstellungen: «Rundgang erneut zeigen» startet den Guide', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="einstellung-rundgang"]');
  // Panel schliesst sich, der Rundgang läuft (Überspringen-Knopf ist der Beweis).
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="starter-guide-ueberspringen"]')).toBeVisible();
});

test('Einstellungen: «Companion öffnen» ist auffindbar (v0.7.4 P8) und wechselt in die Companion-Ansicht', async ({
  page,
}) => {
  // Bisher NUR über einen von Hand getippten `#companion`-URL-Hash erreichbar
  // (`main.tsx` `istCompanion`, kein In-App-Link) — dieser Knopf lebt unter
  // «Kosmo & Betrieb», setzt denselben Hash und lädt neu (main.tsx prüft den
  // Hash nur einmal beim Laden).
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  const knopf = page.locator('[data-testid="einstellung-companion-oeffnen"]');
  await expect(knopf).toBeVisible();
  await knopf.click();
  await expect(page.locator('[data-testid="companion"]')).toBeVisible();
  expect(page.url()).toContain('#companion');
});

test('Einstellungen: «Funktionen & Neues» zeigt den 0.6.2-Eintrag', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  const eintrag = page.locator('[data-testid="neuigkeiten-version-0.6.2"]');
  await expect(eintrag).toBeVisible();
  await expect(eintrag).toContainText('0.6.2');
});

test('Stations-Zahnrad in KosmoDesign öffnet dasselbe Panel gefiltert (Design-Punkt sichtbar)', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="station-einstellungen-design"]');
  const panel = page.locator('[data-testid="einstellungen-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('KosmoDesign');
  const stationsBlock = page.locator('[data-testid="einstellungen-neuigkeiten-station"]');
  await expect(stationsBlock).toBeVisible();
  // Mindestens ein echter Design-Punkt aus neuigkeiten.ts steht im gefilterten Block.
  await expect(stationsBlock).toContainText('Teilphase');
  // Die üblichen Sektionen bleiben darunter erhalten — ein Panel, kein Sonderfall.
  await expect(page.locator('[data-testid="einstellungen-darstellung"]')).toBeVisible();
  await expect(page.locator('[data-testid="einstellungen-neuigkeiten"]')).toBeVisible();
});

/**
 * v0.7.2 §5/§7/§8/§9 (W4-H, Kritik-Auflage «Einstellungs-Verdrahtung»): vier
 * neue Schalter in der Sektion «Bewegung & Klang» — jeder schreibt exakt den
 * localStorage-Key, den das jeweilige Modul bereits liest (`state/sounds.ts`,
 * `state/cursor-zustand.ts`, `state/abspiel-ebene.ts`), keine neue Logik.
 */
test.describe('Einstellungen: «Bewegung & Klang» — vier neue Schalter (W4-H)', () => {
  test('Sounds: Default aus, Schalter schreibt kosmo.sounds und wirkt sofort', async ({ page }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-sounds"]');
    await expect(schalter).not.toBeChecked(); // Owner-Entscheid: Default AUS
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sounds'))).toBeNull();

    await schalter.click();
    await expect(schalter).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sounds'))).toBe('1');

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sounds'))).toBe('0');
  });

  test('Eigencursor: Default an (pointer:fine in Chromium), Schalter schreibt kosmo.eigencursor und wirkt sofort auf die Cursor-Ebene', async ({
    page,
  }) => {
    await bootstrap(page);
    // Test-Hook aktivieren (Muster e2e/cursor-ebene.spec.ts) — unter
    // navigator.webdriver bleibt die Ebene sonst per Hartvertrag aus,
    // unabhängig von der Einstellung selbst.
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await expect(page.locator('[data-testid="cursor-ebene"]')).toBeAttached();

    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-eigencursor"]');
    await expect(schalter).toBeChecked(); // Default AN bei pointer:fine

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.eigencursor'))).toBe('0');
    // Wirkt SOFORT, ohne Reload — die Cursor-Ebene verschwindet komplett
    // (kein gecachter Re-Read-Bug, s. `EIGENCURSOR_EINSTELLUNG_EVENT`).
    await expect(page.locator('[data-testid="cursor-ebene"]')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.eigencursor))
      .toBe('aus');

    // Zurückschalten stellt die Ebene ebenso sofort wieder her.
    await schalter.click();
    await expect(schalter).toBeChecked();
    await expect(page.locator('[data-testid="cursor-ebene"]')).toBeAttached();
  });

  test('«Kosmo zeichnet sichtbar»: Default an, Schalter schreibt kosmo.abspielen', async ({ page }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-abspielen"]');
    await expect(schalter).toBeChecked(); // Default AN (Spec §7)

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.abspielen'))).toBe('0');

    await schalter.click();
    await expect(schalter).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.abspielen'))).toBe('1');
  });

  test('Zwei-Finger-Doppeltipp-Undo (P8/E10 §10.2): Default AUS, Schalter schreibt kosmo.touch-undo-geste', async ({
    page,
  }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-touch-undo-geste"]');
    await expect(schalter).not.toBeChecked(); // §10.2: Default AUS, §8-1 bleibt Owner-offen
    expect(await page.evaluate(() => localStorage.getItem('kosmo.touch-undo-geste'))).toBeNull();

    await schalter.click();
    await expect(schalter).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.touch-undo-geste'))).toBe('1');

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.touch-undo-geste'))).toBe('0');
  });

  test('Kosmo-Charakter-Fenster: ehrlich «nur Desktop-App» — ausserhalb Tauri deaktiviert/ausgegraut', async ({
    page,
  }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-charakter"]');
    await expect(schalter).toBeVisible();
    // Kein Tauri in dieser Browser-Umgebung (`istTauriDesktop()` prüft
    // `__TAURI_INTERNALS__`, das hier nie gesetzt ist) — der Schalter bleibt
    // ehrlich deaktiviert, nicht nur optisch grau.
    await expect(schalter).toBeDisabled();
    await expect(schalter).not.toBeChecked();
  });
});

/**
 * K7 (docs/OWNER-KORREKTUREN-2026-07.md, Owner wörtlich: «einstellung ist
 * KosmoOrbit grundeinstellungen und fragenzeichen, die beiden dürfen
 * präsenter sein. sync aus ist daneben»): ? (Rundgang) und ⚙ (Einstellungen)
 * sind 44px-Kreis-Knöpfe (Touch-Mindest-Trefferfläche), der Sync-Status ist
 * DIREKT DANEBEN in derselben Gruppe (`kopf-grundfunktionen`) gruppiert —
 * vorher stand «Sync aus» ganz links, getrennt durch Hairlines.
 */
test('K7: ? und ⚙ präsenter (≥44px Trefferfläche), Sync-Status direkt daneben gruppiert', async ({
  page,
}) => {
  await bootstrap(page);
  const gruppe = page.locator('[data-testid="kopf-grundfunktionen"]');
  await expect(gruppe).toBeVisible();
  // «sync aus ist daneben»: der Sync-Umschalter lebt IN der Gruppe.
  await expect(gruppe.locator('[data-testid="sync-toggle"]')).toBeVisible();
  const sync = await gruppe.locator('[data-testid="sync-toggle"]').boundingBox();
  const frage = await page.locator('[data-testid="starter-guide-start"]').boundingBox();
  const zahnrad = await page.locator('[data-testid="einstellungen-oeffnen"]').boundingBox();
  // Touch-Mindestfläche 44px für beide Grundfunktions-Knöpfe.
  for (const box of [frage, zahnrad]) {
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  // Reihenfolge in der Gruppe: Sync → ? → ⚙, unmittelbar nebeneinander
  // (kleiner Gruppen-Gap, keine Hairline-Trennung mehr dazwischen).
  expect(sync!.x + sync!.width).toBeLessThanOrEqual(frage!.x + 1);
  expect(frage!.x + frage!.width).toBeLessThanOrEqual(zahnrad!.x + 1);
  expect(frage!.x - (sync!.x + sync!.width)).toBeLessThan(24);
  expect(zahnrad!.x - (frage!.x + frage!.width)).toBeLessThan(24);
  // Beide Knöpfe funktionieren unverändert: ⚙ öffnet das zentrale Panel.
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
});
