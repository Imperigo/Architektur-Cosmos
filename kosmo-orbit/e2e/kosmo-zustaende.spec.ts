import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.2 §6 (Paket 06, Stream W2-D) — «Kosmo-Zustände»: `KosmoOrb.tsx`
 * zeigt jeden `KosmoZustand` über `data-zustand` (CSS-Attribut-Selektoren,
 * `kosmo-feedback.css`). Getrieben über den Test-Hook `window.__kosmoStatus`
 * (Muster wie `window.__kosmoBlick`/`window.__kosmoChat`, `KosmoPanel.tsx`) —
 * unabhängig davon, ob gerade das Symbol (Panel zu) oder das Panel (offen)
 * gemountet ist, der Store selbst existiert immer (Modul-Singleton).
 *
 * Läuft gegen `KosmoSymbol.tsx` (Panel bewusst ZU, s. `kosmo-symbol.spec.ts`):
 * der Orb sitzt dort im 52px-Knopf, `[data-testid="kosmo-orb"]`.
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

const ALLE_ZUSTAENDE = [
  'idle',
  'thinking',
  'listening',
  'speaking',
  'writing',
  'dispatching',
  'done',
  'error',
  'takeover',
] as const;

test('data-zustand wechselt korrekt über alle 9 Kosmo-Zustände', async ({ page }) => {
  await frischOhnePanel(page);
  const orb = page.locator('[data-testid="kosmo-orb"]');
  await expect(orb).toBeAttached();
  // Default-Start: idle (Store-Initialwert, kein Aufruf nötig).
  await expect(orb).toHaveAttribute('data-zustand', 'idle');

  for (const z of ALLE_ZUSTAENDE) {
    await page.evaluate((zustand) => {
      (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
        zustand,
      );
    }, z);
    await expect(orb).toHaveAttribute('data-zustand', z);
  }
});

test('takeover rendert den Fensterrahmen-Overlay mit Chip «KOSMO ARBEITET · ESC BRICHT AB»', async ({ page }) => {
  await frischOhnePanel(page);
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'takeover',
    );
  });
  const overlay = page.locator('[data-testid="kosmo-orb-takeover"]');
  await expect(overlay).toBeAttached();
  await expect(overlay).toContainText('KOSMO ARBEITET · ESC BRICHT AB');
  // 4 Ecken-Pulse vorhanden (§6 Punkt 8, wörtlich «4 Ecken pulsieren versetzt»).
  await expect(page.locator('.kosmo-orb-takeover-ecke')).toHaveCount(4);
});

test('speaking zeigt den Equalizer, writing zeigt Wort-Pills mit tealem letzten Wort', async ({ page }) => {
  await frischOhnePanel(page);
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'speaking',
    );
  });
  await expect(page.locator('[data-testid="kosmo-orb-equalizer"]')).toBeVisible();

  // `writing` selbst kommt über `onText`-Streaming (KosmoPanel) — hier direkt
  // über den Zustand geprüft (Orb-Darstellung ohne `text`-Prop bleibt leer,
  // s. `KosmoOrb.tsx`: keine Wort-Pills ohne Text — kein erfundener Inhalt).
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'writing',
    );
  });
  await expect(page.locator('[data-testid="kosmo-orb"]')).toHaveAttribute('data-zustand', 'writing');
});

test('reduced-motion: der Orb-Kern hat animation-name none; Standard: eine echte Animation läuft', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frischOhnePanel(page);
  const kern = page.locator('.kosmo-orb-kern').first();
  await expect(kern).toBeAttached();
  const animName = await kern.evaluate((el) => getComputedStyle(el).animationName);
  expect(animName).toBe('none');
});

test('Standard (keine reduced-motion): der idle-Orb-Kern trägt eine echte Puls-Animation', async ({ page }) => {
  await frischOhnePanel(page);
  const kern = page.locator('.kosmo-orb-kern').first();
  await expect(kern).toBeAttached();
  const animName = await kern.evaluate((el) => getComputedStyle(el).animationName);
  expect(animName).toBe('k-orb-kern-puls');
});

test('reduced-motion: takeover-Ecken-Puls ist strukturell abgeschaltet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frischOhnePanel(page);
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'takeover',
    );
  });
  const ecke = page.locator('.kosmo-orb-takeover-ecke').first();
  await expect(ecke).toBeAttached();
  const animName = await ecke.evaluate((el) => getComputedStyle(el).animationName);
  expect(animName).toBe('none');
});

test('done→idle Auto-Decay nach ~2s', async ({ page }) => {
  await frischOhnePanel(page);
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'done',
    );
  });
  await expect(page.locator('[data-testid="kosmo-orb"]')).toHaveAttribute('data-zustand', 'done');
  await expect(page.locator('[data-testid="kosmo-orb"]')).toHaveAttribute('data-zustand', 'idle', {
    timeout: 3000,
  });
});

test('error→idle Auto-Decay nach ~4s (länger als done)', async ({ page }) => {
  await frischOhnePanel(page);
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'error',
    );
  });
  await expect(page.locator('[data-testid="kosmo-orb"]')).toHaveAttribute('data-zustand', 'error');
  // Nach 2.5s ist 'error' (anders als 'done') noch NICHT verfallen.
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-testid="kosmo-orb"]')).toHaveAttribute('data-zustand', 'error');
  await expect(page.locator('[data-testid="kosmo-orb"]')).toHaveAttribute('data-zustand', 'idle', {
    timeout: 3000,
  });
});

test('beschaeftigt() ist während done/error bereits false (abgeleitet), während dispatching true', async ({
  page,
}) => {
  await frischOhnePanel(page);
  const beschaeftigt = () =>
    page.evaluate(
      () => (window as unknown as { __kosmoStatus: { beschaeftigt: () => boolean } }).__kosmoStatus.beschaeftigt(),
    );
  const setze = (z: string) =>
    page.evaluate(
      (zustand) =>
        (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
          zustand,
        ),
      z,
    );

  await setze('dispatching');
  expect(await beschaeftigt()).toBe(true);

  await setze('done');
  expect(await beschaeftigt()).toBe(false);

  await setze('error');
  expect(await beschaeftigt()).toBe(false);
});
