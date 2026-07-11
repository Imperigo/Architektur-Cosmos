import { expect, test, type Page } from '@playwright/test';

/**
 * V0.7.2 W4-G (Paket-Ergänzung «Companion minimal», Spec §10) — die schmale
 * PWA-Ansicht unter `#companion`. `main.tsx` rendert `Companion.tsx` ANSTELLE
 * von `<App/>`, sobald der Hash mit `#companion` beginnt — kein App-Chrome,
 * kein `window.__kosmo`-Hook (der lebt nur in `<App/>`s Mount-Effect).
 *
 * Job-/Freigabe-Karten kommen aus zwei bestehenden Laufzeit-Quellen
 * (`state/auftragsbuch.ts` + `modules/vis/vis-runtime.ts`, s.
 * `shell/companion-daten.ts`) — diese Suite seedet sie über den ECHTEN
 * Test-Hook `window.__kosmoCompanion` (Muster `window.__kosmoStatus`), der
 * NUR bestehende Store-Funktionen aufruft (`auftragErfassen`, `setzeLauf`) —
 * kein Fake-Datenpfad. Die Freigabe selbst läuft über dieselbe Bridge-Route
 * wie `NodeCanvas.tsx` (`POST /jobs/{id}/approve`), hier mit `page.route`
 * gemockt (Muster: kein bestehender Spec fährt einen echten Render-Job nur
 * für einen Freigabe-Klick hoch).
 */

async function bootstrapApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

/**
 * `main.tsx` prüft den Hash NUR EINMAL beim allerersten Laden (kein Router,
 * kein `hashchange`-Listener) — ein `page.goto('/#companion')`, dem im
 * SELBEN Browserkontext bereits eine `/`-Navigation vorausging, ist per
 * HTML-Spec eine reine Fragment-Navigation (kein neues Dokument, `main.tsx`
 * läuft NICHT erneut). Darum hier ein erzwungener `reload()` NACH dem
 * Hash-Wechsel, wenn diese Seite schon einmal ohne `#companion` geladen war.
 */
async function gotoCompanion(page: Page): Promise<void> {
  await page.goto('/#companion');
  await page.reload();
}

test('#companion rendert die schmale Ansicht — kein App-Chrome, Splash weg', async ({ page }) => {
  await page.goto('/#companion');
  await expect(page.locator('[data-testid="companion"]')).toBeVisible();
  // Kein Stück der vollen App im DOM (kein Doppel-Rendering, keine Zentrale-Kacheln).
  await expect(page.locator('[data-testid="module-design"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="orbit-haupt-design"]')).toHaveCount(0);
  // Der Splash lebt inline in index.html VOR #root — Companion entfernt ihn
  // im eigenen Mount-Effect genau wie App.tsx (sonst bliebe er für immer stehen).
  await expect(page.locator('#splash')).toHaveCount(0);
  // 4er-Kreis-Dock ist da.
  await expect(page.locator('[data-testid="companion-dock"]')).toBeVisible();
  for (const id of ['design', 'data', 'kosmo', 'office']) {
    await expect(page.locator(`[data-testid="companion-dock-${id}"]`)).toBeVisible();
  }
});

test('Phasen-Ring zeigt n/5 gemäss der aktuellen SIA-112-Gruppe (sia112Gruppe aus state/orbit-rang.ts)', async ({
  page,
}) => {
  await bootstrapApp(page);
  // `project-vault.ts#initVault()` restauriert einen Autosave-Stand nur, wenn
  // er mindestens eine Entity trägt (leere Projekte gelten nicht als
  // «etwas zu wiederherstellen») — KosmoDesign öffnen bootstrappt EG/OG
  // (`bootstrapProject()`), erst DANACH überlebt eine reine Settings-Änderung
  // (SIA-Phase) den Reload in Companion.tsx.
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
  // Ausschreibung (SIA 41) → SIA-112-Gruppe 4 von 5 (`sia112Gruppe`, Spec §4).
  await page.evaluate(() =>
    (window as unknown as { __kosmo: { run: (id: string, params: unknown) => unknown } }).__kosmo.run(
      'design.siaPhaseSetzen',
      { siaPhase: 'ausschreibung' },
    ),
  );
  // Autosave ist entprellt (project-vault.ts, 1200 ms) — der Companion-Tab
  // liest gleich darauf über `initVault()` dieselbe IndexedDB-Kopie.
  await page.waitForTimeout(1600);

  await gotoCompanion(page);
  const ring = page.locator('[data-testid="companion-phasenring"]');
  await expect(ring).toBeVisible();
  await expect(ring).toHaveAttribute('aria-label', /Phase 4 von 5/);
  await expect(ring).toContainText('4/5');
});

