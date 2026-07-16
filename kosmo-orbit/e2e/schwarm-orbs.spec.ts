import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P8 (0.7.2-Rest «Schwarm-Orbs», Spec §6.2, B-85 §11b «max. 3
 * gleichzeitige Neben-Orbs, Klick = Fokus») — läuft in `Companion.tsx`
 * (`#companion`, Muster `e2e/companion.spec.ts`), Daten über den
 * bestehenden Test-Hook `window.__kosmoCompanion.setzeVisLauf` geseedet
 * (echte `vis-runtime`-Läufe, kein zweiter Datenpfad).
 */
declare global {
  interface Window {
    __kosmoCompanion: {
      setzeVisLauf: (nodeId: string, lauf: unknown) => void;
    };
  }
}

async function gotoCompanion(page: Page): Promise<void> {
  await page.goto('/#companion');
  await page.reload();
}

async function seedeLauf(page: Page, nodeId: string): Promise<void> {
  await page.evaluate(
    (id) => window.__kosmoCompanion.setzeVisLauf(id, { status: 'rendert', memoKey: 'k' }),
    nodeId,
  );
}

test('Schwarm-Orbs: bis zu 3 Neben-Orbs, ab der 4. Karte ein «+N»-Chip', async ({ page }) => {
  await gotoCompanion(page);
  await seedeLauf(page, 'node-a');
  await seedeLauf(page, 'node-b');
  await seedeLauf(page, 'node-c');

  const orbs = page.locator('[data-testid^="schwarm-orb-vis-"]');
  await expect(orbs).toHaveCount(3);
  await expect(page.locator('[data-testid="schwarm-orb-mehr"]')).toHaveCount(0);

  await seedeLauf(page, 'node-d');
  await expect(orbs).toHaveCount(3);
  await expect(page.locator('[data-testid="schwarm-orb-mehr"]')).toHaveText('+1');
});

test('Klick auf einen Schwarm-Orb fokussiert (hervorgehoben + aria-pressed) die zugehörige Zeile in der vollen Liste', async ({
  page,
}) => {
  await gotoCompanion(page);
  await seedeLauf(page, 'node-a');
  await seedeLauf(page, 'node-b');

  const orbB = page.locator('[data-testid="schwarm-orb-vis-node-b"]');
  await expect(orbB).toHaveAttribute('aria-pressed', 'false');
  await orbB.click();
  await expect(orbB).toHaveAttribute('aria-pressed', 'true');

  const zeileB = page.locator('[data-testid="companion-job-vis-node-b"]');
  await expect(zeileB).toBeVisible();
  // Fokussierte Zeile trägt den Signal-Outline-Ring (s. `Companion.tsx` `KarteZeile`).
  await expect(zeileB).toHaveCSS('outline-color', 'rgb(87, 182, 194)');
});
