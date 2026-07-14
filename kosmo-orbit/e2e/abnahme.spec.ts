import { expect, test } from '@playwright/test';

/**
 * Abnahme-Loop (Owner-Q26): öffnen → modellieren → Pläne live →
 * Flächenreport → IFC-Export → Kosmo-Vorschlag gated anwenden → Undo.
 * (Render-Job und Live-Sync brauchen die HomeStation und laufen in den
 * dedizierten Skripten der Bridge bzw. dem 2-Client-Test.)
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
          entities: Map<string, unknown>;
        };
      };
      open: (s: string) => void;
    };
  }
}

test('Voller Entwurfs-Loop: TKB → Wand → Pläne → Kennzahlen → IFC', async ({ page }) => {
  await page.goto('/');

  // 1) Beispielprojekt laden
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  // 2) Modellieren über den Command-Weg (derselbe wie Maus/Chat/Sprache)
  const wandId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const res = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: -8000 },
      b: { x: 12000, y: -8000 },
      assemblyId: aw.id,
    });
    return res.patches[0]!.id;
  });
  expect(wandId).toBeTruthy();

  // 3) Fenster in die Wand, Grundriss-Ansicht zeigt es
  await page.evaluate((id) => {
    window.__kosmo.run('design.oeffnungSetzen', {
      wallId: id,
      openingType: 'fenster',
      center: 3000,
      width: 2000,
      height: 1500,
      sill: 900,
    });
  }, wandId);
  await page.click('[data-testid="view-2d"]');
  // Fenstersymbol (zwei Glaslinien) ist im abgeleiteten Grundriss-SVG
  await expect(page.locator('svg .fenster').first()).toBeAttached();

  // 4) Kennzahlen leben — Demo v2: Bibliothek (NGF 2814) + Wohnhof-Kette
  await expect(page.getByText(/NGF/).first()).toBeVisible();
  const demoStand = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return { zonen: doc.byKind('zone').length, waende: doc.byKind('wall').length };
  });
  expect(demoStand.zonen).toBeGreaterThan(10); // 7 Bibliothek + Wohnhof-Räume
  expect(demoStand.waende).toBeGreaterThan(10); // gebaute Kette

  // 5) IFC-Export liefert echtes SPF (Umlaut-Dateinamen sanitisiert Chromium — Inhalt zählt)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-ifc"]'),
  ]);
  const pfad = await download.path();
  const { readFileSync } = await import('node:fs');
  const inhalt = readFileSync(pfad, 'utf8');
  expect(inhalt.startsWith('ISO-10303-21;')).toBe(true);
  expect(inhalt).toContain('IFCWALL');

  await page.screenshot({ path: 'e2e-results/abnahme-grundriss.png' });
});

test('Kosmo (Demo-Modus): Vorschlag → Anwenden → Element existiert → Undo', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    // Interner Fix (K11): Panel-Default ist jetzt zu (Symbol zuerst) —
    // dieser Test spricht kosmo-input direkt an, ohne den Symbol-Klick.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');

  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
  await page.click('[data-testid="kosmo-send"]');
  await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 });

  const wandCount = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  expect(wandCount).toBeGreaterThan(0);

  await page.click('[data-testid="undo"]');
  const nachUndo = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  expect(nachUndo).toBe(wandCount - 1);
});
