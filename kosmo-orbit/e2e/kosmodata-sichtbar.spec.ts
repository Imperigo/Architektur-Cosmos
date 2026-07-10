import { expect, test, type Page } from '@playwright/test';

/**
 * v0.6.8 Stream B — «KosmoData sichtbar» (K1/K6/K8):
 *
 *  K1  Hero-Bilder lokal-first über den Laufzeit-Blob-Store
 *      (`modules/data/data-runtime.ts`): on-demand nur bei sichtbarer Karte,
 *      unter WebDriver/Playwright NIE ein fetch nach aussen, Fallback ist der
 *      deterministische Tusche-Platzhalter je Typologie plus die ehrliche
 *      Zeile «Bild nicht lokal — Quelle: <domain>» statt eines kaputten <img>.
 *  K6  Das Referenz-Dossier zeigt die bisher unsichtbaren Felder des reichen
 *      Master-Modells — gruppiert und zusammenklappbar (Programm, Kontext,
 *      Einordnung, Architektur-Text, 3D-Modelle, Quellen, Datenbankprofil).
 *  K8  Gedächtnis-/Wissens-Querverweise im Dossier — Klick wechselt den Tab
 *      innerhalb von KosmoData und fokussiert den verwiesenen Eintrag.
 *
 * Seed bleibt READ-ONLY: die Erwartungswerte unten (Pantheon: 9 Kapitel,
 * 3 Modelle, 4 Quellen-Kandidaten, «Quellen 5» im Datenbankprofil) sind aus
 * `apps/kosmo-orbit/public/kosmodata-seed.json` abgelesen, nicht verändert.
 */

/** Externe Hosts hart kappen — diese Spec DARF keinen Verkehr nach aussen
 *  erzeugen; jede abgefangene URL landet im Protokoll für die Assertion. */
async function kappeExternesNetz(page: Page): Promise<string[]> {
  const extern: string[] = [];
  await page.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (route) => {
    extern.push(route.request().url());
    void route.abort('failed');
  });
  return extern;
}

async function oeffneKosmoData(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
}

async function oeffneDossier(page: Page, titel: string): Promise<void> {
  await page.fill('[data-testid="data-search"]', titel);
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();
}

test('K1: Hero-Bilder lokal-first — kein Netz nach aussen, deterministischer Tusche-Platzhalter, ehrliche Quellzeile im Dossier', async ({ page }) => {
  const extern = await kappeExternesNetz(page);
  await oeffneKosmoData(page);
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(112);

  // Jede Karte ohne lokales Bild zeigt das gezeichnete Signet (W4-Vertrag
  // `karte-leerbild` lebt weiter) — unter Playwright sind das alle 112.
  await expect(
    page.locator('[data-testid="ref-card"] [data-testid="karte-leerbild"]').first(),
  ).toBeVisible();

  // Kernvertrag K1: das Karten-Grid hat KEINEN Request nach aussen ausgelöst
  // (die 78 Wikimedia-`hero`-URLs des Seeds werden unter WebDriver nie geholt).
  expect(extern).toEqual([]);

  // Deterministisch: dieselbe Referenz zeichnet nach einem Reload exakt
  // dasselbe Piktogramm (Hash aus der Referenz-Id, kein Zufall).
  await page.fill('[data-testid="data-search"]', 'Pantheon');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  const signet = page.locator('[data-testid="ref-card"] [data-testid="karte-leerbild"]');
  await expect(signet).toBeVisible();
  const vorher = await signet.innerHTML();
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Pantheon');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await expect(signet).toBeVisible();
  expect(await signet.innerHTML()).toBe(vorher);

  // Dossier: statt eines kaputten externen <img> steht der Platzhalter plus
  // die ehrliche Zeile mit der Quelle (Domain der nicht geladenen URL).
  await page.click('[data-testid="ref-card"]');
  const dossierBild = page.locator('[data-testid="ref-dossier-bild"]');
  await expect(dossierBild).toBeVisible();
  await expect(dossierBild.locator('img')).toHaveCount(0);
  const quelle = dossierBild.locator('[data-testid="ref-bild-quelle"]');
  await expect(quelle).toContainText('Bild nicht lokal');
  await expect(quelle).toContainText('upload.wikimedia.org');

  // Karte ohne hero-URL: ehrlicher W4-Wortlaut bleibt.
  await page.locator('[data-testid="ref-detail-dossier"] button', { hasText: '×' }).click();
  await page.fill('[data-testid="data-search"]', 'De architectura');
  const karteOhne = page.locator('[data-testid="ref-card"]');
  await expect(karteOhne).toHaveCount(1);
  await expect(karteOhne).toContainText('kein Bild hinterlegt');
  await expect(karteOhne.locator('img')).toHaveCount(0);

  await page.screenshot({ path: 'e2e-results/kosmodata-sichtbar-k1.png' });
});

