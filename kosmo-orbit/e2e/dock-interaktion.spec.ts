import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * v0.7.8 Welle 1 / Paket P3 («Intelligente Werkzeugtabs», Herzstück) —
 * Interaktions-Beweise für `DockSplitter.tsx`/`DockPanel.tsx`: Spalten-/
 * Zeilen-Splitter, Einklappen/Tab, Anheften-Schutz, Touch, Persistenz.
 *
 * Bootstrap wie `dock-layout.spec.ts` (`load-tkb`, kein Onboarding-Setup
 * nötig — s. `bauablauf.spec.ts`).
 *
 * Messungen NACH einer Ziehgeste/einem Klick warten auf `stabileBox()` statt
 * eines festen `waitForTimeout` — die Reflow-Motion (.28s,
 * `dock-flaeche.css`) braucht unter Last (SwiftShader-Software-Rendering +
 * die laufende 3D-Szene) empirisch nachgewiesen WESENTLICH länger als die
 * nominalen 280ms, bis `getBoundingClientRect()` einen stabilen Endwert
 * liefert (per Debug-Messung: teils erst nach ~600ms). Ein fester Timeout
 * wäre entweder zu kurz (Flake) oder unnötig lang (langsame Suite) — Polling
 * bis zwei aufeinanderfolgende Messungen übereinstimmen ist robust gegen
 * beide.
 */

async function oeffneDesignMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function gleich(a: Box | null, b: Box | null): boolean {
  return (
    !!a &&
    !!b &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5
  );
}

/** Pollt `locator.boundingBox()`, bis der Wert für mindestens `ruheMs` am
 *  Stück unverändert bleibt — «die Reflow-Motion ist fertig», unabhängig
 *  davon, wie lange sie unter Last tatsächlich braucht. EIN erster fixer
 *  Wartepuffer (`anlaufMs`) VOR dem ersten Vergleich ist nötig, sonst
 *  akzeptiert die Funktion die alte Grösse als "stabil", wenn der Klick die
 *  Transition noch gar nicht ausgelöst hat (React/Paint brauchen ein paar ms,
 *  bevor sich `left/top/width/height` überhaupt zu ändern beginnen) —
 *  reproduzierbar beobachtet, als ein reiner 2-Messungen-Vergleich ohne
 *  Anlaufpuffer die UNVERÄNDERTE Ausgangsgrösse zurückgab. */
async function stabileBox(
  locator: Locator,
  timeoutMs = 4000,
  intervalMs = 100,
  anlaufMs = 700,
  ruheMs = 300,
): Promise<Box> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, anlaufMs));
  let letzte = await locator.boundingBox();
  let stabilSeitMs = 0;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const jetzt = await locator.boundingBox();
    if (gleich(letzte, jetzt)) {
      stabilSeitMs += intervalMs;
      if (stabilSeitMs >= ruheMs) return jetzt!;
    } else {
      stabilSeitMs = 0;
    }
    letzte = jetzt;
  }
  return letzte!;
}

async function ziehe(page: Page, testid: string, dx: number, dy: number): Promise<Box> {
  const griff = page.locator(`[data-testid="${testid}"]`);
  const box = (await griff.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 8 });
  await page.mouse.up();
  return box;
}

test('col-Splitter (links) ändert die Spaltenbreite und klemmt an MIN/MAX', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  const vorher = await stabileBox(panel);

  // Vergrössern
  await ziehe(page, 'dock-splitter-spL', 60, 0);
  const groesser = await stabileBox(panel);
  expect(groesser.width).toBeGreaterThan(vorher.width + 20);

  // Weit über MAX_LEFT (360px) hinausziehen — klemmt (dock-zustand.ts `klemme()`).
  await ziehe(page, 'dock-splitter-spL', 2000, 0);
  const maxBreite = (await stabileBox(panel)).width;
  expect(maxBreite).toBeLessThanOrEqual(361);
  expect(maxBreite).toBeGreaterThanOrEqual(355);

  // Weit unter MIN_LEFT (168px) — klemmt nach unten.
  await ziehe(page, 'dock-splitter-spL', -2000, 0);
  const minBreite = (await stabileBox(panel)).width;
  expect(minBreite).toBeLessThanOrEqual(174);
  expect(minBreite).toBeGreaterThanOrEqual(160);
});

