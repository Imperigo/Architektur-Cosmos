import { expect, test } from '@playwright/test';

/**
 * v0.8.1 P7 (`docs/V081-SPEZ.md` §6.1/§7(e), C-13 «Publish-Preset-Wähler +
 * Erststart-Trigger») — die seit ROADMAP 380 bestehende Preset-Registry
 * (`state/dock-presets.ts`, `PUBLISH_FOKUS`/`PUBLISH_ARBEITEN`/
 * `PUBLISH_PRUEFEN`) bekam bislang KEINEN UI-Wähler und KEINEN Erststart-
 * Trigger für die Publish-Station (design/vis hatten beides schon seit PD2,
 * v0.8.0). Dieses Paket zieht beides nach — reiner UI-/Effekt-Zusatz in
 * `PublishWorkspace.tsx`, keine Änderung an der Registry selbst.
 *
 * Drei Teile (Konvention: eigene Kopie der Registry-Werte als Literale, kein
 * Cross-Spec-Import — s. `dock-presets.spec.ts`s Kopfkommentar):
 *   (a) je Preset über die Toolbar-Gruppe «Oberfläche» anwenden → Dossier-/
 *       Plankopf-Panel-Sichtbarkeit deckt sich mit der Registry-Kuration.
 *   (b) Erststart (kein `aktivesPreset.publish` in `kosmo.dock.v1`): Fokus
 *       wird beim ersten Besuch der Publish-Station automatisch aktiv.
 *   (c) Einmal ausgelöst, feuert der Erststart-Trigger nicht erneut (ein
 *       manuell geöffnetes Panel bleibt bei einem zweiten Besuch bestehen).
 */

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

declare global {
  interface Window {
    __kosmo: { open: (s: string) => void };
  }
}

// ---------------------------------------------------------------------------
// (a) Drei Presets über die Toolbar-Gruppe «Oberfläche»
// ---------------------------------------------------------------------------

for (const preset of ['fokus', 'arbeiten', 'pruefen'] as const) {
  test(`Publish-Station · Preset «${preset}»: anwenden über die Toolbar, Dossier/Plankopf folgen der Kuration`, async ({ page }) => {
    await ladeUndOeffnePublish(page);
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload();
    await page.evaluate(() => window.__kosmo.open('publish'));
    await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();

    // Ein Blatt anlegen, damit `plankopf` sichtbar werden KANN (Guard:
    // `plankopfOffen && !!sheet`, s. `PublishWorkspace.tsx`s
    // `publishDockPanels`) — und beide Panels vorher manuell öffnen, damit
    // der Preset-Wechsel seine Ziel-Kuration auch wirklich HERSTELLT statt
    // nur additiv zu öffnen (dasselbe Beweismuster wie die design/vis-Tests).
    await page.click('[data-testid="add-sheet"]');
    await page.click('[data-testid="publish-dossier"]');
    await page.click('[data-testid="publish-plankopf"]');
    await expect(page.locator('[data-testid="dock-panel-dossier"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock-panel-plankopf"]')).toBeVisible();

    await page.click(`[data-testid="dock-preset-${preset}"]`);
    await expect(page.locator(`[data-testid="dock-preset-${preset}"]`)).toHaveAttribute('aria-pressed', 'true');
    for (const andere of ['fokus', 'arbeiten', 'pruefen'] as const) {
      if (andere === preset) continue;
      await expect(page.locator(`[data-testid="dock-preset-${andere}"]`)).toHaveAttribute('aria-pressed', 'false');
    }

    if (preset === 'fokus') {
      // PUBLISH_FOKUS.offen=[] — beide Zusatz-Panels zu (hartes N=0-Kriterium).
      await expect(page.locator('[data-testid="dock-panel-dossier"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="dock-panel-plankopf"]')).toHaveCount(0);
    } else if (preset === 'arbeiten') {
      // PUBLISH_ARBEITEN.offen=['plankopf'] — nur Plankopf offen.
      await expect(page.locator('[data-testid="dock-panel-plankopf"]')).toBeVisible();
      await expect(page.locator('[data-testid="dock-panel-dossier"]')).toHaveCount(0);
    } else {
      // PUBLISH_PRUEFEN.offen=['dossier'] (+ angeheftet) — nur Dossier offen.
      await expect(page.locator('[data-testid="dock-panel-dossier"]')).toBeVisible();
      await expect(page.locator('[data-testid="dock-panel-plankopf"]')).toHaveCount(0);
    }
  });
}

// ---------------------------------------------------------------------------
// (b) Erststart der Publish-Station: Fokus wird automatisch aktiv
// ---------------------------------------------------------------------------

test('Erststart der Publish-Station (kein aktivesPreset.publish): Fokus wird automatisch aktiv', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.reload();
  await page.evaluate(() => window.__kosmo.open('publish'));

  // Fokus ist bereits aktiv, OHNE dass ein Preset-Knopf geklickt wurde.
  await expect(page.locator('[data-testid="dock-preset-fokus"]')).toHaveAttribute('aria-pressed', 'true');

  const gespeichert = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    return roh ? (JSON.parse(roh) as { aktivesPreset?: Record<string, string> }) : null;
  });
  expect(gespeichert?.aktivesPreset?.['publish']).toBe('fokus');
});

// ---------------------------------------------------------------------------
// (c) Der Erststart-Trigger feuert nur EINMAL
// ---------------------------------------------------------------------------

test('Der Publish-Erststart-Trigger feuert nur einmal: ein zweiter Besuch überschreibt eine manuelle Öffnung nicht erneut', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.reload();
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="dock-preset-fokus"]')).toHaveAttribute('aria-pressed', 'true');

  // Manuell Plankopf öffnen (braucht ein Blatt) — dieser Zustand ist NICHT
  // durch ein Preset gesetzt, `aktivesPreset.publish` bleibt bei 'fokus'.
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="dock-panel-plankopf"]')).toBeVisible();

  // Station verlassen und erneut besuchen (zweiter «Besuch» im Sinne des
  // Erststart-Kriteriums) — der Trigger darf NICHT erneut «Fokus» erzwingen,
  // weil `aktivesPreset.publish` schon gesetzt ist.
  await page.evaluate(() => window.__kosmo.open('design'));
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-plankopf"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-preset-fokus"]')).toHaveAttribute('aria-pressed', 'true');
});