test('K6: Dossier zeigt die reichen Felder — Programm/Kontext offen, Einordnung/Architektur-Text/Modelle/Quellen/Datenbankprofil aufklappbar', async ({ page }) => {
  await kappeExternesNetz(page);
  await oeffneKosmoData(page);
  await oeffneDossier(page, 'Pantheon');

  // Programm (offen per Default): strukturiertes Profil statt nichts.
  const programm = page.locator('[data-testid="ref-programm"]');
  await expect(programm).toBeVisible();
  await expect(programm).toContainText('roman temple church and memorial');

  // Kontext (offen): Topografie/Lage aus dem bisher unsichtbaren context-Feld.
  const kontext = page.locator('[data-testid="ref-kontext"]');
  await expect(kontext).toContainText('dense historic city center');

  // Einordnung (zu): erst nach dem Aufklappen sichtbar.
  const einordnung = page.locator('[data-testid="ref-einordnung"]');
  await expect(einordnung.getByText('architectural history 1')).toBeHidden();
  await einordnung.locator('summary').click();
  await expect(einordnung.getByText('architectural history 1')).toBeVisible();

  // Architektur-Text: Kapitelzahl aus dem Seed (Pantheon: 9), Kapitel einzeln aufklappbar.
  const at = page.locator('[data-testid="ref-architekturtext"]');
  await at.locator('> summary').click();
  await expect(at).toContainText('Pantheon: Kuppel, Oculus und Beton als kosmischer Innenraum');
  const kapitel = at.locator('[data-testid="ref-architekturtext-kapitel"]');
  await expect(kapitel).toHaveCount(9);

  // 3D-Modelle: die Liste selbst (bisher existierte nur der has_3d-Boolean).
  const modelle = page.locator('[data-testid="ref-modelle"]');
  await modelle.locator('summary').click();
  await expect(modelle).toContainText('Pantheon Piazza della Rotonda site model');

  // Quellen-Kandidaten: Anzahl aus dem Seed (Pantheon: 4).
  const quellen = page.locator('[data-testid="ref-quellen"]');
  await quellen.locator('summary').click();
  await expect(quellen).toContainText('Quellen-Kandidaten');

  // Datenbankprofil: das Zählwerk (source/media/model/analysis/tag counts).
  const db = page.locator('[data-testid="ref-dbprofil"]');
  await db.locator('summary').click();
  await expect(db).toContainText('Quellen 5');
  await expect(db).toContainText('Tags 19');

  // Zusammenklappen funktioniert auch rückwärts (Programm zu → Inhalt weg).
  await programm.locator('summary').click();
  await expect(programm.getByText('roman temple church and memorial')).toBeHidden();

  // Alt-Verträge unangetastet: Analyse-Abschnitt und Sichtbarkeits-Chip stehen weiter.
  await expect(page.locator('[data-testid="ref-analyse"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-visibility"]')).toContainText('Öffentlich');

  await page.screenshot({ path: 'e2e-results/kosmodata-sichtbar-k6.png' });
});

test('K8: Gedächtnis-Querverweis im Dossier — Klick wechselt in den Gedächtnis-Tab und fokussiert den Eintrag; ohne Treffer ehrliche Leerzeile', async ({ page }) => {
  await kappeExternesNetz(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Dasselbe Fixture-Muster wie kosmodata-gedaechtnis.spec.ts — ein Eintrag
    // nennt die Referenz «Pantheon» wörtlich, der andere bewusst nicht.
    localStorage.setItem(
      'kosmo.lernjournal',
      JSON.stringify([
        {
          ts: '2026-07-01T08:00:00.000Z',
          sentiment: 'gut',
          context: 'Pantheon Oculus-Lichtführung als Referenz für das Atriumhaus notiert',
        },
        {
          ts: '2026-07-02T09:00:00.000Z',
          sentiment: 'schlecht',
          context: 'Ohne Referenzbezug: Wand ohne Aufbau vorgeschlagen',
        },
      ]),
    );
  });
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await oeffneDossier(page, 'Pantheon');

  const quer = page.locator('[data-testid="ref-querverweise"]');
  await expect(quer).toBeVisible();

  // Genau EIN Gedächtnis-Eintrag nennt «Pantheon» — genau ein Querverweis.
  const links = page.locator('[data-testid="ref-gedaechtnis-link"]');
  await expect(links).toHaveCount(1);
  await expect(links.first()).toContainText('Oculus');

  // Wissen: ohne geladene Wissensbasis ehrlich leer statt Fake-Treffer.
  await expect(page.locator('[data-testid="ref-wissen-leer"]')).toBeVisible();

  // Klick: Tab-Wechsel INNERHALB von KosmoData zum Gedächtnis, der verwiesene
  // Eintrag ist markiert («Querverweis aus Referenz»).
  await links.first().click();
  await expect(page.locator('[data-testid="kosmodata-gedaechtnis"]')).toBeVisible();
  const eintrag = page.locator('[data-testid="gedaechtnis-eintrag"]').filter({ hasText: 'Oculus' });
  await expect(eintrag.locator('[data-testid="gedaechtnis-fokus"]')).toBeVisible();
  // Der andere (nicht verwiesene) Eintrag trägt die Markierung nicht.
  const anderer = page.locator('[data-testid="gedaechtnis-eintrag"]').filter({ hasText: 'Wand ohne Aufbau' });
  await expect(anderer.locator('[data-testid="gedaechtnis-fokus"]')).toHaveCount(0);

  // Gegenprobe: eine Referenz, die kein Eintrag nennt → ehrliche Leerzeile.
  await page.click('[data-testid="tab-referenzen"]');
  await oeffneDossier(page, 'Parthenon');
  await expect(page.locator('[data-testid="ref-gedaechtnis-leer"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-gedaechtnis-link"]')).toHaveCount(0);

  await page.screenshot({ path: 'e2e-results/kosmodata-sichtbar-k8.png' });
});
