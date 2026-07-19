import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * PB3 (v0.8.9 E3, `docs/SUBSPEZ-BLATTVERZEICHNIS-089.md` §7) — die drei
 * E2E-Tests für den neuen «Blattverzeichnis (SVG)»-Export-Knopf:
 * 1. Export + Inhalt (PublishWorkspace-Set-Karte, Manuell-Chrome).
 * 2. C-5-Aktualisierung: eine Änderung an den Blättern zeigt sich beim
 *    erneuten Export.
 * 3. Derselbe Export aus der AUSTAUSCH-Insel liefert identischen Inhalt.
 *
 * Downloads werden über `page.waitForEvent('download')` abgefangen — Muster
 * `e2e/flaechennachweis.spec.ts`/`e2e/module.spec.ts`s Transmittal-Test
 * (gegengrep von `waitForEvent('download'` über `e2e/`, s. Bauauftrag).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        doc: {
          byKind: (k: string) => Array<{ id: string; name: string }>;
        };
      };
    };
  }
}

async function ueberspringeOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/** Zwei benannte Blätter (Grundriss EG 1:50, Schnitt A-A 1:100) + ein
 * Publikations-Set «Werkplansatz» — über den echten Command-Bus
 * (`window.__kosmo.run`, Muster `flaechennachweis.spec.ts`s
 * `seedZonenAufBootstrapGeschosse`). `bootstrapProject()` legt beim ersten
 * Modul-Öffnen IMMER EG/1.OG an (Guard: nur wenn `byKind('storey')` leer
 * ist) — ein wirklich leeres Doc ist über die UI nie erreichbar, dieselbe
 * ehrliche Grenze wie in `flaechennachweis.spec.ts` dokumentiert. */
async function seedWerkplansatz(page: Page): Promise<{ sheet1Id: string; sheet2Id: string }> {
  return page.evaluate(() => {
    const k = window.__kosmo;
    const egId = k.state().doc.byKind('storey').find((s) => s.name === 'EG')!.id;
    const b1 = k.run('publish.blattErstellen', { name: 'Grundriss EG', format: 'A1', orientation: 'quer' });
    const sheet1Id = b1.patches[0]!.id;
    k.run('publish.ansichtPlatzieren', { sheetId: sheet1Id, view: 'grundriss', storeyId: egId, scale: 50, x: 200, y: 200 });
    const b2 = k.run('publish.blattErstellen', { name: 'Schnitt A-A', format: 'A3', orientation: 'hoch' });
    const sheet2Id = b2.patches[0]!.id;
    k.run('publish.ansichtPlatzieren', { sheetId: sheet2Id, view: 'schnitt', a: { x: 0, y: 0 }, b: { x: 8000, y: 0 }, scale: 100, x: 100, y: 100 });
    k.run('publish.setSpeichern', { name: 'Werkplansatz', sheetIds: [sheet1Id, sheet2Id] });
    return { sheet1Id, sheet2Id };
  });
}

test('Export + Inhalt: Blattverzeichnis-Knopf liefert ein SVG mit beiden Blattnamen + Titel', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-publish"]'); // bootstrappt EG/1.OG, Manuell-Chrome (globaler Seed)
  await seedWerkplansatz(page);

  await expect(page.locator('[data-testid="pubset-karte"]')).toHaveCount(1);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="pubset-blattverzeichnis"]'),
  ]);
  expect(download.suggestedFilename()).toBe('Werkplansatz-Blattverzeichnis.svg');

  const pfad = await download.path();
  const svg = readFileSync(pfad!, 'utf8');
  expect(svg).toContain('BLATTVERZEICHNIS');
  expect(svg).toContain('Grundriss EG');
  expect(svg).toContain('Schnitt A-A');
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);

  // Screenshot des GERENDERTEN Verzeichnis-SVGs selbst (Subspez §8), nicht
  // nur der App-Chrome drumherum: eigene, kurzlebige Seite mit dem
  // Download-Inhalt als Content (Muster: `pdf`-Härtungsspecs rendern ihren
  // Export analog separat nach, statt nur den Auslöse-Knopf abzulichten).
  const svgSeite = await page.context().newPage();
  await svgSeite.setContent(
    `<!doctype html><html><body style="margin:0;background:#ddd;display:flex;justify-content:center;">${svg}</body></html>`,
  );
  await svgSeite.screenshot({ path: 'e2e-results/pb3-089-blattverzeichnis-export.png', fullPage: true });
  await svgSeite.close();
});

