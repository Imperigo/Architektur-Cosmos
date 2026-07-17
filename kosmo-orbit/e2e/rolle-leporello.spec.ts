import { expect, test } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * Rolle 1600×594 / Leporello-Faltung (v0.8.1/P13, `docs/V081-SPEZ.md` §7(d),
 * C-27) — deckt den im Bau-Auftrag geforderten UI-Weg ab:
 *
 *  - Format-Wähler der Publish-Station bietet «Rolle» zusätzlich zu A0–A4 an
 *    (`new-sheet-format`, additiver `data-testid` auf dem KSelect-Trigger,
 *    `PublishWorkspace.tsx`).
 *  - Ein so erstelltes Blatt zeigt im Vorschau-SVG das volle Plankopf-
 *    Framework UND die neuen Leporello-Knicklinien (`g[data-teil=
 *    "leporello"]`, `derive/sheet.ts`).
 *  - Regressionsnetz: A1 (Bestandsformat) bleibt ohne Leporello-Gruppe.
 *
 * Bootstrap wie `e2e/plankopf.spec.ts`/`e2e/blatt-fuellen.spec.ts`: TKB-Demo
 * laden, Publish öffnen.
 */

declare global {
  interface Window {
    __kosmo: { open: (s: string) => void };
  }
}

async function ladeUndOeffnePublish(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
}

test('Format-Wähler bietet Rolle zusätzlich zu A0–A4 an — Screenshot des geöffneten Popups', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  const trigger = page.locator('[data-testid="new-sheet-format"]');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('data-value', 'A1'); // Default unverändert

  await trigger.click();
  const popup = page.locator('[data-testid="new-sheet-format-popup"]');
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-value="A0"]')).toBeVisible();
  await expect(popup.locator('[data-value="A1"]')).toBeVisible();
  await expect(popup.locator('[data-value="A2"]')).toBeVisible();
  await expect(popup.locator('[data-value="A3"]')).toBeVisible();
  await expect(popup.locator('[data-value="A4"]')).toBeVisible();
  await expect(popup.locator('[data-value="Rolle"]')).toBeVisible();
  // Nur für den Screenshot: die `k-einblenden`-Öffnen-Animation
  // (`aura.css`) bleibt auf dieser Maschine (Software-GL/SwiftShader-
  // Compositor, `playwright.config.ts` `--use-angle=swiftshader`) manchmal
  // dauerhaft auf der 0%-Keyframe-Opazität stehen (`animation-play-state:
  // running`, aber ohne fortschreitende Zeit — ein reiner Compositor-
  // Stillstand dieses Containers, verifiziert per Diagnose-Script: weder
  // `reducedMotion:'no-preference'` noch beliebig langes Warten ändert
  // daran etwas). Rein kosmetisch für DIESEN Screenshot, keine funktionale
  // Regression: `toBeVisible()`/der Klick auf «Rolle» unten funktionieren
  // unabhängig von der Opazität (DOM-Element ist da, klickbar, nur die
  // Pixel wären ohne diesen Reset unsichtbar). Deshalb hier gezielt die
  // Animation stillgelegt, statt eine Wartezeit zu verlängern, die auf
  // dieser Maschine nie greifen würde.
  await page.addStyleTag({ content: '.k-einblenden { animation: none !important; opacity: 1 !important; transform: none !important; }' });
  await page.screenshot({ path: 'test-results/p13-081-format-waehler-rolle.png' });

  await popup.locator('[data-value="Rolle"]').click();
  await expect(popup).toBeHidden();
  await expect(trigger).toHaveAttribute('data-value', 'Rolle');
});

test('Rolle-Blatt erstellen: Format-Meta zeigt «Rolle», SVG zeigt Plankopf-Framework + Leporello-Faltlinien', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await waehleOption(page, 'new-sheet-format', 'Rolle');
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  // Sheet-Meta-Zeile (`{s.format} {s.orientation} · …`) nennt «Rolle quer».
  await expect(page.locator('.k-publish-sheet-meta').last()).toContainText('Rolle quer');

  // Post-Sammelwechsel-Default-Framework ist da, wie bei jedem anderen Format.
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1);

  // Die neue Leporello-Gruppe (nur beim Rolle-Format, Guard `sheet.format ===
  // 'Rolle'`, `derive/sheet.ts`) ist da, mit den 8 erwarteten Knicklinien
  // (`faltmarken(1600,594).vertikal`, s. `blattlayout.test.ts`).
  const leporello = page.locator('[data-testid="sheet-canvas"] g[data-teil="leporello"]');
  await expect(leporello).toHaveCount(1);
  await expect(leporello.locator('line')).toHaveCount(8);

  await page.screenshot({ path: 'test-results/p13-081-rolle-blatt-faltlinien.png' });
});

test('Regressionsnetz: A1 (Bestandsformat) zeigt weiterhin KEINE Leporello-Gruppe, Default bleibt A1', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  const trigger = page.locator('[data-testid="new-sheet-format"]');
  await expect(trigger).toHaveAttribute('data-value', 'A1');
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="leporello"]')).toHaveCount(0);
  await expect(page.locator('.k-publish-sheet-meta').last()).toContainText('A1 quer');
});
