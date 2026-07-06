import { expect, test } from '@playwright/test';

/**
 * V1-Testlauf «Vollsimulation Umbau» — Haustyp Umbau/Sanierung.
 *
 * Szenario: Altbau-Sanierung Zürich-Aussersihl. Blockrandliegenschaft an der
 * (fiktiven) Hohlstrasse 42, Parzelle AS-2231, Baujahr ca. 1910. Auftrag:
 * Entkernung im Erdgeschoss (die nichttragende Trennwand zwischen Wohnen und
 * Essen fällt für einen offenen Grundriss), eine neue freistehende
 * Gartenstützmauer für die Terrassenerweiterung im rückwärtigen Garten, ein
 * neuer Wanddurchbruch für den Gartenzugang in der bestehenden Gartenfassade,
 * und ein abgeflachtes neues Terrain am neuen Ausgang.
 *
 * Deckt in EINEM zusammenhängenden Ablauf ab: Umbau-Status (Vision A1),
 * Terrain gewachsen/neu (Vision A2), Aussparung/Durchbruch (Vision A3),
 * Umbau-Filter je Blatt (RE-ARCHICAD A2), eine belegte Kosmo-Dossierfrage
 * zum Umbau, und den IFC-Export mit dem Pset_KosmoUmbau als Abschluss.
 *
 * Selektoren/Muster 1:1 aus e2e/module.spec.ts übernommen (Onboarding via
 * localStorage + reload, Bootstrap über «module-design», echte, im Code
 * bestätigte data-testid). Nichts erfunden — wo ein sinnvoller Umbau-Schritt
 * kein Testid trägt, wurde er ausgelassen (siehe Rückmeldung an Opus).
 */

