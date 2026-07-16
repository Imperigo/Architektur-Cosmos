import { expect, test } from '@playwright/test';

/**
 * PlankopfPanel (v0.8.0 P6, `docs/V080-PLANKOPF-SPEZ.md` §1.5/§2.3/§4/§8
 * V-K9/P-K7) — deckt die im Bau-Auftrag geforderten Kernpunkte ab:
 *
 *  - Felder setzen → Plankopf erscheint im SVG (`<g data-teil="plankopf">`),
 *    Plancode wird sichtbar UND im Panel korrekt (`sheetPlancode()`).
 *  - Layout-Toggle Wasserzeichen an/aus (`publish.blattLayoutSetzen`).
 *  - Overlay-Klick öffnet/fokussiert das Panel — seit dem Golden-
 *    Sammelwechsel 080 (Default-Flip, `docs/GOLDEN-WECHSEL-080.md`) zeigt
 *    JEDES Blatt sofort das volle 180×55-Framework, auch ganz ohne
 *    Plankopf-/Layout-Daten (der frühere P4-Daten-Guard mit dem kompakten
 *    ~120×26/31-mm-Alt-Fusskopf ist aufgelöst) — die Overlay-Hitbox bleibt
 *    darum über Feld-Eingaben hinweg GLEICH gross, statt zu wachsen.
 *  - Massstab-Chip MIT Selektion ändert den Massstab der Platzierung (+
 *    Undo), OHNE Selektion bleiben die Chips deaktiviert (reine
 *    Empfehlungsanzeige, Spez §2.3).
 *  - PNG-Logo an `publish.bueroSetzen` → ehrliche Fehlermeldung
 *    (`meldung-fehler`), kein stiller Fehlschlag (Spez §4.3/§8) — seit
 *    v0.8.1 P7 (`docs/V081-SPEZ.md` §6.1/§7(e), C-24) umgekehrtes Vorzeichen:
 *    SVG/JPG werden jetzt akzeptiert, PNG bleibt ehrlich abgelehnt.
 *
 * Bootstrap wie `e2e/baugesuch.spec.ts`/`e2e/module.spec.ts`: TKB-Demo laden
 * (Default-Doc, `siaPhase: 'wettbewerb'` → Matrix-Stufe VS, `docs/
 * V080-PLANKOPF-SPEZ.md` §2.2), Publish öffnen, `window.__kosmo` für
 * deterministische Modell-Abfragen (kein Test-Hook-Shortcut für den
 * eigentlichen Plankopf-Auftrag selbst — alle Feld-/Toggle-/Chip-
 * Interaktionen laufen über echte UI-Klicks).
 */

declare global {
  interface Window {
    __kosmo: {
      state: () => {
        doc: {
          byKind: (k: string) => { id: string; placements: { scale: number }[] }[];
        };
      };
      open: (s: string) => void;
    };
  }
}

async function ladeUndOeffnePublish(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
}

