import { expect, test } from '@playwright/test';

/**
 * CSP-Absicherung (Serie I / Batch B2, R6) — gezielter Root-Smoke, KEINE
 * Vollsuite. Beweist, dass die PWA-Meta-CSP in `index.html` (dieselbe
 * Politik wie die Tauri-Desktop-CSP) die App nicht weiss macht: Zentrale
 * lädt, Modul-Kacheln stehen, eine Station (KosmoDesign) öffnet fehlerfrei —
 * und dabei verletzt NICHTS die Content-Security-Policy (kein blockiertes
 * Script/Style/Connect/Worker). CSP-Verstösse feuern das Browser-Event
 * `securitypolicyviolation` UND landen als Konsolenfehler — wir fangen
 * beides, damit ein Fehlschlag hier eindeutig auf die Policy zeigt statt auf
 * einen unabhängigen App-Bug.
 */

test('CSP-Root-Smoke: Zentrale lädt, KosmoDesign öffnet, keine CSP-Verstösse', async ({ page }) => {
  const cspViolations: string[] = [];
  const consoleErrors: string[] = [];

  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
        `${e.violatedDirective}: ${e.blockedURI}`,
      );
    });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto('/');

  // Zentrale sichtbar: mind. eine module-*-Kachel da (KosmoDesign ist immer
  // vorhanden, unabhängig vom Onboarding-Zustand).
  await expect(page.locator('[data-testid="module-design"]')).toBeVisible({ timeout: 15_000 });
  const kachelAnzahl = await page.locator('[data-testid^="module-"]').count();
  expect(kachelAnzahl).toBeGreaterThan(3);

  // Eine Station öffnen (KosmoDesign) — bootstrappt Projekt/EG/OG, rendert
  // Plan/3D-Chrome, lädt den derive.worker (Module-Worker, script-src/worker-src).
  // Die Zentrale-Kachel verschwindet dabei (Vollbild-Wechsel) — die Station
  // selbst zeigt sich am Plan-Werkzeug.
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"]')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500); // Worker/Style-Nachzügler Zeit geben

  const violationsFromEvent = await page.evaluate(
    () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
  );
  const violationsFromConsole = consoleErrors.filter((t) => /content security policy|csp/i.test(t));

  expect(violationsFromEvent, `CSP-Verstösse (Event): ${violationsFromEvent.join(' | ')}`).toEqual([]);
  expect(
    violationsFromConsole,
    `CSP-Verstösse (Konsole): ${violationsFromConsole.join(' | ')}`,
  ).toEqual([]);

  await page.screenshot({ path: 'e2e-results/csp-smoke-design.png' });
});