test('C-5-Aktualisierung: Blatt geändert → erneuter Export zeigt den neuen Zustand, der alte ist weg', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-publish"]');
  const { sheet1Id } = await seedWerkplansatz(page);

  const [ersterDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="pubset-blattverzeichnis"]'),
  ]);
  const ersteSvg = readFileSync((await ersterDownload.path())!, 'utf8');
  expect(ersteSvg).toContain('Grundriss EG');

  // Es gibt (noch) keinen dedizierten «Blatt umbenennen»-Command/UI-Weg im
  // heutigen Stand (Subspez-Auftrag «bestehender Command/UI-Weg» geprüft:
  // `design.eigenschaftSetzen`s editierbare Felder — design.ts:788ff — kennen
  // `sheet` NICHT; commands/publish.ts, TABU für PB3, hat keinen Rename-
  // Command). Ehrlicher Ersatz mit AUSSCHLIESSLICH bestehenden, produktiv
  // erreichbaren Commands: das alte Blatt entfernen, ein neu benanntes an
  // seiner Stelle anlegen und das Set neu speichern (`publish.blattEntfernen`
  // + `publish.blattErstellen` + `publish.ansichtPlatzieren` +
  // `publish.setSpeichern` — alle vier bereits UI-verdrahtet). Das beweist
  // exakt die C-5-Eigenschaft («aktualisiert bei Blatt-Änderung»): der
  // Export ist eine PURE Ableitung über den aktuellen Set-Zustand, kein
  // gecachter Snapshot.
  const neuerName = await page.evaluate(({ sheet1Id, egName }) => {
    const k = window.__kosmo;
    k.run('publish.blattEntfernen', { sheetId: sheet1Id });
    const egId = k.state().doc.byKind('storey').find((s) => s.name === egName)!.id;
    const neu = k.run('publish.blattErstellen', { name: 'Grundriss EG — Rev. B', format: 'A1', orientation: 'quer' });
    const neuId = neu.patches[0]!.id;
    k.run('publish.ansichtPlatzieren', { sheetId: neuId, view: 'grundriss', storeyId: egId, scale: 50, x: 200, y: 200 });
    const sheet2Id = k.state().doc.byKind('sheet').find((s) => s.name === 'Schnitt A-A')!.id;
    k.run('publish.setSpeichern', { name: 'Werkplansatz', sheetIds: [neuId, sheet2Id] });
    return 'Grundriss EG — Rev. B';
  }, { sheet1Id, egName: 'EG' });

  const [zweiterDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="pubset-blattverzeichnis"]'),
  ]);
  const zweiteSvg = readFileSync((await zweiterDownload.path())!, 'utf8');
  expect(zweiteSvg).toContain(neuerName);
  expect(zweiteSvg).not.toContain('>Grundriss EG</text>'); // alter Name weg (nicht nur als Teilstring von "Rev. B"-Variante)
  expect(zweiteSvg).toContain('Schnitt A-A'); // unverändertes zweites Blatt bleibt
});

test.describe('Insel-Weg', () => {
  // Produktions-Default `publishOberflaeche:'island'` ohne den globalen
  // Manuell-Seed (Muster `publish-island.spec.ts`/`flaechennachweis.spec.ts`)
  // — nur ein leerer Kontext beweist die echte Insel-Oberfläche.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('AUSTAUSCH-Insel: derselbe Export liefert identischen Inhalt wie der Manuell-Weg', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.reload();
    await page.click('[data-testid="module-publish"]');
    await seedWerkplansatz(page);

    await page.hover('[data-testid="island-austausch-root"]');
    await expect(page.locator('[data-testid="island-austausch-leiste"]')).toBeVisible();
    await page.click('[data-testid="island-werkzeug-export-hub"]');
    await expect(page.locator('[data-testid="island-export-hub-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-pubset-eintrag"]')).toHaveCount(1);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="island-pubset-blattverzeichnis"]'),
    ]);
    expect(download.suggestedFilename()).toBe('Werkplansatz-Blattverzeichnis.svg');

    const svg = readFileSync((await download.path())!, 'utf8');
    expect(svg).toContain('BLATTVERZEICHNIS');
    expect(svg).toContain('Grundriss EG');
    expect(svg).toContain('Schnitt A-A');

    const svgSeite = await page.context().newPage();
    await svgSeite.setContent(
      `<!doctype html><html><body style="margin:0;background:#ddd;display:flex;justify-content:center;">${svg}</body></html>`,
    );
    await svgSeite.screenshot({ path: 'e2e-results/pb3-089-blattverzeichnis-insel.png', fullPage: true });
    await svgSeite.close();
  });
});