test('ehrlicher Leerzustand ohne Aufträge/Läufe, dann Job-Karte + Freigabe-Karte nach dem Seeden', async ({
  page,
}) => {
  await page.goto('/#companion');
  await expect(page.locator('[data-testid="companion"]')).toBeVisible();

  // Ehrlichkeitsregel (Spec §10): ohne Daten zeigt die Ansicht KEINE
  // erfundene Karte, sondern den Leerzustand.
  await expect(page.locator('[data-testid="companion-leer"]')).toBeVisible();

  // Auftragsbuch-Karte: über den echten `auftragErfassen`-Weg seeden
  // (derselbe Weg, den KosmoDev/das Kosmo-Panel nutzen).
  await page.evaluate(() =>
    (window as unknown as { __kosmoCompanion: { erfasseAuftrag: (t: string) => Promise<unknown> } }).__kosmoCompanion.erfasseAuftrag(
      'Fassadenfarbe mit Bauherrschaft klären',
    ),
  );
  const auftragsKarte = page.locator('[data-testid^="companion-job-auftrag-"]');
  await expect(auftragsKarte).toBeVisible({ timeout: 8000 });
  await expect(auftragsKarte).toContainText('Fassadenfarbe mit Bauherrschaft klären');
  await expect(auftragsKarte).toContainText('OFFEN');
  await expect(page.locator('[data-testid="companion-leer"]')).toHaveCount(0);

  // Vis-Freigabe-Karte: über denselben Test-Hook einen echten `NodeLauf` mit
  // Freigabe-Token setzen (Shape wie `vis-jobs.ts#postRenderJob` sie liefert).
  await page.route('**/jobs/vis-1000-abcdef/approve', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: 'vis-1000-abcdef',
        status: 'queued',
        scene: 'scene.json',
        created_at: new Date().toISOString(),
      }),
    }),
  );
  await page.evaluate(() =>
    (
      window as unknown as {
        __kosmoCompanion: { setzeVisLauf: (nodeId: string, lauf: unknown) => void };
      }
    ).__kosmoCompanion.setzeVisLauf('node-render-1', {
      status: 'wartetFreigabe',
      memoKey: 'k',
      jobId: 'vis-1000-abcdef',
      approvalToken: 'CONFIRMED_RENDER_test',
    }),
  );
  const visKarte = page.locator('[data-testid="companion-job-vis-node-render-1"]');
  await expect(visKarte).toBeVisible();
  await expect(visKarte).toContainText('WARTET AUF FREIGABE');
  const freigebenKnopf = page.locator('[data-testid="companion-job-vis-node-render-1-freigeben"]');
  await expect(freigebenKnopf).toBeVisible();

  await freigebenKnopf.click();
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('freigegeben', {
    timeout: 8000,
  });
  // Nach der Freigabe zeigt die Karte den neuen (gemockten) Bridge-Status,
  // nicht mehr «wartet auf Freigabe» — und keinen Freigeben-Knopf mehr.
  await expect(visKarte).not.toContainText('WARTET AUF FREIGABE');
  await expect(freigebenKnopf).toHaveCount(0);
});

test('Dock-Link räumt den Hash und lädt zurück in die Voll-App (Zentrale)', async ({ page }) => {
  await bootstrapApp(page);
  await gotoCompanion(page);
  await expect(page.locator('[data-testid="companion"]')).toBeVisible();

  await page.click('[data-testid="companion-dock-design"]');
  await expect(page.locator('[data-testid="module-design"]')).toBeVisible({ timeout: 10000 });
  expect(new URL(page.url()).hash).toBe('');
});
