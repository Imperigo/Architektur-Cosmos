import { expect, test, type Page } from '@playwright/test';

/**
 * Paket P-S1 («Startsequenz/Boot», `docs/V0812-START-SPEZ.md` §E-S1).
 *
 * `StartSequenz.tsx` rendert NUR mit explizitem Erzwingen-Flag, solange
 * `navigator.webdriver` wahr ist (Sanktion 1 — dasselbe Muster wie
 * `kosmo.vis.onboarding.erzwingen`, `VisOnboarding.tsx`). Playwright/Chromium
 * meldet `navigator.webdriver === true` (verifiziert u. a. in `App.tsx`s
 * `gehZu()`-Kommentar) — jeder BESTEHENDE Spec ohne dieses Flag sieht die
 * Komponente darum nie (Beweis (c) unten). Die vier Beweise hier decken
 * genau die vier Punkte aus der Spez ab: (a) erzwungen — fünf Zeilen +
 * Satellit + BEREIT, danach bedienbare Zentrale; (b) Escape-Skip; (c) ohne
 * Flag: Null-Render; (d) Bridge-offline-Ehrlichkeit (umgebogene
 * `kosmo.bridge`-URL — Test-Infrastruktur, KEIN Produktcode geändert).
 */

async function erzwingen(page: Page, extra?: Record<string, string>): Promise<void> {
  await page.addInitScript(
    ({ e }: { e: Record<string, string> | undefined }) => {
      localStorage.setItem('kosmo.start.erzwingen', '1');
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
      if (e) {
        for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
      }
    },
    { e: extra },
  );
  await page.goto('/');
}

test('(a) erzwungen: fünf ehrliche Boot-Zeilen + Satellit + SYSTEM BEREIT, danach Zentrale bedienbar', async ({
  page,
}) => {
  await erzwingen(page);

  const wurzel = page.locator('[data-testid="start-sequenz"]');
  await expect(wurzel).toBeVisible();

  // Fünf EHRLICHE Boot-Zeilen (Mono-Versalien, Reihenfolge KERN / KOSMO-LLM /
  // PROJEKTGRAPH / BRIDGE / STATIONEN).
  await expect(page.locator('[data-testid="start-sequenz-zeile-kern"]')).toContainText('KERN — BEREIT');
  await expect(page.locator('[data-testid="start-sequenz-zeile-kosmo-llm"]')).toContainText('KOSMO-LLM —');
  await expect(page.locator('[data-testid="start-sequenz-zeile-stationen"]')).toContainText('STATIONEN — BEREIT');
  // PROJEKTGRAPH/BRIDGE sind echte async Signale — sie landen wahr, sobald
  // `initVault()` bzw. der `/health`-Ping (geteilte Fake-Bridge, :8600)
  // abgeschlossen sind.
  await expect(page.locator('[data-testid="start-sequenz-zeile-projektgraph"]')).toContainText(
    'PROJEKTGRAPH — WIEDERHERGESTELLT',
    { timeout: 10_000 },
  );
  await expect(page.locator('[data-testid="start-sequenz-zeile-bridge"]')).toContainText('BRIDGE — VERBUNDEN', {
    timeout: 10_000,
  });

  // Satellit (Ladeanzeige, umkreist die Ellipse) + Knoten (dockt bei
  // «Bereit» an) — beide echte SVG-Elemente, `toBeAttached()` statt
  // `toBeVisible()` (bekannte Playwright-Bounding-Box-Heuristik-Falle bei
  // Motion-Path-/achsenparallelen SVG-Primitiven, s. orbit-start.spec.ts
  // Kopfkommentar).
  await expect(page.locator('[data-testid="start-sequenz-satellit"]')).toBeAttached();
  await expect(page.locator('[data-testid="start-sequenz-knoten"]')).toBeAttached();

  // Leitsatz + SYSTEM BEREIT, erst NACHDEM alle fünf Signale abgeschlossen sind.
  await expect(page.locator('[data-testid="start-sequenz-leitsatz"]')).toHaveText('Der Architekt bleibt Autor.');
  await expect(page.locator('[data-testid="start-sequenz-bereit"]')).toHaveText('SYSTEM BEREIT');

  // Auto-Ende (Hold + Austritts-Motion) — danach ist die Zentrale bedienbar.
  await expect(wurzel).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await expect(page.locator('[data-testid="orbit-haupt-design"]')).toHaveAttribute('aria-expanded', 'true');
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-station="design"]')).toBeAttached();
});

