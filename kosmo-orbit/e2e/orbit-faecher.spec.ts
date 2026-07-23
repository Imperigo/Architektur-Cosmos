import { expect, test } from '@playwright/test';

/**
 * NEU (Stream W5, 0.6.5) — Nachweis für R2-N1/R2-N2/R2-N3
 * (docs/UI-SELBSTKRITIK-064.md Runde 2, docs/UI-KONZEPT-065.md):
 *
 *  - R2-N1: der Fächer eines Hauptwerkzeugs öffnet AUSSERHALB des Orbit-
 *    Rings — seine Bounding-Box überlappt die des Zentrums (`.k-orbit-mitte`)
 *    NICHT.
 *  - R2-N2: die Untertool-Liste sind echte, radial gestaffelte Karteikarten
 *    (leichte Rotation je Karte) — ihre Bounding-Boxen bleiben trotzdem
 *    paarweise disjunkt (kein Überlappen, kein Text-Gewusel).
 *  - R2-N3 (indirekt): der Familien-Beschrieb hat einen festen, sichtbaren
 *    Platz ÜBER dem Fächer (eigenes Element, nicht die erste Fächer-Zeile).
 *
 * Dieselbe Boot-Hilfsfunktion wie `orbit-start.spec.ts`.
 */

async function zentraleLaden(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

function ueberlappenSich(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('R2-N1: Fächer (KosmoDesign) überlappt die Zentrum-BoundingBox nicht', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-design"]');
  await expect(faecher).toHaveClass(/\boffen\b/);

  const faecherBox = await faecher.boundingBox();
  const zentrumBox = await page.locator('.k-orbit-mitte').boundingBox();
  expect(faecherBox).not.toBeNull();
  expect(zentrumBox).not.toBeNull();
  expect(ueberlappenSich(faecherBox!, zentrumBox!)).toBe(false);
});

// P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion): «Kosmo»
// ist keine Zentrale-Kachel mehr (`OrbitStart.tsx`, `KACHEL_REIHENFOLGE`) —
// seine 8 Untertools laufen jetzt über das Rechtsklick-Menü des Kosmo-Orbs
// (`e2e/kosmo-orb-stationen-menu.spec.ts`, dort das analoge R2-N2-Netz für
// GENAU diese 8 Einträge). Die beiden Tests hier prüfen seither 'office'
// (4 Untertools — Bestandsschutz-`kommend`, aber weiterhin mit realer
// Boxgrösse im DOM, s. `OrbitStart.tsx`-Kopfkommentar «Harter Vertrag»)
// statt des entfallenen 'kosmo'.
test('R2-N1: Fächer (KosmoOffice) überlappt Zentrum nicht', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-office"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-office"]');
  await expect(faecher).toHaveClass(/\boffen\b/);

  const faecherBox = await faecher.boundingBox();
  const zentrumBox = await page.locator('.k-orbit-mitte').boundingBox();
  expect(faecherBox).not.toBeNull();
  expect(zentrumBox).not.toBeNull();
  expect(ueberlappenSich(faecherBox!, zentrumBox!)).toBe(false);
});

test('R2-N2: die Karteikarten im KosmoOffice-Fächer sind paarweise disjunkt (kein Überlappen trotz Staffelung)', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-office"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-office"]');
  await expect(faecher).toHaveClass(/\boffen\b/);

  const karten = faecher.locator('[data-testid^="module-"], [data-testid^="orbit-sub-"], [data-testid^="orbit-office-"]');
  const anzahl = await karten.count();
  expect(anzahl).toBeGreaterThanOrEqual(4); // KosmoOffice: lead/buero-hr/lehre/bau

  const boxen: { x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < anzahl; i++) {
    const box = await karten.nth(i).boundingBox();
    expect(box).not.toBeNull();
    boxen.push(box!);
  }
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      expect(ueberlappenSich(boxen[i]!, boxen[j]!)).toBe(false);
    }
  }
});

test('R2-N3-Nachweis: der Familien-Beschrieb ist ein eigenes, sichtbares Element ÜBER dem Fächer', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  const beschrieb = page.locator('[data-testid="orbit-beschrieb-design"]');
  const faecher = page.locator('[data-testid="orbit-faecher-design"]');
  await expect(beschrieb).toBeVisible();
  await expect(beschrieb).toContainText('Entwerfen');

  const beschriebBox = await beschrieb.boundingBox();
  const faecherBox = await faecher.boundingBox();
  expect(beschriebBox).not.toBeNull();
  expect(faecherBox).not.toBeNull();
  // "ÜBER dem Fächer": eigenes Element, das den Fächer nicht überlappt —
  // je nach Kompassrichtung (oben/rechts/unten/links) kann das eine Seite
  // in x ODER y sein, daher genügt hier: keine Überlappung der Boxen.
  expect(ueberlappenSich(beschriebBox!, faecherBox!)).toBe(false);
});
