import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.2 §8 (Paket 08, Stream W3-F) — CursorEbene: der eigene Zeiger.
 *
 * Hartvertrag (Spec §11): unter `navigator.webdriver` (== Playwright/
 * Chromium-Automation, immer `true` in dieser Suite) bleibt die Ebene PER
 * DEFAULT aus — die ~40 Bestands-Specs, die `module-design` direkt anklicken,
 * dürfen nie einen unsichtbaren System-Cursor (`cursor:none`) bekommen.
 * Diese Suite schaltet die Ebene darum GEZIELT über den dokumentierten
 * Test-Pfad `window.__kosmoCursor.aktivieren()` ein (siehe
 * `shell/CursorEbene.tsx` Kopfkommentar) — genau der von der Aufgabe
 * verlangte «Testpfad».
 */

async function geladen(page: Page, vorabLocalStorage?: Record<string, string>): Promise<void> {
  await page.goto('/');
  await page.evaluate((seed) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    for (const [k, v] of Object.entries(seed ?? {})) localStorage.setItem(k, v);
  }, vorabLocalStorage);
  await page.reload();
}

test.describe('Default-Sperre unter navigator.webdriver (Hartvertrag §11)', () => {
  test('ohne Test-Hook bleibt die Ebene aus — kein Layer, kein cursor:none', async ({ page }) => {
    await geladen(page);
    await expect(page.locator('[data-testid="cursor-ebene"]')).toHaveCount(0);
    const eigencursorAttr = await page.evaluate(() => document.documentElement.dataset.eigencursor);
    expect(eigencursorAttr).toBe('aus');
  });

  test('Test-Hook window.__kosmoCursor existiert immer (App-Mount), unabhängig vom Aktiv-Zustand', async ({
    page,
  }) => {
    await geladen(page);
    const hookVorhanden = await page.evaluate(
      () => typeof (window as unknown as { __kosmoCursor?: unknown }).__kosmoCursor === 'object',
    );
    expect(hookVorhanden).toBe(true);
  });
});

test.describe('Eingeschaltet über den Test-Pfad (window.__kosmoCursor.aktivieren())', () => {
  test('Layer erscheint, [data-eigencursor="an"] gesetzt, echter Cursor unsichtbar', async ({ page }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await expect(page.locator('[data-testid="cursor-ebene"]')).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.eigencursor)).toBe('an');
    const cursorStil = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
    expect(cursorStil).toBe('none');
  });

  test('Mausbewegung positioniert den Wrapper (translate3d folgt dem Zeiger)', async ({ page }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await page.mouse.move(300, 200);
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
    const transformBei300 = await wrapper.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.move(500, 400);
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).transform)).not.toBe(transformBei300);
  });
});

test.describe('Opt-out: kosmo.eigencursor = "0" gewinnt IMMER (Spec §8)', () => {
  test('bleibt aus, selbst wenn der Test-Hook den webdriver-Riegel umgeht', async ({ page }) => {
    await geladen(page, { 'kosmo.eigencursor': '0' });
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await expect(page.locator('[data-testid="cursor-ebene"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.eigencursor)).toBe('aus');
    const cursorStil = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
    expect(cursorStil).not.toBe('none');
  });
});

test.describe('Input-Ausnahme (Spec §8: Inputs/Textarea/Select/contenteditable)', () => {
  test('über einem Input versteckt sich die Ebene (Opacity 0), cursor bleibt auto', async ({ page }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    // `projekt-neu-name` (Zentrale) ist ein einfaches <input> ohne Sonderfall.
    const input = page.locator('[data-testid="projekt-neu-name"]');
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    if (!box) throw new Error('Input hat keine BoundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    const inputCursor = await input.evaluate((el) => getComputedStyle(el).cursor);
    expect(inputCursor).toBe('auto');
  });
});

test.describe('reduced-motion: Morph/Rotor strukturell statisch (Spec §0/§8)', () => {
  test('Rotor-Transition und Morph-Keyframes sind auf 0.01ms gekürzt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    const rotor = page.locator('.cursor-ebene-rotor');
    await expect(rotor).toBeAttached();
    const transitionDuration = await rotor.evaluate((el) => getComputedStyle(el).transitionDuration);
    // Chromium meldet `getComputedStyle().transitionDuration` für 0.01ms als
    // "1e-05s" (wissenschaftliche Schreibweise in Sekunden) — praktisch
    // unsichtbar/synchron, der eigentliche Beweis für den globalen
    // aura.css-Riegel. Ein numerischer Vergleich ist robuster als exakte
    // String-Varianten verschiedener Engines/Rundungen.
    const sekunden = Number.parseFloat(transitionDuration);
    expect(sekunden).toBeLessThan(0.001);
  });
});

/**
 * pointer:fine-Gate (Spec §8: "Default AN nur bei pointer:fine"): Playwright
 * emuliert in dieser Chromium-Version **immer** `pointer:fine` — es gibt
 * keinen `page.emulateMedia`-Hebel für `pointer`/`hover` (nur
 * `reducedMotion`/`colorScheme`/`forcedColors`). Ein `hasTouch`-Browser-
 * Kontext ändert die Touch-Fähigkeit, spiegelt aber nicht zuverlässig auf
 * `matchMedia('(pointer: coarse)')` in Headless-Chromium (mit SwiftShader),
 * wie der Vorab-Check unten zeigt — darum bricht dieser Test bewusst ab
 * (`test.skip`), statt einen falschen grünen Haken vorzutäuschen. Die
 * eigentliche Regel («ohne gespeicherten Wert entscheidet `pointer:fine`»)
 * ist stattdessen in `test/cursor-zustand.test.ts` (Vitest, `matchMedia`
 * gemockt) hart geprüft — DAS ist hier die massgebliche, verlässliche
 * Absicherung. Ehrliche Grenze, wie von der Aufgabe verlangt.
 */
test.describe('pointer:fine-Gate — Grenze dieser E2E-Suite', () => {
  test('coarse-pointer lässt sich in dieser Chromium/Playwright-Kombination nicht zuverlässig emulieren', async ({
    browser,
  }) => {
    const kontext = await browser.newContext({ hasTouch: true, isMobile: true });
    const seite = await kontext.newPage();
    await seite.goto('/');
    const istCoarse = await seite.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
    await kontext.close();
    test.skip(
      !istCoarse,
      'hasTouch:true spiegelt in dieser Umgebung nicht auf matchMedia("(pointer: coarse)") — ' +
        'dokumentierte Grenze, siehe Kopfkommentar. Die Default-AN-nur-bei-pointer:fine-Regel ' +
        'ist stattdessen per Vitest (gemocktes matchMedia) hart abgesichert.',
    );
    expect(istCoarse).toBe(true);
  });
});
