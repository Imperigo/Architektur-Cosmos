import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P15 (Mobile Companion, docs/V081-SPEZ.md §7(f)/§9.5 C-34) —
 * beweist das responsive Kartenlayout von `shell/Companion.tsx`
 * (`shell/companion-065.css`) unter SIMULIERTEN Playwright-Viewports. Die
 * Ansicht bleibt dieselbe Komponente/dieselben `data-testid`s wie
 * `e2e/companion.spec.ts` — hier nur zusätzlich mit engen `viewport`-Werten
 * pro Test (Playwright erlaubt das über `page.setViewportSize`, kein neuer
 * Browser-Kontext nötig).
 *
 * **Deklarierte Grenze** (wörtlich im UI, `[data-testid="companion-geraete-
 * grenze"]`): reales Touch-Verhalten auf echter Hardware ist NICHT Teil
 * dieser Suite — das bleibt Owner-Aktion ausserhalb des Containers (analog
 * `docs/IPAD-TOUCH-DREHBUCH.md`, §9 C-11 der Spez). Diese Suite beweist nur,
 * dass das LAYOUT unter simulierten schmalen Viewports funktioniert und die
 * Tap-Ziele gross genug sind.
 */

async function gotoCompanionAt(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/#companion');
  await page.reload();
  await page.waitForSelector('[data-testid="companion"]');
}

test('375px (Telefon-Breite): kein horizontaler Overflow, Aside stapelt über der Hauptspalte', async ({ page }) => {
  await gotoCompanionAt(page, 375, 812);

  const [scrollWidth, clientWidth] = await Promise.all([
    page.evaluate(() => document.documentElement.scrollWidth),
    page.evaluate(() => document.documentElement.clientWidth),
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

  // Body stapelt (flex-direction: column) statt zwei Spalten nebeneinander
  // zu quetschen — `.companion-body`/`.companion-aside`, s. companion-065.css.
  const flexDirection = await page.evaluate(
    () => getComputedStyle(document.querySelector('.companion-body')!).flexDirection,
  );
  expect(flexDirection).toBe('column');

  const asideWidth = await page.locator('.companion-aside').evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(asideWidth)).toBeLessThanOrEqual(375);

  // Beide Spalten bleiben sichtbar (nur gestapelt, nichts verschwindet).
  await expect(page.locator('[data-testid="companion-zustaende"]')).toBeVisible();
  await expect(page.locator('[data-testid="companion-leer"]')).toBeVisible();
});

test('375px: 4er-Dock bleibt touch-tauglich (>= 44px) und vollständig sichtbar', async ({ page }) => {
  await gotoCompanionAt(page, 375, 812);
  await expect(page.locator('[data-testid="companion-dock"]')).toBeVisible();
  for (const id of ['design', 'data', 'kosmo', 'office']) {
    const box = await page.locator(`[data-testid="companion-dock-${id}"]`).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('700px (Breakpoint-Grenze): Zwei-Spalten-Layout bleibt nebeneinander, keine Regression', async ({ page }) => {
  await gotoCompanionAt(page, 900, 700);
  const flexDirection = await page.evaluate(
    () => getComputedStyle(document.querySelector('.companion-body')!).flexDirection,
  );
  expect(flexDirection).toBe('row');
  const asideWidth = await page.locator('.companion-aside').evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(asideWidth)).toBe(340);
});

test('deklarierte Grenze steht wörtlich in der UI: reale Geräte/Touch-Hardware bleibt Owner-Prüfung', async ({ page }) => {
  await gotoCompanionAt(page, 375, 812);
  const grenze = page.locator('[data-testid="companion-geraete-grenze"]');
  await expect(grenze).toBeVisible();
  await expect(grenze).toContainText('simulierten Viewports');
  await expect(grenze).toContainText('Owner-Prüfung');
});

test('414px (iPhone-Plus-Breite): Job-Karte nach dem Seeden bleibt lesbar, kein Overflow', async ({ page }) => {
  await gotoCompanionAt(page, 414, 896);
  await page.evaluate(() =>
    (window as unknown as { __kosmoCompanion: { erfasseAuftrag: (t: string) => Promise<unknown> } }).__kosmoCompanion.erfasseAuftrag(
      'Fenstermass mit Bauherrschaft klären',
    ),
  );
  const karte = page.locator('[data-testid^="companion-job-auftrag-"]');
  await expect(karte).toBeVisible({ timeout: 8000 });
  const [scrollWidth, clientWidth] = await Promise.all([
    page.evaluate(() => document.documentElement.scrollWidth),
    page.evaluate(() => document.documentElement.clientWidth),
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});
