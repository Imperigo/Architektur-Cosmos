import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * P-P2 «Profil-Manager UI» (v0.9.2 «Massgenau», `docs/V092-SPEZ.md` §P-P2) —
 * Beweis für den neuen Profil-Manager (PROJEKT-Insel, Katalog-Id `profil`,
 * `island/inhalte/profile.tsx`) + die neuen Inspector-Profil-Auswahlfelder
 * (Stütze/Unterzug, `Inspector.tsx`):
 *
 * (a) Profil anlegen über die Insel (Anlegen-Formular im Einstellungsfenster)
 *     — erscheint in der Liste.
 * (b) Ändern wirkt (Name + ein Mass über das Inline-Bearbeiten-Formular).
 * (c) Stütze zeichnen (Test-Hook `window.__kosmo.run`, kein Klick-Zeichnen
 *     nötig — Cluster-B-TABU), im Inspector (erreichbar über die ZEICHNEN-
 *     Insel, Werkzeug «Auswahl» → Stufe 3, `AuswahlStufe3` bettet
 *     `Inspector.tsx` unverändert ein) Profil zuweisen, dann lehnt das
 *     Löschen des referenzierten Profils MIT Referenz-Hinweis ab (Kernel-
 *     Fehlertext ehrlich angezeigt, sowohl als Toast als auch als bleibender
 *     Inline-Hinweis unter der Profil-Zeile).
 * (d) «— kein Profil —» wählen entfernt die Referenz wieder — danach klappt
 *     das Löschen.
 *
 * Kernel-Seite (Entity `Profil` + `design.profilErstellen`/`-Aendern`/
 * `-Loeschen` + `profilId` bei Column/Beam) ist bereits gelandet (P-P1) —
 * dieses Paket rührt NUR die PROJEKT-Insel + `Inspector.tsx` an, TABU bleiben
 * PlanView.tsx/DesignWorkspace.tsx/plan-hit-test.ts (Cluster B) und jede
 * `packages/kosmo-kernel/**`-Datei.
 */

test.use({ storageState: { cookies: [], origins: [] } });

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        activeStoreyId: string;
        doc: {
          get: (id: string) => Record<string, unknown> | undefined;
          byKind: (k: string) => Array<Record<string, unknown>>;
        };
        selection: string[];
        select: (ids: string[]) => void;
      };
      open: (s: string) => void;
    };
  }
}

async function starteIsland(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
}

/** Hover statt Klick — `.click()` löst `onMouseEnter` (IslandShell.tsx)
 *  bereits selbst aus (Muster `island-verdrahtung.spec.ts`/`island-ui.spec.ts`).
 *  Idempotent: schliesst ein `-fenster` NUR den Fenster-Zustand, die Insel
 *  bleibt `leiste` (1000ms-Rückklapp-Timer, `island-shell.test.tsx`-
 *  Kopfkommentar) — solange die Maus nicht explizit wegbewegt wird, bleibt
 *  `leiste` bestehen (die Pille wäre gar nicht im DOM) — darum die Leiste
 *  zuerst prüfen, statt blind auf die Pille zu hovern. */
async function oeffneInsel(page: Page, island: 'zeichnen' | 'projekt'): Promise<void> {
  const leiste = page.locator(`[data-testid="island-${island}-leiste"]`);
  if ((await leiste.count()) === 0) {
    await page.hover(`[data-testid="island-${island}-pill"]`);
  }
  await expect(leiste).toBeVisible();
}

async function oeffnePopup(page: Page, island: 'zeichnen' | 'projekt', werkzeugId: string): Promise<void> {
  await oeffneInsel(page, island);
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
  await expect(page.locator(`[data-testid="island-${werkzeugId}-popup"]`)).toBeVisible();
}

async function eskaliereZuFenster(page: Page, werkzeugId: string): Promise<void> {
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
  await expect(page.locator(`[data-testid="island-${werkzeugId}-fenster"]`)).toBeVisible();
}

async function schliesseFenster(page: Page, werkzeugId: string): Promise<void> {
  await page.click(`[data-testid="island-${werkzeugId}-fenster-schliessen"]`);
  await expect(page.locator(`[data-testid="island-${werkzeugId}-fenster"]`)).toHaveCount(0);
}

/** Öffnet den Profil-Manager bis Stufe 3 (Einstellungsfenster). */
async function oeffneProfilManager(page: Page): Promise<void> {
  await oeffnePopup(page, 'projekt', 'profil');
  await eskaliereZuFenster(page, 'profil');
  await expect(page.locator('[data-testid="island-profil-stufe3"]')).toBeVisible();
}

/** Öffnet den Inspector über die ZEICHNEN-Insel («Auswahl» → Stufe 3,
 *  `AuswahlStufe3` bettet `Inspector.tsx` 1:1 ein) — die vorher per
 *  `select()` gesetzte Auswahl bleibt beim Insel-Wechsel unverändert (globaler
 *  Zustand-Store, unabhängig von der gerade sichtbaren Insel). */
async function oeffneInspector(page: Page): Promise<void> {
  await oeffnePopup(page, 'zeichnen', 'auswahl');
  await eskaliereZuFenster(page, 'auswahl');
  await expect(page.locator('[data-testid="island-auswahl-stufe3"]')).toBeVisible();
}

const holeEntity = (page: Page, id: string) => page.evaluate((id) => window.__kosmo.state().doc.get(id), id);
const holeProfile = (page: Page) => page.evaluate(() => window.__kosmo.state().doc.byKind('profil'));
const fehlerToast = (page: Page) => page.locator('[data-testid="meldung-fehler"]').first();