test('row-Splitter verschiebt Grössen zwischen zwei Nachbarn derselben Spalte', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  // Reihenfolge in `dock-stationen.ts` (DESIGN_PANELS): raster VOR cwSetzen —
  // `stack()` ordnet die linke Spalte in genau dieser Reihenfolge, der
  // row-Splitter dazwischen heisst deshalb `sr-rasterOffen`.
  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="cw-setzen-oeffnen"]');

  const raster = page.locator('[data-testid="dock-panel-rasterOffen"]');
  const cw = page.locator('[data-testid="dock-panel-cwSetzenOffen"]');
  await expect(raster).toBeVisible();
  await expect(cw).toBeVisible();

  const rasterVorher = await stabileBox(raster);
  const cwVorher = await stabileBox(cw);
  const summeVorher = rasterVorher.height + cwVorher.height;

  await ziehe(page, 'dock-splitter-sr-rasterOffen', 0, 40);

  const rasterNachher = await stabileBox(raster);
  const cwNachher = await stabileBox(cw);

  // Raster (oben) wächst, cwSetzen (unten) schrumpft entsprechend — die
  // Summe bleibt (bis auf Rundung) gleich, kein Platz geht verloren.
  expect(rasterNachher.height).toBeGreaterThan(rasterVorher.height + 10);
  expect(cwNachher.height).toBeLessThan(cwVorher.height - 10);
  expect(Math.abs(rasterNachher.height + cwNachher.height - summeVorher)).toBeLessThanOrEqual(4);
});

test('Chevron klappt ein/aus — eingeklappt zeigt einen 34px-Tab, Inhalt verschwindet', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();

  await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen-tab"]')).toBeVisible();
  await expect(page.locator('[data-testid="kv-panel"]')).toHaveCount(0);
  const tabBox = await stabileBox(page.locator('[data-testid="dock-panel-kvOffen"]'));
  expect(Math.round(tabBox.height)).toBe(34);

  // Erneuter Klick auf den Chevron ist nicht mehr da (Tab hat kein
  // Einklappen-Icon) — der Tab selbst klappt wieder auf.
  await page.click('[data-testid="dock-panel-kvOffen-tab"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen-tab"]')).toHaveCount(0);
});

test('Tab-Klick öffnet ein eingeklapptes Panel wieder', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="bauablauf-oeffnen"]');
  await page.click('[data-testid="dock-panel-bauablaufOffen-einklappen"]');
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen-tab"]')).toBeVisible();

  await page.click('[data-testid="dock-panel-bauablaufOffen-tab"]');
  await expect(page.locator('[data-testid="bauablauf-panel"]')).toBeVisible();
});

test('Pin schützt Grösse: geht ein zweites Panel auf, klappt das ANDERE (nicht angeheftete) ein', async ({
  page,
}) => {
  // Knapper Höhenrahmen erzwingt eine Kollision zwischen zwei Panels mit nur
  // je einem Öffnen-Klick (statt vieler Panels bei Standardgrösse).
  await page.setViewportSize({ width: 1400, height: 420 });
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
  await page.click('[data-testid="dock-panel-kvOffen-pin"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen-pin"]')).toHaveAttribute('aria-pressed', 'true');

  await page.click('[data-testid="bauablauf-oeffnen"]');

  // kv bleibt offen (angeheftet schützt), bauablauf (das ANDERE, nicht
  // geschützte Panel) klappt zum Tab.
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen-tab"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen-tab"]')).toBeVisible();
});

test('Touch-Variante: col-Splitter reagiert auf pointerType=touch', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  const vorher = await stabileBox(panel);

  const splitter = page.locator('[data-testid="dock-splitter-spL"]');
  const box = (await splitter.boundingBox())!;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const init = { pointerId: 7, pointerType: 'touch', bubbles: true, clientX: startX, clientY: startY };

  await splitter.dispatchEvent('pointerdown', init);
  await splitter.dispatchEvent('pointermove', { ...init, clientX: startX + 60 });
  await splitter.dispatchEvent('pointerup', { ...init, clientX: startX + 60 });

  const nachher = await stabileBox(panel);
  expect(nachher.width).toBeGreaterThan(vorher.width + 20);
});

test('Persistenz: reload behält die per Splitter gesetzte leftW', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  const vorher = await stabileBox(panel);

  await ziehe(page, 'dock-splitter-spL', 50, 0);
  const breiteVorReload = (await stabileBox(panel)).width;
  expect(Math.abs(breiteVorReload - vorher.width)).toBeGreaterThan(20);

  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(panel).toBeVisible();
  const breiteNachReload = (await stabileBox(panel)).width;
  expect(Math.abs(breiteNachReload - breiteVorReload)).toBeLessThanOrEqual(1);
});