test('Vollsimulation Umbau: Altbau-Sanierung Zürich-Aussersihl — Bestand markieren, Terrain, Durchbruch, Blatt-Filter, Kosmo, IFC-Export', async ({
  page,
}) => {
  // ---------------------------------------------------------------------
  // 1) Onboarding + Projekt/Modul öffnen. Mock-LLM gleich mitsetzen (für die
  // spätere Kosmo-Dossierfrage — Provider wird beim App-Start gelesen).
  // ---------------------------------------------------------------------
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/1.OG + AW/IW-Aufbauten
  await page.click('[data-testid="view-2d"]'); // Grundriss, ruhige Koordinaten für die Klicks unten

  // ---------------------------------------------------------------------
  // 2) Bestand anlegen: Blockrand-Fussabdruck 8.0 × 6.0 m aus den
  // Bestands-Aussenmauern, eine innere Trennwand (Abbruch) und eine neue
  // freistehende Gartenstützmauer (Neu, Terrassen-Anbau).
  // ---------------------------------------------------------------------
  const ids = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const iw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('IW'))!;
    const W = (a: { x: number; y: number }, b: { x: number; y: number }, assemblyId: string) =>
      k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId }).patches[0]!.id;
    const strasse = W({ x: 0, y: 0 }, { x: 8000, y: 0 }, aw.id); // Fassade Hohlstrasse
    const ost = W({ x: 8000, y: 0 }, { x: 8000, y: 6000 }, aw.id); // Brandmauer Ost
    const west = W({ x: 0, y: 6000 }, { x: 0, y: 0 }, aw.id); // Brandmauer West
    const garten = W({ x: 8000, y: 6000 }, { x: 0, y: 6000 }, aw.id); // Fassade Garten
    // Innere Trennwand — fällt für den offenen Wohn-/Essbereich
    const trennwand = W({ x: 4000, y: 0 }, { x: 4000, y: 6000 }, iw.id);
    // Neue freistehende Gartenstützmauer (Terrassen-Anbau, nicht am Bestand angeschlagen)
    const gartenmauer = W({ x: 12000, y: 1000 }, { x: 12000, y: 4500 }, aw.id);
    return { strasse, ost, west, garten, trennwand, gartenmauer };
  });
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(6);

  // Bestand explizit markieren: die Brandmauer West bleibt unangetastet stehen
  await page.evaluate((id) => window.__kosmo.state().select([id]), ids.west);
  await page.selectOption('[data-testid="inspector-renovation"]', 'bestand');
  await expect(page.locator('[data-testid="inspector-renovation"]')).toHaveValue('bestand');
  // Explizites «Bestand» sieht (SIA 400) wie unmarkiert aus — keine Sonderfarbe
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(0);
  await expect(page.locator('path.renovation-neu')).toHaveCount(0);

  // Abbruch: die innere Trennwand → gelbe Fläche + Abbruch-Kreuz im Plan
  await page.evaluate((id) => window.__kosmo.state().select([id]), ids.trennwand);
  await page.selectOption('[data-testid="inspector-renovation"]', 'abbruch');
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(1);
  await expect(page.locator('line.abbruch-kreuz')).toHaveCount(2);

  // Neu: die Gartenstützmauer → rote Fläche im Plan, Abbruch bleibt unverändert stehen
  await page.evaluate((id) => window.__kosmo.state().select([id]), ids.gartenmauer);
  await page.selectOption('[data-testid="inspector-renovation"]', 'neu');
  // Das Poché rendert EINEN Pfad je Schicht — die AW-Gartenmauer (3 Schichten)
  // ergibt entsprechend mehrere `renovation-neu`-Pfade; geprüft wird darum
  // «mindestens eine neu-Fläche erscheint», nicht eine feste Pfadzahl.
  expect(await page.locator('path.renovation-neu').count()).toBeGreaterThan(0);
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(1);

  // ---------------------------------------------------------------------
  // 3) Terrain: das gewachsene Terrain fällt zur Gartenseite hin ab; das neue
  // Terrain wird für den geplanten Gartenausgang auf Kote 0 abgeflacht.
  // ---------------------------------------------------------------------
  await page.evaluate(() => {
    const k = window.__kosmo;
    k.run('design.terrainSetzen', {
      typ: 'gewachsen',
      punkte: [
        { x: -2000, y: 0, z: 600 },
        { x: 13000, y: 0, z: -400 },
      ],
    });
    k.run('design.terrainSetzen', {
      typ: 'neu',
      punkte: [
        { x: -2000, y: 0, z: 0 },
        { x: 13000, y: 0, z: 0 },
      ],
    });
  });
  await page.click('[data-testid="view-quad"]');
  const gewachsen = page.locator('[data-testid="terrain-gewachsen"]').first();
  await expect(gewachsen).toBeVisible();
  await expect(gewachsen).toHaveAttribute('stroke-dasharray', '200 120');
  // Flaches Neu-Profil hat Bounding-Höhe 0 → für Playwright nie «visible»: Attribute prüfen
  const neu = page.locator('[data-testid="terrain-neu"]').first();
  await expect(neu).toHaveAttribute('points', /,0 .*,0$/); // beide Stützpunkte auf Kote 0
  await expect(neu).not.toHaveAttribute('stroke-dasharray', /.*/);

  // ---------------------------------------------------------------------
  // 4) Aussparung/Durchbruch: neuer Gartenzugang durch die bestehende
  // Gartenfassade — Bestandsmauer bleibt schwarz, der Durchbruch trägt
  // Symbol + Kote im Werkplan.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="view-2d"]');
  await page.evaluate((id) => window.__kosmo.state().select([id]), ids.garten);
  await page.click('[data-testid="inspector-aussparung"]');
  await expect(page.locator('line.aussparung')).toHaveCount(6); // 4 Kanten + Kreuz
  await expect(page.locator('text.aussparung')).toHaveText('D 300×300 UK 1100');
  // Die Aussparung ändert nichts an den bereits gesetzten Umbau-Status-Flächen
  // (renovation-neu: mehrere Pfade je Schicht der AW-Gartenmauer — s. oben).
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(1);
  expect(await page.locator('path.renovation-neu').count()).toBeGreaterThan(0);

  // ---------------------------------------------------------------------
  // 5) Umbau-Filter je Blatt: Abbruchplan blendet Neubau aus, Neubauplan
  // blendet Abbruch aus, Bestandsplan blendet beides aus.
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-plan"]');
  const farben = () =>
    page.evaluate(() => {
      const html = document.body.innerHTML;
      return { rot: html.includes('#b3261e'), gelb: html.includes('#8a7500') };
    });
  // Kombinierter Plan (kein Filter): beide Umbau-Farben stehen gleichzeitig
  expect(await farben()).toEqual({ rot: true, gelb: true });

  await page.locator('[data-testid^="placement-"]').first().click();
  await page.selectOption('[data-testid="auswahl-umbau"]', 'abbruch');
  await expect
    .poll(async () => (await farben()).rot, { message: 'Abbruchplan muss Neubau-Rot ausblenden' })
    .toBe(false);
  expect((await farben()).gelb).toBe(true);

  await page.selectOption('[data-testid="auswahl-umbau"]', 'neu');
  await expect
    .poll(async () => (await farben()).gelb, { message: 'Neubauplan muss Abbruch-Gelb ausblenden' })
    .toBe(false);
  expect((await farben()).rot).toBe(true);

  await page.selectOption('[data-testid="auswahl-umbau"]', 'bestand');
  await expect
    .poll(async () => (await farben()).rot, { message: 'Bestandsplan darf weder Neubau- noch Abbruchfarbe zeigen' })
    .toBe(false);
  expect((await farben()).gelb).toBe(false);

  const umbauStand = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('sheet')[0]!.placements[0]!.umbau,
  );
  expect(umbauStand).toBe('bestand');

  // ---------------------------------------------------------------------
  // 6a) Kosmo (KI-Panel), Umbau-Frage gegen die Fake-Bridge/Mock: Dossier-
  // Eintrag zum Umbau wird belegt zitiert und lässt sich anspringen.
  // ---------------------------------------------------------------------
  await page.evaluate(() =>
    window.__kosmo.run('design.dossierSetzen', {
      eintraege: [
        { typ: 'dont', text: 'Die denkmalgeschützte Fassade zur Hohlstrasse darf beim Umbau nicht verändert werden.' },
      ],
    }),
  );
  await page.fill('[data-testid="kosmo-input"]', 'Was sagt das Dossier zum Umbau?');
  await page.click('[data-testid="kosmo-send"]');
  const chip = page.locator('[data-testid="quelle-chip"]').first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText('Dossier NO-GO');
  await chip.click();
  await expect(page.locator('[data-testid="quelle-sprung-dossier"]')).toBeVisible();
  await expect(page.locator('[data-testid="quelle-sprung-dossier"]')).toContainText('Hohlstrasse');

  // ---------------------------------------------------------------------
  // 6b) Export als Abschluss: IFC trägt den Umbau-Status als Pset_KosmoUmbau
  // (Bestand/Neu/Abbruch bleiben für nachgelagerte Werkzeuge erhalten).
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('design'));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-ifc"]'),
  ]);
  const pfad = await download.path();
  const { readFileSync } = await import('node:fs');
  const ifcInhalt = readFileSync(pfad!, 'utf8');
  expect(ifcInhalt).toContain('Pset_KosmoUmbau');
  expect(ifcInhalt).toContain("IFCLABEL('abbruch')");
  expect(ifcInhalt).toContain("IFCLABEL('neu')");
});
