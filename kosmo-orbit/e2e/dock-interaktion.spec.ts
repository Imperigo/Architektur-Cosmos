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
  // v0.7.8 Welle 2 (P4): vorher `locator('text=KENNZAHLEN')` — seit
  // `kennzahlen` selbst ein Dock-Panel ist, trägt auch dessen Dock-Kopf
  // («Doppel-Chrome», `DockPanel.tsx`) den Titel «Kennzahlen» als Text,
  // zusätzlich zur schon vorher vorhandenen Badge im Panel-Inhalt — ein
  // reiner Text-Locator träfe jetzt beide (Playwright-Strict-Bruch).
  // PANEL-testid statt Inhalt-testid, weil der Pin-Test dieser Datei mit
  // extrem knapper Fensterhöhe fährt (1400×420): dort klappt der Solver das
  // Kennzahlen-Panel planmässig zum Tab (Inhalt unmountet) — das Panel-
  // Rechteck selbst ist in JEDEM Zustand da.
  await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();
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

/**
 * v0.8.1 / P2 (Technik-/Flake-Härtung, ROADMAP 390/393-Diagnose) —
 * deterministisches Pendant zu `stabileBox()` unten: pollt NICHT die teure
 * `getBoundingClientRect()`-Ableitung, sondern das billig lesbare
 * `data-solve-generation`-Attribut der DockFlaeche (`shell/dock/
 * DockFlaeche.tsx`, bumpt bei JEDEM `ergebnis`-Solve-Wechsel — s. dortiger
 * Kopfkommentar), bis es für `ruheMs` unverändert bleibt.
 *
 * Hintergrund (real gemessen, HEAD-Beweis P8/P8b): ein Panel-Öffnen-/
 * Einklappen-Klick löst zuerst SOFORT einen Solve aus, ein zweiter,
 * feld-getriebener Re-Solve (ResizeObserver auf Container/Geschwistern,
 * rAF-debounced) folgt unter Last (SwiftShader + laufende 3D-Szene, +
 * zusätzlicher paralleler E2E-Last aus einem anderen Arbeitspaket im
 * selben Container real beobachtet) oft erst ~500ms später und ändert
 * dieselbe Panel-Höhe ein zweites Mal (real 573px→34px / 272px beobachtet).
 * `stabileBox()`s reines BBox-Zeitfenster konnte auf dem ERSTEN (noch nicht
 * endgültigen) Wert einrasten, wenn zufällig genug Ruhe zwischen den beiden
 * Solves lag.
 *
 * ZWEI Härtungs-Runden nötig (beide HEAD-bewiesen, s. Verifikationsbericht):
 *  1. Erster Versuch pollte `getAttribute()` von AUSSEN (Node→Browser-IPC,
 *     50ms-Intervall) UND liess die Ruhe-Uhr ab dem AUFRUF-Zeitpunkt laufen.
 *     Das reproduzierte denselben Fehler nur EINE Ebene höher: kam der
 *     zweite Solve erst NACH Ablauf von `ruheMs` seit Aufruf an, galt das
 *     Attribut fälschlich schon als «stabil», BEVOR der späte Re-Solve
 *     überhaupt landete — real reproduziert (Chevron-Test lieferte exakt
 *     573 statt 34, row-Splitter exakt den Vorher- statt den Nachher-Wert).
 *  2. Fix: ein `MutationObserver` LÄUFT IM BROWSER selbst auf dem Attribut
 *     und hält die Ruhe-Uhr über die GESAMTE Beobachtungsdauer offen — jede
 *     tatsächliche Mutation (auch eine späte, nach 500ms+) setzt sie zurück,
 *     kein Node↔Browser-Poll-Intervall kann eine Mutation verpassen oder zu
 *     früh „ruhig“ urteilen. `ruheMs` bewusst auf denselben Wert wie
 *     `stabileBox()`s `anlaufMs` (700ms) gehoben — der in diesem Repo bereits
 *     belegte «genug Puffer für die .28s-Reflow-Motion plus Messlatenz
 *     unter Last»-Wert, hier als MINDEST-Ruhefenster statt als reiner
 *     Vor-Puffer verwendet.
 *
 * Additiv: ersetzt NUR das Timing in den lastanfälligen Tests dieser Datei
 * (row-Splitter, Chevron, Tab (a)) — `stabileBox()` bleibt für alle anderen
 * Aufrufer unangetastet, seine eigene BBox-Prüfung läuft nach diesem Warten
 * unverändert weiter (kein Assertion-Abbau).
 */
