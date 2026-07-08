import { expect, test, type Page } from '@playwright/test';

/**
 * C4b-Overlay (C-E5, docs/SUBMISSION-KONZEPT.md): der DXF-Rücklauf des
 * Unternehmers als Referenz-Overlay im Grundriss. Robustheits-Doktrin wie
 * `freemesh.spec.ts`/`plan-interaktion.spec.ts`: der gesegnete
 * `__kosmo.run`-Weg fürs Modell (2 Wände), stabile UI-testids für den Rest.
 *
 * Die DXF-Datei kommt NICHT aus einem separaten Kernel-Aufruf im Node-
 * Kontext (parseDxf/planToDxf sind Browser-seitig gebündelt, `window.__kosmo`
 * bietet keinen `planToDxf`-Zugriff — siehe `App.tsx` Z.279ff.), sondern aus
 * dem echten Export-Weg der App selbst: der Architekt exportiert seinen
 * eigenen Grundriss als DXF (`export-dxf`, Playwright-Download), das ist der
 * ehrliche Rundlauf-Fall («Unternehmer liefert unverändert zurück») und
 * beweist nebenbei, dass Export/Import zueinander passen. Die Datei geht
 * anschliessend über den echten Dateiwahl-Dialog (`filechooser`-Event) in
 * `import-dxf` — dasselbe Playwright-Muster wie `import-ifc`/`import-splat`
 * in `module.spec.ts`/`splat.spec.ts` (das dort vom Auftrag vorgeschlagene
 * `page.setInputFiles` griffe hier ins Leere: der `<input type="file">` wird
 * dynamisch erzeugt und nie ins DOM gehängt, exakt wie bei den beiden
 * Nachbar-Importen).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
        };
      };
    };
  }
}

async function bootstrapDesign(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Plan-Koordinaten
}

/** 2 Wände über den gesegneten `__kosmo.run`-Weg — Geometrie ist Nebensache. */
async function zweiWaendeZeichnen(page: Page) {
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      assemblyId: aw.id,
    });
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 5000, y: 0 },
      b: { x: 5000, y: 4000 },
      assemblyId: aw.id,
    });
  });
}

test('Unternehmerplan-Overlay: DXF laden → Toggle erscheint → Overlay sichtbar/aus', async ({ page }) => {
  await bootstrapDesign(page);
  await zweiWaendeZeichnen(page);

  // Ohne geladenen Unternehmerplan gibt es weder Toggle noch Overlay.
  await expect(page.locator('[data-testid="unternehmerplan-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);

  // Eigenen Grundriss als DXF exportieren (Rundlauf: der «Unternehmer»
  // liefert ihn unverändert zurück) und den Download-Inhalt einlesen.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-dxf"]'),
  ]);
  const pfad = await download.path();
  const { readFileSync } = await import('node:fs');
  const dxfInhalt = readFileSync(pfad!);

  // Import über den echten Dateiwahl-Dialog, wie bei import-ifc/import-splat.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({ name: 'unternehmer.dxf', mimeType: 'application/dxf', buffer: dxfInhalt });

  // Erfolgs-Meldung: der ehrliche Ein-Absatz-Bericht (importBerichtText)
  // enthält immer die Match-Quote, bei Abweichungen zusätzlich «Vorschlag».
  const erfolg = page.locator('[data-testid="meldung-erfolg"]').first();
  await expect(erfolg).toBeVisible({ timeout: 10_000 });
  await expect(erfolg).toContainText(/Vorschlag|Quote/);

  // Toggle erscheint jetzt (dxf geladen) und ist aktiv — der Import schaltet
  // den Overlay beim ersten Laden einmalig ein.
  const toggle = page.locator('[data-testid="unternehmerplan-toggle"]');
  await expect(toggle).toBeVisible();
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toBeVisible();

  // Toggle aus → Overlay weg.
  await toggle.click();
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);

  // Toggle wieder an → Overlay wieder da.
  await toggle.click();
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toBeVisible();
});

test('Unternehmerplan-Import: DWG wird ehrlich abgelehnt (C-E7), kein Ladeversuch', async ({ page }) => {
  await bootstrapDesign(page);
  await zweiWaendeZeichnen(page);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({
    name: 'unternehmer.dwg',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('fake dwg content, niemals geparst'),
  });

  const fehler = page.locator('[data-testid="meldung-fehler"]').first();
  await expect(fehler).toBeVisible();
  await expect(fehler).toContainText('DWG ist proprietär');

  // Kein Ladeversuch: weder Toggle noch Overlay erscheinen.
  await expect(page.locator('[data-testid="unternehmerplan-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);
});
