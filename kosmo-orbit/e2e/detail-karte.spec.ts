import { expect, test, type Page } from '@playwright/test';

/**
 * v0.9.2 P-D (`docs/V092-SPEZ.md` §P-D — Scope v1 BEWUSST schmal) —
 * read-only-Detailansicht in der Publish-Station (`PublishWorkspace.tsx`,
 * `k-publish-detail-karte`): Leerzustand + ein per Konsole (`window.__kosmo.
 * run`, bestehendes Muster `e2e/schnitt-command.spec.ts`) angelegter
 * Detail-Marker erscheint mit Name/Massstab/Geschoss + Inline-SVG-
 * Voransicht aus `deriveDetail`-Daten. Das eigentliche Aufziehen des
 * Rechtecks direkt im PlanView (Design-Station) ist NICHT Teil dieses
 * Postens (Dateikreis `plan-hit-test.ts`/`PlanView.tsx`/`DesignWorkspace.tsx`
 * bleibt tabu, s. Auftrag) — der Hauptagent baut diesen Zug separat; hier
 * wird NUR bewiesen, dass Command → Doc → Publish-Karte durchgängig
 * funktioniert (derselbe Weg, den ein künftiges PlanView-Werkzeug später
 * nur um die Maus-Interaktion ergänzt).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, params: unknown) => { patches: { id: string }[] };
      state: () => { doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      open: (s: string) => void;
    };
  }
}

async function ladeUndOeffnePublish(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
}

test('Publish-Station · Detail-Karte (P-D v1): leerer Zustand ohne Marker', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  const leer = page.locator('[data-testid="detail-leer"]');
  await expect(leer).toBeVisible();
  await expect(leer).toHaveText('Noch keine Details — Marker im Plan aufziehen folgt.');
  await expect(page.locator('[data-testid="detail-karte"]')).toHaveCount(0);
});

test('Publish-Station · Detail-Karte (P-D v1): per Konsole angelegter Marker zeigt Name/Massstab/Geschoss + SVG-Voransicht', async ({
  page,
}) => {
  await ladeUndOeffnePublish(page);

  const detailId = await page.evaluate(() => {
    const storey = window.__kosmo.state().doc.byKind('storey')[0]!;
    const res = window.__kosmo.run('design.detailErstellen', {
      storeyId: storey.id,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 2000 },
      massstab: 5,
      name: 'Fensteranschluss EG',
    });
    return res.patches[0]!.id;
  });

  await expect(page.locator('[data-testid="detail-leer"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="detail-karte"]')).toHaveCount(1);
  await expect(page.locator(`[data-testid="detail-name-${detailId}"]`)).toHaveText('Fensteranschluss EG');
  await expect(page.locator(`[data-testid="detail-meta-${detailId}"]`)).toContainText('1:5');
  await expect(page.locator(`[data-testid="detail-svg-${detailId}"]`)).toBeVisible();

  // Löschen über denselben Command-Weg — die Karte verschwindet wieder,
  // der Leerzustand kommt zurück (kein zweiter Marker aus dem TKB-Demo-Doc).
  await page.evaluate((id) => window.__kosmo.run('design.detailLoeschen', { detailId: id }), detailId);
  await expect(page.locator('[data-testid="detail-karte"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="detail-leer"]')).toBeVisible();
});