async function warteAufSolveStabilitaet(page: Page, ruheMs = 700, timeoutMs = 10000): Promise<void> {
  await page.evaluate(
    ({ ruheMs, timeoutMs }) => {
      return new Promise<void>((resolve) => {
        const feld = document.querySelector('[data-testid="dock-flaeche"]');
        if (!feld) {
          resolve();
          return;
        }
        const start = performance.now();
        let letzteAenderung = start;
        const beobachter = new MutationObserver(() => {
          letzteAenderung = performance.now();
        });
        beobachter.observe(feld, { attributes: true, attributeFilter: ['data-solve-generation'] });
        const tick = () => {
          const jetzt = performance.now();
          if (jetzt - letzteAenderung >= ruheMs || jetzt - start >= timeoutMs) {
            beobachter.disconnect();
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { ruheMs, timeoutMs },
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
  // v0.8.1/P2: erst auf den späten, feld-getriebenen Re-Solve warten (s.
  // `warteAufSolveStabilitaet()`-Kopfkommentar), DANACH die BBox messen —
  // sonst kann `stabileBox()` unter Last auf der noch nicht endgültigen
  // Vorher-Grösse einrasten.
  await warteAufSolveStabilitaet(page);

  const rasterVorher = await stabileBox(raster);
  const cwVorher = await stabileBox(cw);
  const summeVorher = rasterVorher.height + cwVorher.height;

  await ziehe(page, 'dock-splitter-sr-rasterOffen', 0, 40);
  await warteAufSolveStabilitaet(page);

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
  // v0.8.1/P2: den Öffnen-Solve UND einen etwaigen späten feld-getriebenen
  // Re-Solve (s. `warteAufSolveStabilitaet()`-Kopfkommentar) abwarten, bevor
  // der Chevron-Klick den nächsten Solve auslöst — sonst überlagern sich
  // zwei Re-Solves und die spätere BBox-Messung kann auf einem
  // Zwischenstand einrasten.
  await warteAufSolveStabilitaet(page);

  await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen-tab"]')).toBeVisible();
  await expect(page.locator('[data-testid="kv-panel"]')).toHaveCount(0);
  await warteAufSolveStabilitaet(page);
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

test('Pin schützt Grösse + zuletztGeoeffnet schützt das Frische: das dritte Panel öffnet, das ANDERE (weder gepinnt noch frisch) klappt ein', async ({
  page,
}) => {
  // Knapper Höhenrahmen erzwingt eine Kollision mit wenigen Öffnen-Klicks.
  // v0.7.9 (A6-Restpunkt): seit `DockFlaeche` `zuletztGeoeffnet` an den
  // Solver füttert, klappt das FRISCH geöffnete Panel nie selbst ein — die
  // alte Zwei-Panel-Fassung dieses Tests («kv gepinnt, bauablauf öffnet und
  // klappt sofort selbst zum Tab») ist damit BEWUSST Geschichte: bauablauf
  // war dort zugleich das frische UND das einzige Flex-Panel. Neue
  // Konstellation mit DREI Panels: kv (45) gepinnt, bauablauf (44) offen,
  // dann maengel (42) frisch geöffnet → einklappen muss bauablauf — NICHT
  // maengel (frisch geschützt, obwohl es mit 42 das unwichtigste ist!) und
  // NICHT kv (Pin). Damit beweist derselbe Test beide Schutzmechanismen und
  // ihre Rangfolge-Umkehrung.
  await page.setViewportSize({ width: 1400, height: 470 });
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
  await page.click('[data-testid="dock-panel-kvOffen-pin"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen-pin"]')).toHaveAttribute('aria-pressed', 'true');
  // Abnahme-Fix C4 (Pin-Badge): sichtbar im Kopf, sobald angeheftet.
  await expect(page.locator('[data-testid="dock-panel-kvOffen-pin-badge"]')).toBeVisible();

  // bauablauf öffnen: als frisches Panel selbst geschützt, kv gepinnt —
  // es gibt keinen Einklapp-Kandidaten, beide bleiben offen (gequetscht).
  await page.click('[data-testid="bauablauf-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen-tab"]')).toHaveCount(0);

  // maengel öffnen: jetzt ist MAENGEL das frische (geschützt), kv gepinnt —
  // bauablauf ist der einzige legale Kandidat und klappt zum Tab.
  await page.click('[data-testid="maengel-oeffnen"]');

  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen-tab"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen-tab"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-maengelOffen-tab"]')).toHaveCount(0);
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

// ---------------------------------------------------------------------------
// v0.7.8 Welle 2 / Paket P4 («Header-Drag & Neu-Andocken») — Beweise für
// `DockSnapZonen.tsx` + die Drag-Erweiterungen in `DockPanel.tsx`/
// `DockFlaeche.tsx`: Redock-Drag (Snap-Zonen links/rechts/schwebend),
// Pop-out, freies Verschieben eines schwebenden Panels (Magnet + Snap-
// zurück), Touch-Variante.
// ---------------------------------------------------------------------------

/** Liest `kosmo.dock.v1` und gibt die `PanelOverride` EINES Panels der
 *  aktiven `A:design`-Layout-Zeile zurück (oder `undefined`, wenn (noch)
 *  keine Overrides existieren) — dieselbe Rohform wie `dock-zustand.ts`s
 *  `DockSpeicher`, hier nur lesend/typlos für die Spec gebraucht. */
async function leseOverride(
  page: Page,
  panelId: string,
): Promise<{ dock?: string; fx?: number; fy?: number; anker?: string } | undefined> {
  return page.evaluate((id) => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    if (!roh) return undefined;
    const geparst = JSON.parse(roh) as { layouts?: Record<string, { panels?: Record<string, unknown> }> };
    return geparst.layouts?.['A:design']?.panels?.[id] as
      | { dock?: string; fx?: number; fy?: number; anker?: string }
      | undefined;
  }, panelId);
}

/** Greift den Kopf (Ziehgriff) eines Dock-Panels an einer Stelle, die
 *  garantiert KEIN `<button>` trifft — die Kopf-Buttons sitzen alle am
 *  rechten Rand (`.k-dock-panel-titel` hat `flex:1 1 auto`, füllt den Rest),
 *  20px vom linken Rand liegt darum immer auf Rollenpunkt/Titel. */
async function kopfGriff(page: Page, panelId: string): Promise<{ locator: Locator; box: Box }> {
  const kopf = page.locator(`[data-testid="dock-panel-${panelId}"] .k-dock-panel-kopf`);
  const box = (await kopf.boundingBox())!;
  return { locator: kopf, box };
}

test('Header-Drag: Kennzahlen von rechts nach links (Snap-Zone links) dockt neu an, nichts überlappt', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);

  const panel = page.locator('[data-testid="dock-panel-kennzahlen"]');
  await expect(panel).toBeVisible();
  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  const vorher = await stabileBox(panel);
  // Kennzahlen sitzt anfangs rechts (dock:'right', wichtigkeit 60).
  expect(vorher.x).toBeGreaterThan(feldBox.x + feldBox.width / 2);

  const { box: kopfBox } = await kopfGriff(page, 'kennzahlen');
  const startX = kopfBox.x + 20;
  const startY = kopfBox.y + kopfBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // In die linke Snap-Zone ziehen (deutlich unter der Feld-Mitte, nahe der
  // linken Feldkante) — die Zone muss währenddessen als aktiv markiert sein.
  await page.mouse.move(feldBox.x + 20, feldBox.y + 60, { steps: 10 });
  await expect(page.locator('[data-testid="dock-snap-links"]')).toHaveAttribute('data-aktiv', 'true');
  await expect(page.locator('[data-testid="dock-drag-geist"]')).toBeVisible();
  await page.mouse.up();

  const override = await leseOverride(page, 'kennzahlen');
  expect(override?.dock).toBe('left');

  const nachher = await stabileBox(panel);
  expect(nachher.x).toBeLessThan(feldBox.x + feldBox.width / 2);
  // Snap-Zonen-Overlay verschwindet nach dem Loslassen wieder.
  await expect(page.locator('[data-testid="dock-snap-links"]')).toHaveCount(0);

  // Nichts überlappt: der zentrale Viewport bleibt kollisionsfrei und ≥380px.
  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('Touch-Variante: Header-Drag reagiert auf pointerType=touch', async ({ page }) => {
  await oeffneDesignMitTkb(page);

  const panel = page.locator('[data-testid="dock-panel-kennzahlen"]');
  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  const vorher = await stabileBox(panel);
  expect(vorher.x).toBeGreaterThan(feldBox.x + feldBox.width / 2);

  const { locator: kopf, box: kopfBox } = await kopfGriff(page, 'kennzahlen');
  const startX = kopfBox.x + 20;
  const startY = kopfBox.y + kopfBox.height / 2;
  const zielX = feldBox.x + 20;
  const zielY = feldBox.y + 60;
  const init = { pointerId: 11, pointerType: 'touch', bubbles: true, clientX: startX, clientY: startY };

  // WICHTIG: nur der pointerdown geht an den Kopf — pointermove/pointerup
  // werden auf <body> dispatcht. Der Redock-Drag nimmt das gegriffene Panel
  // sofort aus dem Solver-Routing (`gedraggtId`, Panel unmountet zum Geist)
  // — ein dispatchEvent auf den (weg-)gelösten Kopf-Locator würde ewig auf
  // ein wieder auftauchendes Element warten. `DockFlaeche` hört ohnehin auf
  // window-Listener (bubbles:true reicht).
  await kopf.dispatchEvent('pointerdown', init);
  const body = page.locator('body');
  await body.dispatchEvent('pointermove', { ...init, clientX: zielX, clientY: zielY });
  await expect(page.locator('[data-testid="dock-snap-links"]')).toHaveAttribute('data-aktiv', 'true');
  await body.dispatchEvent('pointerup', { ...init, clientX: zielX, clientY: zielY });

  const override = await leseOverride(page, 'kennzahlen');
  expect(override?.dock).toBe('left');
  const nachher = await stabileBox(panel);
  expect(nachher.x).toBeLessThan(feldBox.x + feldBox.width / 2);
});

/** Zieht ein SCHWEBENDES Panel am Kopf-Griff, sodass seine LINKE OBERE Ecke
 *  möglichst bei (zielX, zielY) landet (Klemmung/Magnet der App dürfen das
 *  Ergebnis verschieben — genau das prüfen die Tests). Griffpunkt ist 20px
 *  vom linken Panel-Rand (sicher auf Rollenpunkt/Titel, nie auf einem
 *  Kopf-Knopf) und vertikal in der Kopfmitte (~17px). */
async function ziehePanelNach(page: Page, panelId: string, zielX: number, zielY: number): Promise<void> {
  const panel = page.locator(`[data-testid="dock-panel-${panelId}"]`);
  const pBox = (await panel.boundingBox())!;
  await page.mouse.move(pBox.x + 20, pBox.y + 17);
  await page.mouse.down();
  await page.mouse.move(zielX + 20, zielY + 17, { steps: 10 });
  await page.mouse.up();
}

test('Pop-out: Panel schwebt frei, lässt sich ziehen (Magnet an Kante) und snappt nahe dem Ursprung zurück', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-schwebend', 'false');

  await page.click('[data-testid="dock-panel-kvOffen-popout"]');
  await expect(panel).toHaveAttribute('data-schwebend', 'true');
  await expect(page.locator('[data-testid="dock-panel-kvOffen-redock"]')).toBeVisible();
  const geschwebt = await stabileBox(panel);
  const w = geschwebt.width;

  // Die Klemm-Grenzen des floatmove sind der SOLVER-Viewport (zentraler
  // Bereich zwischen den Spalten), nicht das `viewport3d`-DOM-Element.
  // v0.7.9 (A3, Teil B): die früheren Extrem-Drags nach GANZ links/rechts
  // sind seit den Snap-Zonen für Schwebende keine reinen Klemm-Proben mehr —
  // ein Zeiger seitlich AUSSERHALB des Viewports dockt jetzt bewusst an
  // (eigener Beweis «Schwebend (d)» unten). Die x-Kanten werden darum
  // MESSEND bestimmt, exakt wie `DockFlaeche.tsx` sie selbst herleitet:
  // links = rechte Kante von Geschossleiste/EntwurfsDock + GAP(10) (die
  // linke Spalte ist nach dem Pop-out leer, lw=0 → vp.x = feld.x), rechts =
  // linke Kante der immer offenen Kennzahlen-Spalte. Nur die OBERE Kante
  // bleibt eine Extrem-Drag-Probe — nach oben gibt es keine Zone.
  const chromeKanten: number[] = [];
  for (const tid of ['geschossleiste', 'entwurf-dock']) {
    const b = await page.locator(`[data-testid="${tid}"]`).boundingBox();
    if (b) chromeKanten.push(b.x + b.width);
  }
  expect(chromeKanten.length).toBeGreaterThan(0);
  const vpX = Math.max(...chromeKanten) + 10;
  const vpRechts = (await stabileBox(page.locator('[data-testid="dock-panel-kennzahlen"]'))).x;
  await ziehePanelNach(page, 'kvOffen', 500, 0);
  const vpY = (await stabileBox(panel)).y;
  expect(vpRechts - vpX).toBeGreaterThan(300); // Sanity: echter Zwischenraum

  // 1) Frei ziehen ABSEITS jeder Magnet-Linie (>16px zu Kanten/Mitte):
  //    Panel bleibt an der Zielposition liegen (kein ungewolltes Einrasten).
  const frei = vpX + 60;
  await ziehePanelNach(page, 'kvOffen', frei, 300);
  const nachFrei = await stabileBox(panel);
  expect(Math.abs(nachFrei.x - frei)).toBeLessThanOrEqual(6);

  // 2) NAHE der linken Kante (<16px) loslassen — Magnet rastet EXAKT ein.
  await ziehePanelNach(page, 'kvOffen', vpX + 10, 300);
  const anKante = await stabileBox(panel);
  expect(Math.abs(anKante.x - vpX)).toBeLessThanOrEqual(2);

  // 3) Zurück nahe der Ausgangsanker-Position (Konzept A `anker:'top'`:
  //    oben-mittig im Viewport, 14px Pad — `dock-kern.ts` `placeFloats()`)
  //    — Loslassen <30px daneben löscht `fx`/`fy` wieder (Snap-zurück).
  const ankerX = vpX + (vpRechts - vpX - w) / 2;
  const ankerY = vpY; // vpY-Probe oben ist bereits die geklemmte Pad-Position
  await ziehePanelNach(page, 'kvOffen', ankerX + 8, ankerY + 8);
  await stabileBox(panel);

  const override = await leseOverride(page, 'kvOffen');
  expect(override?.dock).toBe('float'); // weiterhin schwebend …
  expect(override?.fx).toBeUndefined(); // … aber ohne eigene fx/fy — zurück am Anker.

  // Re-Dock-Knopf: löscht auch `dock`/`anker` — zurück in die Ursprungsspalte.
  await page.click('[data-testid="dock-panel-kvOffen-redock"]');
  await expect(panel).toHaveAttribute('data-schwebend', 'false');
  const overrideNachRedock = await leseOverride(page, 'kvOffen');
  expect(overrideNachRedock?.dock).toBeUndefined();
});

// ---------------------------------------------------------------------------
// v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats» / «C6» Auto-
// Reaktions-Hinweis) — die vier Viewport-HUDs sind IMMER schwebend
// (`dock-stationen.ts`, `dock:'float'` steht schon in der Registry, kein
// Redock-Weg) und tragen KEINEN vollen Dock-Kopf (`floatChrome:'schlank'`,
// `DockPanel.tsx`) — nur einen dünnen Griffstreifen (`.k-dock-panel-griff`)
// zum Ziehen. `kopfGriff()`/`ziehePanelNach()` oben setzen einen vollen Kopf
// voraus (Klick 20px vom linken Rand) — dafür der eigene Helfer unten.
// ---------------------------------------------------------------------------

async function zieheHudGriffNach(page: Page, panelId: string, zielX: number, zielY: number): Promise<void> {
  // v0.7.9-Robustheits-Fix (real diagnostiziert): der Griffstreifen ist nur
  // 5px hoch (`top:-5`), und die bottom-left-verankerten HUDs sacken nach
  // dem Projekt-Load noch einmal um ~3px nach OBEN nach (späte
  // Statusleisten-/Feld-Nachmessung, teils NACH dem `stabileBox()`-
  // Ruhefenster des Aufrufers) — ein Mausklick auf die VERALTETE Griff-
  // Mitte traf dann haarscharf UNTER den Griff (Panel-Inhalt → kein Drag,
  // Textselektion; delta 0). Zwei Gegenmittel: (1) der Griff wird HIER
  // frisch und mit eigenem, längerem Ruhefenster gemessen (600ms statt
  // 300ms — die beobachtete Nachmessung fällt in dieses Fenster);
  // (2) gezielt wird der OBERSTE Griff-Pixel + 1 (statt der Mitte) — ein
  // weiteres Nachsacken um bis zu ~4px nach oben bleibt damit im Griff.
  const griff = page.locator(`[data-testid="dock-panel-${panelId}"] .k-dock-panel-griff`);
  const box = await stabileBox(griff, 6000, 100, 300, 600);
  await page.mouse.move(box.x + box.width / 2, box.y + 1);
  await page.mouse.down();
  await page.mouse.move(zielX, zielY, { steps: 10 });
  await page.mouse.up();
}

test('HUD frei ziehen (Griffstreifen): bleibt an freier Position liegen, snappt nahe dem Ursprungsanker zurück', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  const panel = page.locator('[data-testid="dock-panel-viewportOrientierung"]');
  await expect(panel).toBeVisible();
  // Die vier HUDs sind IMMER schwebend (Registry-`dock:'float'`, kein
  // Redock-Weg — anders als `kvOffen` oben, das erst per Pop-out schwebend
  // wird).
  await expect(panel).toHaveAttribute('data-schwebend', 'true');
  const vorher = await stabileBox(panel);

  // 1) Weit weg ziehen (fernab jeder Magnet-Linie) — bleibt liegen.
  const zielX = vorher.x + 220;
  const zielY = vorher.y - 180;
  await zieheHudGriffNach(page, 'viewportOrientierung', zielX, zielY);
  const nachDrag = await stabileBox(panel);
  expect(Math.abs(nachDrag.x - vorher.x)).toBeGreaterThan(100);
  const overrideNachDrag = await leseOverride(page, 'viewportOrientierung');
  expect(overrideNachDrag?.fx).toBeDefined();

  // 2) Nahe an die Ausgangsanker-Position zurückziehen (< 30px, s.
  //    `DockFlaeche.tsx`s `FLOAT_SNAPBACK_T`) — `fx`/`fy` werden gelöscht,
  //    das HUD kehrt an seinen `anker:'bottom-left'`-Platz zurück.
  await zieheHudGriffNach(page, 'viewportOrientierung', vorher.x + 8, vorher.y + 8);
  await stabileBox(panel);
  const overrideNachRueck = await leseOverride(page, 'viewportOrientierung');
  expect(overrideNachRueck?.fx).toBeUndefined();
});

test('Auto-Reaktions-Hinweis (C6): drittes Panel öffnen lässt das ANDERE (weder gepinnt noch frisch) einklappen — Chip zeigt den richtigen Titel und verschwindet wieder', async ({
  page,
}) => {
  // EXAKT dieselbe Ausgangslage wie der Pin-Test oben — kv (45) gepinnt,
  // bauablauf (44) offen, DANN maengel (42) frisch geöffnet: bauablauf (das
  // ANDERE — weder gepinnt noch das frische) klappt zum Tab und der Chip
  // meldet GENAU diesen Titel. v0.7.9 (A6-Restpunkt): die alte Zwei-Panel-
  // Fassung («bauablauf öffnet und klappt sofort SELBST ein, der Chip
  // erklärt die Überraschung») ist Geschichte — der `zuletztGeoeffnet`-
  // Schutz verhindert das Sofort-Selbst-Einklappen jetzt strukturell, der
  // Chip erklärt stattdessen die Reaktion am ANDEREN Panel. Die Chip-
  // SEMANTIK (`eingeklappteDiff()`, P5) ist unangetastet: kein Chevron wird
  // manuell geklickt, `ausgeloestId` bleibt undefiniert, nichts wird aus dem
  // Diff ausgenommen.
  await page.setViewportSize({ width: 1400, height: 470 });
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
  await page.click('[data-testid="dock-panel-kvOffen-pin"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen-pin"]')).toHaveAttribute('aria-pressed', 'true');

  // bauablauf öffnen: frisch geschützt + kv gepinnt → kein Kandidat, kein
  // Einklappen, KEIN Chip.
  await page.click('[data-testid="bauablauf-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen-tab"]')).toHaveCount(0);

  const chip = page.locator('[data-testid="dock-auto-hinweis"]');
  await expect(chip).toHaveCount(0);

  await page.click('[data-testid="maengel-oeffnen"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-bauablaufOffen-tab"]')).toBeVisible();

  await expect(chip).toBeVisible({ timeout: 2000 });
  await expect(chip).toHaveText('Bauablauf eingeklappt · Platz geschaffen');

  // Verschwindet nach ~2,9s von selbst wieder (Auftrag).
  await expect(chip).toHaveCount(0, { timeout: 4500 });
});

// ---------------------------------------------------------------------------
// v0.7.9 (A3, Owner-Kern) — Tabs als Drag-Handles + Snap-Zonen für
// Schwebende (ROADMAP-359-Restpunkte). Fünf Beweise gemäss Auftrag:
//  (a) Tab-Klick öffnet weiterhin (auch mit Zitter-Bewegung unter der
//      5px-Schwelle, `DockPanel.tsx`s `TAB_DRAG_SCHWELLE`) — ergänzt die
//      bereits bestehende «Tab-Klick öffnet ein eingeklapptes Panel wieder»-
//      Probe oben (die deckt den reinen `page.click()`-Fall ab, hier kommt
//      gezielt der Grenzfall knapp unter der Schwelle dazu).
//  (b) Tab-Drag über die Schwelle in die RECHTS-Zone: Spaltenwechsel, der Tab
//      BLEIBT eingeklappt (Owner-Entscheid «least surprise»).
//  (c) Tab-Drag in die SCHWEBEND-Zone (nur Modus A): öffnet als Float —
//      eingeklappte Floats existieren im Modell nicht (`placeFloats()`,
//      `dock-kern.ts`, setzt `eingeklappt` für JEDES Float-Rechteck hart auf
//      `false`), Aufklappen ist die einzig sinnvolle Semantik.
//  (d) Ein bereits schwebendes Panel in die LINKS-Zone gezogen dockt an
//      (`dock:'left'`, `fx`/`fy` gelöscht) — die neuen Snap-Zonen für
//      Schwebende (`DockFlaeche.tsx`s `floatDragStart`).
//  (e) Touch-Variante von (b).
// ---------------------------------------------------------------------------

test('Tab (a): Klick öffnet weiterhin — auch mit Zitter-Bewegung unter der 5px-Schwelle', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
  const tab = page.locator('[data-testid="dock-panel-kvOffen-tab"]');
  await expect(tab).toBeVisible();

  // WICHTIG: `stabileBox` statt rohem `boundingBox` — direkt nach dem
  // Einklappen läuft die .28s-Reflow-Motion noch (real gemessen: die rohe
  // Box war 580px hoch statt 34, mitten im Schrumpfen). Ein Klick auf die
  // VERALTETE Mitte träfe nach dem Fertig-Schrumpfen den Viewport statt den
  // Tab — pointerup/click gingen am Tab vorbei, nichts öffnete (deterministisch
  // reproduziert). Dasselbe Muster wie `zieheHudGriffNach()` oben.
  // v0.8.1/P2 — bei der Verifikation dieses Auftrags (3×-Last-Läufe, s.
  // `warteAufSolveStabilitaet()`-Kopfkommentar) zusätzlich unter echter
  // Last (paralleler zweiter E2E-Lauf im selben Container) beobachtet:
  // dieselbe Klasse Flake wie row-Splitter/Chevron (ein später, feld-
  // getriebener Re-Solve nach dem Einklappen-Klick, auf den `stabileBox()`
  // unter Last vorzeitig einrasten kann) — additiv auf dasselbe Signal
  // umgestiegen, bevor überhaupt gemessen wird.
  await warteAufSolveStabilitaet(page);
  const box = await stabileBox(tab);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Bewegung deutlich UNTER der 5px-Schwelle — kein Drag, der Klick öffnet
  // ganz normal (kein Redock-Geist, keine Snap-Zonen).
  await page.mouse.move(cx + 2, cy + 1, { steps: 2 });
  await page.mouse.up();

  await expect(page.locator('[data-testid="dock-drag-geist"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(tab).toHaveCount(0);
});

test('Tab (b): Drag über die Schwelle in die RECHTS-Zone verschiebt den Tab EINGEKLAPPT in die rechte Spalte', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
  const tab = page.locator('[data-testid="dock-panel-kvOffen-tab"]');
  await expect(tab).toBeVisible();

  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  // kvOffen sitzt anfangs links (dock:'left').
  const vorher = await stabileBox(panel);
  expect(vorher.x).toBeLessThan(feldBox.x + feldBox.width / 2);

  // `stabileBox` — Reflow-Motion nach dem Einklappen abwarten (s. Tab (a)).
  const box = await stabileBox(tab);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Deutlich über die 5px-Schwelle hinaus in die rechte Snap-Zone ziehen.
  await page.mouse.move(feldBox.x + feldBox.width - 20, feldBox.y + 60, { steps: 10 });
  await expect(page.locator('[data-testid="dock-snap-rechts"]')).toHaveAttribute('data-aktiv', 'true');
  await expect(page.locator('[data-testid="dock-drag-geist"]')).toBeVisible();
  await page.mouse.up();

  const override = await leseOverride(page, 'kvOffen');
  expect(override?.dock).toBe('right');

  // BLEIBT eingeklappt (Owner-Entscheid «least surprise») — der Tab ist nach
  // dem Spaltenwechsel weiterhin ein Tab, kein aufgeklapptes Panel.
  await expect(tab).toBeVisible();
  await expect(page.locator('[data-testid="kv-panel"]')).toHaveCount(0);

  const nachher = await stabileBox(panel);
  expect(nachher.x).toBeGreaterThan(feldBox.x + feldBox.width / 2);
});

test('Tab (c): Drag in die SCHWEBEND-Zone öffnet als Float (eingeklappte Floats existieren im Modell nicht)', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
  const tab = page.locator('[data-testid="dock-panel-kvOffen-tab"]');
  await expect(tab).toBeVisible();

  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  // v0.8.2 / P7a (C2, ROADMAP 1445, `docs/V082-SPEZ.md` §6.6/C-28) — exakt
  // dieselbe Härtungsklasse wie Tab (a)/row-Splitter/Chevron: der
  // Einklappen-Klick löst SOFORT einen Solve aus, ein zweiter, feld-
  // getriebener Re-Solve (ResizeObserver, rAF-debounced) folgt unter Last oft
  // erst ~500ms später — im 27-min-Volllast-Batch real gerissen (`stabileBox`
  // allein rastete auf dem ersten, noch nicht endgültigen Wert ein, `tab`
  // lag dann nicht mehr an der gemessenen Position, der Klick traf daneben),
  // isoliert 4× grün (s. `warteAufSolveStabilitaet()`-Kopfkommentar). Additiv
  // auf dasselbe deterministische Signal umgestiegen, bevor überhaupt
  // gemessen wird — keine Assertion gelockert.
  await warteAufSolveStabilitaet(page);
  // `stabileBox` — Reflow-Motion nach dem Einklappen abwarten (s. Tab (a)).
  const box = await stabileBox(tab);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Feld-Mitte — weit von beiden Rand-Zonen entfernt, trifft die SCHWEBEND-Zone.
  await page.mouse.move(feldBox.x + feldBox.width / 2, feldBox.y + feldBox.height / 2, { steps: 10 });
  await expect(page.locator('[data-testid="dock-snap-schwebend"]')).toHaveAttribute('data-aktiv', 'true');
  await page.mouse.up();

  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toHaveAttribute('data-schwebend', 'true');
  // Öffnet vollständig — kein Tab mehr, der volle Kopf + Inhalt sind da.
  await expect(tab).toHaveCount(0);
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen-redock"]')).toBeVisible();

  const override = await leseOverride(page, 'kvOffen');
  expect(override?.dock).toBe('float');
});