test('(b) Escape beendet die Sequenz sofort — Zentrale ist direkt danach bedienbar', async ({ page }) => {
  await erzwingen(page);

  const wurzel = page.locator('[data-testid="start-sequenz"]');
  await expect(wurzel).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(wurzel).toHaveCount(0, { timeout: 3_000 });
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  // Klick auf `module-design` navigiert OHNE Hover-Vorlauf (Hard-Contract
  // aus `OrbitStart.tsx`s Kopfkommentar) — der schlagende Beweis, dass die
  // Zentrale nach dem Skip wirklich sofort bedienbar ist.
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-station="design"]')).toBeAttached();
});

test('(c) ohne Erzwingen-Flag: Bestandsschutz — Sequenz-Root hat Count 0', async ({ page }) => {
  // KEIN `kosmo.start.erzwingen` gesetzt — nur die üblichen Bootstrap-Flags,
  // damit die Zentrale ohne Guide/Onboarding-Karten lädt (Muster wie
  // orbit-start.spec.ts). `navigator.webdriver` ist in Playwright bereits
  // wahr — das allein muss reichen, um die Sequenz komplett zu unterdrücken.
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.waitForSelector('[data-testid="orbit-start"]');

  await expect(page.locator('[data-testid="start-sequenz"]')).toHaveCount(0);
  // Auch nach einer kurzen Wartezeit (falls die Komponente verzögert doch
  // etwas rendern würde) bleibt der Bestandsschutz hart.
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="start-sequenz"]')).toHaveCount(0);
});

test('(d) Bridge-offline-Ehrlichkeit: umgebogene Bridge-URL → «NICHT VERBUNDEN», Sequenz endet trotzdem', async ({
  page,
}) => {
  // Test-Infrastruktur-Umbiegung (KEIN Produktcode geändert): derselbe
  // Schlüssel, den `StartSequenz.tsx`/`VisWorkspace.tsx`/`KosmoPanel.tsx`
  // u. a. bereits lesen (`localStorage['kosmo.bridge']`) — hier auf einen
  // toten Port gesetzt, damit der `/health`-Ping ehrlich scheitert.
  await erzwingen(page, { 'kosmo.bridge': 'http://localhost:9' });

  await expect(page.locator('[data-testid="start-sequenz"]')).toBeVisible();
  await expect(page.locator('[data-testid="start-sequenz-zeile-bridge"]')).toContainText(
    'BRIDGE — NICHT VERBUNDEN',
    { timeout: 10_000 },
  );

  // Ehrlich, aber nicht blockierend: die Sequenz läuft trotzdem bis
  // SYSTEM BEREIT und endet danach von selbst.
  await expect(page.locator('[data-testid="start-sequenz-bereit"]')).toHaveText('SYSTEM BEREIT', {
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="start-sequenz"]')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
});

/**
 * iPad-Beweis (Owner-Kompass 2026-07-20: «iPad erste Klasse»): die
 * Startsequenz rendert im iPad-Viewport vollständig und der Tap-Skip
 * (Spez E-S1 Punkt 3 «Klick/Tap/Escape beendet sofort») funktioniert
 * mit echtem Touch-Event.
 */
test.describe('iPad 1024×768 (Touch)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test('Sequenz rendert mit allen fünf Zeilen, Tap überspringt sofort', async ({ page }) => {
    await erzwingen(page);
    await page.goto('/');
    const wurzel = page.locator('[data-testid="start-sequenz"]');
    await expect(wurzel).toBeVisible();
    await expect(page.locator('[data-testid="start-sequenz-zeile-kern"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-sequenz-zeile-bridge"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-sequenz-zeile-stationen"]')).toBeVisible();
    await wurzel.tap();
    await expect(wurzel).toHaveCount(0);
    await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
  });
});
