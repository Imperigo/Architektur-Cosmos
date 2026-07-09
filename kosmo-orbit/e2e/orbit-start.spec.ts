import { expect, test } from '@playwright/test';

/**
 * Serie K / F3 — Owner-Auftrag wörtlich: «das startmenü muss neu gestaltet
 * werden ... nicht Blöcke, eher wie das Kosmos-Zeichen rund ... NUR die 4
 * Hauptwerkzeuge anzeigen ... im Kreis angeordnet, GANZ LANGSAM ... Hover
 * auf Hauptwerkzeug zeigt Untertools mit Titel + Kurzbeschrieb, Hover auf
 * Untertool zeigt was es kann.»
 *
 * Diese Suite prüft das neue `OrbitStart.tsx` direkt. Playwright-Fallen
 * (siehe Auftrag): achsenparallele SVG-Linien in den Hauptwerkzeug-Icons
 * gelten Playwright oft als "hidden" (Bounding-Box-Heuristik bei 0-Breite/
 * Höhe-Segmenten) — wir prüfen deshalb `toBeAttached()` statt `toBeVisible()`
 * auf Icon-internen Pfaden, nie auf den echten Knöpfen/Containern selbst.
 */

async function zentraleLaden(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

test('4 Hauptwerkzeuge sind sichtbar, mit Titel (KosmoDesign/KosmoData/Kosmo/KosmoOffice)', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();

  const erwartet: Record<string, string> = {
    design: 'KosmoDesign',
    data: 'KosmoData',
    kosmo: 'Kosmo',
    office: 'KosmoOffice',
  };
  for (const [id, titel] of Object.entries(erwartet)) {
    const knopf = page.locator(`[data-testid="orbit-haupt-${id}"]`);
    await expect(knopf).toBeVisible();
    await expect(knopf).toContainText(titel);
  }
  // Genau 4 — keine fünfte Kachel/kein Rest der alten Familien-Ansicht.
  await expect(page.locator('[data-testid^="orbit-haupt-"]')).toHaveCount(4);
});

test('Hover auf KosmoDesign zeigt Draw/Prepare/Vis/Publish mit Kurzbeschrieb', async ({ page }) => {
  await zentraleLaden(page);
  const faecher = page.locator('[data-testid="orbit-faecher-design"]');

  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await expect(faecher).toHaveClass(/\boffen\b/);

  const draw = faecher.locator('[data-testid="module-design"]');
  await expect(draw).toContainText('Draw');
  await expect(draw).toContainText('Wände');

  await expect(faecher.locator('[data-testid="module-prepare"]')).toContainText('Prepare');
  await expect(faecher.locator('[data-testid="module-vis"]')).toContainText('Vis');
  await expect(faecher.locator('[data-testid="module-publish"]')).toContainText('Publish');
});

test('Klick auf Draw (module-design) im Fächer öffnet den KosmoDesign-Workspace', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await page.locator('[data-testid="orbit-faecher-design"] [data-testid="module-design"]').click();
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
});

test('KosmoOffice trägt sichtbar «kommend» und öffnet KEIN leeres Modul', async ({ page }) => {
  await zentraleLaden(page);
  const office = page.locator('[data-testid="orbit-haupt-office"]');
  await expect(office).toContainText('kommend');

  await office.hover();
  const faecher = page.locator('[data-testid="orbit-faecher-office"]');
  await expect(faecher).toHaveClass(/\boffen\b/);
  for (const id of ['lead', 'buero-hr', 'lehre', 'bau']) {
    const knopf = page.locator(`[data-testid="orbit-office-${id}"]`);
    await expect(knopf).toBeVisible();
    await expect(knopf).toBeDisabled();
  }

  // Klick auf das Hauptwerkzeug selbst navigiert nirgendwohin.
  await office.click();
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="planview"], [data-testid="tab-uebersicht"], [data-testid="auftrag-erfassen"]'),
  ).toHaveCount(0);
});

test('reduced-motion: die Orbit-Rotation ist strukturell abgeschaltet (keine Animation)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await zentraleLaden(page);
  const knoten = page.locator('.k-orbit-knoten').first();
  await expect(knoten).toBeAttached();
  const animName = await knoten.evaluate((el) => getComputedStyle(el).animationName);
  expect(animName).toBe('none');
});

test('Standard (keine reduced-motion): die Orbit-Rotation ist strukturell EIN — animation-name gesetzt', async ({ page }) => {
  await zentraleLaden(page);
  const knoten = page.locator('.k-orbit-knoten').first();
  const gegendreh = page.locator('.k-orbit-knoten-gegendreh').first();
  await expect(knoten).toBeAttached();
  const [drehName, gegenName] = await Promise.all([
    knoten.evaluate((el) => getComputedStyle(el).animationName),
    gegendreh.evaluate((el) => getComputedStyle(el).animationName),
  ]);
  expect(drehName).toBe('k-orbit-drehen');
  expect(gegenName).toBe('k-orbit-gegendrehen');
});

test('Hover pausiert die Rotation — Owner-Auftrag: das Ziel darf der Maus nicht entfliehen', async ({ page }) => {
  await zentraleLaden(page);
  const ringFeld = page.locator('[data-testid="orbit-ring"]');
  await ringFeld.hover();
  const knoten = page.locator('.k-orbit-knoten').first();
  await expect.poll(() => knoten.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
});