test('Plankopf: Felder setzen → Framework-Plankopf im SVG, Plancode korrekt, Wasserzeichen-Toggle an/aus', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  // v0.8.0 P7 (Golden-Sammelwechsel 080, Default-Flip): schon VOR jeder
  // Feld-Eingabe zeigt das neu erstellte Blatt das volle Framework — der
  // frühere P4-Daten-Guard (Alt-Fusskopf ohne Plankopf-/Layout-Daten) ist
  // aufgelöst, s. docs/GOLDEN-WECHSEL-080.md.
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1);

  await page.fill('[data-testid="plankopf-buero-kuerzel"]', 'MAA');
  await page.locator('[data-testid="plankopf-buero-kuerzel"]').blur();
  await page.fill('[data-testid="plankopf-projekt-code"]', 'SEE');
  await page.locator('[data-testid="plankopf-projekt-code"]').blur();
  await page.fill('[data-testid="plankopf-disziplin"]', 'A');
  await page.locator('[data-testid="plankopf-disziplin"]').blur();
  await page.fill('[data-testid="plankopf-geschoss"]', 'EG');
  await page.locator('[data-testid="plankopf-geschoss"]').blur();
  await page.fill('[data-testid="plankopf-plan-nummer"]', '101');
  await page.locator('[data-testid="plankopf-plan-nummer"]').blur();
  await page.fill('[data-testid="plankopf-inhalt"]', 'Grundriss EG');
  await page.locator('[data-testid="plankopf-inhalt"]').blur();

  // Framework bleibt nach den Feld-Eingaben unverändert vorhanden (war schon
  // vorher da, Default-Flip s. oben).
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Grundriss EG');

  // Plancode: MAA-SEE-<Matrix-Stufe>-A-EG-101 (Matrix-Stufe = 2 Buchstaben,
  // Default-Doc `siaPhase: 'wettbewerb'` → VS, s. `siaZuMatrixStufe`).
  const plancode = page.locator('[data-testid="plankopf-plancode"]');
  await expect(plancode).toHaveText(/^MAA-SEE-[A-Z]{2}-A-EG-101$/);
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText(await plancode.innerText());
  // Kein «unvollständig»-Hinweis mehr, sobald alle drei Pflichtteile stehen.
  await expect(page.locator('[data-testid="plankopf-plancode-hinweis"]')).toHaveCount(0);

  // Wasserzeichen-Toggle (VS-Phase: «STUDIE — NICHT FÜR AUSFÜHRUNG»). v0.8.0
  // P7 (Default-Flip, Spez §5.1): Wasserzeichen ist jetzt OHNE explizites
  // Setzen bereits AN — der Checkbox-Ausgangszustand ist darum «angehakt»
  // (s. PlankopfPanel.tsx, `!== false`-Anzeige), nicht mehr «leer».
  await expect(page.locator('[data-testid="blattlayout-wasserzeichen"]')).toBeChecked();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('STUDIE');
  await page.uncheck('[data-testid="blattlayout-wasserzeichen"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).not.toContainText('STUDIE', { timeout: 10_000 });
  await page.check('[data-testid="blattlayout-wasserzeichen"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('STUDIE', { timeout: 10_000 });
});

test('Plankopf: Plancode-Hinweis nennt fehlende Teile, bevor die Stammdaten stehen', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');

  const hinweis = page.locator('[data-testid="plankopf-plancode-hinweis"]');
  await expect(hinweis).toContainText('Büro-Kürzel');
  await expect(hinweis).toContainText('Projekt-Code');
  await expect(hinweis).toContainText('Plan-Nummer');
  await expect(page.locator('[data-testid="plankopf-plancode"]')).toHaveText('—');
});

// v0.8.0 P7 (Golden-Sammelwechsel 080, Default-Flip): dieser Test prüfte
// bisher zwei UNTERSCHIEDLICHE Overlay-Geometrien (kompakter Alt-Fusskopf vs.
// gewachsenes Framework-Rect, Nachweis über eine wachsende Bounding-Box). Mit
// dem Default-Flip zeigt JEDES Blatt von Anfang an das volle 180×55-mm-
// Framework — der Alt-Fusskopf ist nicht mehr erreichbar (s.
// docs/GOLDEN-WECHSEL-080.md). Der Test prüft jetzt stattdessen: die
// Overlay-Hitbox ist von Anfang an da (Framework-Grösse), der Klick öffnet
// das Panel VOR wie NACH dem Setzen von Plankopf-Feldern, und die Hitbox-
// Grösse bleibt dabei stabil (kein Wachstum mehr, weil es keine zweite,
// kleinere Geometrie mehr gibt).
test('Plankopf-Overlay: Klick öffnet das Panel — Framework-Rect ist von Anfang an da und bleibt über Feld-Eingaben hinweg gleich gross', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);
  const overlay = page.locator('[data-testid="plankopf-overlay"]');
  await expect(overlay).toBeAttached();
  const vorBox = await overlay.boundingBox();
  expect(vorBox).not.toBeNull();

  // Framework-Rect ist bereits vor jeder Feld-Eingabe da (Default-Flip) —
  // Klick öffnet das Panel.
  await overlay.click();
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);

  // Nach dem Setzen eines Plankopf-Felds bleibt die Hitbox dieselbe Grösse
  // (dieselbe 180×55-mm-Box, keine zweite Geometrie mehr) — Klick öffnet das
  // Panel weiterhin.
  await page.click('[data-testid="publish-plankopf"]');
  await page.fill('[data-testid="plankopf-inhalt"]', 'Fassade Ost');
  await page.locator('[data-testid="plankopf-inhalt"]').blur();
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1);
  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);

  const nachBox = await overlay.boundingBox();
  expect(nachBox).not.toBeNull();
  expect(Math.abs(nachBox!.height - vorBox!.height)).toBeLessThan(3);
  expect(Math.abs(nachBox!.width - vorBox!.width)).toBeLessThan(3);

  await overlay.click();
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
});

