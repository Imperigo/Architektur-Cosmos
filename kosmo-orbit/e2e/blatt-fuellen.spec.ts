import { expect, test } from '@playwright/test';

/**
 * Owner-Befund K10 (PDF S. 12, «Publish-Blätter halb leer»): «Blatt füllen»
 * schlägt die Kosmo-Ableitung (`schlageBlattBelegungVor`) vor und platziert
 * sie — Grundriss, Axonometrie, Kennzahlen-Text und ein Render-Platzhalter
 * (kein Render im Modell) — in EINEM atomaren Undo-Schritt. NICHT im
 * Worktree ausführen (Ports gehören dem Hauptbaum); Bootstrap wie
 * e2e/plan-lod.spec.ts: onboarded + starterGuide.done, damit der Block-E-
 * Guide keine Klicks abfängt.
 */
test('KosmoPublish: «Blatt füllen» belegt mehrere Slots — Undo macht ALLES in einem Schritt rückgängig', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');

  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten

  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      open: (s: string) => void;
    };
    const st = k.state();
    const storeyId = st.activeStoreyId!;
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const W = (a: unknown, b: unknown) => k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id });
    W({ x: 0, y: 0 }, { x: 7000, y: 0 });
    W({ x: 7000, y: 0 }, { x: 7000, y: 5000 });
    W({ x: 7000, y: 5000 }, { x: 0, y: 5000 });
    W({ x: 0, y: 5000 }, { x: 0, y: 0 });
    // Decke — ohne sie bliebe totalGf=0 und die Kennzahlen-Ableitung meldet
    // nur einen ehrlichen Hinweis statt eines Textblocks.
    k.run('design.deckeZeichnen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 7000, y: 0 },
        { x: 7000, y: 5000 },
        { x: 0, y: 5000 },
      ],
    });
    k.open('publish');
  });

  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  // Vorher: leeres Blatt, keine Platzierungen/Bilder/Texte.
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="blatt-bild-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="blatt-text-"]')).toHaveCount(0);

  await page.click('[data-testid="blatt-fuellen"]');

  // Mehrere Slots belegt: Grundriss + Axonometrie (Ansichten), ein Render-
  // Platzhalter (kein Render im Modell) und ein Kennzahlen-Textblock.
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="blatt-bild-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="blatt-text-"]')).toHaveCount(1);

  // Ehrliche Meldung: was platziert wurde UND was im Modell fehlt (kein Schnitt definiert).
  const meldung = page.locator('[data-testid="meldung-info"]');
  await expect(meldung).toBeVisible();
  await expect(meldung).toContainText('Platziert:');
  await expect(meldung).toContainText('Fehlt im Modell');

  await page.screenshot({ path: 'e2e-results/blatt-fuellen-belegt.png' });

  // EIN Rückgängig macht ALLES auf einmal rückgängig (Grundriss + Axo + Text + Bild-Slot).
  await page.click('button:has-text("Rückgängig")');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="blatt-bild-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="blatt-text-"]')).toHaveCount(0);
});

/**
 * Situationsplan-Verdrahtung (Stream 3A, v0.7.0 E4): mit einer als Parzelle
 * erkennbaren Zone (`sia: 'KF'`) im Modell wählt «Blatt füllen» zusätzlich
 * einen Situationsplan-Slot (Parzellengrenze + Gebäude-Footprint) — genau
 * EIN weiterer, ehrlicher Slot, kein Rateergebnis.
 */
test('KosmoPublish: «Blatt füllen» ergänzt den Situationsplan, sobald eine Parzelle im Modell steht', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');

  await page.click('[data-testid="module-design"]');

  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      open: (s: string) => void;
    };
    const st = k.state();
    const storeyId = st.activeStoreyId!;
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const W = (a: unknown, b: unknown) => k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id });
    W({ x: 0, y: 0 }, { x: 7000, y: 0 });
    W({ x: 7000, y: 0 }, { x: 7000, y: 5000 });
    W({ x: 7000, y: 5000 }, { x: 0, y: 5000 });
    W({ x: 0, y: 5000 }, { x: 0, y: 0 });
    // Parzelle (Zone mit sia:'KF') + Footprint-Volumen — dieselbe Erkennung
    // wie derive/schwarzplan.ts (schwarzplanGeometrie/gemeinsame Quelle).
    k.run('design.zoneErstellen', {
      storeyId,
      outline: [
        { x: -5000, y: -4000 },
        { x: 12000, y: -4000 },
        { x: 12000, y: 9000 },
        { x: -5000, y: 9000 },
      ],
      name: 'Parzelle E2E',
      sia: 'KF',
    });
    k.run('design.volumenErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 7000, y: 0 },
        { x: 7000, y: 5000 },
        { x: 0, y: 5000 },
      ],
      height: 6000,
    });
    k.open('publish');
  });

  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await page.click('[data-testid="blatt-fuellen"]');

  // Grundriss + Axo + Situationsplan — kein Bild-Slot-Text-Konflikt geprüft hier.
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(3);

  const meldung = page.locator('[data-testid="meldung-info"]');
  await expect(meldung).toBeVisible();
  await expect(meldung).toContainText('Situationsplan');

  await page.screenshot({ path: 'e2e-results/blatt-fuellen-situationsplan.png' });
});
