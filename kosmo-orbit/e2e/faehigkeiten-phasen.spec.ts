import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * A7+A8 (Owner-Befunde K17+K18, gekoppelt, v0.6.3):
 *
 * A7 — «Fähigkeiten»-Gruppe: sechs Icons (Sonnenstudie/Volumenstudien/KV/
 * Bauablauf/Mängel/Submissions-Check) in der Design-Werkzeugleiste, je EIN
 * Klick öffnet die Fähigkeit wie heute (bestehende Handler wiederverwendet,
 * die Alt-Knöpfe in «Ebenen» bleiben unverändert stehen — Begründung:
 * Kommentar bei `FAEHIGKEITEN` in `DesignWorkspace.tsx`). Dazu vier kleine
 * Stations-Icons im Entwurfs-Dock (Draw/Vis/Publish/Prepare) — Draw bleibt in
 * KosmoDesign (Deep-Link), Vis/Publish/Prepare wechseln ehrlich die Station.
 *
 * A8 — Phasen-Presets: `phasen-presets.ts` kuratiert je SIA-Teilphase, welche
 * Fähigkeits-Icons im Fokus stehen. Ein Wechsel der Teilphase bietet das
 * Preset AN (Banner, KMeldungen/Bestätigungs-Muster) — NIE stumm angewendet.
 * «Anwenden» hebt die Fokus-Icons (Opazität 1), dämpft den Rest (0.6, KEIN
 * Entfernen aus dem DOM — feste Anker bleiben unverändert). «Nicht jetzt»
 * lässt alles unverändert.
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Koordinaten (Muster oberflaeche-minimal.spec.ts)
}

/** Alle testids der Fähigkeits-Icons (ohne die «-voll»-Chevrons), in
 *  DOM-Reihenfolge — für den «feste Anker»-Reihenfolge-Beweis. */
async function faehigkeitenReihenfolge(page: Page): Promise<string[]> {
  const alle = await page
    .locator('[data-testid="leiste-gruppe-faehigkeiten"] [data-testid^="faehigkeit-"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')!));
  return alle.filter((id) => !id.endsWith('-voll'));
}

test('Fähigkeits-Icons sichtbar; Sonnenstudie togglet über den bestehenden Handler', async ({ page }) => {
  await oeffneKosmoDesign(page);

  const gruppe = page.locator('[data-testid="leiste-gruppe-faehigkeiten"]');
  await expect(gruppe).toBeVisible();

  for (const id of ['sonne', 'volumenstudien', 'kv', 'bauablauf', 'maengel', 'submission']) {
    await expect(page.locator(`[data-testid="faehigkeit-${id}"]`)).toBeVisible();
  }

  // Sonnenstudie: derselbe Zustand wie der Alt-Knopf `sonne-toggle` (kein
  // zweiter Store, kein Logik-Duplikat) — beide steuern `sonneOffen`.
  await expect(page.locator('[data-testid="sonne-standort-label"]')).toHaveCount(0);
  await page.click('[data-testid="faehigkeit-sonne"]');
  await expect(page.locator('[data-testid="sonne-standort-label"]')).toBeVisible();
  // Derselbe zugrundeliegende Zustand wie der Alt-Knopf «sonne-toggle»
  // (kein zweiter Store, kein Logik-Duplikat) — ein Klick DORT schliesst
  // das Panel, das die Fähigkeiten-Gruppe geöffnet hat.
  await page.click('[data-testid="sonne-toggle"]');
  await expect(page.locator('[data-testid="sonne-standort-label"]')).toHaveCount(0);

  // Submissions-Check: das einzige komplett neue Panel dieser Gruppe.
  await page.click('[data-testid="faehigkeit-submission"]');
  await expect(page.locator('[data-testid="submission-panel"]')).toBeVisible();

  // Rechtsklick öffnet garantiert («voll»), auch wenn schon offen — schliesst
  // NIE (kein Toggle).
  await page.locator('[data-testid="faehigkeit-submission"]').click({ button: 'right' });
  await expect(page.locator('[data-testid="submission-panel"]')).toBeVisible();
});

