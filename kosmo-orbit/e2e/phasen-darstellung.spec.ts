import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * v0.7.0 Stream 2A (`docs/V070-KONZEPT.md` E1/E2, H-42) — Beweis, dass der
 * BILDSCHIRM-Plan (PlanView) der SIA-Phase, dem Poché-Modus-Override und dem
 * Fensterbögen-Schalter im Projekt-Menü genau wie der Export folgt:
 *  (a) Phase «Wettbewerb»: EIN Poché, Tinte (`var(--k-ink)`) statt Beton-
 *      schraffur (`derive/poche.ts` `pocheEntscheid()` — `art === 'schwarz'`).
 *  (b) Zurück «Werkplan»: exakt wie vorher (Betonschraffur, keine Tinte).
 *  (c) Poché-Modus «Immer Material» übersteuert die Phase — Wettbewerb bleibt
 *      hell (Owner-Präzedenz: `pocheModus` schlägt `phase`).
 *  (d) Fensterbögen-Schalter aus: keine `.fenster-bogen`-Pfade mehr im
 *      Grundriss (H-42, `derive/plan.ts` `fluegelBogen`).
 *
 * Muster für den Kosmo-Run-Aufbau (Wand + parametrisches Fenster) wie das
 * bestehende «SIA-Phase»-Modul.spec-T7 (`e2e/module.spec.ts` ~Z.746): EIN
 * neues, leeres Projekt (Default-Assemblies inkl. «AW…», keine grossen
 * TKB-Zonen) — die View fittet sich eng um die gezeichnete Wand, damit die
 * Plan-LOD-Stufe «voll» bleibt (Schraffur-Vergleich braucht das). Wand +
 * parametrisches Einflügel-Fenster über `window.__kosmo.run` — derselbe Weg
 * wie Maus/Kosmo, kein Sonderpfad fürs Testen.
 */

async function projektMitFenster(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');

  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const wand = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      assemblyId: aw.id,
    });
    const wallId = wand.patches[0]!.id;
    const oeffnung = k.run('design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 3000,
      width: 1500,
      height: 1500,
      sill: 900,
    }) as { patches: { id: string }[] };
    k.run('design.fensterParametrieren', {
      openingId: oeffnung.patches[0]!.id,
      fensterTyp: 'einfluegel',
      swing: 'links',
    });
  });

  await page.click('[data-testid="view-2d"]');
  await expect(page.locator('[data-testid="planview"]')).toBeVisible();
  // Projekt-Menü (phase-stil/poche-modus/fenster-boegen sitzen dort, s. T7).
  await page.click('[data-testid="projekt-menu-toggle"]');
}

test('Phasen-Darstellung (v0.7.0 E2/H-42): Bildschirm-Plan folgt Phase, Poché-Modus, Fensterbögen-Schalter', async ({
  page,
}) => {
  await projektMitFenster(page);
  const planview = page.locator('[data-testid="planview"]');

  // Default Werkplan: volle Detaillierung — Betonschraffur, keine Tinte,
  // Öffnungsflügel-Bogen sichtbar (Default an).
  await expect(planview.locator('path[fill="url(#hatch-beton)"]').first()).toBeAttached();
  await expect(planview.locator('path[fill="var(--k-ink)"]')).toHaveCount(0);
  await expect(planview.locator('path.fenster-bogen')).toHaveCount(1);

  // (a) Wettbewerb: EIN schwarzes Poché statt Materialschraffur.
  await waehleOption(page, 'phase-stil', 'wettbewerb');
  await expect(page.locator('[data-testid="phase-stil"]')).toHaveAttribute('data-value', 'wettbewerb');
  await expect(planview.locator('path[fill="var(--k-ink)"]').first()).toBeAttached();
  await expect(planview.locator('path[fill="url(#hatch-beton)"]')).toHaveCount(0);

  // (b) Zurück Werkplan: byte-identisch zum Ausgangszustand oben.
  await waehleOption(page, 'phase-stil', 'werkplan');
  await expect(page.locator('[data-testid="phase-stil"]')).toHaveAttribute('data-value', 'werkplan');
  await expect(planview.locator('path[fill="url(#hatch-beton)"]').first()).toBeAttached();
  await expect(planview.locator('path[fill="var(--k-ink)"]')).toHaveCount(0);

  // (c) Poché-Modus «Immer Material» in Phase Wettbewerb: Override gewinnt,
  // die Fläche bleibt hell (Betonschraffur) statt schwarz.
  await waehleOption(page, 'phase-stil', 'wettbewerb');
  await waehleOption(page, 'poche-modus', 'material');
  await expect(page.locator('[data-testid="poche-modus"]')).toHaveAttribute('data-value', 'material');
  await expect(planview.locator('path[fill="url(#hatch-beton)"]').first()).toBeAttached();
  await expect(planview.locator('path[fill="var(--k-ink)"]')).toHaveCount(0);
  // Zurücksetzen für den letzten Teil.
  await waehleOption(page, 'poche-modus', 'phase');
  await waehleOption(page, 'phase-stil', 'werkplan');

  // (d) Fensterbögen-Schalter aus: die `.fenster-bogen`-Symbolik verschwindet
  // (Teilungslinien/Fenstersymbol selbst bleiben unangetastet, H-42).
  await expect(planview.locator('path.fenster-bogen')).toHaveCount(1);
  await page.click('[data-testid="fenster-boegen"]');
  await expect(planview.locator('path.fenster-bogen')).toHaveCount(0);
});