test('Massstab-Chips: ohne Selektion deaktiviert, mit Selektion ändern sie den Massstab der Platzierung (+ Undo)', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-plan"]');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(1);

  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  // VS-Phase (Default-Doc) empfiehlt 1:500/1:200 — ohne Selektion deaktiviert.
  const chip500 = page.locator('[data-testid="plankopf-massstab-chip-500"]');
  await expect(chip500).toBeVisible();
  await expect(chip500).toBeDisabled();
  await expect(page.locator('[data-testid="plankopf-massstab-hinweis"]')).toBeVisible();

  await page.locator('[data-testid^="placement-"]').first().click();
  await expect(chip500).toBeEnabled();
  await expect(page.locator('[data-testid="plankopf-massstab-hinweis"]')).toHaveCount(0);

  const liesScale = () =>
    page.evaluate(() => window.__kosmo.state().doc.byKind('sheet')[0]!.placements[0]!.scale);

  const scaleVorClick = await liesScale();

  await chip500.click();
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('1:500');
  await expect.poll(liesScale).toBe(500);

  // Undo macht die Massstabsänderung rückgängig — Panel vorher schliessen,
  // weil es (rechts oben, `right:16/top:52`) den «Rückgängig»-Knopf der
  // Blattflächen-Werkzeugleiste überlappt und dessen Klick abfangen würde.
  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);
  await page.click('button:has-text("Rückgängig")');
  await expect.poll(liesScale).toBe(scaleVorClick);
});

// v0.8.1 P7 (docs/V081-SPEZ.md §6.1/§7(e), C-24 «Büro-Logo SVG/JPG») — Format-
// Flip gegenüber v0.8.0 P2: PNG wird jetzt ehrlich abgelehnt, SVG/JPG laufen
// durch. `MINI_JPEG_BASE64`/`MINI_SVG_BASE64` sind ECHTE, gültige Bilddaten
// (kein Fake-Byte-String wie im PNG-Ablehnungsfall — nur der Mime-Typ zählt
// dort für den Guard, s. `plankopf-commands.test.ts`), damit ein etwaiger
// Browser-Decode-Schritt (z.B. beim späteren PDF-Export, `export-pdf-
// haertung.spec.ts`) nicht an unechten Bytes scheitert.
const MINI_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAEAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDlaKKK+ZP3A//Z';
const MINI_SVG_BASE64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#c83c3c"/></svg>',
).toString('base64');

test('Büro-Logo: PNG-Datei löst die ehrliche Fehlermeldung des Commands aus', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  await page.setInputFiles('[data-testid="plankopf-buero-logo"]', {
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });

  const toast = page.locator('[data-testid="meldung-fehler"]');
  await expect(toast).toContainText('SVG oder JPG erforderlich');
  // Kein stiller Fehlschlag: das Panel bleibt offen, kein Logo gesetzt.
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
});

