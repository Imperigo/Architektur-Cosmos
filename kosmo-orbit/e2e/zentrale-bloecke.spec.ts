import { expect, test, type Page } from '@playwright/test';

/**
 * K13 (Paket P-S2 «Zentrale-Blöcke», docs/V0812-START-SPEZ.md E-S2,
 * Owner-Korrektur docs/OWNER-KORREKTUREN-2026-07.md: «entwerfen modeliieren,
 * draw, prepare, vis und so bitte sauber machen, gerade und nüchterne
 * blöcke und ganze logos bitte»).
 *
 * Beweist NUR die neue Fächer-OPTIK (gerade, linksbündige Blockliste mit
 * vollständigem KIcon-Logo + Klartext-Name je Block, `orbit-065.css`
 * `.orbit065-karte`) — der Fächer-VERHALTENS-Vertrag selbst (Hover öffnet,
 * Klick-Regeln, testids, aria, DOM-Reihenfolge) ist TABU und bleibt exakt
 * so, wie ihn `e2e/orbit-start.spec.ts`/`e2e/orbit-faecher.spec.ts`/
 * `e2e/orbit-hub-vollausbau.spec.ts`/`e2e/zentrale-kacheln.spec.ts` schon
 * beweisen — dieselbe Boot-/Hover-Choreografie wie dort.
 */

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="orbit-start"]');
}

/** K17-Härtung (s. `e2e/island-ui.spec.ts`, Lastflake-Fund 21.07.2026):
 *  wartet alle ENDLICHEN Animationen des Dokuments ab (unendliche — Orb-
 *  Drift & Co. — würden `finished` nie erfüllen und bleiben aussen vor),
 *  bevor Bounding-Boxen gemessen werden. Ohne das könnte die Fächer-
 *  Eintritts-/Kinder-Staffelung (`orbit065-sheet-kind`, `animationDelay`
 *  bis 8×24ms) unter Last noch laufen, während gemessen wird. */
async function animationenAbwarten(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => {
          const t = a.effect?.getTiming?.();
          return !!t && t.iterations !== Infinity;
        })
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

/** Je Hauptwerkzeug: die realen Block-Testids seiner Untertools (aus
 *  `shell/orbit-werkzeuge.ts`) + der erwartete Klartext-Titel je Block. */
const FAECHER: Record<string, { testid: string; titel: string }[]> = {
  design: [
    { testid: 'module-design', titel: 'Draw' },
    { testid: 'module-prepare', titel: 'Prepare' },
    { testid: 'module-vis', titel: 'Vis' },
    { testid: 'module-publish', titel: 'Publish' },
    { testid: 'module-draw', titel: 'Modellbaum' },
  ],
  data: [
    { testid: 'module-data', titel: 'Reference' },
    { testid: 'module-asset', titel: 'Asset' },
  ],
  kosmo: [
    { testid: 'module-speak', titel: 'Speak' },
    { testid: 'module-sketch', titel: 'Sketch' },
    { testid: 'orbit-sub-modell', titel: 'Modell' },
    { testid: 'module-train', titel: 'Train' },
    { testid: 'module-dev', titel: 'Dev' },
    { testid: 'module-doc', titel: 'Doc' },
    { testid: 'module-trust', titel: 'Trust' },
    { testid: 'module-paket', titel: 'Package' },
  ],
  office: [
    { testid: 'orbit-office-lead', titel: 'KosmoLead' },
    { testid: 'orbit-office-buero-hr', titel: 'KosmoBüro' },
    { testid: 'orbit-office-lehre', titel: 'KosmoLehre' },
    { testid: 'orbit-office-bau', titel: 'KosmoBau' },
  ],
};

for (const [hauptId, eintraege] of Object.entries(FAECHER)) {
  test(`(a) Fächer ${hauptId}: jeder Block zeigt ein SVG-Logo UND Klartext`, async ({ page }) => {
    await zentraleLaden(page);
    await page.locator(`[data-testid="orbit-haupt-${hauptId}"]`).hover();
    const faecher = page.locator(`[data-testid="orbit-faecher-${hauptId}"]`);
    await expect(faecher).toHaveClass(/\boffen\b/);

    for (const { testid, titel } of eintraege) {
      const block = faecher.locator(`[data-testid="${testid}"]`);
      await expect(block).toContainText(titel);
      // Playwright-Falle (s. orbit-start.spec.ts-Kopfkommentar): achsen-
      // parallele SVG-Pfade gelten oft als "hidden" — `toBeAttached()` auf
      // dem Logo-SVG selbst, nicht `toBeVisible()`.
      const logo = block.locator('svg');
      await expect(logo).toHaveCount(1);
      await expect(logo).toBeAttached();
    }
  });
}

test('(b) KosmoDesign-Fächer: alle Blöcke linksbündig (identische x-Koordinate)', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-design"]');
  await expect(faecher).toHaveClass(/\boffen\b/);
  await animationenAbwarten(page);

  const xWerte: number[] = [];
  for (const { testid } of FAECHER['design']!) {
    const box = await faecher.locator(`[data-testid="${testid}"]`).boundingBox();
    expect(box, `${testid} fehlt`).not.toBeNull();
    xWerte.push(box!.x);
  }
  for (const x of xWerte) {
    expect(Math.abs(x - xWerte[0]!)).toBeLessThan(1);
  }
});

test('(b) Kosmo-Fächer (dichtester Fächer, 8 Blöcke): alle Blöcke linksbündig (identische x-Koordinate)', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-kosmo"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-kosmo"]');
  await expect(faecher).toHaveClass(/\boffen\b/);
  await animationenAbwarten(page);

  const xWerte: number[] = [];
  for (const { testid } of FAECHER['kosmo']!) {
    const box = await faecher.locator(`[data-testid="${testid}"]`).boundingBox();
    expect(box, `${testid} fehlt`).not.toBeNull();
    xWerte.push(box!.x);
  }
  for (const x of xWerte) {
    expect(Math.abs(x - xWerte[0]!)).toBeLessThan(1);
  }
});

for (const hauptId of Object.keys(FAECHER)) {
  test(`(c) Fächer ${hauptId}: Trefferfläche jedes Blocks ist mindestens 44px hoch`, async ({ page }) => {
    await zentraleLaden(page);
    await page.locator(`[data-testid="orbit-haupt-${hauptId}"]`).hover();
    const faecher = page.locator(`[data-testid="orbit-faecher-${hauptId}"]`);
    await expect(faecher).toHaveClass(/\boffen\b/);
    await animationenAbwarten(page);

    for (const { testid } of FAECHER[hauptId]!) {
      const box = await faecher.locator(`[data-testid="${testid}"]`).boundingBox();
      expect(box, `${testid} fehlt`).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(43.5);
    }
  });
}
