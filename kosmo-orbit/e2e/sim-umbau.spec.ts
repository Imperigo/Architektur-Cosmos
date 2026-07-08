import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import type { TerrainProfil } from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * V1-Testlauf «Vollsimulation Umbau» — Haustyp Umbau/Sanierung.
 *
 * Szenario: Altbau-Sanierung Zürich-Aussersihl (`SZENARIEN.umbau`,
 * `e2e/sim/szenarien.ts`). Blockrandliegenschaft an der (fiktiven)
 * Hohlstrasse 42, Parzelle AS-2231, Baujahr ca. 1910. Auftrag: Entkernung
 * im Erdgeschoss (die nichttragende Trennwand zwischen Wohnen und Essen
 * fällt für einen offenen Grundriss), eine neue freistehende
 * Gartenstützmauer für die Terrassenerweiterung im rückwärtigen Garten, ein
 * neuer Wanddurchbruch für den Gartenzugang in der bestehenden Gartenfassade,
 * und ein abgeflachtes neues Terrain am neuen Ausgang.
 *
 * Deckt in EINEM zusammenhängenden Ablauf ab: Umbau-Status (Vision A1),
 * Terrain gewachsen/neu (Vision A2), Aussparung/Durchbruch (Vision A3),
 * Umbau-Filter je Blatt (RE-ARCHICAD A2), eine belegte Kosmo-Dossierfrage
 * zum Umbau, und den IFC-Export mit dem Pset_KosmoUmbau als Abschluss.
 *
 * Serie H / H1a: auf die wiederverwendbaren Journey-Bausteine
 * (`e2e/sim/bausteine.ts`) umgestellt — reine Extraktion, die geprüften
 * Bedingungen (Farben/Pset) bleiben unverändert. Wo ein sinnvoller
 * Umbau-Schritt kein Testid trägt oder keinem generischen Baustein
 * entspricht (Bestand/Abbruch/Neu-Status, Aussparung, Blatt-Umbau-Filter),
 * bleibt er journey-spezifisch inline — echte, im Code bestätigte
 * data-testids, nichts erfunden.
 */