test('Schwebend (d): Kopf-Drag eines bereits schwebenden Panels in die LINKS-Zone dockt an — fx/fy werden gelöscht', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-schwebend', 'false');

  await page.click('[data-testid="dock-panel-kvOffen-popout"]');
  await expect(panel).toHaveAttribute('data-schwebend', 'true');
  const geschwebt = await stabileBox(panel);

  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  const startX = geschwebt.x + 20; // Rollenpunkt/Titel, nie ein Kopf-Knopf.
  const startY = geschwebt.y + 17;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Nahe der linken Feldkante — die Snap-Zone links muss erscheinen und aktiv
  // werden; die SCHWEBEND-Zone gibt es hier bewusst NICHT (`mitSchwebendZone
  // ={false}`, `DockFlaeche.tsx` — ein bereits schwebendes Panel hat keine
  // sinnvolle "schwebend bleiben"-Zone).
  await page.mouse.move(feldBox.x + 20, feldBox.y + 60, { steps: 10 });
  await expect(page.locator('[data-testid="dock-snap-links"]')).toHaveAttribute('data-aktiv', 'true');
  await expect(page.locator('[data-testid="dock-snap-schwebend"]')).toHaveCount(0);
  await page.mouse.up();

  await expect(panel).toHaveAttribute('data-schwebend', 'false');
  const override = await leseOverride(page, 'kvOffen');
  expect(override?.dock).toBe('left');
  expect(override?.fx).toBeUndefined();
  expect(override?.fy).toBeUndefined();

  const nachher = await stabileBox(panel);
  expect(nachher.x).toBeLessThan(feldBox.x + feldBox.width / 2);
});