test('Profil-Manager: Anlegen/Ändern über die Insel, Referenz-Schutz beim Löschen, «— kein Profil —» löst die Referenz wieder', async ({
  page,
}) => {
  await starteIsland(page);

  // ---------------------------------------------------------------------
  // (a) Profil anlegen über die Insel — erscheint in der Liste.
  // ---------------------------------------------------------------------
  await oeffneProfilManager(page);
  await expect(page.locator('[data-testid="island-profil-leer"]')).toBeVisible();

  await page.click('[data-testid="island-profil-neu-oeffnen"]');
  await page.fill('[data-testid="island-profil-neu-name"]', 'IPE 300');
  await waehleOption(page, 'island-profil-neu-form', 'stahl-i');
  await page.fill('[data-testid="island-profil-neu-b"]', '150');
  await page.fill('[data-testid="island-profil-neu-h"]', '300');
  await page.fill('[data-testid="island-profil-neu-steg"]', '8');
  await page.fill('[data-testid="island-profil-neu-flansch"]', '12');
  await page.click('[data-testid="island-profil-anlegen"]');

  await expect(page.locator('[data-testid="island-profil-liste"]')).toContainText('IPE 300');
  await expect(page.locator('[data-testid="island-profil-liste"]')).toContainText('Stahl I');
  await expect(page.locator('[data-testid="island-profil-leer"]')).toHaveCount(0);

  const nachAnlegen = await holeProfile(page);
  expect(nachAnlegen).toHaveLength(1);
  const profilId = nachAnlegen[0]!['id'] as string;
  expect(nachAnlegen[0]!['form']).toBe('stahl-i');
  expect(nachAnlegen[0]!['h']).toBe(300);
  expect(nachAnlegen[0]!['steg']).toBe(8);

  // ---------------------------------------------------------------------
  // (b) Ändern wirkt — Name + ein Mass über das Inline-Bearbeiten-Formular.
  // ---------------------------------------------------------------------
  await page.click(`[data-testid="island-profil-bearbeiten-${profilId}"]`);
  await page.fill(`[data-testid="island-profil-bearb-${profilId}-name"]`, 'IPE 300 (angepasst)');
  await page.fill(`[data-testid="island-profil-bearb-${profilId}-h"]`, '320');
  await page.click(`[data-testid="island-profil-speichern-${profilId}"]`);

  await expect(page.locator(`[data-testid="island-profil-name-${profilId}"]`)).toHaveText('IPE 300 (angepasst)');
  const nachAendern = await holeEntity(page, profilId);
  expect(nachAendern?.['name']).toBe('IPE 300 (angepasst)');
  expect(nachAendern?.['h']).toBe(320);
  // Nicht angefasste Masse bleiben (Kernel-Merge design.profilAendern).
  expect(nachAendern?.['b']).toBe(150);
  expect(nachAendern?.['steg']).toBe(8);
  expect(nachAendern?.['flansch']).toBe(12);

  await schliesseFenster(page, 'profil');

  // ---------------------------------------------------------------------
  // (c) Stütze zeichnen (Test-Hook, kein Klick-Zeichnen), im Inspector
  //     Profil zuweisen, dann lehnt das Löschen mit Referenz-Hinweis ab.
  // ---------------------------------------------------------------------
  const storeyId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  expect(storeyId).toBeTruthy();
  const columnId = await page.evaluate(
    (storeyId) => window.__kosmo.run('design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 } }).patches[0]!.id,
    storeyId,
  );
  await page.evaluate((id) => window.__kosmo.state().select([id]), columnId);

  await oeffneInspector(page);
  const profilAuswahl = page.locator('[data-testid="inspector-stuetze-profil"]');
  await expect(profilAuswahl).toBeVisible();
  await expect(profilAuswahl).toHaveAttribute('data-value', '');
  await waehleOption(page, 'inspector-stuetze-profil', profilId);
  expect((await holeEntity(page, columnId))?.['profilId']).toBe(profilId);

  await schliesseFenster(page, 'auswahl');

  await oeffneProfilManager(page);
  await page.click(`[data-testid="island-profil-loeschen-${profilId}"]`);

  const loeschFehler = page.locator(`[data-testid="island-profil-loesch-fehler-${profilId}"]`);
  await expect(loeschFehler).toBeVisible();
  await expect(loeschFehler).toContainText(columnId);
  await expect(fehlerToast(page)).toContainText(columnId);
  // Ehrliche Ablehnung, keine stille Klemmung — das Profil besteht weiter.
  expect(await holeProfile(page)).toHaveLength(1);
  await expect(page.locator(`[data-testid="island-profil-zeile-${profilId}"]`)).toBeVisible();

  await schliesseFenster(page, 'profil');

  // ---------------------------------------------------------------------
  // (d) «— kein Profil —» wählen entfernt die Referenz — danach klappt das
  //     Löschen.
  // ---------------------------------------------------------------------
  await oeffneInspector(page);
  await waehleOption(page, 'inspector-stuetze-profil', '');
  const nachEntfernen = await holeEntity(page, columnId);
  expect(nachEntfernen?.['profilId']).toBeUndefined();
  expect(Object.prototype.hasOwnProperty.call(nachEntfernen, 'profilId')).toBe(false);

  await schliesseFenster(page, 'auswahl');

  await oeffneProfilManager(page);
  await page.click(`[data-testid="island-profil-loeschen-${profilId}"]`);
  await expect(page.locator(`[data-testid="island-profil-zeile-${profilId}"]`)).toHaveCount(0);
  await expect(page.locator('[data-testid="island-profil-leer"]')).toBeVisible();
  expect(await holeProfile(page)).toHaveLength(0);
});