test('Vollsimulation Umbau: Altbau-Sanierung Zürich-Aussersihl — Bestand markieren, Terrain, Durchbruch, Blatt-Filter, Kosmo, IFC-Export', async ({
  page,
}) => {
  const szenario = SZENARIEN.umbau;

  // ---------------------------------------------------------------------
  // 1) Onboarding + Projekt/Modul öffnen + Standort (Baustein 1).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);

  // ---------------------------------------------------------------------
  // 2) Bestand anlegen: Blockrand-Fussabdruck 8.0 × 6.0 m aus den
  // Bestands-Aussenmauern, eine innere Trennwand (Abbruch) und eine neue
  // freistehende Gartenstützmauer (Neu, Terrassen-Anbau). Baustein 4
  // zeichnet je Aufbau-Typ und assertet den Wandanzahl-Delta.
  // ---------------------------------------------------------------------
  // Reihenfolge der Kanten: Strasse, Ost, West, Garten — nur West/Garten
  // werden später selektiert, die anderen beiden bleiben ungenutzte IDs
  // (wie im ursprünglichen Monolithen).
  const [, , west, garten] = await B.waendeZeichnen(
    page,
    [
      { a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } }, // Fassade Hohlstrasse
      { a: { x: 8000, y: 0 }, b: { x: 8000, y: 6000 } }, // Brandmauer Ost
      { a: { x: 0, y: 6000 }, b: { x: 0, y: 0 } }, // Brandmauer West
      { a: { x: 8000, y: 6000 }, b: { x: 0, y: 6000 } }, // Fassade Garten
    ],
    'AW',
  );
  const [trennwand] = await B.waendeZeichnen(
    page,
    [{ a: { x: 4000, y: 0 }, b: { x: 4000, y: 6000 } }], // fällt für den offenen Wohn-/Essbereich
    'IW',
  );
  const [gartenmauer] = await B.waendeZeichnen(
    page,
    [{ a: { x: 12000, y: 1000 }, b: { x: 12000, y: 4500 } }], // neu, freistehend (Terrassen-Anbau)
    'AW',
  );
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(6);

  // Bestand explizit markieren: die Brandmauer West bleibt unangetastet stehen
  await page.evaluate((id) => window.__kosmo.state().select([id]), west);
  await page.selectOption('[data-testid="inspector-renovation"]', 'bestand');
  await expect(page.locator('[data-testid="inspector-renovation"]')).toHaveValue('bestand');
  // Explizites «Bestand» sieht (SIA 400) wie unmarkiert aus — keine Sonderfarbe
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(0);
  await expect(page.locator('path.renovation-neu')).toHaveCount(0);

  // Abbruch: die innere Trennwand → gelbe Fläche im Plan. K2 (Owner-Rundgang
  // 0.6.2, S. 18): kein Diagonalkreuz mehr über die ganze Wand — SIA-sauber
  // ist die gelbe Fläche allein die Signatur.
  await page.evaluate((id) => window.__kosmo.state().select([id]), trennwand);
  await page.selectOption('[data-testid="inspector-renovation"]', 'abbruch');
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(1);
  await expect(page.locator('line.abbruch-kreuz')).toHaveCount(0);

  // Neu: die Gartenstützmauer → rote Fläche im Plan, Abbruch bleibt unverändert stehen
  await page.evaluate((id) => window.__kosmo.state().select([id]), gartenmauer);
  await page.selectOption('[data-testid="inspector-renovation"]', 'neu');
  // Das Poché rendert EINEN Pfad je Schicht — die AW-Gartenmauer (3 Schichten)
  // ergibt entsprechend mehrere `renovation-neu`-Pfade; geprüft wird darum
  // «mindestens eine neu-Fläche erscheint», nicht eine feste Pfadzahl (Regel 1.4.1).
  expect(await page.locator('path.renovation-neu').count()).toBeGreaterThan(0);
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(1);

  // ---------------------------------------------------------------------
  // 3) Terrain: das gewachsene Terrain fällt zur Gartenseite hin ab; das neue
  // Terrain wird für den geplanten Gartenausgang auf Kote 0 abgeflacht.
  // Baustein 18 (Regel 1.4.4: Attribut- statt Visible-Assertion für das
  // flache Neu-Profil).
  // ---------------------------------------------------------------------
  await B.terrainSetzen(page, szenario.geometrie['terrain'] as TerrainProfil);

  // ---------------------------------------------------------------------
  // 4) Aussparung/Durchbruch: neuer Gartenzugang durch die bestehende
  // Gartenfassade — Bestandsmauer bleibt schwarz, der Durchbruch trägt
  // Symbol + Kote im Werkplan. Kein genereller Baustein (kein Testid-Weg
  // ausserhalb dieses Musters), bleibt journey-spezifisch inline.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="view-2d"]');
  await page.evaluate((id) => window.__kosmo.state().select([id]), garten);
  await page.click('[data-testid="inspector-aussparung"]');
  await expect(page.locator('line.aussparung')).toHaveCount(6); // 4 Kanten + Kreuz
  await expect(page.locator('text.aussparung')).toHaveText('D 300×300 UK 1100');
  // Die Aussparung ändert nichts an den bereits gesetzten Umbau-Status-Flächen
  // (renovation-neu: mehrere Pfade je Schicht der AW-Gartenmauer — s. oben).
  await expect(page.locator('path.renovation-abbruch')).toHaveCount(1);
  expect(await page.locator('path.renovation-neu').count()).toBeGreaterThan(0);

  // ---------------------------------------------------------------------
  // 5) Umbau-Filter je Blatt: Abbruchplan blendet Neubau aus, Neubauplan
  // blendet Abbruch aus, Bestandsplan blendet beides aus. Der Farbcheck vor
  // der Platzierungsauswahl passt nicht in den generischen Baustein 16
  // (Reihenfolge Assert-vor-Klick) — bleibt journey-spezifisch inline.
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
    () => window.__kosmo.state().doc.byKind('sheet')[0]!.placements![0]!.umbau,
  );
  expect(umbauStand).toBe('bestand');

  // ---------------------------------------------------------------------
  // 6a) Kosmo (KI-Panel), Umbau-Frage gegen die Fake-Bridge/Mock: Dossier-
  // Eintrag zum Umbau (aus szenario.gestaltung.dossier, H4) wird belegt
  // zitiert und lässt sich anspringen. Baustein 13, Modus «quelle».
  // ---------------------------------------------------------------------
  await page.evaluate(
    (eintraege) => window.__kosmo.run('design.dossierSetzen', { eintraege }),
    szenario.gestaltung.dossier,
  );
  await B.kosmoFragen(page, 'Was sagt das Dossier zum Umbau?', {
    modus: 'quelle',
    chipEnthaelt: 'Dossier NO-GO',
    sprungTestid: 'quelle-sprung-dossier',
    sprungEnthaelt: 'Hohlstrasse',
  });

  // ---------------------------------------------------------------------
  // 6b) Export als Abschluss: IFC trägt den Umbau-Status als Pset_KosmoUmbau
  // (Bestand/Neu/Abbruch bleiben für nachgelagerte Werkzeuge erhalten).
  // Baustein 17 prüft Dateiname + Grösse; der Pset-Inhaltsmarker bleibt
  // journey-spezifisch inline.
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('design'));
  const ifcPfad = await B.exportPruefen(page, 'export-ifc', /\.ifc$/i);
  const { readFileSync } = await import('node:fs');
  const ifcInhalt = readFileSync(ifcPfad, 'utf8');
  expect(ifcInhalt).toContain('Pset_KosmoUmbau');
  expect(ifcInhalt).toContain("IFCLABEL('abbruch')");
  expect(ifcInhalt).toContain("IFCLABEL('neu')");
});