test('Touch-Variante (e): Tab-Drag über die Schwelle dockt eingeklappt in die rechte Spalte', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
  const tab = page.locator('[data-testid="dock-panel-kvOffen-tab"]');
  await expect(tab).toBeVisible();

  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  // `stabileBox` — Reflow-Motion nach dem Einklappen abwarten (s. Tab (a)).
  const box = await stabileBox(tab);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const zielX = feldBox.x + feldBox.width - 20;
  const zielY = feldBox.y + 60;
  const init = { pointerId: 13, pointerType: 'touch', bubbles: true, clientX: startX, clientY: startY };

  // Nur der pointerdown geht an den Tab — sobald die Schwelle überschritten
  // ist, entfernt `tabPointerDown` seine eigenen Listener und startet
  // denselben Redock-Drag wie beim vollen Kopf (`DockFlaeche.tsx` hört ab
  // dann auf window-Listener, s. die Touch-Variante des Header-Drag-Tests
  // oben für dieselbe dispatchEvent-auf-<body>-Begründung).
  await tab.dispatchEvent('pointerdown', init);
  const body = page.locator('body');
  await body.dispatchEvent('pointermove', { ...init, clientX: zielX, clientY: zielY });
  await expect(page.locator('[data-testid="dock-snap-rechts"]')).toHaveAttribute('data-aktiv', 'true');
  await body.dispatchEvent('pointerup', { ...init, clientX: zielX, clientY: zielY });

  const override = await leseOverride(page, 'kvOffen');
  expect(override?.dock).toBe('right');
  await expect(tab).toBeVisible();
  await expect(page.locator('[data-testid="kv-panel"]')).toHaveCount(0);
});
