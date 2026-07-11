import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.2 «Visuelles Update» §2 (Paket 01, Stream W1-A) — Splash.
 *
 * `#splash` lebt inline in `index.html`, VOR `#root`, mit hartcodierten
 * Farb-/Font-Fallbacks (kein Bundle-Wait: er muss zeigen können, bevor das
 * JS-Bundle überhaupt geladen ist). `App.tsx` entfernt ihn synchron im
 * allerersten Mount-Effect (`useLayoutEffect`). Zwei Beweise:
 *
 * 1. Solange der Splash im DOM steht, blockiert er KEINEN Klick
 *    (`pointer-events:none` auf dem gesamten Overlay) — geprüft, indem das
 *    Bundle-Skript geblockt bleibt (Splash bleibt dadurch stehen) und ein
 *    darunterliegender Testknopf trotzdem anklickbar ist.
 * 2. Nach echtem App-Mount (Bootstrap-Muster wie die Nachbar-Specs) ist
 *    `#splash` vollständig aus dem DOM entfernt — kein Rest-Overlay.
 */

async function bootstrap(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

test('Splash blockiert keine Klicks (pointer-events:none, volle Fläche)', async ({ page }) => {
  // Jedes .js-Skript wird geblockt — das App-Bundle läuft dadurch NIE, der
  // Splash bleibt darum für die Dauer des Tests stehen (ohne das würde React
  // ihn binnen Millisekunden synchron entfernen und die Prüfung liefe ins
  // Leere). CSS/HTML sind unabhängig davon bereits vollständig geparst.
  await page.route('**/*.js', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const splash = page.locator('#splash');
  await expect(splash).toBeVisible();

  // Ein echter Testknopf HINTER dem Splash: z-index 10 — bewusst ÜBER dem
  // leeren `#root` (das trägt in aura.css selbst `z-index:1` bei voller
  // Höhe und würde mit einem z-index-0-Knopf als Erstes abfangen; #root ist
  // hier aber nicht der Prüfgegenstand), klar UNTER dem Splash (9999).
  // Kommt der Klick durch, ist der Beweis erbracht: das raumfüllende
  // Splash-Overlay fängt trotz voller Bildschirmgrösse nichts ab. Playwright
  // wirft von selbst einen sprechenden Fehler («… intercepts pointer
  // events»), sollte `pointer-events:none` fehlen — kein `force:true`.
  await page.evaluate(() => {
    const knopf = document.createElement('button');
    knopf.id = 'splash-klick-test';
    knopf.style.position = 'fixed';
    knopf.style.inset = '0';
    knopf.style.zIndex = '10';
    knopf.addEventListener('click', () => knopf.setAttribute('data-geklickt', 'ja'));
    document.body.insertBefore(knopf, document.getElementById('splash'));
  });
  await page.click('#splash-klick-test');
  await expect(page.locator('#splash-klick-test')).toHaveAttribute('data-geklickt', 'ja');
});

test('Splash ist nach dem App-Mount vollständig aus dem DOM entfernt', async ({ page }) => {
  await bootstrap(page);
  await expect(page.locator('#splash')).toHaveCount(0);
});