test('Büro-Logo: echte JPG-Datei wird akzeptiert, Plankopf zeigt das Logo-Bild im Vorschau-SVG', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  await page.setInputFiles('[data-testid="plankopf-buero-logo"]', {
    name: 'logo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(MINI_JPEG_BASE64, 'base64'),
  });
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Büro-Logo aktualisiert');

  // Das Vorschau-SVG (`sheetToSvg`, Blattfläche) bettet das Logo als echtes
  // `<image>` mit `data:image/jpeg;base64,…` ein (Golden-Guard: NUR mit
  // hochgeladenem Logo, s. `derive/plankopf.ts` `plankopfSvg()`).
  const bildHref = await page.locator('[data-testid="sheet-canvas"] image').first().getAttribute('href');
  expect(bildHref).toContain('data:image/jpeg;base64,');
});

test('Büro-Logo: echte SVG-Datei wird ebenfalls akzeptiert', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  await page.setInputFiles('[data-testid="plankopf-buero-logo"]', {
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(MINI_SVG_BASE64, 'base64'),
  });
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Büro-Logo aktualisiert');

  const bildHref = await page.locator('[data-testid="sheet-canvas"] image').first().getAttribute('href');
  expect(bildHref).toContain('data:image/svg+xml;base64,');
});

// v0.8.0B / W4 (Spez §4/§2 Gesetz 9, B-58) — «Publish ist der ERSTE
// Verbraucher» des additiven `oeffnen`-Felds auf `DockPanelEintrag`
// (`shell/dock/DockFlaeche.tsx`): ein Panel, das seine Station als
// `sichtbar:false` UND mit einem `oeffnen`-Rückruf meldet, erscheint als
// «+ NAME»-Closed-Chip in der Dock-Closed-Leiste — additiver Test, kein
// bestehendes Verhalten geändert (vorher blieb die Leiste für JEDE Station
// leer, weil niemand `oeffnen` durchreichte).
test('Dock-Closed-Chips: geschlossene Dossier-/Plankopf-Panels erscheinen als «+ NAME»-Chip und öffnen per Klick wieder', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  // Beide Panels starten geschlossen (`start:'zu'`, `dock-stationen.ts`s
  // `PUBLISH_PANELS`) — beide reichen jetzt `oeffnen` durch (erster
  // Verbraucher, s. `PublishWorkspace.tsx`s `publishDockPanels`), darum
  // erscheinen BEIDE Closed-Chips bereits VOR jedem Öffnen, sobald ein
  // Blatt existiert (dieselben Guards wie die Werkzeugleisten-Knöpfe).
  const dossierChip = page.locator('[data-testid="dock-closed-chip-dossier"]');
  const plankopfChip = page.locator('[data-testid="dock-closed-chip-plankopf"]');
  await expect(page.locator('[data-testid="dock-closed-leiste"]')).toBeVisible();
  await expect(dossierChip).toBeVisible();
  await expect(dossierChip).toContainText('Projekt-Dossier');
  await expect(plankopfChip).toBeVisible();
  await expect(plankopfChip).toContainText('Plankopf');
  await expect(page.locator('[data-testid="dossier-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);

  // Chip-Klick öffnet das Panel — der eigene Chip verschwindet sofort.
  await dossierChip.click();
  await expect(page.locator('[data-testid="dossier-panel"]')).toBeVisible();
  await expect(dossierChip).toHaveCount(0);

  // Über die Dock-Kopf-Chrome schliessen (nicht das Panel-eigene
  // «Schliessen» — Doppel-Chrome, s. `DockPanel.tsx`-Kopfkommentar) → Chip
  // erscheint wieder.
  await page.click('[data-testid="dock-panel-dossier-schliessen"]');
  await expect(page.locator('[data-testid="dossier-panel"]')).toHaveCount(0);
  await expect(dossierChip).toBeVisible();

  // Plankopf: derselbe Nachweis über den Werkzeugleisten-Knopf statt den
  // Chip — beide Öffnen-Wege (Knopf UND Chip) bedienen denselben Setter.
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
  await expect(plankopfChip).toHaveCount(0);
  await page.click('[data-testid="dock-panel-plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);
  await expect(plankopfChip).toBeVisible();
  await plankopfChip.click();
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
});
