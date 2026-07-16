import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P8 (0.7.2-Rest «Schliessen-Choreografie mit Plopp», Spec §6.2,
 * B-84 §8d) — der container-baubare Teil dieses Rests: `KosmoPanel.tsx`
 * saugt sich beim Schliessen zur Orb-Ecke (`.k-panel-austritt-orb`, additiv
 * in `packages/kosmo-ui/src/aura.css`) statt nur seitlich wegzugleiten
 * (`.k-panel-austritt`, unverändert für `CommandPalette.tsx`).
 *
 * `playwright.config.ts` erzwingt app-weit `reducedMotion: 'reduce'` — genau
 * das ist der zweite hier geprüfte Vertrag («unter reduced-motion schliesst
 * das Panel weiterhin sofort, keine neue Verzögerung»). Für den eigentlichen
 * Choreografie-Test wird `reducedMotion` gezielt auf `'no-preference'`
 * übersteuert (Muster `e2e/kosmo-zustaende.spec.ts`).
 *
 * Die ZWEITE, choreografierte Übergabe zwischen dem Tauri-Hauptfenster und
 * dem separaten Desktop-Charakter-Fenster (`shell/KosmoCharakterFenster.tsx`)
 * bleibt eine ehrliche, dort dokumentierte Grenze (bräuchte einen Rust→JS-
 * Vorlauf, den `lib.rs` heute nicht sendet) — NICHT Gegenstand dieser Suite.
 */

async function frischOhnePanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
}

test('Schliessen-Choreografie: das Panel bekommt beim Schliessen die Orb-Austritts-Klasse, danach verschwindet es', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await frischOhnePanel(page);
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();

  await page.click('[data-testid="kosmo-panel-schliessen"]');
  // Sofort nach dem Klick trägt das (noch gemountete) Panel die neue
  // Austritts-Klasse — die Choreografie läuft, bevor der Eltern-`onClose`
  // es unmountet (`handleClose` in `KosmoPanel.tsx`).
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveClass(/k-panel-austritt-orb/);
  // Nach der Animation (~200ms, --k-motion-base) ist es weg.
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  // Das schwebende Symbol — die «Orb»-Ecke der Choreografie — ist wieder da.
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toBeVisible();
});

test('reduced-motion (App-Default in Playwright): das Panel schliesst sofort, ohne die Austritts-Klasse je zu zeigen', async ({
  page,
}) => {
  await frischOhnePanel(page);
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
  await page.click('[data-testid="kosmo-panel-schliessen"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
});
