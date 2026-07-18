import { expect, test, type Page } from '@playwright/test';

/**
 * Regressionstest (v0.8.3/P5, E8 §8/§11 Sanktion 9, `docs/V-NAECHSTE-
 * KANDIDATEN.md` Sektion C, Einträge «Statusleisten-2-Zeilen-Wrap ×
 * NavLeiste» und «kosmo-ui-bruecke (d) × nav-pan-Überdeckung»):
 *
 * Der reale Klick-Blocker (live gegen den unveränderten `design.css`-Ist-
 * Stand reproduziert — `flex-wrap:wrap`, kein `z-index` auf `.dw-modus-chip-
 * wrap`): mit eingefrorener Uhr (`page.clock.install()`+`pauseAt()`, exakt
 * dasselbe Muster wie Test (d) in `kosmo-ui-bruecke.spec.ts` — die Uhr muss
 * VOR dem `module-design`-Mount stehen, sonst ist das Layout nicht
 * deterministisch, s. dortiger Kommentar) blockierte ein schwebender
 * `nav-pan`-Knopf einer der beiden `NavLeiste`n (3D- ODER Plan-Seite,
 * `dw-viewport-flex--getrennt`) den Klick auf `[data-testid="modus-chip"]`
 * — Playwright meldete wörtlich (90s-Timeout, Test (d), Baseline-
 * Reproduktion des Bauagenten): `<button … data-testid="nav-pan" …> from
 * <div class="dw-viewport-flex dw-viewport-flex--getrennt">…</div> subtree
 * intercepts pointer events`.
 *
 * Der sanktionierte Doppelfix (`design.css:405-435`, NUR dieser Ausschnitt):
 * `.dw-statusleiste { flex-wrap: nowrap }` (die Leiste wächst nie mehr auf
 * eine zweite Zeile, unabhängig von der Chip-Zahl — hält die feste
 * `min-height:30px` und damit sicheren Abstand zur `NavLeiste`-Zone
 * `bottom:50`, die Wrap-Flake) UND `.dw-modus-chip-wrap { z-index: 6 }`
 * (explizit über `NavLeiste`s `zIndex:5`, `NavLeiste.tsx`) — dieser Test
 * beweist die Rangfolge geometrisch UNTER genau den Bedingungen, die den
 * Flake ursprünglich auslösten: `elementFromPoint` am Chip-Zentrum im
 * eingefrorenen Split-Layout liefert den Chip-Button selbst, nie `nav-pan`.
 */
async function bootstrapEingefroren(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.setItem(
      'kosmo.ui.v1',
      JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null, designOberflaeche: 'manuell' }),
    );
  });
  await page.reload();
  // Uhr einfrieren, BEVOR die Design-Werkstatt mountet — identisches Muster
  // zu Test (d)/`arbeitsmodi.spec.ts` (`pauseAt()` direkt nach `install()`,
  // s. dortige ausführliche Begründung). Genau dieser eingefrorene Zustand
  // war die Bedingung, unter der der reale Klick-Blocker reproduzierte.
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await page.clock.pauseAt(t0 + 60_000);
  await page.click('[data-testid="module-design"]');
}

test('Statusleiste × NavLeiste: modus-chip bleibt im eingefrorenen 3D|Plan-Split über nav-pan klickbar', async ({ page }) => {
  await bootstrapEingefroren(page);

  // Default-Ansicht ist der 3D|Plan-Split (`viewMode: 'split'` in
  // `anfangsZustand()`, `state/ui-zustand.ts`) — genau der Modus, in dem der
  // Flake gemeldet wurde. Explizit bestätigt statt stillschweigend
  // angenommen.
  await expect(page.locator('[data-testid="view-split"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.dw-viewport-flex--getrennt')).toBeVisible();

  const chip = page.locator('[data-testid="modus-chip"]');
  await expect(chip).toBeVisible();

  // Statusleiste wächst nie in die NavLeiste-Zone (§8.1): genau EINE Zeile,
  // nie mehr als `min-height:30px` — der Mengen-Beweis gegen die Wrap-Flake.
  const leisteHoehe = await page.locator('[data-testid="statusleiste"]').evaluate((el) => el.getBoundingClientRect().height);
  expect(leisteHoehe).toBeLessThanOrEqual(40); // 30px min-height + Toleranz, NIE eine zweite Zeile

  // Der eigentliche Klick-Blocker-Beweis: `elementFromPoint` am exakten
  // Chip-Zentrum liefert im eingefrorenen Split-Layout den Chip-Button
  // selbst — nicht einen der beiden `nav-pan`-Knöpfe (3D- oder Plan-Seite),
  // die sich in genau dieser Bildschirm-Ecke befinden können
  // (`left:12, bottom:50`).
  const probe = await page.evaluate(() => {
    const chipEl = document.querySelector('[data-testid="modus-chip"]');
    const navPans = Array.from(document.querySelectorAll('[data-testid="nav-pan"]'));
    if (!chipEl) return { fehler: 'chip nicht im DOM' };
    const r = chipEl.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      chipRect: { x: r.x, y: r.y, w: r.width, h: r.height },
      navPanRects: navPans.map((el) => el.getBoundingClientRect().toJSON()),
      topTag: top?.tagName ?? null,
      topTestid: top?.getAttribute('data-testid') ?? null,
      topIstChip: top === chipEl || (top != null && chipEl.contains(top)),
    };
  });

  expect(probe.topIstChip, `elementFromPoint(Chip-Zentrum) traf ${JSON.stringify(probe)}`).toBe(true);
  expect(probe.topTestid).toBe('modus-chip');

  // Der volle Interaktions-Beweis, nicht nur die Geometrie: der Chip lässt
  // sich TATSÄCHLICH klicken (öffnet das Modus-Menü), ohne dass Playwrights
  // Aktionierbarkeits-Check auf einen `nav-pan`-Knopf läuft — genau der
  // Klick, der in der Baseline-Reproduktion 90s lang blockierte.
  await chip.click();
  await expect(page.locator('[data-testid="modus-menu"]')).toBeVisible();
});