test('Dock-Stationsicon «Vis» öffnet KosmoVis (ehrlich Navigation, keine Einbettung)', async ({ page }) => {
  await oeffneKosmoDesign(page);

  await expect(page.locator('[data-testid="dock-vis"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-vis"]')).toHaveAttribute('title', /öffnet KosmoVis/);

  await page.click('[data-testid="dock-vis"]');
  await expect(page.locator('[data-testid="vis-auto-kamera"]')).toBeVisible();
  await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toHaveCount(0);
});

test('Teilphase → Bewilligung: Preset wird angeboten, Anwenden hebt KV/Sonne, dämpft den Rest — feste Anker bleiben', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  const reihenfolgeVorher = await faehigkeitenReihenfolge(page);
  expect(reihenfolgeVorher).toEqual([
    'faehigkeit-sonne',
    'faehigkeit-volumenstudien',
    'faehigkeit-kv',
    'faehigkeit-bauablauf',
    'faehigkeit-maengel',
    'faehigkeit-submission',
  ]);

  await page.click('[data-testid="projekt-menu-toggle"]');
  const angebot = page.locator('[data-testid="phasen-preset-angebot"]');
  await expect(angebot).toHaveCount(0); // kein Angebot vor einem echten Wechsel

  await waehleOption(page, 'sia-phase-select', 'bewilligung');
  await expect(angebot).toBeVisible();
  // v0.7.0 (E1): das Owner-bestätigte Phasenmodell benennt SIA 33 als
  // «Baueingabe» (siaPhaseLabel in model/doc.ts) — vorher «Bewilligungsverfahren».
  await expect(angebot).toContainText('Baueingabe');
  await expect(angebot).toContainText('KV');
  await expect(angebot).toContainText('Sonnenstudie');

  await page.click('[data-testid="phasen-preset-anwenden"]');
  await expect(angebot).toHaveCount(0);

  // Fokus-Icons (KV/Sonne, das Bewilligungs-Preset): volle Opazität.
  await expect(page.locator('[data-testid="faehigkeit-kv"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-testid="faehigkeit-sonne"]')).toHaveCSS('opacity', '1');
  // Gedämpfte Icons: sichtbar gedimmt, aber NICHT aus dem DOM entfernt.
  const bauablaufKnopf = page.locator('[data-testid="faehigkeit-bauablauf"]');
  await expect(bauablaufKnopf).toBeVisible();
  await expect(bauablaufKnopf).toHaveCSS('opacity', '0.6');
  await expect(page.locator('[data-testid="faehigkeit-submission"]')).toHaveCSS('opacity', '0.6');

  // Feste Anker: dieselbe Reihenfolge wie vorher, kein DOM-Umbau.
  expect(await faehigkeitenReihenfolge(page)).toEqual(reihenfolgeVorher);

  // Der gedämpfte Knopf bleibt trotzdem klickbar (Regel 2.3.1) — öffnet Bauablauf.
  await bauablaufKnopf.click();
  await expect(page.locator('[data-testid="bauablauf-panel"]')).toBeVisible();
});

test('Ablehnen-Pfad: «Nicht jetzt» schliesst das Angebot ohne jede Änderung', async ({ page }) => {
  await oeffneKosmoDesign(page);

  await page.click('[data-testid="projekt-menu-toggle"]');
  await waehleOption(page, 'sia-phase-select', 'ausschreibung');
  const angebot = page.locator('[data-testid="phasen-preset-angebot"]');
  await expect(angebot).toBeVisible();
  await expect(angebot).toContainText('Submissions-Check');

  await page.click('[data-testid="phasen-preset-verwerfen"]');
  await expect(angebot).toHaveCount(0);

  // Kein Preset angewendet → keine Icon-Dämpfung, alle bleiben auf voller Opazität.
  for (const id of ['sonne', 'volumenstudien', 'kv', 'bauablauf', 'maengel', 'submission']) {
    await expect(page.locator(`[data-testid="faehigkeit-${id}"]`)).toHaveCSS('opacity', '1');
  }

  // Die SIA-Teilphase selbst hat trotzdem gewechselt (das Angebot betrifft
  // nur die Icon-Betonung, nicht den Projektstand) — sichtbar im Phasen-Badge.
  await expect(page.locator('[data-testid="statusleiste-phase"]')).toContainText('Ausschreibung');
});
